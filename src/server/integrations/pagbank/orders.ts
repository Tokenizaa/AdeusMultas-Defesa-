// PagBank Orders - Business logic for payment creation and management
// Based on DefesAi v1 implementation

import { pagbankServer } from './client.server';
import { domainIdToUuid } from '../../db/uuid-v5';
import type {
  PagBankCustomer,
  PagBankItem,
  PagBankShipping,
  PagBankCharge,
  PagBankOrderRequest,
  PagBankOrderResponse,
  PagBankQRCode,
  DefesaPagamentoData,
  PagamentoStatusInterno,
  PaymentRecord,
} from './types';
import { mapearStatusPagBank } from './types';

function mascararCpfCnpj(value: string): string {
  const nums = value.replace(/\D/g, '');
  if (nums.length === 11) {
    return `${nums.slice(0, 3)}.***.***-${nums.slice(9)}`;
  }
  if (nums.length === 14) {
    return `${nums.slice(0, 2)}.***.***/****-${nums.slice(12)}`;
  }
  return value;
}

function buildCustomer(data: DefesaPagamentoData): PagBankCustomer {
  const phones = data.cliente.telefone
    ? [
        {
          type: 'MOBILE' as const,
          country: '55',
          area: data.cliente.telefone.slice(0, 2),
          number: data.cliente.telefone.slice(2),
        },
      ]
    : undefined;

  return {
    name: data.cliente.nome,
    email: data.cliente.email,
    tax_id: data.cliente.cpf.replace(/\D/g, ''),
    phones,
  };
}

function buildItems(data: DefesaPagamentoData): PagBankItem[] {
  const typeLabels: Record<DefesaPagamentoData['caseType'], string> = {
    defesa_previa: 'Defesa Prévia',
    recurso_1a: 'Recurso em 1ª Instância',
    recurso_2a: 'Recurso em 2ª Instância',
    recurso_especial: 'Recurso Especial',
  };

  return [
    {
      reference_id: `${data.caseType}-${data.caseId}`,
      name: typeLabels[data.caseType],
      quantity: 1,
      unit_amount: data.valor,
    },
  ];
}

function buildShipping(data: DefesaPagamentoData): PagBankShipping | undefined {
  if (!data.endereco) return undefined;

  return {
    address: {
      street: data.endereco.rua,
      number: data.endereco.numero,
      complement: data.endereco.complemento,
      locality: data.endereco.bairro,
      city: data.endereco.cidade,
      region_code: data.endereco.uf,
      country: 'BRA',
      postal_code: data.endereco.cep.replace(/\D/g, ''),
    },
  };
}

function buildCharge(data: DefesaPagamentoData): Omit<
  PagBankCharge,
  'id' | 'status' | 'created_at' | 'paid_at' | 'payment_response' | 'links' | 'metadata'
> {
  const paymentMethod = {
    type: data.paymentMethod,
    installments: data.paymentMethod === 'CREDIT_CARD' ? data.installments || 1 : 1,
    capture: true,
    soft_descriptor: 'DefesAi',
  } as const;

  if (data.paymentMethod === 'CREDIT_CARD') {
    (paymentMethod as any).card = {
      store: false,
    };
  }

  return {
    reference_id: `charge-${data.caseId}-${Date.now()}`,
    description:
      data.description || `Pagamento ${data.caseType.replace('_', ' ')} - Caso ${data.caseId}`,
    amount: {
      value: data.valor,
      currency: 'BRL',
    },
    payment_method: paymentMethod,
  };
}

export interface CriarPagamentoResult {
  order: PagBankOrderResponse;
  qrCode?: PagBankQRCode;
  pixCode?: string;
  paymentUrl?: string;
}

// Save payment to Supabase database
// FASE 7: Persistência OBRIGATÓRIA — falha de banco propaga erro (FAIL CLOSED)
async function savePaymentToDatabase(
  data: DefesaPagamentoData,
  order: PagBankOrderResponse,
  charge: PagBankCharge
): Promise<void> {
  if (!data.userId) {
    throw new Error('[PagBank] userId obrigatório para persistência de pagamento');
  }

  const { createClient } = await import('@supabase/supabase-js');

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('[PagBank] Supabase não configurado — não é possível persistir pagamento');
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const pixData = order.qr_codes?.[0];
  const paymentMethod = charge.payment_method.type;

  const paymentData = {
    case_id: domainIdToUuid(data.caseId),
    user_id: data.userId && /^[0-9a-f-]{36}$/i.test(data.userId) ? data.userId : null,
    pagbank_order_id: order.id,
    pagbank_charge_id: charge.id!,
    pagbank_reference_id: order.reference_id,
    amount_cents: charge.amount.value,
    currency: charge.amount.currency,
    payment_method: paymentMethod,
    installments: charge.payment_method.installments || 1,
    status: mapearStatusPagBank(charge.status || 'INITIAL') as any,
    status_detail: charge.status,
    pix_qr_code_id: pixData?.id,
    pix_qr_code_text: pixData?.text,
    pix_qr_code_image_url: pixData ? pagbankServer.getQRCodeImageUrl(pixData.id, 'png') : null,
    payment_url: order.links.find((l) => l.rel === 'PAY')?.href || null,
    paid_at: charge.paid_at || null,
    metadata: {
      order_created_at: order.created_at,
      payment_response: charge.payment_response,
      customer: order.customer
        ? {
            name: order.customer.name,
            email: order.customer.email,
            tax_id_masked: mascararCpfCnpj(order.customer.tax_id),
          }
        : undefined,
    },
  };

  const { data: existing } = await supabase
    .from('payment_orders')
    .select('id')
    .eq('pagbank_order_id', order.id)
    .maybeSingle();

  let error;
  if (existing) {
    ({ error } = await supabase
      .from('payment_orders')
      .update(paymentData)
      .eq('pagbank_order_id', order.id));
  } else {
    ({ error } = await supabase.from('payment_orders').insert(paymentData));
  }

  if (error) {
    throw new Error(`Falha ao persistir pagamento: ${error.message}`);
  }

  console.log('[PagBank] Payment saved to database:', { orderId: order.id, caseId: data.caseId });
}

export async function criarPagamentoDefesa(data: DefesaPagamentoData): Promise<CriarPagamentoResult> {
  const notificationUrls = [
    data.notificationUrl ||
      `${process.env.APP_URL || process.env.VITE_APP_URL || 'https://defesai.com.br'}/api/webhooks/pagbank`,
  ];

  const orderRequest: PagBankOrderRequest = {
    reference_id: `defesa-${data.caseId}`,
    customer: buildCustomer(data),
    items: buildItems(data),
    shipping: buildShipping(data),
    notification_urls: notificationUrls,
    charges: [buildCharge(data)],
  };

  const order = await pagbankServer.createOrder(orderRequest);

  // Extract PIX QR Code if applicable
  let qrCode: PagBankQRCode | undefined;
  let pixCode: string | undefined;
  let paymentUrl: string | undefined;

  if (data.paymentMethod === 'PIX' && order.qr_codes?.length) {
    qrCode = order.qr_codes[0];
    pixCode = qrCode.text;
    const qrCodeId = qrCode.id;
    paymentUrl = pagbankServer.getQRCodeImageUrl(qrCodeId, 'png');
  }

  // Payment link for card/boleto (only if not PIX)
  if (data.paymentMethod !== 'PIX') {
    const payLink = order.links.find((l) => l.rel === 'PAY');
    if (payLink) {
      paymentUrl = payLink.href;
    }
  }

  // Save to database (non-blocking)
  const charge = order.charges[0];
  if (charge) {
    await savePaymentToDatabase(data, order, charge);
  }

  return { order, qrCode, pixCode, paymentUrl };
}

export async function consultarPagamento(orderId: string): Promise<PagBankOrderResponse> {
  return pagbankServer.getOrder(orderId);
}

export async function cancelarPagamento(chargeId: string): Promise<PagBankCharge> {
  return pagbankServer.cancelCharge(chargeId);
}

export async function reembolsarPagamento(
  chargeId: string,
  valor?: number
): Promise<PagBankCharge> {
  return pagbankServer.refundCharge(chargeId, valor);
}

export function extrairCaseIdDoReference(referenceId: string): string | null {
  const match = referenceId.match(/^defesa-(.+)$/);
  return match ? match[1] : null;
}