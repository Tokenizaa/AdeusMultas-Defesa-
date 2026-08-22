// PagBank Server Client - Server-only client for Orders API v2
// This file should ONLY be imported in server-side code (*.ts, API routes, webhooks)
// NEVER import in client-side React components

import { PagBankApiError } from './types';
import type {
  PagBankConfig,
  PagBankOrderRequest,
  PagBankOrderResponse,
  PagBankCharge,
  PagBankEnvironment,
  PagBankErrorResponse,
} from './types';

const SANDBOX_BASE_URL = 'https://sandbox.api.pagseguro.com';
const SANDBOX_ASSINATURAS_URL = 'https://sandbox.api.assinaturas.pagseguro.com';
const PRODUCTION_BASE_URL = 'https://api.pagseguro.com';
const PRODUCTION_ASSINATURAS_URL = 'https://api.assinaturas.pagseguro.com';

let _config: PagBankConfig | null = null;

function getConfig(): PagBankConfig {
  if (_config) return _config;

  const environment = (process.env.PAGBANK_ENV as PagBankEnvironment) || 'sandbox';
  const email = process.env.PAGBANK_EMAIL;
  const token = process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN;

  if (!email || !token) {
    throw new Error(
      '[PagBank Server] Missing environment variables: PAGBANK_EMAIL and PAGBANK_TOKEN (or PAGSEGURO_TOKEN)'
    );
  }

  _config = {
    environment,
    email,
    token,
    baseUrl: environment === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL,
    assinaturasUrl:
      environment === 'production' ? PRODUCTION_ASSINATURAS_URL : SANDBOX_ASSINATURAS_URL,
  };

  return _config;
}

async function pagbankFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  useAssinaturas = false
): Promise<T> {
  const config = getConfig();
  const baseUrl = useAssinaturas ? config.assinaturasUrl : config.baseUrl;
  const url = `${baseUrl}${endpoint}`;

  const headers = new Headers({
    Authorization: `Bearer ${config.token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  if (options.headers) {
    const customHeaders = new Headers(options.headers);
    customHeaders.forEach((value, key) => headers.set(key, value));
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    const errorData = isJson ? await response.json() : { message: await response.text() };
    throw new PagBankApiError(
      errorData.error_messages?.[0]?.description ||
        errorData.message ||
        `PagBank API Error: ${response.status} ${response.statusText}`,
      response.status,
      errorData as PagBankErrorResponse
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return isJson ? await response.json() : ((await response.text()) as T);
}

export const pagbankServer = {
  // Orders
  async createOrder(data: PagBankOrderRequest): Promise<PagBankOrderResponse> {
    return pagbankFetch<PagBankOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getOrder(orderId: string): Promise<PagBankOrderResponse> {
    return pagbankFetch<PagBankOrderResponse>(`/orders/${orderId}`);
  },

  async payOrder(
    orderId: string,
    paymentData?: Record<string, unknown>
  ): Promise<PagBankOrderResponse> {
    return pagbankFetch<PagBankOrderResponse>(`/orders/${orderId}/pay`, {
      method: 'POST',
      body: paymentData ? JSON.stringify(paymentData) : undefined,
    });
  },

  // Charges
  async getCharge(chargeId: string): Promise<PagBankCharge> {
    return pagbankFetch<PagBankCharge>(`/charges/${chargeId}`);
  },

  async cancelCharge(chargeId: string): Promise<PagBankCharge> {
    return pagbankFetch<PagBankCharge>(`/charges/${chargeId}/cancel`, {
      method: 'POST',
    });
  },

  async refundCharge(chargeId: string, amount?: number): Promise<PagBankCharge> {
    return pagbankFetch<PagBankCharge>(`/charges/${chargeId}/refund`, {
      method: 'POST',
      body: amount ? JSON.stringify({ amount: { value: amount } }) : undefined,
    });
  },

  // Customers (assinaturas)
  async createCustomer(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return pagbankFetch<Record<string, unknown>>(
      '/customers',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true
    );
  },

  async getCustomer(customerId: string): Promise<Record<string, unknown>> {
    return pagbankFetch<Record<string, unknown>>(`/customers/${customerId}`, {}, true);
  },

  // Subscriptions (assinaturas)
  async createSubscription(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return pagbankFetch<Record<string, unknown>>(
      '/subscriptions',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true
    );
  },

  async getSubscription(subscriptionId: string): Promise<Record<string, unknown>> {
    return pagbankFetch<Record<string, unknown>>(`/subscriptions/${subscriptionId}`, {}, true);
  },

  async cancelSubscription(subscriptionId: string): Promise<Record<string, unknown>> {
    return pagbankFetch<Record<string, unknown>>(
      `/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
      },
      true
    );
  },

  // Plans (assinaturas)
  async listPlans(limit = 10, offset = 0): Promise<Record<string, unknown>> {
    return pagbankFetch<Record<string, unknown>>(
      `/plans?limit=${limit}&offset=${offset}`,
      {},
      true
    );
  },

  // QR Code image URL
  getQRCodeImageUrl(qrCodeId: string, format: 'png' | 'svg' | 'base64' = 'png'): string {
    const config = getConfig();
    return `${config.baseUrl}/qrcode/${qrCodeId}/${format}`;
  },

  getConfig,
};

export default pagbankServer;