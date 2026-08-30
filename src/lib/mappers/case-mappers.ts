/**
 * @file case-mappers.ts
 * DefesAi — Explicit and Deterministic Single Source of Truth Case Mappers
 * 
 * Provides explicit, deterministic mappings between Onboarding, CaseDomain,
 * Rule Engine Analysis Inputs, and Document Assembly Payloads.
 * Completely replaces all implicit or loose object spreadings.
 */

import {
  CaseDomain,
  CaseAnalysis,
  CaseApplicantData,
  InfractionData,
  VehicleData,
  ProcedureType,
  LegalArgumentDomain,
  CaseDocumentData
} from '../../types';
import { DocumentAssemblyPayload } from '../../core/documents/document-assembly-engine';
import { PROCEDURES_CATALOG } from '../../core/procedures/procedures-catalog';

export interface AnalysisEngineInput {
  caseId: string;
  procedureType: ProcedureType;
  infraction: InfractionData;
  vehicle: VehicleData;
  clientName: string;
  clientCpf?: string;
  applicant?: CaseApplicantData;
  userUf: string;
  userCity: string;
  extractedText?: string;
  formalFlaws: string[];
}

export interface WatermarkAuditResult {
  watermarkId: string;
  matchedFields: {
    field: string;
    expectedValue: string;
    foundInDocument: boolean;
    foundInPdfPayload: boolean;
  }[];
  totalFields: number;
  matchedCount: number;
  integrityScorePercent: number;
  crossContaminationDetected: boolean;
  foreignDataDetected: string[];
}

/**
 * 1. Mapeia CaseDomain de forma explícita e determinística para a entrada do Motor de Regras e IA.
 */
export function mapCaseToAnalysisInput(caseDomain: CaseDomain): AnalysisEngineInput {
  const autuador = caseDomain.infraction?.autuadorBody?.trim() || 'DETRAN';
  const location = caseDomain.infraction?.location || '';
  
  // Extrai UF de forma determinística
  let detectedUf = 'SP';
  const ufMatch = location.match(/\b([A-Z]{2})\b/) || autuador.match(/-([A-Z]{2})/);
  if (ufMatch && ufMatch[1]) {
    detectedUf = ufMatch[1];
  } else if (caseDomain.applicant?.addressCityState) {
    const cityStateMatch = caseDomain.applicant.addressCityState.match(/-?\s*([A-Z]{2})/i);
    if (cityStateMatch && cityStateMatch[1]) {
      detectedUf = cityStateMatch[1].toUpperCase();
    }
  }

  // Extrai Cidade
  let detectedCity = 'São Paulo';
  if (caseDomain.applicant?.addressCityState) {
    const cityPart = caseDomain.applicant.addressCityState.split(/[-/]/)[0].trim();
    if (cityPart) detectedCity = cityPart;
  } else if (location.includes('-')) {
    detectedCity = location.split('-')[0].trim();
  }

  return {
    caseId: caseDomain.id,
    procedureType: caseDomain.serviceType || 'recurso_jari',
    infraction: {
      aitNumber: caseDomain.infraction?.aitNumber || 'SEM-AIT',
      infractionCode: caseDomain.infraction?.infractionCode || caseDomain.infraction?.code || '745-50',
      description: caseDomain.infraction?.description || 'Infração de Trânsito',
      ctbArticle: caseDomain.infraction?.ctbArticle || 'Art. 218 do CTB',
      severity: caseDomain.infraction?.severity || 'media',
      points: caseDomain.infraction?.points ?? 4,
      fineAmount: caseDomain.infraction?.fineAmount ?? 130.16,
      autuadorBody: autuador,
      dateTime: caseDomain.infraction?.dateTime || new Date().toISOString(),
      location: location || `${detectedCity} - ${detectedUf}`,
      speedLimit: caseDomain.infraction?.speedLimit,
      measuredSpeed: caseDomain.infraction?.measuredSpeed ?? caseDomain.infraction?.speedMeasured,
      consideredSpeed: caseDomain.infraction?.consideredSpeed ?? caseDomain.infraction?.speedConsidered,
      formalFlawsDetected: Array.isArray(caseDomain.infraction?.formalFlawsDetected)
        ? [...caseDomain.infraction.formalFlawsDetected]
        : [],
    },
    vehicle: {
      plate: caseDomain.vehicle?.plate?.toUpperCase().trim() || 'ABC-1234',
      brandModel: caseDomain.vehicle?.brandModel?.trim() || 'Veículo Automotor',
      renavam: caseDomain.vehicle?.renavam?.trim(),
      chassis: caseDomain.vehicle?.chassis?.trim(),
      year: caseDomain.vehicle?.year,
      color: caseDomain.vehicle?.color,
    },
    clientName: caseDomain.clientName || caseDomain.applicant?.applicantName || 'Condutor Requerente',
    clientCpf: caseDomain.clientCpf || caseDomain.applicant?.applicantCpf,
    applicant: caseDomain.applicant ? { ...caseDomain.applicant } : undefined,
    userUf: detectedUf,
    userCity: detectedCity,
    extractedText: caseDomain.ocrAuxiliaryData?.extractedText,
    formalFlaws: Array.isArray(caseDomain.infraction?.formalFlawsDetected)
      ? [...caseDomain.infraction.formalFlawsDetected]
      : [],
  };
}

/**
 * 2. Mapeia explicitamente o CaseDomain e o Diagnóstico para o Payload do DocumentAssemblyEngine
 */
export function mapAnalysisToDocumentInput(
  caseDomain: CaseDomain,
  analysis?: CaseAnalysis,
  applicantOverride?: CaseApplicantData | CaseDocumentData
): DocumentAssemblyPayload {
  const applicantSource = applicantOverride || caseDomain.applicant;

  const qualifiedApplicant = {
    name: applicantSource?.applicantName || caseDomain.clientName || 'Condutor Requerente',
    cpf: applicantSource?.applicantCpf || caseDomain.clientCpf || '000.000.000-00',
    rg: applicantSource?.applicantRg || '',
    cnh: applicantSource?.applicantCnh || '00000000000',
    category: applicantSource?.cnhCategory || 'B',
    address: applicantSource?.addressStreet
      ? `${applicantSource.addressStreet}, ${applicantSource.addressNumber || 'S/N'}${applicantSource.addressNeighborhood ? ` - ${applicantSource.addressNeighborhood}` : ''}`
      : 'Endereço não informado',
    cityState: applicantSource?.addressCityState || 'São Paulo - SP',
  };

  const selectedArgs = analysis?.recommendedArguments?.length
    ? analysis.recommendedArguments.map((arg) => arg.id || arg.code)
    : ['ARG-001'];

  const dates = {
    infractionDate: caseDomain.infraction?.dateTime?.split('T')[0] || caseDomain.infraction?.dateTime,
    notificationDate: caseDomain.infraction?.notificationExpeditionDate,
    appealFilingDate: new Date().toLocaleDateString('pt-BR'),
  };

  const speeds = {
    limit: caseDomain.infraction?.speedLimit,
    measured: caseDomain.infraction?.measuredSpeed ?? caseDomain.infraction?.speedMeasured,
    considered: caseDomain.infraction?.consideredSpeed ?? caseDomain.infraction?.speedConsidered,
  };

  return {
    caseId: caseDomain.id,
    procedureType: caseDomain.serviceType || analysis?.recommendedProcedure || 'recurso_jari',
    infraction: {
      aitNumber: caseDomain.infraction?.aitNumber || 'SEM-AIT',
      description: caseDomain.infraction?.description || 'Infração de Trânsito',
      ctbArticle: caseDomain.infraction?.ctbArticle || 'Art. 218 do CTB',
      severity: caseDomain.infraction?.severity || 'media',
      points: caseDomain.infraction?.points ?? 4,
      fineAmount: caseDomain.infraction?.fineAmount ?? 130.16,
      autuadorBody: caseDomain.infraction?.autuadorBody || 'DETRAN-SP',
      dateTime: caseDomain.infraction?.dateTime || new Date().toISOString(),
      location: caseDomain.infraction?.location || 'Local da infração',
      speedLimit: speeds.limit,
      measuredSpeed: speeds.measured,
      consideredSpeed: speeds.considered,
      formalFlawsDetected: caseDomain.infraction?.formalFlawsDetected || [],
    },
    vehicle: {
      plate: caseDomain.vehicle?.plate?.toUpperCase().trim() || 'ABC-1234',
      model: caseDomain.vehicle?.brandModel?.trim() || 'Veículo Automotor',
      renavam: caseDomain.vehicle?.renavam || applicantSource?.vehicleRenavam,
    },
    applicant: qualifiedApplicant,
    dates,
    speeds,
    selectedArgumentIds: selectedArgs,
    customFacts: applicantSource?.factsNarrative,
  };
}

/**
 * 3. Valida se os dados da marca-d'água de teste constam com 100% de integridade na peça jurídica final.
 */
export function auditWatermarkIntegrity(
  watermarkKey: string,
  sourceCase: CaseDomain,
  documentText: string,
  foreignCases: CaseDomain[] = []
): WatermarkAuditResult {
  const fieldsToCheck = [
    { field: 'Nome do Requerente', expectedValue: sourceCase.applicant?.applicantName || sourceCase.clientName },
    { field: 'CPF do Requerente', expectedValue: sourceCase.applicant?.applicantCpf || sourceCase.clientCpf },
    { field: 'CNH do Requerente', expectedValue: sourceCase.applicant?.applicantCnh },
    { field: 'Placa do Veículo', expectedValue: sourceCase.vehicle?.plate },
    { field: 'Modelo do Veículo', expectedValue: sourceCase.vehicle?.brandModel },
    { field: 'Número do Auto (AIT)', expectedValue: sourceCase.infraction?.aitNumber },
    { field: 'Órgão Autuador', expectedValue: sourceCase.infraction?.autuadorBody },
    { field: 'Artigo do CTB', expectedValue: sourceCase.infraction?.ctbArticle },
    { field: 'Marca-d’água Específica', expectedValue: watermarkKey },
  ].filter((f): f is { field: string; expectedValue: string } => Boolean(f.expectedValue && f.expectedValue.trim().length > 0));

  const matchedFields = fieldsToCheck.map((f) => {
    const cleanExpected = f.expectedValue.trim().toLowerCase();
    const cleanDoc = (documentText || '').toLowerCase();
    const foundInDoc = cleanDoc.includes(cleanExpected);
    return {
      field: f.field,
      expectedValue: f.expectedValue,
      foundInDocument: foundInDoc,
      foundInPdfPayload: foundInDoc,
    };
  });

  const matchedCount = matchedFields.filter((f) => f.foundInDocument).length;
  const totalFields = matchedFields.length;
  const integrityScorePercent = totalFields > 0 ? Math.round((matchedCount / totalFields) * 100) : 100;

  // Verificação de isolamento: dados de outros usuários NÃO devem constar no documento
  const foreignDataDetected: string[] = [];
  for (const foreign of foreignCases) {
    if (foreign.id === sourceCase.id) continue;
    if (foreign.clientName && foreign.clientName !== sourceCase.clientName && documentText.includes(foreign.clientName)) {
      foreignDataDetected.push(`Nome do caso estranho: ${foreign.clientName}`);
    }
    if (foreign.clientCpf && foreign.clientCpf !== sourceCase.clientCpf && documentText.includes(foreign.clientCpf)) {
      foreignDataDetected.push(`CPF do caso estranho: ${foreign.clientCpf}`);
    }
    if (foreign.vehicle?.plate && foreign.vehicle.plate !== sourceCase.vehicle?.plate && documentText.includes(foreign.vehicle.plate)) {
      foreignDataDetected.push(`Placa de outro caso: ${foreign.vehicle.plate}`);
    }
  }

  return {
    watermarkId: watermarkKey,
    matchedFields,
    totalFields,
    matchedCount,
    integrityScorePercent,
    crossContaminationDetected: foreignDataDetected.length > 0,
    foreignDataDetected,
  };
}
