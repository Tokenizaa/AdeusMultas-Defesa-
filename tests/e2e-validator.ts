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
    const { data: caseData, error } = await this.supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (error || !caseData) {
      return this.failResult(caseId, [`Case not found in database: ${error?.message}`]);
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
        const expectedUF = extractUF(testCase.applicant.addressCityState);
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
          { pattern: 'DETRAN-SP', field: 'autuadorBody (SP fallback)' },
          { pattern: 'São Paulo/SP', field: 'cityState (SP fallback)' },
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
        errors.push('No protocol_info_json found in case');
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
      // Fetch all cases from this test run
      const { data: allCases } = await this.supabase
        .from('cases')
        .select('id, defense_draft_json, applicant_json, infraction_json')
        .eq('test_run_id', testCase.testRunId) // Note: need to add test_run_id column or use metadata
        .neq('id', caseData.id);

      if (allCases && allCases.length > 0) {
        const currentDraft = caseData.defense_draft_json 
          ? (typeof caseData.defense_draft_json === 'string' ? JSON.parse(caseData.defense_draft_json) : caseData.defense_draft_json)
          : null;

        if (currentDraft?.fullDraftText) {
          for (const otherCase of allCases) {
            const otherDraft = otherCase.defense_draft_json
              ? (typeof otherCase.defense_draft_json === 'string' ? JSON.parse(otherCase.defense_draft_json) : otherCase.defense_draft_json)
              : null;

            if (otherDraft?.fullDraftText) {
              // Check if current draft contains data from other case
              const otherApplicant = otherCase.applicant_json
                ? (typeof otherCase.applicant_json === 'string' ? JSON.parse(otherCase.applicant_json) : otherCase.applicant_json)
                : null;

              if (otherApplicant) {
                const otherName = otherApplicant.applicantName;
                const otherCpf = otherApplicant.applicantCpf;
                const otherCityState = otherApplicant.addressCityState;

                if (currentDraft.fullDraftText.includes(otherName) && otherName !== testCase.applicant.applicantName) {
                  clean = false;
                  errors.push(`Contamination: Current draft contains other case's name: ${otherName}`);
                  otherCasesData.push(`Other case ${otherCase.id}: name=${otherName}`);
                }
                if (currentDraft.fullDraftText.includes(otherCpf) && otherCpf !== testCase.applicant.applicantCpf) {
                  clean = false;
                  errors.push(`Contamination: Current draft contains other case's CPF: ${otherCpf}`);
                  otherCasesData.push(`Other case ${otherCase.id}: cpf=${otherCpf}`);
                }
                if (currentDraft.fullDraftText.includes(otherCityState) && otherCityState !== testCase.applicant.addressCityState) {
                  clean = false;
                  errors.push(`Contamination: Current draft contains other case's cityState: ${otherCityState}`);
                  otherCasesData.push(`Other case ${otherCase.id}: cityState=${otherCityState}`);
                }
              }
            }
          }
        }
      }
    } catch (e: any) {
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