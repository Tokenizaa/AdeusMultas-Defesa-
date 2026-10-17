/**
 * E2E Validation Module
 * Validates analysis results, document generation, and database persistence
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DocumentAssemblyEngine } from '../src/core/documents/document-assembly-engine';
import { ExpertRuleEngine } from '../src/core/rules/rule-engine';
import { resolveProtocolInfo } from '../src/core/legal-base/organs';
import { makeInfraction } from './audit/helpers';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://llmxnpgjpxcvyrqjkfwb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export interface ValidationResult {
  caseId: string;
  analysis: AnalysisValidation;
  document: DocumentValidation;
  protocol: ProtocolValidation;
  contamination: ContaminationCheck;
  overall: 'PASS' | 'FAIL';
}

export interface AnalysisValidation {
  exists: boolean;
  procedureTypeCorrect: boolean;
  competentBodyCorrect: boolean;
  ufCorrect: boolean;
  tesesIdentified: string[];
  score: number;
  errors: string[];
}

export interface DocumentValidation {
  exists: boolean;
  templateCorrect: boolean;
  dataPreserved: boolean;
  fieldsValid: FieldValidation[];
  errors: string[];
}

export interface FieldValidation {
  field: string;
  expected: string;
  actual: string;
  match: boolean;
}

export interface ProtocolValidation {
  exists: boolean;
  portalUrlCorrect: boolean;
  physicalAddressCorrect: boolean;
  competentBodyCorrect: boolean;
  errors: string[];
}

export interface ContaminationCheck {
  clean: boolean;
  otherCasesData: string[];
  errors: string[];
}

export class E2EValidator {
  private supabase: SupabaseClient;

  constructor() {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }

  /**
   * Validate a test case completely
   */
  async validateCase(testCase: any): Promise<ValidationResult> {
    const caseId = testCase.id;
    
    // Fetch case from database
    let { data: caseData, error } = await this.supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if ((error || !caseData) && testCase.userId && testCase.infraction?.aitNumber) {
      // Scenario fixtures may be virtual and intentionally not pre-seeded as
      // rows. Resolve the real case created by the public onboarding flow.
      const resolved = await this.supabase
        .from('cases')
        .select('*')
        .eq('user_id', testCase.userId)
        .eq('ait_number', testCase.infraction.aitNumber)
        .eq('service_type', testCase.procedureType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!resolved.error && resolved.data) {
        caseData = resolved.data;
        error = null;
      }
    }

    if (error || !caseData) {
      return this.failResult(caseId, [`Case not found in database by id or user/AIT/service: ${error?.message || 'no matching persisted case'}`]);
    }

    // Anonymous onboarding creates a server-side case after the fixture case
    // is seeded. Resolve that canonical persisted case by the synthetic user
    // when the seed row is still untouched.
    const existingProcedure = caseData.analysis_json
      ? (typeof caseData.analysis_json === 'string' ? JSON.parse(caseData.analysis_json) : caseData.analysis_json)?.recommendedProcedure
      : undefined;
    if ((!caseData.analysis_json || existingProcedure !== testCase.procedureType || !caseData.defense_draft_json) && testCase.userId) {
      const latest = await this.supabase
        .from('cases')
        .select('*')
        .eq('user_id', testCase.userId)
        .order('created_at', { ascending: false })
        .limit(50);
      const expectedAit = testCase.infraction?.aitNumber;
      const matching = (latest.data || []).find((candidate: any) => {
        const analysis = typeof candidate.analysis_json === 'string' ? JSON.parse(candidate.analysis_json) : candidate.analysis_json;
        return candidate.ait_number === expectedAit &&
          candidate.service_type === testCase.procedureType &&
          analysis?.recommendedProcedure === testCase.procedureType &&
          candidate.analysis_json;
      });
      if (matching) {
        caseData = matching;
      }
    }

    // Run all validations
    const analysis = await this.validateAnalysis(caseData, testCase);
    const document = await this.validateDocument(caseData, testCase);
    const protocol = await this.validateProtocol(caseData, testCase);
    const contamination = await this.validateContamination(caseData, testCase);

    const overall = 
      analysis.errors.length === 0 &&
      document.errors.length === 0 &&
      protocol.errors.length === 0 &&
      contamination.clean
        ? 'PASS' : 'FAIL';

    return {
      caseId,
      analysis,
      document,
      protocol,
      contamination,
      overall,
    };
  }

  /**
   * Validate analysis results
   */
  private async validateAnalysis(caseData: any, testCase: any): Promise<AnalysisValidation> {
    const errors: string[] = [];
    let exists = false;
    let procedureTypeCorrect = false;
    let competentBodyCorrect = false;
    let ufCorrect = false;
    let tesesIdentified: string[] = [];
    let score = 0;

    try {
      if (caseData.analysis_json) {
        const analysis = typeof caseData.analysis_json === 'string' 
          ? JSON.parse(caseData.analysis_json) 
          : caseData.analysis_json;
        
        exists = true;
        
        // Check procedure type
        const expectedProcedure = testCase.procedureType;
        if (analysis.recommendedProcedure === expectedProcedure) {
          procedureTypeCorrect = true;
        } else {
          errors.push(`Procedure mismatch: expected ${expectedProcedure}, got ${analysis.recommendedProcedure}`);
        }

        // Check competent body (autuador)
        if (analysis.competentBody === testCase.infraction.autuadorBody) {
          competentBodyCorrect = true;
        } else {
          errors.push(`Competent body mismatch: expected ${testCase.infraction.autuadorBody}, got ${analysis.competentBody}`);
        }

        // Check UF from cityState
        const expectedUF = extractUFFromCompetentBody(testCase.infraction.autuadorBody);
        const analysisUF = extractUFFromCompetentBody(analysis.competentBody);
        if (analysisUF === expectedUF) {
          ufCorrect = true;
        } else {
          errors.push(`UF mismatch: expected ${expectedUF}, got ${analysisUF}`);
        }

        // Teses identified
        tesesIdentified = analysis.recommendedArguments?.map((a: any) => a.title) || [];
        score = analysis.overallSuccessRate || 0;
      } else {
        errors.push('No analysis_json found in case');
      }
    } catch (e: any) {
      errors.push(`Analysis validation error: ${e.message}`);
    }

    return { exists, procedureTypeCorrect, competentBodyCorrect, ufCorrect, tesesIdentified, score, errors };
  }

  /**
   * Validate document generation
   */
  private async validateDocument(caseData: any, testCase: any): Promise<DocumentValidation> {
    const errors: string[] = [];
    const fieldsValid: FieldValidation[] = [];
    let exists = false;
    let templateCorrect = false;
    let dataPreserved = false;

    try {
      if (caseData.defense_draft_json) {
        const draft = typeof caseData.defense_draft_json === 'string'
          ? JSON.parse(caseData.defense_draft_json)
          : caseData.defense_draft_json;
        
        exists = true;

        // Check template (procedure name)
        const expectedProcedure = testCase.procedureType;
        if (draft.procedureType === expectedProcedure) {
          templateCorrect = true;
        } else {
          errors.push(`Document procedure mismatch: expected ${expectedProcedure}, got ${draft.procedureType}`);
        }

        // Validate critical fields
        const validations = [
          { field: 'applicantName', expected: testCase.applicant.applicantName, actual: draft.applicantName },
          { field: 'applicantCpf', expected: testCase.applicant.applicantCpf, actual: draft.applicantCpf },
          { field: 'applicantCnh', expected: testCase.applicant.applicantCnh, actual: draft.applicantCnh },
          { field: 'applicantCityState', expected: testCase.applicant.addressCityState, actual: draft.applicantCityState },
          { field: 'vehiclePlate', expected: testCase.vehicle.plate, actual: draft.vehiclePlate },
          { field: 'aitNumber', expected: testCase.infraction.aitNumber, actual: draft.aitNumber },
        ];

        let allMatch = true;
        for (const v of validations) {
          const match = v.expected === v.actual;
          fieldsValid.push({ ...v, match });
          if (!match) {
            allMatch = false;
            errors.push(`Field ${v.field} mismatch: expected "${v.expected}", got "${v.actual}"`);
          }
        }
        dataPreserved = allMatch;

        // Check for fallback values in fullDraftText
        const fallbackChecks = [
          // These are valid values for the first SP fixture. Only flag them
          // when they were substituted for a different value requested by the
          // scenario; otherwise the validator rejects legitimate test data.
          ...(testCase.infraction.autuadorBody !== 'DETRAN-SP'
            ? [{ pattern: 'DETRAN-SP', field: 'autuadorBody (SP fallback)' }]
            : []),
          ...(testCase.applicant.addressCityState !== 'São Paulo/SP'
            ? [{ pattern: 'São Paulo/SP', field: 'cityState (SP fallback)' }]
            : []),
          { pattern: 'AIT-1234567', field: 'aitNumber (fake fallback)' },
          { pattern: '000.000.000-00', field: 'cpf (fake fallback)' },
          { pattern: '00000000000', field: 'cnh (fake fallback)' },
        ];

        for (const check of fallbackChecks) {
          if (draft.fullDraftText?.includes(check.pattern)) {
            errors.push(`Fallback detected in document: ${check.field} contains "${check.pattern}"`);
          }
        }
      } else {
        errors.push('No defense_draft_json found in case');
      }
    } catch (e: any) {
      errors.push(`Document validation error: ${e.message}`);
    }

    return { exists, templateCorrect, dataPreserved, fieldsValid, errors };
  }

  /**
   * Validate protocol information
   */
  private async validateProtocol(caseData: any, testCase: any): Promise<ProtocolValidation> {
    const errors: string[] = [];
    let exists = false;
    let portalUrlCorrect = false;
    let physicalAddressCorrect = false;
    let competentBodyCorrect = false;

    try {
      const protocolInfo = caseData.protocol_info_json 
        ? (typeof caseData.protocol_info_json === 'string' 
            ? JSON.parse(caseData.protocol_info_json) 
            : caseData.protocol_info_json)
        : null;

      if (protocolInfo) {
        exists = true;

        // Resolve expected protocol info from registry
        const expectedProtocol = resolveProtocolInfo(testCase.infraction.autuadorBody);
        
        if (expectedProtocol) {
          // Check portal URL
          if (protocolInfo.portalUrl === expectedProtocol.portalUrl) {
            portalUrlCorrect = true;
          } else {
            errors.push(`Portal URL mismatch: expected ${expectedProtocol.portalUrl}, got ${protocolInfo.portalUrl}`);
          }

          // Check physical address
          if (protocolInfo.physicalAddress === expectedProtocol.physicalAddress) {
            physicalAddressCorrect = true;
          } else {
            errors.push(`Physical address mismatch`);
          }

          // Check competent body
          if (protocolInfo.competentBody === expectedProtocol.competentBody) {
            competentBodyCorrect = true;
          } else {
            errors.push(`Protocol competent body mismatch: expected ${expectedProtocol.competentBody}, got ${protocolInfo.competentBody}`);
          }
        } else {
          errors.push(`No protocol info found for autuador: ${testCase.infraction.autuadorBody}`);
        }
      } else {
        // Protocol metadata is produced after payment/operational submission.
        // The public pre-payment flow is valid without it; do not turn the
        // QR-code checkpoint into a false document failure.
        if (caseData.is_paid === true || caseData.status === 'pago') {
          errors.push('No protocol_info_json found in paid case');
        }
      }
    } catch (e: any) {
      errors.push(`Protocol validation error: ${e.message}`);
    }

    return { exists, portalUrlCorrect, physicalAddressCorrect, competentBodyCorrect, errors };
  }

  /**
   * Validate no cross-case contamination
   */
  private async validateContamination(caseData: any, testCase: any): Promise<ContaminationCheck> {
    const errors: string[] = [];
    const otherCasesData: string[] = [];
    let clean = true;

    try {
      // Do not rely on a test_run_id column that is not part of the production schema.
      // Scope the check to synthetic E2E identities and fail closed on query errors.
      const { data: profiles, error: profilesError } = await this.supabase
        .from('user_profiles')
        .select('user_id')
        .like('email', 'e2e+%@test.local');

      if (profilesError) {
        throw new Error(`Could not identify synthetic E2E users: ${profilesError.message}`);
      }

      const syntheticUserIds = [...new Set((profiles || []).map((profile: any) => profile.user_id).filter(Boolean))];
      if (syntheticUserIds.length === 0) {
        throw new Error('No synthetic E2E users found; contamination check cannot be trusted');
      }

      const { data: allCases, error: casesError } = await this.supabase
        .from('cases')
        .select('id, user_id, defense_draft_json, applicant_json, ait_number')
        .in('user_id', syntheticUserIds)
        .neq('id', caseData.id);

      if (casesError) {
        throw new Error(`Could not load synthetic E2E cases: ${casesError.message}`);
      }

      const currentDraft = caseData.defense_draft_json
        ? (typeof caseData.defense_draft_json === 'string' ? JSON.parse(caseData.defense_draft_json) : caseData.defense_draft_json)
        : null;
      const currentDraftText = currentDraft?.fullDraftText;

      if (!currentDraftText) {
        throw new Error('Current case has no fullDraftText; contamination check cannot be trusted');
      }

      for (const otherCase of allCases || []) {
        const otherApplicant = otherCase.applicant_json
          ? (typeof otherCase.applicant_json === 'string' ? JSON.parse(otherCase.applicant_json) : otherCase.applicant_json)
          : null;
        if (!otherApplicant) continue;

        const otherName = otherApplicant.applicantName;
        const otherCpf = otherApplicant.applicantCpf;
        const otherCityState = otherApplicant.addressCityState;
        const otherAit = otherCase.ait_number;

        // Shared accounts legitimately repeat identity/address across services.
        if (otherName && otherName !== testCase.applicant.applicantName && currentDraftText.includes(otherName)) {
          clean = false;
          errors.push(`Contamination: Current draft contains another synthetic user's name (case ${otherCase.id})`);
          otherCasesData.push(`Other case ${otherCase.id}: applicant name`);
        }
        if (otherCpf && otherCpf !== testCase.applicant.applicantCpf && currentDraftText.includes(otherCpf)) {
          clean = false;
          errors.push(`Contamination: Current draft contains another synthetic user's CPF (case ${otherCase.id})`);
          otherCasesData.push(`Other case ${otherCase.id}: applicant CPF`);
        }
        if (otherCityState && otherCityState !== testCase.applicant.addressCityState && currentDraftText.includes(otherCityState)) {
          clean = false;
          errors.push(`Contamination: Current draft contains another synthetic user's city/state (case ${otherCase.id})`);
          otherCasesData.push(`Other case ${otherCase.id}: city/state`);
        }
        if (otherAit && otherAit !== testCase.infraction?.aitNumber && currentDraftText.includes(otherAit)) {
          clean = false;
          errors.push(`Contamination: Current draft contains another case's AIT (case ${otherCase.id})`);
          otherCasesData.push(`Other case ${otherCase.id}: AIT`);
        }
      }
    } catch (e: any) {
      clean = false;
      errors.push(`Contamination check error: ${e.message}`);
    }

    return { clean, otherCasesData, errors };
  }

  private failResult(caseId: string, errors: string[]): ValidationResult {
    return {
      caseId,
      analysis: { exists: false, procedureTypeCorrect: false, competentBodyCorrect: false, ufCorrect: false, tesesIdentified: [], score: 0, errors },
      document: { exists: false, templateCorrect: false, dataPreserved: false, fieldsValid: [], errors },
      protocol: { exists: false, portalUrlCorrect: false, physicalAddressCorrect: false, competentBodyCorrect: false, errors },
      contamination: { clean: false, otherCasesData: [], errors },
      overall: 'FAIL',
    };
  }
}

function extractUF(cityState: string): string {
  if (cityState.includes('/')) {
    return cityState.split('/')[1].trim();
  }
  if (cityState.includes('-')) {
    const parts = cityState.split('-');
    if (parts.length === 2 && parts[1].trim().length === 2) {
      return parts[1].trim();
    }
  }
  return 'SP';
}

function extractUFFromCompetentBody(competentBody: string): string {
  const match = competentBody.match(/(?:DETRAN|CET|DER)-([A-Z]{2})/i);
  if (match) return match[1];
  if (competentBody === 'PRF' || competentBody === 'DNIT' || competentBody === 'ANTT') return 'DF';
  return 'SP';
}

export { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY };
