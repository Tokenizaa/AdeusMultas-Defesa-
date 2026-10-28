import { InfractionData, VehicleData } from '../../types';
import { InfractionCategory, calculateConsideredSpeed } from '../../core/onboarding/rules-matrix';
import { INFRACTION_CATALOG } from '../../data/knowledge-base';
import { generateRandomAIT, generateRandomCPF, generateRandomCNH, generateRandomName, generateRandomPhone, generateRandomVehicleData, generateRandomAddress } from '../../utils/test-data-generator';

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
        radarEquipmentId: 'TEST-RADAR-001',
        hasR19SignageProof: true,
        hasPhotoProof: true,
        ...extras,
      };
    }

    case 'lei_seca': {
      const isRecusa = Math.random() > 0.5;
      const code = isRecusa ? '757-90' : '516-91';
      extras = isRecusa
        ? { notes: 'recusa_bafometro | termo_sem_sinais | reteste_nao_oferecido' }
        : { notes: 'teste_positivo | termo_entregue | reteste_oferecido' };
      return {
        ...current,
        ...neutral,
        ...catalogFields(code),
        hasPsychomotorTerm: false, // Dispara ARG-025 se termo ausente/sem sinais
        offeredRetest: false,
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
        cellphoneCircumstance: chosen,
        hasAgentDetailedObservations: chosen === 'sem_abordagem' ? false : true,
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
      const chosen = pick(motivos);
      extras = { notes: `vermelho_${chosen}` };
      return {
        ...current,
        ...neutral,
        ...catalogFields('605-01'),
        yellowPhaseCrossing: chosen === 'amarelo_rapido',
        emergencyPassage: chosen === 'emergencia',
        hasPhotoProof: true,
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
      // O select não é controlado; use sua opção inicial para manter UI e estado coerentes.
      extras = { notes: 'estacionamento_embarque_rapido' };
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

    case 'indicacao_condutor': {
      return {
        ...current,
        ...neutral,
        ...catalogFields(current.infractionCode && catalogItemByCode(current.infractionCode) ? current.infractionCode : '745-50'),
        realDriverName: generateRandomName().toUpperCase(),
        realDriverCpf: generateRandomCPF().replace(/\D/g, ''),
        realDriverCnh: generateRandomCNH(),
        indicationWithinDeadline: true,
        speedLimit: undefined,
        measuredSpeed: undefined,
        consideredSpeed: undefined,
        speedMeasured: undefined,
        speedConsidered: undefined,
        inmetroAferitionDate: undefined,
      };
    }

    default: {
      // conversao_advertencia | cnh_geral | outro:
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
        ...(category === 'conversao_advertencia' ? { hasPreviousInfractionsLast12Months: false } : {}),
        notes: current.notes || 'Relato sintético gerado para validar o preenchimento automático.',
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


/**
 * Fixture completo para o formulário de identificação do onboarding.
 * Centraliza o preenchimento de todos os campos visíveis/obrigatórios para
 * que o botão administrativo e os testes usem exatamente o mesmo contrato.
 */
export interface CompleteTestIdentificationFixture {
  leadName: string;
  leadPhone: string;
  vehicleData: VehicleData;
  infractionData: InfractionData;
}

export function buildCompleteTestIdentificationFixture(
  category: InfractionCategory | undefined,
  currentInfraction: InfractionData,
): CompleteTestIdentificationFixture {
  const leadName = generateRandomName();
  const leadPhone = generateRandomPhone();
  const vehicleData = generateRandomVehicleData();

  // Sem categoria, usa o catálogo genérico para nunca deixar o código vazio.
  const baseInfraction = buildCoherentTestInfraction(category ?? 'outro', currentInfraction);
  const address = generateRandomAddress();
  const occurrenceDate = /^\d{4}-\d{2}-\d{2}$/.test(baseInfraction.dateTime ?? '')
    ? baseInfraction.dateTime!
    : new Date().toISOString().slice(0, 10);
  const addTestDays = (days: number) => {
    const date = new Date(`${occurrenceDate}T12:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const infractionData: InfractionData = {
    ...baseInfraction,
    aitNumber: baseInfraction.aitNumber?.trim() || generateRandomAIT(),
    infractionCode: baseInfraction.infractionCode?.trim() || catalogFields('745-50').infractionCode || '745-50',
    autuadorBody: baseInfraction.autuadorBody?.trim() || 'DETRAN-SP',
    dateTime: occurrenceDate,
    notificationExpeditionDate: addTestDays(3),
    notificationDeliveryDate: addTestDays(5),
    defenseDeadline: addTestDays(25),
    location: `${address.street}, ${address.number} - ${address.neighborhood}, ${address.cityState}`,
  };

  // Keep article, description, severity, points and amount aligned with the
  // selected code, even if the incoming state held stale data from another category.
  const canonicalFields = catalogFields(infractionData.infractionCode);
  Object.assign(infractionData, canonicalFields);

  return { leadName, leadPhone, vehicleData, infractionData };
}
