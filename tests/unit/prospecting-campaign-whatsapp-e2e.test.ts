/**
 * @file prospecting-campaign-whatsapp-e2e.test.ts
 * Validação Operacional E2E do Fluxo Completo:
 * Scraper / Lead -> Normalização -> Campanha -> WhatsApp (Evolution API) ->
 * Automação Worker -> Resposta Inbound -> Follow-up Cancellation / Opt-out -> Métricas Persistidas
 *
 * Número oficial de teste: 5551994096322
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizePhone, normalizeLead } from '../../src/scraper-prospecting/normalizer';
import { normalizeBrPhone, persistProspectingResponse } from '../../src/server/services/prospecting-responder';
import { whatsappService } from '../../src/server/services/whatsapp-service';
import { messagingService } from '../../src/server/services/messaging-service';

const TEST_PHONE_RAW = '5551994096322';
const TEST_PHONE_FORMATTED = '+55 (51) 99409-6322';
const TEST_PHONE_CANONICAL = '51994096322';

describe('VALIDAÇÃO E2E — PROSPECTING + CAMPANHAS + WHATSAPP (5551994096322)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('EVOLUTION_API_KEY', 'test_evolution_api_key_secret');
    vi.stubEnv('EVOLUTION_API_URL', 'http://localhost:8080');
    vi.stubEnv('EVOLUTION_INSTANCE_NAME', 'defesai_production');
  });

  // =========================================================================
  // TESTE 1 — Health & Conectividade WhatsApp / Evolution API
  // =========================================================================
  describe('Teste 1 — Health & Conectividade Evolution API', () => {
    it('deve verificar status da instância e responder com cliente único oficial', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('/instance/fetchInstances')) {
          return new Response(JSON.stringify([{ name: 'defesai_production', status: 'open' }]), { status: 200 });
        }
        if (urlStr.includes('/instance/connectionState')) {
          return new Response(JSON.stringify({ instance: { state: 'open', owner: '5551994096322' } }), { status: 200 });
        }
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      });

      const status = await whatsappService.getInstanceStatus('defesai_production');
      expect(status).toBeDefined();
      expect(status?.status).toBe('open');

      fetchSpy.mockRestore();
    });
  });

  // =========================================================================
  // TESTE 2 — Normalização Rigorosa do Número de Teste
  // =========================================================================
  describe('Teste 2 — Normalização do Número de Teste (5551994096322)', () => {
    it('deve normalizar todas as variações de formato para o número canônico BR', () => {
      const v1 = normalizePhone(TEST_PHONE_RAW);
      const v2 = normalizePhone(TEST_PHONE_FORMATTED);
      const v3 = normalizePhone('(51) 99409-6322');
      const v4 = normalizePhone('051 99409-6322');

      expect(v1).toBe(TEST_PHONE_CANONICAL);
      expect(v2).toBe(TEST_PHONE_CANONICAL);
      expect(v3).toBe(TEST_PHONE_CANONICAL);
      expect(v4).toBe(TEST_PHONE_CANONICAL);

      const leadNormalized = normalizeLead({
        name: 'Despachante Teste 5551994096322',
        phone: TEST_PHONE_FORMATTED,
        city: 'Porto Alegre',
        state: 'rs',
        category: 'Despachante',
      });

      expect(leadNormalized.phone_normalized).toBe(TEST_PHONE_CANONICAL);
      expect(leadNormalized.state).toBe('RS');
    });

    it('deve manter compatibilidade com normalizeBrPhone no responder', () => {
      expect(normalizeBrPhone(TEST_PHONE_RAW)).toBe(TEST_PHONE_CANONICAL);
      expect(normalizeBrPhone(TEST_PHONE_CANONICAL)).toBe(TEST_PHONE_CANONICAL);
      expect(normalizeBrPhone(`55${TEST_PHONE_CANONICAL}`)).toBe(TEST_PHONE_CANONICAL);
    });
  });

  // =========================================================================
  // TESTE 3 — Envio Controlado via WhatsApp (Evolution API)
  // =========================================================================
  describe('Teste 3 — Envio Controlado para 5551994096322', () => {
    it('deve formatar número com código 55 e despachar via Evolution API', async () => {
      let sentPayload: any = null;
      let sentEndpoint = '';

      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
        sentEndpoint = String(url);
        sentPayload = JSON.parse((opts?.body as string) || '{}');
        return new Response(
          JSON.stringify({
            key: { id: 'wamid_test_e2e_5551994096322', fromMe: true },
            status: 'PENDING',
          }),
          { status: 200 }
        );
      });

      const result = await whatsappService.sendText({
        to: TEST_PHONE_RAW,
        message: 'Teste de validação operacional DefesAi - Prospecting E2E',
        instanceName: 'defesai_production',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wamid_test_e2e_5551994096322');
      expect(sentPayload.number).toBe(TEST_PHONE_RAW);
      expect(sentPayload.text).toContain('Teste de validação operacional');
      expect(sentEndpoint).toContain('/message/sendText/');

      fetchSpy.mockRestore();
    });
  });

  // =========================================================================
  // TESTE 4 — Recepção de Resposta via Webhook & Normalização Inbound
  // =========================================================================
  describe('Teste 4 — Recepção / Webhook Inbound de 5551994096322', () => {
    it('deve processar webhook da Evolution API e normalizar mensagem inbound', async () => {
      const webhookPayload = {
        event: 'messages.upsert',
        instance: 'defesai_production',
        data: {
          key: {
            remoteJid: `${TEST_PHONE_RAW}@s.whatsapp.net`,
            fromMe: false,
            id: 'WAMID_INBOUND_RESP_001',
          },
          pushName: 'Despachante Silva RS',
          message: {
            conversation: 'Olá! Temos interesse na parceria para recursos de trânsito em Porto Alegre.',
          },
          messageTimestamp: Math.floor(Date.now() / 1000),
        },
      };

      const result = await messagingService.handleEvolutionWebhook(webhookPayload);
      expect(result.processed).toBe(true);
      expect(result.conversationId).toBeDefined();

      // Conversa criada/atualizada no inbox in-memory
      const conv = messagingService.getConversationById(result.conversationId!);
      expect(conv).toBeDefined();
      expect(conv?.lastMessageText).toContain('Temos interesse na parceria');
    });
  });

  // =========================================================================
  // TESTE 5 — Automação / Transição de Estado e Métricas
  // =========================================================================
  describe('Teste 5 — Automação Worker & Resposta Inbound', () => {
    it('deve marcar lead_campaign como responded e cancelar follow-ups futuros ao receber resposta', async () => {
      const mockLead = {
        id: 'lead_e2e_5551994096322',
        phone: TEST_PHONE_RAW,
        whatsapp: TEST_PHONE_RAW,
        phone_normalized: TEST_PHONE_CANONICAL,
        name: 'Despachante Silva',
        category: 'Despachante',
        city: 'Porto Alegre',
        state: 'RS',
        status: 'qualified',
      };

      const mockLeadCampaign = {
        id: 'lc_e2e_001',
        lead_id: mockLead.id,
        campaign_id: 'camp_e2e_001',
        status: 'sent',
        current_step: 1,
        contact_count: 1,
      };

      let queueDeleted = false;

      const clientMock: any = {
        from: vi.fn((table: string) => {
          if (table === 'marketing_leads') {
            return {
              select: () => ({
                limit: async () => ({ data: [mockLead], error: null }),
              }),
              update: () => ({
                eq: async () => ({ data: null, error: null }),
              }),
            };
          }
          if (table === 'marketing_lead_campaigns') {
            return {
              select: () => ({
                eq: () => ({
                  in: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({ data: mockLeadCampaign, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
              update: (fields: any) => ({
                eq: async () => {
                  mockLeadCampaign.status = fields.status;
                  return { data: null, error: null };
                },
              }),
            };
          }
          if (table === 'marketing_messages') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
              insert: async () => ({ data: null, error: null }),
            };
          }
          if (table === 'marketing_automation_queue') {
            return {
              delete: () => ({
                eq: async () => {
                  queueDeleted = true;
                  return { data: null, error: null };
                },
              }),
            };
          }
          return {
            select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          };
        }),
      };

      const responseResult = await persistProspectingResponse(
        {
          externalContactId: TEST_PHONE_RAW,
          externalMessageId: 'msg_inbound_reply_123',
          text: 'Gostaria de saber a comissão para despachantes parceiros.',
          channel: 'whatsapp_evolution',
          timestamp: new Date().toISOString(),
        },
        clientMock
      );

      expect(responseResult.matched).toBe(true);
      expect(responseResult.messageInserted).toBe(true);
      expect(responseResult.statusUpdated).toBe(true);
      expect(mockLeadCampaign.status).toBe('responded');
      expect(queueDeleted).toBe(true);
    });
  });

  // =========================================================================
  // TESTE 6 — Follow-up & Interrupção / Opt-Out Seguro
  // =========================================================================
  describe('Teste 6 — Follow-up Interrupção e Opt-Out', () => {
    it('deve interromper e cancelar toda automação imediatamente ao detectar opt-out', async () => {
      const mockLead = {
        id: 'lead_optout_001',
        phone: TEST_PHONE_RAW,
        whatsapp: TEST_PHONE_RAW,
        phone_normalized: TEST_PHONE_CANONICAL,
        status: 'new',
      };

      const mockLeadCampaign = {
        id: 'lc_optout_001',
        lead_id: mockLead.id,
        campaign_id: 'camp_001',
        status: 'sent',
      };

      let queueDeleted = false;
      let leadStatusUpdated = '';
      let lcStatusUpdated = '';

      const clientMock: any = {
        from: vi.fn((table: string) => {
          if (table === 'marketing_leads') {
            return {
              select: () => ({
                limit: async () => ({ data: [mockLead], error: null }),
              }),
              update: (fields: any) => ({
                eq: async () => {
                  leadStatusUpdated = fields.status;
                  return { data: null, error: null };
                },
              }),
            };
          }
          if (table === 'marketing_lead_campaigns') {
            return {
              select: () => ({
                eq: () => ({
                  in: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({ data: mockLeadCampaign, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
              update: (fields: any) => ({
                eq: async () => {
                  lcStatusUpdated = fields.status;
                  return { data: null, error: null };
                },
              }),
            };
          }
          if (table === 'marketing_messages') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
              insert: async () => ({ data: null, error: null }),
            };
          }
          if (table === 'marketing_automation_queue') {
            return {
              delete: () => ({
                eq: async () => {
                  queueDeleted = true;
                  return { data: null, error: null };
                },
              }),
            };
          }
          return {};
        }),
      };

      const result = await persistProspectingResponse(
        {
          externalContactId: TEST_PHONE_RAW,
          externalMessageId: 'msg_optout_123',
          text: 'SAIR',
          channel: 'whatsapp_evolution',
        },
        clientMock
      );

      expect(result.matched).toBe(true);
      expect(result.statusUpdated).toBe(true);
      expect(leadStatusUpdated).toBe('opt_out');
      expect(lcStatusUpdated).toBe('opt_out');
      expect(queueDeleted).toBe(true);
    });
  });
});
