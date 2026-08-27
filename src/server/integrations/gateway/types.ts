/**
 * @file gateway/types.ts
 * Payment Gateway Abstraction Layer — Tipos e Interfaces
 *
 * Contrato comum que todos os gateways (PagBank, GGPIXAPI, etc.) devem
 * implementar. O restante do sistema (Checkout, rotas, repositório, UI)
 * opera exclusivamente contra esses tipos, sem conhecer o provedor real.
 *
 * REGRA: Cada pagamento registra qual gateway o criou. Trocar o gateway
 * ativo NÃO migra pagamentos existentes — novos pagamentos usam o novo
 * gateway; antigos continuam sendo tratados pelo adapter original.
 */

// ============================================================================
// Identificadores de Gateway
// ============================================================================

/** Identificador único de um gateway de pagamento suportado. */
export type GatewayId = 'pagbank' | 'ggpixapi';

/** Status do gateway na configuração administrativa. */
export type GatewayStatus = 'configured' | 'not_configured';

// ============================================================================
// Entrada (Input) — O que o Checkout envia ao gateway
// ============================================================================

/** Dados do pagador, comuns a todos os gateways. */
export interface GatewayPayerInput {
  name: string;
  email?: string;
  document: string; // CPF ou CNPJ (somente números)
  phone?: string;
}

/** Entrada para criação de cobrança PIX. */
export interface GatewayCreatePixInput {
  caseId: string;
  referenceId?: string;
  payer: GatewayPayerInput;
  amountInCents: number; // Sempre em centavos
  description: string;
  /** URL de callback para webhook. O gateway resolve internamente. */
  webhookUrl?: string;
}

/** Entrada para criação de pagamento com cartão de crédito (PagBank-specific por enquanto). */
export interface GatewayCreateCreditCardInput {
  caseId: string;
  referenceId?: string;
  payer: GatewayPayerInput;
  amountInCents: number;
  description: string;
  cardToken: string;
  installments?: number;
  authenticationMethod?: 'CHALLENGE' | 'FRICTIONLESS';
  softDescriptor?: string;
  webhookUrl?: string;
}

// ============================================================================
// Saída (Output) — O que o gateway retorna ao Checkout
// ============================================================================

/** Status normalizado de uma transação (independente do gateway). */
export type GatewayPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'DECLINED'
  | 'CANCELED'
  | 'REFUNDED'
  | 'WAITING'
  | 'AUTHORIZED';

/** Resultado da criação de uma cobrança PIX — dados suficientes para montar o Checkout. */
export interface GatewayPixResult {
  /** ID da transação no gateway. */
  gatewayTransactionId: string;
  /** ID de referência no nosso sistema. */
  referenceId: string;
  /** Qual gateway processou. */
  gateway: GatewayId;
  status: GatewayPaymentStatus;
  /** Valor em centavos. */
  amountInCents: number;
  /** Código EMV PIX para copia-e-cola. */
  pixCopyPaste: string;
  /** URL da imagem do QR Code (se disponível). */
  qrCodeUrl?: string;
  /** QR Code em base64 data URL (gerado localmente ou obtido do gateway). */
  qrCodeDataUrl?: string;
  /** Data/hora de expiração em ISO 8601. */
  expiresAt: string;
  /** Data/hora de criação em ISO 8601. */
  createdAt: string;
  /** Taxa cobrada pelo gateway em centavos (se disponível). */
  feeInCents?: number;
  /** Valor líquido em centavos (amount - fee). */
  netAmountInCents?: number;
}

/** Resultado da criação de pagamento com cartão. */
export interface GatewayCreditCardResult {
  gatewayTransactionId: string;
  referenceId: string;
  gateway: GatewayId;
  status: GatewayPaymentStatus;
  amountInCents: number;
  createdAt: string;
  /** URL de desafio 3DS (se aplicável). */
  threeDsUrl?: string;
  /** Se requer autenticação 3DS. */
  threeDsChallengeRequired?: boolean;
}

/** Resultado de polling de status. */
export interface GatewayPaymentStatusResult {
  gatewayTransactionId: string;
  gateway: GatewayId;
  status: GatewayPaymentStatus;
  paidAt?: string;
}

/** Resultado de estorno. */
export interface GatewayRefundResult {
  gatewayTransactionId: string;
  gateway: GatewayId;
  success: boolean;
  refundAmount?: number;
}

// ============================================================================
// Webhook Normalizado — Evento interno padronizado
// ============================================================================

/**
 * Evento de webhook normalizado.
 * O WebhookNormalizer converte payloads brutos do PagBank e GGPIXAPI
 * para este formato único. Todo o sistema downstream opera contra ele.
 */
export interface NormalizedWebhookEvent {
  /** ID do evento no gateway original (para idempotência). */
  gatewayEventId: string;
  /** Qual gateway originou o evento. */
  gateway: GatewayId;
  /** ID da transação no gateway. */
  gatewayTransactionId: string;
  /** ID de referência no nosso sistema (externalId / referenceId). */
  referenceId?: string;
  /** Status normalizado. */
  status: GatewayPaymentStatus;
  /** Tipo de operação (PIX_IN, CREDIT_CARD, BOLETO, etc.). */
  transactionType: string;
  /** Valor bruto em centavos. */
  amountInCents: number;
  /** Valor líquido em centavos (se disponível). */
  netAmountInCents?: number;
  /** Taxa do gateway em centavos. */
  gatewayFeeInCents?: number;
  /** Data/hora do pagamento em ISO 8601. */
  paidAt?: string;
  /** Dados brutos do payload original (para auditoria). */
  rawPayload: unknown;
  /** Se é evento duplicado (já processado). */
  isDuplicate: boolean;
}

// ============================================================================
// Interface Principal — Contrato do Gateway
// ============================================================================

/**
 * Contrato que cada gateway de pagamento deve implementar.
 *
 * O GatewayManager seleciona o adapter ativo e delega todas as chamadas.
 * O Checkout, as rotas e o repositório NUNCA importam PagBank ou GGPIXAPI
 * diretamente — sempre passam por essa interface.
 */
export interface PaymentGateway {
  /** Identificador único deste gateway. */
  readonly id: GatewayId;

  /** Nome legível para exibição. */
  readonly displayName: string;

  /** Verifica se o gateway está configurado (credenciais disponíveis). */
  isConfigured(): boolean;

  /** Cria uma cobrança PIX. Retorna dados para montar o Checkout. */
  createPix(input: GatewayCreatePixInput): Promise<GatewayPixResult>;

  /**
   * Cria pagamento com cartão de crédito.
   * Nem todos os gateways suportam — GGPIXAPI não tem cartão.
   * Se não suportado, o adapter deve lançar Error com mensagem clara.
   */
  createCreditCard?(input: GatewayCreateCreditCardInput): Promise<GatewayCreditCardResult>;

  /** Consulta status de uma transação (polling). */
  getPaymentStatus(gatewayTransactionId: string): Promise<GatewayPaymentStatusResult>;

  /** Processa webhook bruto e retorna evento normalizado. */
  processWebhook(rawBody: string, headers: Record<string, string | undefined>, body: unknown): NormalizedWebhookEvent;
}
