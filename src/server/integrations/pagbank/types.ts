// PagBank Types - Complete type definitions for Orders API v2
// Based on DefesAi v1 implementation

export type PagBankEnvironment = 'sandbox' | 'production';

export interface PagBankConfig {
  environment: PagBankEnvironment;
  email: string;
  token: string;
  baseUrl: string;
  assinaturasUrl: string;
}

export interface PagBankCustomer {
  name: string;
  email: string;
  tax_id: string;
  phones?: Array<{
    type: 'MOBILE' | 'LANDLINE';
    country: string;
    area: string;
    number: string;
  }>;
}

export interface PagBankItem {
  reference_id: string;
  name: string;
  quantity: number;
  unit_amount: number; // em centavos
}

export interface PagBankShippingAddress {
  street: string;
  number: string;
  complement?: string;
  locality: string;
  city: string;
  region_code: string;
  country: 'BRA';
  postal_code: string;
}

export interface PagBankShipping {
  address: PagBankShippingAddress;
}

export interface PagBankAmount {
  value: number; // em centavos
  currency: 'BRL';
  summary?: {
    total: number;
    paid: number;
    refunded: number;
  };
}

export interface PagBankPaymentMethod {
  type: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  installments?: number;
  capture?: boolean;
  card?: {
    id?: string;
    brand?: string;
    first_digits?: string;
    last_digits?: string;
    exp_month?: string;
    exp_year?: string;
    holder?: {
      name: string;
      tax_id?: string;
    };
    store?: boolean;
    issuer?: Record<string, unknown>;
    country?: string;
  };
  authentication_method?: {
    type: 'THREEDS';
    id: string;
    eci?: string;
    cavv?: string;
    xid?: string;
    version?: string;
    dstrans_id?: string;
    status?: string;
  };
  soft_descriptor?: string;
}

export interface PagBankCharge {
  id?: string;
  reference_id: string;
  status?: 'INITIAL' | 'WAITING' | 'AUTHORIZED' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'PROCESSING' | 'DECLINED';
  created_at?: string;
  paid_at?: string;
  description: string;
  amount: PagBankAmount;
  payment_method: PagBankPaymentMethod;
  payment_response?: {
    code: string;
    message: string;
    reference: string;
    raw_data?: Record<string, unknown>;
  };
  links?: Array<{
    rel: string;
    href: string;
    media: string;
    type: string;
  }>;
  metadata?: Record<string, unknown>;
}

export interface PagBankQRCode {
  id: string;
  amount: { value: number };
  text: string;
  arrangement?: string[];
  expiration_date?: string;
  links: Array<{
    rel: 'QRCODE.PNG' | 'QRCODE.SVG' | 'QRCODE.BASE64';
    href: string;
    media: string;
    type: 'GET';
  }>;
}

export interface PagBankLink {
  rel: string;
  href: string;
  media: string;
  type: string;
}

export interface PagBankOrderRequest {
  reference_id: string;
  customer: PagBankCustomer;
  items: PagBankItem[];
  shipping?: PagBankShipping;
  notification_urls: string[];
  charges: Omit<
    PagBankCharge,
    'id' | 'status' | 'created_at' | 'paid_at' | 'payment_response' | 'links' | 'metadata'
  >[];
}

export interface PagBankOrderResponse {
  id: string;
  reference_id: string;
  created_at: string;
  customer: PagBankCustomer;
  items: PagBankItem[];
  shipping?: PagBankShipping;
  charges: PagBankCharge[];
  qr_codes?: PagBankQRCode[];
  notification_urls: string[];
  links: PagBankLink[];
  status?: string;
}

export interface PagBankErrorResponse {
  error_messages: Array<{
    code?: string;
    error: string;
    parameter_name?: string;
    description: string;
  }>;
}

export interface PagBankWebhookPayload {
  order_id: string;
  charge_id: string;
  status: 'PAID' | 'CANCELLED' | 'REFUNDED' | 'PROCESSING' | 'EXPIRED' | 'WAITING' | 'AUTHORIZED' | 'DECLINED';
  paid_at?: string;
  amount: { value: number; currency: 'BRL' };
  payment_method: { type: 'PIX' | 'CREDIT_CARD' | 'BOLETO' };
  reference_id: string;
}

export class PagBankApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errorData: PagBankErrorResponse
  ) {
    super(message);
    this.name = 'PagBankApiError';
  }
}

export interface DefesaPagamentoData {
  caseId: string;
  caseType: 'defesa_previa' | 'recurso_1a' | 'recurso_2a' | 'recurso_especial';
  valor: number; // em centavos (ex: 29900 = R$ 299,00)
  cliente: {
    nome: string;
    email: string;
    cpf: string;
    telefone?: string;
  };
  endereco?: {
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  installments?: number;
  description?: string;
  returnUrl?: string;
  notificationUrl?: string;
  userId?: string;
}

export type PagamentoStatusInterno = 'pendente' | 'processando' | 'pago' | 'cancelado' | 'reembolsado' | 'expirado';

export const STATUS_MAP = {
  INITIAL: 'pendente',
  WAITING: 'processando',
  AUTHORIZED: 'processando',
  PROCESSING: 'processando',
  PAID: 'pago',
  CANCELLED: 'cancelado',
  REFUNDED: 'reembolsado',
  EXPIRED: 'expirado',
  DECLINED: 'cancelado',
} as const;

export function mapearStatusPagBank(status: string): PagamentoStatusInterno {
  return STATUS_MAP[status as keyof typeof STATUS_MAP] || 'pendente';
}

export interface PaymentRecord {
  id: string;
  case_id: string;
  user_id: string;
  pagbank_order_id: string;
  pagbank_charge_id: string | null;
  pagbank_reference_id: string;
  amount_cents: number;
  currency: string;
  payment_method: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  installments: number;
  status: PagamentoStatusInterno;
  status_detail: string | null;
  pix_qr_code_id: string | null;
  pix_qr_code_text: string | null;
  pix_qr_code_image_url: string | null;
  payment_url: string | null;
  paid_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  metadata: Record<string, unknown> | null;
  webhook_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentEventRecord {
  id: string;
  payment_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  idempotency_key: string;
  created_at: string;
}

export const EVENTO_AUDIT = {
  WEBHOOK_RECEIVED: 'webhook_received',
  STATUS_CHANGED: 'status_changed',
} as const;

export function calcularIdempotencyKey(
  paymentId: string,
  chargeId: string,
  status: string,
  eventType: string
): string {
  const crypto = require('node:crypto');
  return createHash('sha256')
    .update(`${paymentId}:${chargeId}:${status}:${eventType}`)
    .digest('hex');
}

function createHash(algorithm: string) {
  const crypto = require('node:crypto');
  return {
    update: (data: string) => ({
      digest: (encoding: string) => crypto.createHash(algorithm).update(data).digest(encoding),
    }),
  };
}