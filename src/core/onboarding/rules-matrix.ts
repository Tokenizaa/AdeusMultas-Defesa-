/**
 * @file rules-matrix.ts
 * Matriz de Regras e Definições de Campos por Serviço, Infração e Fase Processual.
 * 
 * Fonte da Verdade para o Onboarding Dinâmico do DefesAi.
 * Garante que:
 * 1. Nenhum dado seja solicitado duas vezes (Fase Gratuita vs. Fase Paga).
 * 2. Somente campos pertinentes ao tipo de infração sejam exibidos.
 * 3. O usuário responda perguntas em linguagem humana e acessível.
 */

import { ProcedureType, InfractionSeverity } from '../../types';

export type UserSituation = 
  | 'multa_transito'
  | 'suspensao_cnh'
  | 'cassacao_cnh'
  | 'indicacao_condutor'
  | 'conversao_advertencia';

export type UserProcessStage =
  | 'primeira_notificacao'       // Notificação de Autuação (Defesa Prévia)
  | 'notificacao_penalidade'     // Notificação de Imposição de Penalidade (Recurso JARI)
  | 'defesa_negada'              // Recurso indeferido na fase preliminar
  | 'recurso_jari_negado'        // Recurso indeferido na JARI (Recurso CETRAN)
  | 'conversao_advertencia'      // Pedido direto de advertência por escrito
  | 'nao_tenho_certeza';         // Inferido pelo sistema

export type InfractionCategory =
  | 'excesso_velocidade'
  | 'lei_seca'
  | 'celular'
  | 'vermelho'
  | 'estacionamento'
  | 'indicacao_condutor'
  | 'conversao_advertencia'
  | 'cnh_geral'
  | 'outro';

export interface ServiceDefinition {
  id: UserSituation;
  title: string;
  subtitle: string;
  badge: string;
  mappedProcedure: ProcedureType;
  inferredStage?: UserProcessStage;
  defaultInfractionCategory?: InfractionCategory;
}

export const USER_SITUATIONS: ServiceDefinition[] = [
  {
    id: 'multa_transito',
    title: 'Multa de Trânsito',
    subtitle: 'Radar, celular ao volante, sinal vermelho, estacionamento, rodízio ou infrações gerais.',
    badge: 'Análise Gratuita',
    mappedProcedure: 'recurso_jari',
  },
  {
    id: 'conversao_advertencia',
    title: 'Conversão em Advertência (0 Reais de Multa)',
    subtitle: 'Art. 267 do CTB (Lei 14.071/20). Isenção total de pagamento e 0 pontos na CNH para infrações leves ou médias.',
    badge: '100% Isenção',
    mappedProcedure: 'conversao_advertencia',
    inferredStage: 'conversao_advertencia',
    defaultInfractionCategory: 'conversao_advertencia',
  },
  {
    id: 'indicacao_condutor',
    title: 'Indicação de Real Condutor',
    subtitle: 'Transferência legal da pontuação para o motorista que estava dirigindo o veículo no momento da infração.',
    badge: 'Art. 257 § 7º',
    mappedProcedure: 'indicacao_condutor',
    inferredStage: 'primeira_notificacao',
    defaultInfractionCategory: 'indicacao_condutor',
  },
  {
    id: 'suspensao_cnh',
    title: 'Suspensão da CNH / Lei Seca',
    subtitle: 'Processo de suspensão por bafômetro (Art. 165/165-A), excesso de velocidade acima de 50% ou acúmulo de pontos.',
    badge: 'Proteção CNH',
    mappedProcedure: 'suspensao_cnh',
  },
  {
    id: 'cassacao_cnh',
    title: 'Cassação da CNH (PCDD)',
    subtitle: 'Defesa contra processo de cancelamento do direito de dirigir por conduzir com CNH suspensa ou reincidência.',
    badge: 'Instância Crítica',
    mappedProcedure: 'cassacao_cnh',
  },
];

export interface StageDefinition {
  id: UserProcessStage;
  title: string;
  subtitle: string;
  badge: string;
  mappedProcedure: ProcedureType;
}

export const USER_PROCESS_STAGES: StageDefinition[] = [
  {
    id: 'primeira_notificacao',
    title: 'Recebi a primeira notificação (Sem boleto)',
    subtitle: 'Notificação de Autuação (NA). Prazo aberto para Defesa Prévia antes da aplicação de penalidade.',
    badge: 'Fase Inicial • Defesa Prévia',
    mappedProcedure: 'defesa_previa',
    // NOTA ARQUITETURAL: 'primeira_notificacao' (Notificação de Autuação, fase NA)
    // mapeia para 'defesa_previa' (Art. 281 CTB) — fase DISTINTA do Recurso JARI
    // (Art. 285 CTB, contra a NIP). O template TPL_DEFESA_PREVIA não usa epígrafe
    // de "Recurso Ordinário". Ver ADR / rules-matrix para a separação conceitual.
  },
  {
    id: 'notificacao_penalidade',
    title: 'Recebi a penalidade (Com código de barras / boleto)',
    subtitle: 'Notificação de Imposição de Penalidade (NIP). Recurso cabível perante a JARI em 1ª instância.',
    badge: '1ª Instância • JARI',
    mappedProcedure: 'recurso_jari',
  },
  {
    id: 'defesa_negada',
    title: 'Minha Defesa Prévia foi indeferida',
    subtitle: 'O órgão manteve o auto e agora é necessário interpor recurso formal à JARI com efeito suspensivo.',
    badge: 'Efeito Suspensivo • JARI',
    mappedProcedure: 'recurso_jari',
  },
  {
    id: 'recurso_jari_negado',
    title: 'Já recorri à JARI e foi negado',
    subtitle: 'Recurso de 2ª instância perante o Conselho Estadual de Trânsito (CETRAN) ou CONTRAN.',
    badge: '2ª Instância Final • CETRAN',
    mappedProcedure: 'recurso_cetran',
  },
  {
    id: 'conversao_advertencia',
    title: 'Quero converter em Advertência por Escrito',
    subtitle: 'Direito subjetivo para condutores sem reincidência no último ano (Art. 267 CTB).',
    badge: 'Art. 267 CTB',
    mappedProcedure: 'conversao_advertencia',
  },
  {
    id: 'nao_tenho_certeza',
    title: 'Não tenho certeza da fase',
    subtitle: 'Vamos identificar a melhor estratégia jurídica pelo número do auto e pelo órgão autuador.',
    badge: 'Diagnóstico Automático',
    mappedProcedure: 'recurso_jari',
  },
];

/**
 * Matriz de Campos Requeridos por Etapa
 */
export interface RulesMatrixEntry {
  situation: UserSituation;
  infractionCategory: InfractionCategory;
  processStage: UserProcessStage;
  // Campos obrigatórios na etapa preliminar gratuita (Fase 1)
  requiredFreeFields: string[];
  // Campos opcionais na etapa preliminar gratuita
  optionalFreeFields: string[];
  // Campos que o backend infere automaticamente se omitidos
  inferableFields: string[];
  // Campos exclusivos da etapa de geração/qualificação paga (Fase 2)
  requiredDocumentFields: string[];
}

export const RULES_MATRIX: Record<InfractionCategory, Partial<RulesMatrixEntry>> = {
  excesso_velocidade: {
    requiredFreeFields: ['aitNumber', 'autuadorBody', 'plate', 'speedLimit', 'measuredSpeed', 'location', 'dateTime', 'notificationExpeditionDate', 'defenseDeadline'],
    optionalFreeFields: ['inmetroAferitionDate', 'radarEquipmentId', 'hasR19SignageProof'],
    inferableFields: ['consideredSpeed', 'ctbArticle', 'infractionCode', 'severity', 'points', 'fineAmount'],
    requiredDocumentFields: ['applicantName', 'applicantCpf', 'applicantCnh', 'cnhCategory', 'applicantEmail', 'applicantPhone', 'addressStreet', 'addressNumber', 'addressNeighborhood', 'addressZipCode', 'addressCityState'],
  },
  lei_seca: {
    requiredFreeFields: ['aitNumber', 'autuadorBody', 'plate', 'location', 'dateTime', 'notificationExpeditionDate', 'defenseDeadline'],
    optionalFreeFields: ['hasSignTerm', 'offeredRetest', 'refusedTest'],
    inferableFields: ['ctbArticle', 'infractionCode', 'severity', 'points', 'fineAmount'],
    requiredDocumentFields: ['applicantName', 'applicantCpf', 'applicantCnh', 'cnhCategory', 'applicantEmail', 'applicantPhone', 'addressStreet', 'addressNumber', 'addressNeighborhood', 'addressZipCode', 'addressCityState'],
  },
  celular: {
    requiredFreeFields: ['aitNumber', 'autuadorBody', 'plate', 'location', 'dateTime', 'notificationExpeditionDate', 'defenseDeadline'],
    optionalFreeFields: ['wasInHolder', 'hadPhysicalApproach', 'description'],
    inferableFields: ['ctbArticle', 'infractionCode', 'severity', 'points', 'fineAmount'],
    requiredDocumentFields: ['applicantName', 'applicantCpf', 'applicantCnh', 'cnhCategory', 'applicantEmail', 'applicantPhone', 'addressStreet', 'addressNumber', 'addressNeighborhood', 'addressZipCode', 'addressCityState'],
  },
  vermelho: {
    requiredFreeFields: ['aitNumber', 'autuadorBody', 'plate', 'location', 'dateTime', 'notificationExpeditionDate', 'defenseDeadline'],
    optionalFreeFields: ['yellowDurationIssue', 'emergencyPassage', 'description'],
    inferableFields: ['ctbArticle', 'infractionCode', 'severity', 'points', 'fineAmount'],
    requiredDocumentFields: ['applicantName', 'applicantCpf', 'applicantCnh', 'cnhCategory', 'applicantEmail', 'applicantPhone', 'addressStreet', 'addressNumber', 'addressNeighborhood', 'addressZipCode', 'addressCityState'],
  },
  estacionamento: {
    requiredFreeFields: ['aitNumber', 'autuadorBody', 'plate', 'location', 'dateTime', 'notificationExpeditionDate', 'defenseDeadline'],
    optionalFreeFields: ['parkingCircumstance', 'hasRegulatorySign', 'description'],
    inferableFields: ['ctbArticle', 'infractionCode', 'severity', 'points', 'fineAmount'],
    requiredDocumentFields: ['applicantName', 'applicantCpf', 'applicantCnh', 'cnhCategory', 'applicantEmail', 'applicantPhone', 'addressStreet', 'addressNumber', 'addressNeighborhood', 'addressZipCode', 'addressCityState'],
  },
  indicacao_condutor: {
    requiredFreeFields: ['aitNumber', 'autuadorBody', 'plate', 'location', 'dateTime', 'notificationExpeditionDate', 'defenseDeadline'],
    optionalFreeFields: ['realDriverName', 'realDriverCpf', 'realDriverCnh'],
    inferableFields: ['ctbArticle', 'infractionCode'],
    requiredDocumentFields: ['applicantName', 'applicantCpf', 'applicantCnh', 'cnhCategory', 'applicantEmail', 'applicantPhone', 'addressStreet', 'addressNumber', 'addressNeighborhood', 'addressZipCode', 'addressCityState'],
  },
  conversao_advertencia: {
    requiredFreeFields: ['aitNumber', 'autuadorBody', 'plate', 'location', 'dateTime', 'notificationExpeditionDate', 'defenseDeadline'],
    optionalFreeFields: ['hasPreviousInfractionsLast12Months'],
    inferableFields: ['ctbArticle', 'infractionCode', 'fineAmount'],
    requiredDocumentFields: ['applicantName', 'applicantCpf', 'applicantCnh', 'cnhCategory', 'applicantEmail', 'applicantPhone', 'addressStreet', 'addressNumber', 'addressNeighborhood', 'addressZipCode', 'addressCityState'],
  },
  cnh_geral: {
    requiredFreeFields: ['aitNumber', 'autuadorBody', 'plate', 'location', 'dateTime', 'notificationExpeditionDate', 'defenseDeadline'],
    optionalFreeFields: ['description'],
    inferableFields: ['ctbArticle', 'infractionCode', 'severity', 'points', 'fineAmount'],
    requiredDocumentFields: ['applicantName', 'applicantCpf', 'applicantCnh', 'cnhCategory', 'applicantEmail', 'applicantPhone', 'addressStreet', 'addressNumber', 'addressNeighborhood', 'addressZipCode', 'addressCityState'],
  },
  outro: {
    requiredFreeFields: ['aitNumber', 'autuadorBody', 'plate', 'location', 'dateTime', 'notificationExpeditionDate', 'defenseDeadline'],
    optionalFreeFields: ['description', 'infractionCode'],
    inferableFields: ['ctbArticle', 'severity', 'points', 'fineAmount'],
    requiredDocumentFields: ['applicantName', 'applicantCpf', 'applicantCnh', 'cnhCategory', 'applicantEmail', 'applicantPhone', 'addressStreet', 'addressNumber', 'addressNeighborhood', 'addressZipCode', 'addressCityState'],
  },
};

/**
 * Calcula a velocidade considerada segundo a Tabela I da Resolução CONTRAN nº 798/2020.
 * Para medição até 100 km/h: desconta 7 km/h.
 * Para medição acima de 100 km/h: desconta 7%.
 */
export function calculateConsideredSpeed(measuredSpeed: number): number {
  if (!measuredSpeed || measuredSpeed <= 0) return 0;
  if (measuredSpeed <= 107) {
    return Math.max(0, measuredSpeed - 7);
  }
  return Math.round(measuredSpeed * 0.93);
}
