import { InfractionData } from '../../types';
import { InfractionCategory, calculateConsideredSpeed } from '../../core/onboarding/rules-matrix';
import { INFRACTION_CATALOG } from '../../data/knowledge-base';
import { generateRandomAIT, generateRandomCPF, generateRandomCNH, generateRandomName } from '../../utils/test-data-generator';

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

/** Soma dias a uma data ISO sem depender do fuso horário local. */
function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
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
  const occurrenceDate = recentDate();
  const neutral = {
    aitNumber: generateRandomAIT(),
    dateTime: occurrenceDate,
    // Cronologia sintética coerente para testar os três campos visíveis na UI.
    notificationExpeditionDate: addDays(occurrenceDate, 3),
    notificationDeliveryDate: addDays(occurrenceDate, 5),
    defenseDeadline: addDays(occurrenceDate, 25),
    autuadorBody: pick(AUTUADORES_TESTE),
  };

  // Extras tipados como Record para preservar o padrão já usado pelos steps
  // (campo `notes` via espalhamento, mesmo comportamento de compilação atual).
  let extras: Record<string, string> = {};

  switch (category) {
    case 'excesso_velocidade': {
      // O código 745-50 representa excesso de até 20%. Gere uma medição
      // que continue dentro dessa faixa APÓS aplicar a margem do INMETRO.
      const speedLimit = pick([40, 50, 60, 70, 80, 100, 120]);
      const minimumMeasuredSpeed = speedLimit <= 100
        ? speedLimit + (speedLimit >= 100 ? 9 : 8)
        : Math.ceil((speedLimit + 1) / 0.93);
      const maxMeasuredSpeed = Math.floor((speedLimit * 1.2) / 0.93);
      const measuredSpeed = randInt(
        minimumMeasuredSpeed,
        Math.max(minimumMeasuredSpeed, maxMeasuredSpeed),
      );
      const consideredSpeed = calculateConsideredSpeed(measuredSpeed) ?? Math.round(measuredSpeed * 0.93);
      // A prova de sinalização está marcada como presente; o relato sintético
      // não pode contradizer esse booleano.
      extras = { notes: 'placa_ok' };
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
        ? { notes: 'recusa_bafometro | termo_nao_entregue | reteste_nao_oferecido' }
        : { notes: 'teste_positivo | termo_entregue | reteste_oferecido' };
      return {
        ...current,
        ...neutral,
        ...catalogFields(code),
        refusedTest: isRecusa,
        // Os campos binários refletem a mesma situação descrita nas notas
        // e ficam visíveis de forma coerente nos controles da etapa.
        // undefined representa ausência de termo; false é reservado ao caso
        // em que há termo, mas ele não descreve sinais psicomotores.
        hasPsychomotorTerm: isRecusa ? undefined : true,
        offeredRetest: !isRecusa,
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
      // O select controlado representa diretamente apenas estes dois motivos.
      // Não gerar valores que ficam invisíveis no controle após o preenchimento.
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
      // Cada opção corresponde ao mesmo código/artigo do catálogo canônico.
      const circumstance = pick(['passeio_faixa', 'zona_azul_app'] as const);
      const code = circumstance === 'zona_azul_app' ? '554-12' : '545-21';
      extras = { notes: `estacionamento_${circumstance}` };
      return {
        ...current,
        ...neutral,
        ...catalogFields(code),
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
      const currentCatalogItem = current.infractionCode
        ? catalogItemByCode(current.infractionCode)
        : undefined;
      const eligibleWarningItems = INFRACTION_CATALOG.filter(
        (item) => item.severity === 'leve' || item.severity === 'media',
      );
      const existingCode = category === 'conversao_advertencia'
        ? (currentCatalogItem && (currentCatalogItem.severity === 'leve' || currentCatalogItem.severity === 'media')
          ? currentCatalogItem.code
          : pick(eligibleWarningItems).code)
        : currentCatalogItem?.code || pick(INFRACTION_CATALOG).code;
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
  const occurrenceDate = recentDate();
  return {
    ...current,
    aitNumber: generateRandomAIT(),
    dateTime: occurrenceDate,
    notificationExpeditionDate: addDays(occurrenceDate, 3),
    notificationDeliveryDate: addDays(occurrenceDate, 5),
    defenseDeadline: addDays(occurrenceDate, 25),
    autuadorBody: pick(AUTUADORES_TESTE),
  };
}
