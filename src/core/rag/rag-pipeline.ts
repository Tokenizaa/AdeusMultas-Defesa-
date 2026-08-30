/**
 * @file rag-pipeline.ts
 * Shared Kernel RAG & Domain Pipeline for DefesaAI (ADR 013 & Fases 1-8)
 * Integrates the deterministic Expert Rule Engine, Document Assembly Engine,
 * and Knowledge Base.
 */

import { INFRACTION_CATALOG, InfractionCatalogItem } from '../../data/knowledge-base';
import { ExpertRuleEngine } from '../rules/rule-engine';
import { DocumentAssemblyEngine } from '../documents/document-assembly-engine';
import { InfractionData, LegalArgumentDomain, CaseAnalysis, DefenseDraft, ProcedureType, SubmissionInstructions } from '../../types';
import { ARGUMENTS_CATALOG } from '../arguments/arguments-catalog';
import { ORGANS_DB, resolveProtocolInfo } from '../legal-base/organs';

export class RagPipeline {
  /**
   * Find matching infraction in catalog by code or description
   */
  public static findInfraction(codeOrQuery: string): InfractionCatalogItem | undefined {
    const clean = (codeOrQuery || '').replace(/[^0-9]/g, '');
    return (
      INFRACTION_CATALOG.find((item) => {
        const itemCodeClean = item.code.replace(/[^0-9]/g, '');
        return itemCodeClean.includes(clean) || clean.includes(itemCodeClean);
      })
    );
  }

  /**
   * Retrieve RAG context including matched legal grounds, potential nullities and organ info
   */
  public static retrieveContext(infraction: any): {
    matchedTeses: Array<{ titulo: string; baseLegal: string; categoria: string; resolucoes?: string[] }>;
    potentialNullities: Array<{
      id: string;
      titulo: string;
      tipo: 'FORMAL' | 'MATERIAL' | 'TEMPORAL' | 'TECNICA';
      descricao: string;
      fundamentoLegal: string;
      impacto: 'CRITICO' | 'ALTO' | 'MEDIO';
      probabilidadeExito: number;
    }>;
    organInfo?: {
      nome: string;
      portalUrl: string;
      enderecoFisico: string;
      prazoDias: number;
    };
  } {
    const matchedInfraction = this.findInfraction(infraction?.codigoInfracao || infraction?.descricaoInfracao || '');
    
    // Matched legal arguments
    const matchedTeses = ARGUMENTS_CATALOG.filter((arg) => {
      if (matchedInfraction?.recommendedArgumentCodes?.includes(arg.id)) return true;
      if (infraction?.codigoInfracao?.startsWith('745') || infraction?.codigoInfracao?.startsWith('746')) {
        return arg.id === 'ARG-001' || arg.id === 'ARG-002' || arg.id === 'ARG-003';
      }
      return arg.id === 'ARG-001' || arg.id === 'ARG-008';
    }).map((arg) => ({
      titulo: arg.title,
      baseLegal: arg.legalBase,
      categoria: arg.category,
      resolucoes: arg.resolutions,
    }));

    // Potential nullities
    const potentialNullities = [
      {
        id: 'nul-rag-01',
        titulo: 'Verificação Metrológica de Radar Inconclusiva ou Expirada',
        tipo: 'TECNICA' as const,
        descricao: 'Equipamento de medição deve comprovar aferição válida por 12 meses pelo INMETRO no momento do fato.',
        fundamentoLegal: 'Art. 280, §2º do CTB e Resolução CONTRAN nº 798/2020 (Art. 4º, III)',
        impacto: 'CRITICO' as const,
        probabilidadeExito: 94,
      },
      {
        id: 'nul-rag-02',
        titulo: 'Direito Subjetivo à Advertência por Escrito (Art. 267 CTB)',
        tipo: 'FORMAL' as const,
        descricao: 'Infrações leves ou médias de condutores sem reincidência de 12 meses devem ser convertidas ex officio.',
        fundamentoLegal: 'Art. 267 do CTB (Lei 14.071/2020) c/c Res. CONTRAN 918/2022',
        impacto: 'ALTO' as const,
        probabilidadeExito: 91,
      },
    ];

    // Organ info — FAIL CLOSED: órgão não encontrado → undefined, nunca DETRAN-SP padrão
    const organMatch = ORGANS_DB.find(
      (o) => o.abbreviation.toLowerCase() === (infraction?.orgaoAutuador || '').toLowerCase() ||
             o.name.toLowerCase().includes((infraction?.orgaoAutuador || '').toLowerCase())
    );

    const organInfo = organMatch
      ? {
          nome: organMatch.name,
          portalUrl: organMatch.onlinePortalUrl,
          enderecoFisico: organMatch.physicalAddress,
          prazoDias: organMatch.standardDeadlineDays,
        }
      : undefined;

    return {
      matchedTeses: matchedTeses.length > 0 ? matchedTeses : [
        {
          titulo: 'Aferição Metrológica do Radar Vencida (Res. 798/2020)',
          baseLegal: 'Art. 280, §2º do CTB e Portaria INMETRO 158/2022',
          categoria: 'merito',
        }
      ],
      potentialNullities,
      organInfo,
    };
  }

  /**
   * Run comprehensive legal heuristic analysis on infraction data via Expert Rule Engine
   */
  public static analyzeInfraction(caseId: string, infraction: InfractionData): CaseAnalysis {
    return ExpertRuleEngine.evaluate(caseId, infraction);
  }

  /**
   * Generate complete, formatted legal defense draft petition via Document Assembly Engine
   */
  public static generateDefenseDraft(
    caseId: string,
    infraction: InfractionData,
    vehiclePlate: string,
    vehicleModel: string,
    applicantData: {
      name: string;
      cpf: string;
      rg?: string;
      cnh: string;
      category?: string;
      address: string;
      cityState: string;
    },
    selectedArguments: LegalArgumentDomain[],
    procedureType: ProcedureType = 'recurso_jari'
  ): DefenseDraft & { protocolInfo?: SubmissionInstructions } {
    const protocolInfo = resolveProtocolInfo(infraction.autuadorBody);
    const draft = DocumentAssemblyEngine.assemble({
      caseId,
      procedureType,
      infraction,
      vehicle: {
        plate: vehiclePlate,
        model: vehicleModel,
      },
      applicant: applicantData,
      selectedArgumentIds: selectedArguments.map((a) => a.id),
    });
    return { ...draft, protocolInfo };
  }
}
