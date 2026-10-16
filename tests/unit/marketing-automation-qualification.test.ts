import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketingAutomationWorker } from '../../../src/server/services/marketing-automation/worker';
import { supabaseAdmin } from '../../../src/scraper-prospecting/supabase';
import { whatsappService } from '../../../src/server/services/whatsapp-service';
// We'll mock configService to return a fixed value for EVOLUTION_INSTANCE_NAME
vi.mock('../../../src/server/config/config-service', () => ({
  get: vi.fn(() => 'defesai_production'),
}));
import {
  loadAutomationState,
  updateAutomationState,
  resolveEffectiveStatus,
} from '../../../src/server/services/marketing-automation/state';

// Mock the modules
vi.mock('../../../src/scraper-prospecting/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));
vi.mock('../../../src/server/services/whatsapp-service', () => ({
  whatsappService: {
    sendText: vi.fn(),
  },
}));

describe('Marketing Automation Worker - Qualification Logic', () => {
  const worker = MarketingAutomationWorker.getInstance();

  beforeEach(() => {
    vi.clearAllMocks();
    // We don't mock the state functions; they will use the mocked supabaseAdmin
  });

  describe('handleSendMessage', () => {
    it('should not send message for lead with pending qualification', async () => {
      // Setup the mock to return a pending lead
      supabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'marketing_lead_campaigns') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'lc-test',
                    lead_id: 'lead-pending',
                    campaign_id: 'camp-test',
                    status: 'sent',
                    current_step: 0,
                    contact_count: 0,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'marketing_leads') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'lead-pending',
                    name: 'Pending Lead',
                    phone: '5511999999999',
                    whatsapp: '5511999999999',
                    phone_normalized: '5511999999999',
                    category: 'Despachante',
                    city: 'São Paulo',
                    state: 'SP',
                    qualification_status: 'pending',
                    opt_out_at: null,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'marketing_campaigns') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'camp-test',
                    name: 'Test Campaign',
                    status: 'active',
                    target_cities: ['São Paulo', 'Rio de Janeiro'],
                    target_audience: 'Despachante',
                    steps: [
                      { step: 1, delay_hours: 1, message: 'Hello {nome} from {cidade}!' },
                      { step: 2, delay_hours: 24, message: 'Follow up {nome}!' },
                    ],
                    max_contacts: 3,
                    min_interval_hours: 48,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        // For other tables
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
          update: vi.fn().mockResolvedValue({ data: null, error: null }),
          delete: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const action = {
        id: 'action-1',
        action: 'send_message',
        lead_campaign_id: 'lc-test',
        attempts: 0,
        max_attempts: 3,
        scheduled_at: new Date().toISOString(),
      };

      await worker.processAction(action);

      expect(whatsappService.sendText).not.toHaveBeenCalled();

      // Check that the lead campaign was updated to paused
      const updateCalls = supabaseAdmin.from.mock.calls;
      const leadCampaignUpdate = updateCalls.find(call => call[0] === 'marketing_lead_campaigns' && call[1]?.name === 'update');
      expect(leadCampaignUpdate).toBeDefined();
      expect(leadCampaignUpdate[1]).toHaveBeenCalledWith(
        { status: 'paused', updated_at: expect.any(String) },
        { id: 'lc-test' }
      );

      // Check that the queue was cleared for this lead campaign
      const queueDelete = updateCalls.find(call => call[0] === 'marketing_automation_queue' && call[1]?.name === 'delete');
      expect(queueDelete).toBeDefined();
      expect(queueDelete[1]).toHaveBeenCalledWith({ lead_campaign_id: 'lc-test' });
    });

    it('should send message for qualified lead matching target criteria', async () => {
      // Setup the mock to return a qualified lead
      supabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'marketing_lead_campaigns') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'lc-test',
                    lead_id: 'lead-qualified',
                    campaign_id: 'camp-test',
                    status: 'sent',
                    current_step: 0,
                    contact_count: 0,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'marketing_leads') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'lead-qualified',
                    name: 'Qualified Lead',
                    phone: '5511999999999',
                    whatsapp: '5511999999999',
                    phone_normalized: '5511999999999',
                    category: 'Despachante',
                    city: 'São Paulo',
                    state: 'SP',
                    qualification_status: 'qualified',
                    opt_out_at: null,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'marketing_campaigns') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'camp-test',
                    name: 'Test Campaign',
                    status: 'active',
                    target_cities: ['São Paulo', 'Rio de Janeiro'],
                    target_audience: 'Despachante',
                    steps: [
                      { step: 1, delay_hours: 1, message: 'Hello {nome} from {cidade}!' },
                      { step: 2, delay_hours: 24, message: 'Follow up {nome}!' },
                    ],
                    max_contacts: 3,
                    min_interval_hours: 48,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        // For other tables
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
          update: vi.fn().mockResolvedValue({ data: null, error: null }),
          delete: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const action = {
        id: 'action-2',
        action: 'send_message',
        lead_campaign_id: 'lc-test',
        attempts: 0,
        max_attempts: 3,
        scheduled_at: new Date().toISOString(),
      };

      await worker.processAction(action);

      expect(whatsappService.sendText).toHaveBeenCalledTimes(1);
      expect(whatsappService.sendText).toHaveBeenCalledWith({
        to: '5511999999999',
        message: 'Hello Qualified Lead from São Paulo!',
        instanceName: 'defesai_production',
      });

      // Check that the lead campaign was updated to sent (since there are more steps) and contact_count increased
      const updateCalls = supabaseAdmin.from.mock.calls;
      const leadCampaignUpdate = updateCalls.find(call => call[0] === 'marketing_lead_campaigns' && call[1]?.name === 'update');
      expect(leadCampaignUpdate).toBeDefined();
      expect(leadCampaignUpdate[1]).toHaveBeenCalledWith(
        {
          status: 'sent',
          current_step: 1,
          contact_count: 1,
          last_contact_at: expect.any(String),
          next_contact_at: expect.any(String),
        },
        { id: 'lc-test' }
      );

      // Check that a wait_response action was inserted into the queue
      const queueInsert = updateCalls.find(call => call[0] === 'marketing_automation_queue' && call[1]?.name === 'insert');
      expect(queueInsert).toBeDefined();
      expect(queueInsert[1]).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_campaign_id: 'lc-test',
          action: 'wait_response',
          max_attempts: 3,
        })
      );
    });
  });
});
