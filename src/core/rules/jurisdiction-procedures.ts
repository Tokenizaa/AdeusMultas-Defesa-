/**
 * @file jurisdiction-procedures.ts
 * DefesaAI — Mapeamento de Procedimentos por Jurisdição, Família e Instância
 *
 * Implementa Decisão 3 ADR-019: Procedimento derivado por (UF × Infração × Instância)
 *
 * Substitui o default universal CANONICAL_PROCEDURE_BY_FAMILY por mapeamento
 * preciso considerando:
 * - UF da jurisdição (jurisdiction_uf do Case)
 * - Família da infração (excesso_velocidade, alcoolemia, etc.)
 * - Instância processual (1ª = JARI, 2ª = CETRAN/CONTRANDIFE, administrativa = defesa_previa)
 *
 * Princípio: fail-closed. Combinação desconhecida ⇒ default seguro (recurso_jari para 1ª instância).
 */

import { InfractionFamily } from './infraction-classifier';
import { ProcedureType } from '../../types';

export type ProcessInstance = 'primeira' | 'segunda' | 'administrativa' | 'suspensao' | 'cassacao';

/**
 * Mapeamento canônico: (UF × Família × Instância) → ProcedureType
 * Baseado na legislação de trânsito de cada UF e competência dos órgãos.
 *
 * Estrutura: jurisdiction_uf → family → instance → ProcedureType
 *
 * Obs: 'BR_FEDERAL' = órgãos federais (PRF, DNIT, ANTT, CONTRANDIFE)
 *      'SP', 'RJ', etc. = DETRANs/CETRANs estaduais
 */
export const JURISDICTION_PROCEDURE_MAP: Record<string, Partial<Record<InfractionFamily, Partial<Record<ProcessInstance, ProcedureType>>>>> = {
  // Órgãos federais
  'BR_FEDERAL': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran', // CONTRANDIFE
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
    semaforo: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    celular: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    estacionamento: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
  },

  // São Paulo
  'SP': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
    semaforo: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    celular: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    estacionamento: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
  },

  // Rio de Janeiro
  'RJ': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Minas Gerais
  'MG': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Rio Grande do Sul
  'RS': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Paraná
  // Santa Catarina
  'SC': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Bahia
  'BA': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Goiás
  'GO': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Pernambuco
  'PE': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Ceará
  'CE': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Paraná
  'PR': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Pará
  'PA': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Paraíba
  'PB': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Piauí
  'PI': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Sergipe
  'SE': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Acre
  'AC': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Rondônia
  'RO': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Roraima
  'RR': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Amapá
  'AP': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Amazonas
  'AM': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Tocantins
  'TO': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Mato Grosso do Sul
  'MS': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Mato Grosso
  'MT': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Distrito Federal
  'DF': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Alagoas
  'AL': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },

  // Espírito Santo
  'ES': {
    excesso_velocidade: {
      primeira: 'recurso_jari',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
    },
    alcoolemia: {
      primeira: 'defesa_previa',
      segunda: 'recurso_cetran',
      administrativa: 'defesa_previa',
      suspensao: 'suspensao_cnh',
    },
  },
};

/**
 * Default fallback por família (quando UF não mapeada ou instância não prevista).
 * Mantém comportamento seguro baseado na família.
 */
export const DEFAULT_PROCEDURE_BY_FAMILY: Record<InfractionFamily, Partial<Record<ProcessInstance, ProcedureType>>> = {
  excesso_velocidade: {
    primeira: 'recurso_jari',
    segunda: 'recurso_cetran',
    administrativa: 'defesa_previa',
    suspensao: 'suspensao_cnh',
    cassacao: 'cassacao_cnh',
  },
  alcoolemia: {
    primeira: 'defesa_previa',
    segunda: 'recurso_cetran',
    administrativa: 'defesa_previa',
    suspensao: 'suspensao_cnh',
    cassacao: 'cassacao_cnh',
  },
  semaforo: {
    primeira: 'recurso_jari',
    segunda: 'recurso_cetran',
    administrativa: 'defesa_previa',
  },
  celular: {
    primeira: 'recurso_jari',
    segunda: 'recurso_cetran',
    administrativa: 'defesa_previa',
  },
  estacionamento: {
    primeira: 'recurso_jari',
    segunda: 'recurso_cetran',
    administrativa: 'defesa_previa',
  },
  cinto: {
    primeira: 'recurso_jari',
    segunda: 'recurso_cetran',
    administrativa: 'defesa_previa',
  },
  documentos: {
    primeira: 'recurso_jari',
    segunda: 'recurso_cetran',
    administrativa: 'defesa_previa',
  },
  circulacao: {
    primeira: 'recurso_jari',
    segunda: 'recurso_cetran',
    administrativa: 'defesa_previa',
  },
  capacidade: {
    primeira: 'recurso_jari',
    segunda: 'recurso_cetran',
    administrativa: 'defesa_previa',
  },
  lotacao: {
    primeira: 'recurso_jari',
    segunda: 'recurso_cetran',
    administrativa: 'defesa_previa',
  },
  desconhecida: {
    primeira: 'recurso_jari',
    segunda: 'recurso_cetran',
    administrativa: 'defesa_previa',
  },
};

/**
 * Determina o procedimento correto baseado na jurisdição, família e instância.
 *
 * @param jurisdictionUf - UF da jurisdição (ex: 'SP', 'RJ', 'BR_FEDERAL')
 * @param family - Família jurídica da infração
 * @param instance - Instância processual
 * @returns ProcedureType - Procedimento administrativo correto
 *
 * Fail-closed: retorna default seguro se combinação não mapeada.
 */
export function deriveProcedureByJurisdiction(
  jurisdictionUf: string | null | undefined,
  family: InfractionFamily,
  instance: ProcessInstance
): ProcedureType {
  if (!jurisdictionUf) {
    return DEFAULT_PROCEDURE_BY_FAMILY[family]?.[instance] ?? 'recurso_jari';
  }

  const ufMap = JURISDICTION_PROCEDURE_MAP[jurisdictionUf.toUpperCase()];
  if (!ufMap) {
    return DEFAULT_PROCEDURE_BY_FAMILY[family]?.[instance] ?? 'recurso_jari';
  }

  const familyMap = ufMap[family];
  if (!familyMap) {
    return DEFAULT_PROCEDURE_BY_FAMILY[family]?.[instance] ?? 'recurso_jari';
  }

  const procedure = familyMap[instance];
  if (!procedure) {
    return DEFAULT_PROCEDURE_BY_FAMILY[family]?.[instance] ?? 'recurso_jari';
  }

  return procedure;
}

/**
 * Inferi a instância processual baseada no contexto do caso.
 *
 * @param caseData - Dados do caso (pode conter stage, status, procedimentos anteriores)
 * @returns ProcessInstance inferida
 */
export function inferProcessInstance(caseData: {
  currentStage?: number;
  status?: string;
  previousProcedures?: string[];
  serviceType?: string;
}): ProcessInstance {
  // Se já há procedimentos anteriores, assumir 2ª instância
  if (caseData.previousProcedures && caseData.previousProcedures.length > 0) {
    return 'segunda';
  }

  // Se serviceType indica suspensão/cassação
  if (caseData.serviceType?.includes('suspensao') || caseData.serviceType?.includes('suspensao_cnh')) {
    return 'suspensao';
  }
  if (caseData.serviceType?.includes('cassacao') || caseData.serviceType?.includes('cassacao_cnh')) {
    return 'cassacao';
  }

  // Default: 1ª instância (defesa prévia ou recurso JARI)
  // Se stage > 1, pode ser recurso (2ª instância)
  if (caseData.currentStage && caseData.currentStage >= 2) {
    return 'segunda';
  }

  return 'primeira';
}

export type { ProcessInstance as ProcessInstanceType };
