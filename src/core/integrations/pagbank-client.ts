import { PagBankOrderResponse, CaseDomain } from '../../types';

export interface CreateOrderInput {
  caseId: string;
  customerName?: string;
  customerEmail?: string;
  customerCpf?: string;
  amount?: number;
}

export async function createPagBankOrder(input: CreateOrderInput): Promise<{
  success: boolean;
  order: PagBankOrderResponse;
  pixCopyPasteString: string;
  qrCodeDataUrl: string;
  txId: string;
  status: string;
}> {
  const res = await fetch('/api/payments/pagbank/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Falha ao criar cobrança no PagBank');
  }
  return res.json();
}

export async function getPagBankOrderStatus(orderId: string): Promise<PagBankOrderResponse> {
  const res = await fetch(`/api/payments/pagbank/orders/${orderId}`);
  if (!res.ok) {
    throw new Error('Falha ao consultar pedido no PagBank');
  }
  return res.json();
}
