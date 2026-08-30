/**
 * @file documents.ts
 * DefesAi — Helper para Validação de Documentos e Marcas-d'Água E2E
 */

import { expect } from '@playwright/test';
import { TestCaseScenario } from '../fixtures/case.factory';
import { DocumentAssemblyEngine } from '../../src/core/documents/document-assembly-engine';
import { mapCaseToAnalysisInput, mapAnalysisToDocumentInput, auditWatermarkIntegrity } from '../../src/lib/mappers/case-mappers';
import { CaseDomain } from '../../src/types';

export function executeDeterministicE2EVerification(scenario: TestCaseScenario) {
  const testCaseDomain: CaseDomain = {
    id: `case_${scenario.scenarioId}`,
    userId: `usr_${scenario.user.index}`,
    clientName: scenario.user.name,
    clientEmail: scenario.user.email,
    clientCpf: scenario.user.cpf,
    title: `Processo ${scenario.serviceKey} (${scenario.user.name})`,
    status: 'analisado',
    currentStage: 1,
    serviceType: scenario.procedureType,
    vehicle: {
      plate: scenario.vehicle.plate,
      brandModel: scenario.vehicle.brandModel,
      renavam: scenario.vehicle.renavam,
    },
    infraction: {
      aitNumber: scenario.infraction.aitNumber,
      infractionCode: scenario.infraction.infractionCode,
      description: scenario.infraction.description,
      ctbArticle: scenario.infraction.ctbArticle,
      severity: scenario.infraction.severity,
      points: scenario.infraction.points,
      fineAmount: scenario.infraction.fineAmount,
      autuadorBody: scenario.infraction.autuadorBody,
      dateTime: new Date().toISOString(),
      location: scenario.infraction.location,
      speedLimit: scenario.infraction.speedLimit,
      measuredSpeed: scenario.infraction.measuredSpeed,
      consideredSpeed: scenario.infraction.consideredSpeed,
      formalFlawsDetected: scenario.infraction.formalFlaws,
    },
    applicant: {
      applicantName: scenario.user.name,
      applicantCpf: scenario.user.cpf,
      applicantRg: scenario.user.rg,
      applicantCnh: scenario.user.cnh,
      cnhCategory: 'B',
      applicantPhone: scenario.user.phone,
      applicantEmail: scenario.user.email,
      addressStreet: scenario.user.address.street,
      addressNumber: scenario.user.address.number,
      addressNeighborhood: scenario.user.address.neighborhood,
      addressZipCode: scenario.user.address.zipCode,
      addressCityState: scenario.user.address.cityState,
      factsNarrative: scenario.factsNarrative,
    },
    timeline: [],
    isPaid: true,
    isAnonymous: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const analysisInput = mapCaseToAnalysisInput(testCaseDomain);
  const docPayload = mapAnalysisToDocumentInput(testCaseDomain, undefined, testCaseDomain.applicant);
  const assembled = DocumentAssemblyEngine.assemble(docPayload);

  // Executa auditoria de marca d'água
  const audit = auditWatermarkIntegrity(scenario.watermark, testCaseDomain, assembled.fullDraftText);

  expect(audit.integrityScorePercent).toBe(100);
  expect(audit.crossContaminationDetected).toBe(false);
  expect(assembled.fullDraftText).toContain(scenario.user.name);
  expect(assembled.fullDraftText).toContain(scenario.user.cpf);
  expect(assembled.fullDraftText).toContain(scenario.vehicle.plate);

  return {
    assembledDraft: assembled,
    audit,
  };
}
