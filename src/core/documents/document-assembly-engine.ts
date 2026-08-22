/**
 * @file document-assembly-engine.ts
 * DefesaAI — Deterministic Document Assembly Engine (Fase 4.3 & Fase 8)
 * 100% AI-Independent Multi-Stage Legal Document Generation Pipeline.
 *
 * Flow:
 * Procedure Type + Infraction Data + Applicant/Vehicle Info
 *   -> Select Template (7 Supported Procedures)
 *   -> Evaluate & Select Blocks (from 65+ DOCUMENT_BLOCKS library)
 *   -> Resolve Arguments (from 52+ ARGUMENTS_CATALOG)
 *   -> Interpolate All Standardized Placeholders ({{nome}}, {{placa}}, etc.)
 *   -> Format Sections & Legal Requests
 *   -> Output Ready-to-Print / PDF Legal Petition
 */

import { TEMPLATES_CATALOG } from '../templates/templates-catalog';
import { DOCUMENT_BLOCKS, DocumentBlockModel } from '../templates/document-blocks';
import { ARGUMENTS_CATALOG } from '../arguments/arguments-catalog';
import { PROCEDURES_CATALOG } from '../procedures/procedures-catalog';
import { DefenseDraft, InfractionData, ProcedureType } from '../../types';

export interface DocumentAssemblyPayload {
  caseId: string;
  procedureType: ProcedureType;
  infraction: InfractionData;
  vehicle: {
    plate: string;
    model: string;
    renavam?: string;
  };
  applicant: {
    name: string;
    cpf: string;
    rg?: string;
    cnh: string;
    category?: string;
    address: string;
    cityState: string;
  };
  nominatedDriver?: {
    name: string;
    cpf: string;
    rg?: string;
    cnh: string;
    category?: string;
    uf?: string;
    address?: string;
    city?: string;
  };
  company?: {
    name: string;
    cnpj: string;
    address: string;
    city: string;
    uf: string;
    representativeName: string;
    representativeCpf: string;
  };
  dates?: {
    infractionDate?: string;
    expeditionDate?: string;
    notificationDate?: string;
    appealFilingDate?: string;
    daysElapsed?: number;
  };
  speeds?: {
    measured?: number;
    considered?: number;
    limit?: number;
  };
  processNumbers?: {
    psddNumber?: string;
    pcddNumber?: string;
    suspensionMonths?: number;
  };
  selectedBlockIds?: string[];
  selectedArgumentIds?: string[];
  customFacts?: string;
}

export interface AssemblyValidationResult {
  isValid: boolean;
  unresolvedPlaceholders: string[];
  appliedBlockCount: number;
  appliedArgumentCount: number;
  procedureName: string;
  templateCode: string;
}

export class DocumentAssemblyEngine {
  /**
   * Executes the full deterministic document assembly pipeline (Zero AI Dependency)
   */
  public static assemble(payload: DocumentAssemblyPayload): DefenseDraft & { validation: AssemblyValidationResult } {
    // 1. Resolve Procedure Metadata
    const procedure =
      PROCEDURES_CATALOG.find((p) => p.id === payload.procedureType) ||
      PROCEDURES_CATALOG[0];

    // 2. Resolve Canonical Template
    const template =
      TEMPLATES_CATALOG.find((t) => t.procedureType === payload.procedureType) ||
      TEMPLATES_CATALOG[0];

    // 3. Resolve Arguments (Preliminaries vs Merits)
    const activeArgIds =
      payload.selectedArgumentIds && payload.selectedArgumentIds.length > 0
        ? payload.selectedArgumentIds
        : procedure.applicableGrounds;

    const matchedArguments = ARGUMENTS_CATALOG.filter((a) => activeArgIds.includes(a.id));
    const preliminaryArgs = matchedArguments.filter(
      (a) => a.category === 'preliminar' || a.category === 'formal'
    );
    const meritArgs = matchedArguments.filter(
      (a) => a.category === 'merito' || a.category === 'constitucional'
    );

    // 4. Format Structured Legal Argument Sections
    const formattedPreliminaries = preliminaryArgs
      .map((a, idx) => {
        const body = a.formattedParagraphs.map((p) => `${p.heading}\n\n${p.text}`).join('\n\n');
        return `II.${idx + 1} - ${a.title.toUpperCase()}\n\n${body}`;
      })
      .join('\n\n------------------------------------------------------------\n\n');

    const formattedMerit = meritArgs
      .map((a, idx) => {
        const body = a.formattedParagraphs.map((p) => `${p.heading}\n\n${p.text}`).join('\n\n');
        return `III.${idx + 1} - ${a.title.toUpperCase()}\n\n${body}`;
      })
      .join('\n\n------------------------------------------------------------\n\n');

    // 5. Build Comprehensive Interpolation Dictionary (All standard & shorthand placeholders)
    const autuador = payload.infraction.autuadorBody || 'DETRAN / JARI';
    const cityStateParts = (payload.applicant.cityState || 'São Paulo/SP').split('/');
    const city = cityStateParts[0]?.trim() || 'São Paulo';
    const uf = cityStateParts[1]?.trim() || 'SP';
    const dateFormatted = new Date().toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const speedMeasured = payload.speeds?.measured ?? (payload.infraction.speedMeasured || 78);
    const speedLimit = payload.speeds?.limit ?? (payload.infraction.speedLimit || 60);
    const speedConsidered = payload.speeds?.considered ?? (payload.infraction.speedConsidered || 71);

    const aitNumber = payload.infraction.aitNumber || 'AIT-1234567';
    const ctbArticle = payload.infraction.ctbArticle || 'Art. 218, I do CTB';
    const infractionDesc = payload.infraction.description || 'Transitar em velocidade superior à máxima permitida em até 20%';
    const infractionLocation = payload.infraction.location || 'Av. Principal, nº 1000 - Centro';
    const infractionDate = payload.dates?.infractionDate || payload.infraction.dateTime || '10/02/2026';
    const expeditionDate = payload.dates?.expeditionDate || '25/02/2026';
    const daysElapsed = payload.dates?.daysElapsed || 42;

    const psddNumber = payload.processNumbers?.psddNumber || `PSDD-${aitNumber.replace(/\D/g, '') || '883921'}/2026`;
    const pcddNumber = payload.processNumbers?.pcddNumber || `PCDD-${aitNumber.replace(/\D/g, '') || '994102'}/2026`;
    const suspMonths = payload.processNumbers?.suspensionMonths || 6;

    const variableMap: Record<string, string> = {
      // Standard Variables
      '{{orgao_autuador}}': autuador.toUpperCase(),
      '{{cidade_estado}}': payload.applicant.cityState || 'São Paulo/SP',
      '{{cidade_requerente}}': city,
      '{{uf_requerente}}': uf,
      '{{nome_requerente}}': payload.applicant.name || 'NOME DO REQUERENTE',
      '{{cpf_requerente}}': payload.applicant.cpf || '000.000.000-00',
      '{{rg_requerente}}': payload.applicant.rg || '00.000.000-0',
      '{{cnh_requerente}}': payload.applicant.cnh || '00000000000',
      '{{categoria_cnh}}': payload.applicant.category || 'B',
      '{{endereco_requerente}}': payload.applicant.address || 'Rua das Flores, 123',
      '{{veiculo_modelo}}': payload.vehicle.model || 'Veículo Automotor',
      '{{veiculo_placa}}': (payload.vehicle.plate || 'ABC-1234').toUpperCase(),
      '{{veiculo_renavam}}': payload.vehicle.renavam || '00000000000',
      '{{numero_ait}}': aitNumber,
      '{{data_infracao}}': infractionDate,
      '{{enquadramento_ctb}}': ctbArticle,
      '{{descricao_infracao}}': infractionDesc,
      '{{local_infracao}}': infractionLocation,
      '{{gravidade_infracao}}': (payload.infraction.severity || 'média').toUpperCase(),
      '{{artigo_ctb}}': ctbArticle,
      '{{velocidade_medida}}': `${speedMeasured}`,
      '{{velocidade_considerada}}': `${speedConsidered}`,
      '{{velocidade_limite}}': `${speedLimit}`,
      '{{data_expedicao}}': expeditionDate,
      '{{dias_decorridos}}': `${daysElapsed}`,
      '{{data_interposicao_recurso}}': payload.dates?.appealFilingDate || '01/03/2026',
      '{{data_atual}}': dateFormatted,
      '{{numero_processo_psdd}}': psddNumber,
      '{{numero_processo_pcdd}}': pcddNumber,
      '{{tempo_suspensao_meses}}': `${suspMonths}`,
      '{{data_peticao}}': dateFormatted,

      // Nominated Driver (FICI)
      '{{condutor_indicado_nome}}': payload.nominatedDriver?.name || 'NOME DO CONDUTOR INFRATOR',
      '{{condutor_indicado_cpf}}': payload.nominatedDriver?.cpf || '111.222.333-44',
      '{{condutor_indicado_rg}}': payload.nominatedDriver?.rg || '11.222.333-4',
      '{{condutor_indicado_cnh}}': payload.nominatedDriver?.cnh || '11223344556',
      '{{condutor_indicado_categoria}}': payload.nominatedDriver?.category || 'B',
      '{{condutor_indicado_uf}}': payload.nominatedDriver?.uf || uf,
      '{{condutor_indicado_endereco}}': payload.nominatedDriver?.address || 'Av. dos Estados, 456',
      '{{condutor_indicado_cidade}}': payload.nominatedDriver?.city || city,

      // Company (PJ)
      '{{nome_empresa}}': payload.company?.name || 'EMPRESA LTDA',
      '{{cnpj_empresa}}': payload.company?.cnpj || '00.000.000/0001-00',
      '{{endereco_empresa}}': payload.company?.address || 'Av. Empresarial, 100',
      '{{cidade_empresa}}': payload.company?.city || city,
      '{{uf_empresa}}': payload.company?.uf || uf,
      '{{nome_representante}}': payload.company?.representativeName || payload.applicant.name,
      '{{cpf_representante}}': payload.company?.representativeCpf || payload.applicant.cpf,

      // Formatted Multi-Argument Blocks
      '{{bloco_preliminares_formatado}}': formattedPreliminaries || 'Inexistem preliminares de nulidade formal arguidas nesta oportunidade.',
      '{{bloco_merito_formatado}}': formattedMerit || 'Demonstrada nos autos a manifesta atipicidade e insubsistência da autuação fiscal.',

      // Direct Shorthand Aliases (User Request Phase 4.1)
      '{{nome}}': payload.applicant.name || 'REQUERENTE',
      '{{placa}}': (payload.vehicle.plate || 'ABC-1234').toUpperCase(),
      '{{auto_infracao}}': aitNumber,
      '{{orgao}}': autuador.toUpperCase(),
      '{{cpf}}': payload.applicant.cpf || '000.000.000-00',
      '{{cnh}}': payload.applicant.cnh || '00000000000',
      '{{fundamentacao}}': formattedMerit || 'Fundamentação técnica e legal pautada no Código de Trânsito Brasileiro.',
      '{{argumentos}}': `${formattedPreliminaries ? `${formattedPreliminaries}\n\n` : ''}${formattedMerit}`,
      '{{pedido}}': 'Requer o acolhimento da defesa, reconhecimento da insubsistência e cancelamento definitivo do Auto de Infração de Trânsito.',
    };

    // 6. Select Blocks: Use custom selected blocks or template default blocks
    let blocksToAssemble: { id: string; title: string; contentTemplate: string }[] = [];

    if (payload.selectedBlockIds && payload.selectedBlockIds.length > 0) {
      blocksToAssemble = payload.selectedBlockIds
        .map((bId) => DOCUMENT_BLOCKS.find((b) => b.id === bId))
        .filter((b): b is DocumentBlockModel => !!b);
    } else {
      blocksToAssemble = template.blocks;
    }

    // 7. Interpolate Placeholders Across All Blocks
    const assembledBlockTexts: string[] = [];
    const unresolvedSet = new Set<string>();

    for (const block of blocksToAssemble) {
      let content = block.contentTemplate;

      // Handle custom fact override if present
      if (block.id.includes('FATOS') && payload.customFacts && payload.customFacts.trim().length > 15) {
        content = `I - DOS FATOS\n\n${payload.customFacts.trim()}`;
      }

      for (const [placeholder, value] of Object.entries(variableMap)) {
        content = content.replaceAll(placeholder, value);
      }

      // Check for any remaining unmatched {{placeholders}}
      const leftoverMatches = content.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g);
      if (leftoverMatches) {
        leftoverMatches.forEach((m) => unresolvedSet.add(m));
      }

      assembledBlockTexts.push(content);
    }

    const fullDraftText = assembledBlockTexts.join('\n\n\n');

    // 8. Construct Output DefenseDraft Domain Model
    const resultDraft: DefenseDraft = {
      id: `dft_${Date.now()}`,
      caseId: payload.caseId,
      procedureType: payload.procedureType,
      authorityAddressing: `ILUSTRÍSSIMO SENHOR DIRETOR DA AUTORIDADE DE TRÂNSITO DO(A) ${autuador.toUpperCase()}`,
      applicantName: payload.applicant.name,
      applicantCpf: payload.applicant.cpf,
      applicantRg: payload.applicant.rg,
      applicantCnh: payload.applicant.cnh,
      applicantAddress: payload.applicant.address,
      applicantCityState: payload.applicant.cityState,
      vehiclePlate: payload.vehicle.plate,
      vehicleModel: payload.vehicle.model,
      vehicleRenavam: payload.vehicle.renavam || '',
      aitNumber: aitNumber,
      factsNarrative: payload.customFacts || `O Requerente tomou ciência do AIT nº ${aitNumber} referente à suposta infração do ${ctbArticle}. A autuação padece de vícios insanáveis de legalidade.`,
      selectedArgumentIds: activeArgIds,
      preliminaryArgumentsText: formattedPreliminaries,
      meritArgumentsText: formattedMerit,
      legalRequestsText: `Requer o recebimento tempestivo, o acolhimento das preliminares, o arquivamento definitivo do AIT nº ${aitNumber} e o efeito suspensivo.`,
      closingPlaceDate: `${payload.applicant.cityState}, ${dateFormatted}`,
      fullDraftText,
      isReady: true,
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    const validation: AssemblyValidationResult = {
      isValid: unresolvedSet.size === 0,
      unresolvedPlaceholders: Array.from(unresolvedSet),
      appliedBlockCount: blocksToAssemble.length,
      appliedArgumentCount: matchedArguments.length,
      procedureName: procedure.name,
      templateCode: template.code,
    };

    return {
      ...resultDraft,
      validation,
    };
  }

  /**
   * Returns list of all available document blocks
   */
  public static getAllBlocks(): DocumentBlockModel[] {
    return DOCUMENT_BLOCKS;
  }

  /**
   * Returns blocks recommended for a specific procedure type
   */
  public static getBlocksForProcedure(procedureType: ProcedureType): DocumentBlockModel[] {
    return DOCUMENT_BLOCKS.filter(
      (b) => !b.recommendedProcedures || b.recommendedProcedures.includes(procedureType)
    );
  }

  /**
   * Returns all available templates
   */
  public static getAllTemplates() {
    return TEMPLATES_CATALOG;
  }

  /**
   * Returns all available legal arguments
   */
  public static getAllArguments() {
    return ARGUMENTS_CATALOG;
  }
}
