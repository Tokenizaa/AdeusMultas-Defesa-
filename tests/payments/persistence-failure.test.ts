/**
 * Persistence failure tests for Fase 7
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarPagamentoDefesa, DefesaPagamentoData } from '../../src/server/integrations/pagbank/orders';
import type { PagBankOrderResponse, PagBankCharge } from '../../src/server/integrations/pagbank/types';

// Mock environment
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_key';
process.env.APP_URL = 'https://test.defesai.br';

// Mock pagbankServer
vi.mock('../../src/server/integrations/pagbank/client.server', () => {
  return {
    pagbankServer: {
      createOrder: vi.fn(),
      getQRCodeImageUrl: vi.fn(),
    },
  };
});

// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn().mockReturnValue(mockSupabase),
  };
});

import { pagbankServer } from '../../src/server/integrations/pagbank/client.server';

describe('Persistência de pagamento - falhas', () => {
  const baseData: DefesaPagamentoData = {
    caseId: 'case_123',
    caseType: 'recurso_jari',
    valor: 89.90,
    paymentMethod: 'PIX',
    cliente: {
      nome: 'João Silva',
      email: 'joao@email.com',
      cpf: '123.456.789-09',
      telefone: '11999999999',
    },
    endereco: {
      rua: 'Rua Teste',
      numero: '123',
      complemento: '',
      bairro: 'Bairro Teste',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01234-567',
    },
    userId: '11111111-1111-1111-1111-111111111111', // valid UUID
    notificationUrl: undefined,
  };

  const mockCharge: PagBankCharge = {
    id: 'charge_123',
    status: 'PAID',
    reference_id: 'charge-defesa_case_123-123',
    amount: { value: 89.90, currency: 'BRL' },
    payment_method: { type: 'PIX' },
    created_at: new Date().toISOString(),
    paid_at: new Date().toISOString(),
  };

  const mockOrder: PagBankOrderResponse = {
    id: 'order_123',
    status: 'PAID',
    amount: 89.90,
    paymentMethod: 'pix',
    qr_codes: [{ id: 'qrcode_123', text: '000201...', }],
    reference_id: 'defesa_case_123',
    links: [{ rel: 'PAY', href: 'https://pagbank.com/pay/order_123' }],
    created_at: new Date().toISOString(),
    charges: [mockCharge],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockSupabase implementations
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockSupabase.update.mockResolvedValue({ error: null });
    mockSupabase.insert.mockResolvedValue({ error: null });
    // Reset pagbankServer.createOrder
    pagbankServer.createOrder.mockResolvedValue(mockOrder);
    pagbankServer.getQRCodeImageUrl.mockReturnValue('https://example.com/qr.png');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw error when Supabase SELECT fails', async () => {
    const selectError = new Error('SELECT failed');
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: undefined, error: selectError });

    await expect(
      criarPagamentoDefesa(baseData)
    ).rejects.toThrow(/Falha ao verificar pagamento existente/);
  });

  it('should throw error when Supabase UPDATE fails', async () => {
    const updateError = new Error('UPDATE failed');
    // Simulate existing row found
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'existing' }, error: null });
    mockSupabase.update.mockResolvedValueOnce({ error: updateError });

    await expect(
      criarPagamentoDefesa(baseData)
    ).rejects.toThrow(/Falha ao persistir pagamento/);
  });

  it('should throw error when Supabase INSERT fails', async () => {
    const insertError = new Error('INSERT failed');
    // Simulate no existing row
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockSupabase.insert.mockResolvedValueOnce({ error: insertError });

    await expect(
      criarPagamentoDefesa(baseData)
    ).rejects.toThrow(/Falha ao persistir pagamento/);
  });

  it('should throw error when charge is missing', async () => {
    // Mock order with empty charges array
    pagbankServer.createOrder.mockResolvedValueOnce({
      ...mockOrder,
      charges: [],
    });

    await expect(
      criarPagamentoDefesa(baseData)
    ).rejects.toThrow(/Falha ao criar cobrança/);
  });
}
