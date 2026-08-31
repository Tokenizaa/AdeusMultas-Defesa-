import { InfractionData } from '../../types';
import { InfractionCategory, calculateConsideredSpeed } from '../../core/onboarding/rules-matrix';
import { INFRACTION_CATALOG } from '../../data/knowledge-base';
import { generateRandomAIT } from '../../utils/test-data-generator';

/**
 * testFillData — dados de teste 🧪 COERENTES com a categoria de infração selecionada.
 *
 * Problema resolvido (FIX 3): o gerador genérico `generateRandomInfractionData`
 * sempre produz campos de velocidade + um item ALEATÓRIO do catálogo. Ao ser
 * espalhado (`...base`) dentro dos steps, contaminava qualquer categoria
 * (ex.: Lei Seca recebia "mau estado de conservação"; Sinal Vermelho recebia velocidades).
 *
 * Contrato desta função:
 *  - Aleatoriedade nos VALORES, coerência na ESTRUTURA;
 *  - Campos específicos só aparecem na categoria que os utiliza;
 *  - Categorias não-velocidade NUNCA carregam speedLimit/measuredSpeed/
 *    consideredSpeed/inmetroAferitionDate;
 *  - description/severity/points/fineAmount vêm SEMPRE do MESMO item do
 *    catálogo do infractionCode escolhido (nunca mistura entre itens);
 *  - Campos neutros (AIT, data, órgão, local) são sempre regenerados.
 */

const AUTUADORES_TESTE = ['DETRAN-SP', 'DETRAN-RJ', 'DETRAN-MG', 'PRF', 'CET-SP'] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Data recente (1–60 dias atrás) no formato YYYY-MM-DD. */
function recentDate(): string {
  const daysAgo = randInt(1, 60);
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
}

function catalogItemByCode(code: string) {
  return INFRACTION_CATALOG.find((item) => item.code === code);
}

/** Campos canônicos de um item do catálogo (mesma fonte para todos os campos derivados). */
function catalogFields(code: string): Partial<InfractionData> {
  const item = catalogItemByCode(code);
  if (!item) return {};
  return {
    infractionCode: item.code,
    description: item.description,
    ctbArticle: item.article,
    severity: item.severity,
    points: item.points,
    fineAmount: item.fineAmount,
  };
}

export function buildCoherentTestInfraction(
  category: InfractionCategory,
  current: InfractionData,
): InfractionData {
  // Base neutra: identificadores e metadados sempre válidos, independentes da categoria.
  const neutral = {
    aitNumber: generateRandomAIT(),
    dateTime: recentDate(),
    autuadorBody: pick(AUTUADORES_TESTE),
  };

  // Extras tipados como Record para preservar o padrão já usado pelos steps
  // (campo `notes` via espalhamento, mesmo comportamento de compilação atual).
  let extras: Record<string, string> = {};

  switch (category) {
    case 'excesso_velocidade': {
      const speedLimit = pick([40, 50, 60, 70, 80, 100, 120]);
      const measuredSpeed = speedLimit + randInt(5, 35);
      const consideredSpeed = calculateConsideredSpeed(measuredSpeed) ?? measuredSpeed - 7;
      extras = {
        notes: Math.random() > 0.5 ? 'placa_ok' : 'sem_placa_visivel_art90',
      };
      return {
        ...current,
        ...neutral,
        ...catalogFields('745-50'),
        speedLimit,
        measuredSpeed,
        consideredSpeed,
        inmetroAferitionDate: recentDate(),
        ...extras,
      };
    }

    case 'lei_seca': {
      const isRecusa = Math.random() > 0.5;
      const code = isRecusa ? '516-91' : '516-92';
      extras = isRecusa
        ? { notes: 'recusa_bafometro | termo_sem_sinais | reteste_nao_oferecido' }
        : { notes: 'teste_positivo | termo_entregue | reteste_oferecido' };
      return {
        ...current,
        ...neutral,
        ...catalogFields(code),
        hasPsychomotorTerm: false, // Dispara ARG-025 se termo ausente/sem sinais
        // Coerência: Lei Seca não possui medição de velocidade.
        speedLimit: undefined,
        measuredSpeed: undefined,
        consideredSpeed: undefined,
        speedMeasured: undefined,
        speedConsidered: undefined,
        inmetroAferitionDate: undefined,
        ...extras,
      };
    }

    case 'celular': {
      const circunstancias = ['suporte_gps', 'veiculo_parado_semaforo', 'sem_abordagem', 'viva_voz'];
      const chosen = pick(circunstancias);
      extras = { notes: `celular_${chosen}` };
      return {
        ...current,
        ...neutral,
        ...catalogFields('736-62'),
        hasAgentDetailedObservations: chosen === 'sem_abordagem' ? false : undefined,
        speedLimit: undefined,
        measuredSpeed: undefined,
        consideredSpeed: undefined,
        speedMeasured: undefined,
        speedConsidered: undefined,
        inmetroAferitionDate: undefined,
        ...extras,
      };
    }

    case 'vermelho': {
      const motivos = ['amarelo_rapido', 'emergencia', 'noturno_seguranca', 'cruzamento_travado'];
      extras = { notes: `vermelho_${pick(motivos)}` };
      return {
        ...current,
        ...neutral,
        ...catalogFields('605-01'),
        speedLimit: undefined,
        measuredSpeed: undefined,
        consideredSpeed: undefined,
        speedMeasured: undefined,
        speedConsidered: undefined,
        inmetroAferitionDate: undefined,
        ...extras,
      };
    }

    case 'estacionamento': {
      const tipos = ['embarque_rapido', 'sinalizacao_apagada', 'pane_mecanica', 'zona_azul_app'];
      extras = { notes: `estacionamento_${pick(tipos)}` };
      return {
        ...current,
        ...neutral,
        ...catalogFields('545-21'),
        speedLimit: undefined,
        measuredSpeed: undefined,
        consideredSpeed: undefined,
        speedMeasured: undefined,
        speedConsidered: undefined,
        inmetroAferitionDate: undefined,
        ...extras,
      };
    }

    default: {
      // conversao_advertencia | indicacao_condutor | cnh_geral | outro:
      // campos mínimos válidos, sem contradizer a seleção humana.
      // Se já existe código escolhido, mantém o conjunto canônico DELE;
      // caso contrário, sorteia um item do catálogo coerente (todos os
      // campos derivados do MESMO item) — nunca inventa estrutura alheia.
      const existingCode = current.infractionCode && catalogItemByCode(current.infractionCode)
        ? current.infractionCode
        : pick(INFRACTION_CATALOG).code;
      return {
        ...current,
        ...neutral,
        ...catalogFields(existingCode),
        speedLimit: undefined,
        measuredSpeed: undefined,
        consideredSpeed: undefined,
        speedMeasured: undefined,
        speedConsidered: undefined,
        inmetroAferitionDate: undefined,
      };
    }
  }
}

/**
 * Variante "neutra" para o passo de Identificação quando a categoria ainda
 * não é conhecida: preenche SOMENTE campos neutros e jamais sobrescreve a
 * seleção humana de infração (código/artigo/descrição) nem velocidades.
 */
export function buildNeutralTestIdentification(current: InfractionData): InfractionData {
  return {
    ...current,
    aitNumber: generateRandomAIT(),
    dateTime: recentDate(),
    autuadorBody: pick(AUTUADORES_TESTE),
  };
}
