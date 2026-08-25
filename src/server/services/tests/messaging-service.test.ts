import { describe, it, expect, beforeEach } from 'vitest';
import { MessagingService } from '../messaging-service';

describe('MessagingService — Unified Omnichannel Gateway', () => {
  let service: MessagingService;

  beforeEach(() => {
    service = new MessagingService();
  });

  it('deve normalizar webhook da Evolution API e criar contato e conversa de WhatsApp', async () => {
    const payload = {
      event: 'messages.upsert',
      data: {
        key: {
          remoteJid: '5511998877665@s.whatsapp.net',
          fromMe: false,
          id: 'wamid_test_123',
        },
        pushName: 'João da Silva',
        message: {
          conversation: 'Recebi uma notificação do Art. 218 III por excesso de velocidade. Placa ABC-1234.',
        },
      },
    };

    const res = await service.handleEvolutionWebhook(payload);
    expect(res.processed).toBe(true);
    expect(res.conversationId).toBeDefined();

    const conv = service.getConversationById(res.conversationId!);
    expect(conv).toBeDefined();
    expect(conv?.channel).toBe('whatsapp_evolution');
    expect(conv?.contact.name).toBe('João da Silva');
    expect(conv?.contact.phone).toBe('5511998877665');
    expect(conv?.lead).toBeDefined();
    expect(conv?.lead?.vehiclePlate).toBe('ABC-1234');
    expect(conv?.lead?.infractionType).toContain('Art. 218');
  });

  it('deve normalizar webhook do Facebook Messenger e registrar mensagem inbound', async () => {
    const payload = {
      object: 'page',
      entry: [
        {
          id: 'page_98765',
          messaging: [
            {
              sender: { id: 'fb_psid_445566' },
              recipient: { id: 'page_98765' },
              timestamp: Date.now(),
              message: {
                mid: 'mid_fb_9988',
                text: 'Olá, gostaria de saber se é possível anular multa de bafômetro.',
              },
            },
          ],
        },
      ],
    };

    const res = await service.handleMetaMessagingWebhook(payload);
    expect(res.processed).toBe(true);
    expect(res.count).toBe(1);

    const convs = service.getConversations({ channel: 'meta_messenger' });
    const matching = convs.find((c) => c.contact.externalId === 'fb_psid_445566');
    expect(matching).toBeDefined();
    expect(matching?.channel).toBe('meta_messenger');
    expect(matching?.lead?.infractionType).toContain('Lei Seca / Bafômetro');
  });

  it('deve normalizar webhook do Instagram Direct', async () => {
    const payload = {
      object: 'instagram',
      entry: [
        {
          id: '1784140000000',
          messaging: [
            {
              sender: { id: 'ig_driver_juliana' },
              recipient: { id: '1784140000000' },
              timestamp: Date.now(),
              message: {
                mid: 'mid_ig_7766',
                text: 'Vi os vídeos no Instagram e quero recorrer da minha CNH suspensa.',
              },
            },
          ],
        },
      ],
    };

    const res = await service.handleMetaMessagingWebhook(payload);
    expect(res.processed).toBe(true);
    expect(res.count).toBe(1);

    const convs = service.getConversations({ channel: 'instagram_direct' });
    const matching = convs.find((c) => c.contact.externalId === 'ig_driver_juliana');
    expect(matching).toBeDefined();
    expect(matching?.channel).toBe('instagram_direct');
  });

  it('deve despachar mensagem outbound e atualizar status da conversa', async () => {
    const convs = service.getConversations();
    const targetConv = convs[0];

    const sendRes = await service.sendMessage(
      targetConv.id,
      'Prezado motorista, seu recurso foi gerado com sucesso.',
      'dr_lucas',
      'Dr. Lucas (Advogado Especialista)'
    );

    expect(sendRes.success).toBe(true);
    expect(sendRes.message.direction).toBe('outbound');
    expect(sendRes.message.text).toBe('Prezado motorista, seu recurso foi gerado com sucesso.');

    const messages = service.getMessages(targetConv.id);
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg.text).toBe('Prezado motorista, seu recurso foi gerado com sucesso.');
  });

  it('deve garantir contrato Channel Adapter e conversationId consistente em toda a plataforma', async () => {
    const evoAdapter = service.getAdapter('whatsapp_evolution');
    const msgAdapter = service.getAdapter('meta_messenger');
    const igAdapter = service.getAdapter('instagram_direct');
    const wppMetaAdapter = service.getAdapter('whatsapp_meta');

    expect(evoAdapter.channel).toBe('whatsapp_evolution');
    expect(msgAdapter.channel).toBe('meta_messenger');
    expect(igAdapter.channel).toBe('instagram_direct');
    expect(wppMetaAdapter.channel).toBe('whatsapp_meta');

    // Test Inbound Normalization directly on adapters
    const evoNormalized = await evoAdapter.normalizeInbound({
      event: 'messages.upsert',
      data: {
        key: { remoteJid: '5521977665544@s.whatsapp.net', id: 'key_123', fromMe: false },
        pushName: 'Roberta Lima',
        message: { conversation: 'Recurso de multa' },
      },
    });

    expect(evoNormalized).toHaveLength(1);
    expect(evoNormalized[0].channel).toBe('whatsapp_evolution');
    expect(evoNormalized[0].externalContactId).toBe('5521977665544');

    const result = await service.processIncomingMessage(evoNormalized[0]);
    expect(result.conversation.id).toBe('conv_whatsapp_evolution_5521977665544');
    expect(result.conversation.conversationId).toBe('conv_whatsapp_evolution_5521977665544');

    // Query by ID and by conversationId
    const foundById = service.getConversationById(result.conversation.id);
    const foundByConvId = service.getConversationById(result.conversation.conversationId!);
    expect(foundById).toEqual(foundByConvId);

    const messages = service.getMessages(result.conversation.conversationId!);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].conversationId).toBe('conv_whatsapp_evolution_5521977665544');
  });

  it('deve executar a suite de self-test com 100% de aprovação', async () => {
    const testReport = await service.runSelfTest();
    expect(testReport.success).toBe(true);
    expect(testReport.results.length).toBeGreaterThanOrEqual(4);
    testReport.results.forEach((r) => {
      expect(r.passed).toBe(true);
    });
  });
});
