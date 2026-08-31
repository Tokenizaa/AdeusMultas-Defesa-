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
import { buildDocumentRollText, buildDocumentRollTextForAnalysis } from './document-roll';
import { DefenseDraft, InfractionData, ProcedureType, CaseAnalysis } from '../../types';

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
  /**
   * Análise jurídica estruturada (Fase 4): quando presente, a seleção de teses
   * deriva SOMENTE dos vícios detectados pelo motor de regras — nunca de lista
   * livre. Ausente => comportamento legado (procedure.applicableGrounds).
   */
  analysis?: CaseAnalysis;
}

export interface AssemblyValidationResult {
  isValid: boolean;
  unresolvedPlaceholders: string[];
  appliedBlockCount: number;
  appliedArgumentCount: number;
  procedureName: string;
  templateCode: string;
  /** Preenchido quando payload.analysis existe e recomenda procedimento divergente. */
  procedureMismatch?: boolean;
}

export class DocumentAssemblyEngine {
  /**
   * Executes the full deterministic document assembly pipeline (Zero AI Dependency)
   */
  public static assemble(payload: DocumentAssemblyPayload): DefenseDraft & { validation: AssemblyValidationResult } {
    // 1. Resolve Procedure Metadata — FAIL CLOSED: procedimento desconhecido → erro
    const procedure = PROCEDURES_CATALOG.find((p) => p.id === payload.procedureType);
    if (!procedure) {
      throw new Error(`Procedimento não suportado: ${payload.procedureType}`);
    }

    // 2. Resolve Canonical Template — FAIL CLOSED: template ausente → erro
    const template = TEMPLATES_CATALOG.find((t) => t.procedureType === payload.procedureType);
    if (!template) {
      throw new Error(`Template não disponível para procedimento: ${payload.procedureType}`);
    }

    // 3. Resolve Arguments (Preliminaries vs Merits)
    //    Fase 4: análise estruturada comanda a seleção — somente teses cujo vício
    //    foi DETECTADO entram. Sem análise, mantém-se o caminho legado.
    let activeArgIds: string[];
    if (payload.analysis) {
      // Fase 4: análise comanda a seleção; vazia => nenhuma tese (nada inventado).
      activeArgIds = Array.from(new Set(payload.analysis.detectedInconsistencies.map((i) => i.legalArgumentId).filter(Boolean) as string[]));
      // Garantias constitucionais são sempre aplicáveis (devido processo legal).
      const constArg = ARGUMENTS_CATALOG.find((a) => a.id === 'ARG-049');
      if (constArg && !activeArgIds.includes('ARG-049')) {
        activeArgIds.push('ARG-049');
      }
    } else if (payload.selectedArgumentIds && payload.selectedArgumentIds.length > 0) {
      activeArgIds = payload.selectedArgumentIds;
    } else {
      activeArgIds = procedure.applicableGrounds;
    }

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
    if (!payload.infraction.autuadorBody) {
      throw new Error('autuadorBody obrigatório para geração da minuta');
    }
    if (!payload.applicant.cityState) {
      throw new Error('cityState obrigatório para geração da minuta');
    }
    const autuador = payload.infraction.autuadorBody;
    
    // Extract UF from autuadorBody for CETRAN/PSDD templates when cityState lacks UF
    // Format: DETRAN-SP, CET-SP, DER-RJ, PRF, DNIT, etc.
    let ufFromAutuador = '';
    const autuadorMatch = autuador.match(/(?:DETRAN|CET|DER|BHTRANS|SPTRANS|TRANSALVADOR|TRANSPE|TRANSFOR|PMT)-([A-Z]{2})/i);
    if (autuadorMatch) {
      ufFromAutuador = autuadorMatch[1].toUpperCase();
    } else if (['PRF', 'DNIT', 'ANTT', 'IBAMA', 'INFRAERO', 'POLICIA_MILITAR', 'POLICIA_RODOVIARIA'].includes(autuador)) {
      ufFromAutuador = 'BR'; // Federal
    }

    let city = '';
    let uf = '';
    const rawCityState = (payload.applicant.cityState || '').trim();
    if (rawCityState.includes('/')) {
      const parts = rawCityState.split('/');
      city = parts[0]?.trim() || '';
      uf = parts[1]?.trim() || '';
    } else if (rawCityState.includes(' - ')) {
      const parts = rawCityState.split(' - ');
      city = parts[0]?.trim() || '';
      uf = parts[1]?.trim() || '';
    } else if (rawCityState.includes('-') && !rawCityState.includes('–')) {
      // Handle "São Paulo-SP" but not "São Paulo – SP" (en dash)
      const parts = rawCityState.split('-');
      if (parts.length === 2 && parts[1].trim().length === 2) {
        city = parts[0]?.trim() || '';
        uf = parts[1]?.trim() || '';
      } else {
        city = rawCityState;
        uf = ufFromAutuador || '';
      }
    } else if (rawCityState.includes(',')) {
      const parts = rawCityState.split(',');
      city = parts[0]?.trim() || '';
      uf = parts[1]?.trim() || '';
    } else {
      city = rawCityState;
      uf = ufFromAutuador || '';
    }
    
    const dateFormatted = new Date().toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // FAIL CLOSED: dados ausentes → '' (nunca fabricar AIT, artigo, local,
    // velocidade, datas, nº de processo). AIT/ctbArticle/description/date são
    // valorizados apenas com dados reais do payload.
    const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));

    const speedMeasured = payload.speeds?.measured ?? payload.infraction.speedMeasured;
    const speedLimit = payload.speeds?.limit ?? payload.infraction.speedLimit;
    const speedConsidered = payload.speeds?.considered ?? payload.infraction.speedConsidered;

    const aitNumber = payload.infraction.aitNumber || '';
    const ctbArticle = payload.infraction.ctbArticle || '';
    const infractionDesc = payload.infraction.description || '';
    const infractionLocation = payload.infraction.location || '';
    const infractionDate = payload.dates?.infractionDate || payload.infraction.dateTime || '';
    const expeditionDate = payload.dates?.expeditionDate || payload.infraction.notificationExpeditionDate || '';
    const daysElapsed = payload.dates?.daysElapsed;

    const psddNumber = payload.processNumbers?.psddNumber || '';
    const pcddNumber = payload.processNumbers?.pcddNumber || '';
    const suspMonths = payload.processNumbers?.suspensionMonths;

    const variableMap: Record<string, string> = {
      // Standard Variables
      '{{orgao_autuador}}': autuador.toUpperCase(),
      '{{cidade_estado}}': payload.applicant.cityState,
      '{{cidade_requerente}}': city,
      '{{uf_requerente}}': uf,
      '{{nome_requerente}}': payload.applicant.name || '',
      '{{cpf_requerente}}': payload.applicant.cpf || '',
      '{{rg_requerente}}': payload.applicant.rg || '',
      '{{cnh_requerente}}': payload.applicant.cnh || '',
      '{{categoria_cnh}}': payload.applicant.category || '',
      '{{endereco_requerente}}': payload.applicant.address || '',
      '{{veiculo_modelo}}': payload.vehicle.model || '',
      '{{veiculo_placa}}': (payload.vehicle.plate || '').toUpperCase(),
      '{{veiculo_renavam}}': payload.vehicle.renavam || '',
      '{{numero_ait}}': aitNumber,
      '{{data_infracao}}': infractionDate,
      '{{enquadramento_ctb}}': ctbArticle,
      '{{descricao_infracao}}': infractionDesc,
      '{{local_infracao}}': infractionLocation,
      '{{gravidade_infracao}}': str(payload.infraction.severity).toUpperCase(),
      '{{artigo_ctb}}': ctbArticle,
      '{{velocidade_medida}}': str(speedMeasured),
      '{{velocidade_considerada}}': str(speedConsidered),
      '{{velocidade_limite}}': str(speedLimit),
      '{{data_expedicao}}': expeditionDate,
      '{{dias_decorridos}}': str(daysElapsed),
      '{{data_interposicao_recurso}}': payload.dates?.appealFilingDate || '',
      '{{data_atual}}': dateFormatted,
      '{{numero_processo_psdd}}': psddNumber,
      '{{numero_processo_pcdd}}': pcddNumber,
      '{{tempo_suspensao_meses}}': str(suspMonths),
      '{{data_peticao}}': dateFormatted,

      // Nominated Driver (FICI)
      '{{condutor_indicado_nome}}': payload.nominatedDriver?.name || '',
      '{{condutor_indicado_cpf}}': payload.nominatedDriver?.cpf || '',
      '{{condutor_indicado_rg}}': payload.nominatedDriver?.rg || '',
      '{{condutor_indicado_cnh}}': payload.nominatedDriver?.cnh || '',
      '{{condutor_indicado_categoria}}': payload.nominatedDriver?.category || '',
      '{{condutor_indicado_uf}}': payload.nominatedDriver?.uf || '',
      '{{condutor_indicado_endereco}}': payload.nominatedDriver?.address || '',
      '{{condutor_indicado_cidade}}': payload.nominatedDriver?.city || '',

      // Company (PJ)
      '{{nome_empresa}}': payload.company?.name || '',
      '{{cnpj_empresa}}': payload.company?.cnpj || '',
      '{{endereco_empresa}}': payload.company?.address || '',
      '{{cidade_empresa}}': payload.company?.city || city,
      '{{uf_empresa}}': payload.company?.uf || uf,
      '{{nome_representante}}': payload.company?.representativeName || payload.applicant.name,
      '{{cpf_representante}}': payload.company?.representativeCpf || payload.applicant.cpf,

      // Formatted Multi-Argument Blocks
      '{{bloco_preliminares_formatado}}': formattedPreliminaries || 'Inexistem preliminares de nulidade formal arguidas nesta oportunidade.',
      '{{bloco_merito_formatado}}': formattedMerit || 'Demonstrada nos autos a manifesta atipicidade e insubsistência da autuação fiscal.',

      // Direct Shorthand Aliases (User Request Phase 4.1)
      '{{nome}}': payload.applicant.name || '',
      '{{placa}}': (payload.vehicle.plate || '').toUpperCase(),
      '{{auto_infracao}}': aitNumber,
      '{{orgao}}': autuador.toUpperCase(),
      '{{cpf}}': payload.applicant.cpf || '',
      '{{cnh}}': payload.applicant.cnh || '',
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

      // ROL DE DOCUMENTOS dinâmico (BLK-068): derivado dos documentos
      // OBRIGATÓRIOS do procedimento + evidências das teses detectadas quando
      // há análise (Fase 8). Nunca inventa evidência: só do catálogo canônico.
      if (block.id === 'BLK-068') {
        content = payload.analysis && payload.analysis.detectedInconsistencies.length > 0
          ? buildDocumentRollTextForAnalysis(
              payload.procedureType,
              payload.analysis.detectedInconsistencies.map((i) => i.legalArgumentId).filter(Boolean) as string[],
              aitNumber
            )
          : buildDocumentRollText(payload.procedureType, aitNumber);
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
      procedureMismatch:
        payload.analysis && payload.analysis.recommendedProcedure !== payload.procedureType
          ? true
          : undefined,
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
