/**
 * MessagingService Persistence & Restart Test
 * 
 * Verifies that inbox state (contacts, conversations, messages) survives
 * process restart by hydrating from Supabase on new service instance.
 * 
 * Run: npx tsx src/server/services/messaging-service.persistence.test.ts
 */

import { MessagingService } from './messaging-service';
import { getSupabaseServerClient } from '../db/supabase-server';
import { NormalizedIncomingMessage } from '../../types/messaging';

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function cleanupTestData(client: any, conversationId: string, testExternalId?: string) {
  // Clean up test data in reverse FK order
  if (client) {
    try {
      await client.from('messaging_messages').delete().eq('conversation_id', conversationId);
    } catch {}
    try {
      await client.from('messaging_conversations').delete().eq('id', conversationId);
    } catch {}
    if (testExternalId) {
      try {
        await client.from('messaging_contacts').delete().eq('external_id', testExternalId);
      } catch {}
    }
  }
}

async function runTest() {
  console.log('🧪 Iniciando teste de persistência/restart do Inbox B2C...\n');
  process.stdout.write('🧪 Iniciando teste de persistência/restart do Inbox B2C...\n');
  
  const client = getSupabaseServerClient();
  console.log('🔗 Supabase client:', client ? 'conectado' : 'NÃO CONECTADO');
  process.stdout.write('🔗 Supabase client: ' + (client ? 'conectado' : 'NÃO CONECTADO') + '\n');
  
  if (!client) {
    console.error('❌ Supabase client não disponível - teste requer banco');
    return false;
  }
  
  const testConversationId = `test_conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  try {
    // ===== PASSO 1: Criar primeira instância e popular dados =====
    console.log('📦 Passo 1: Criando primeira instância e populando dados...');
    process.stdout.write('📦 Passo 1: Criando primeira instância...\n');
    const service1 = new MessagingService();
    console.log('   ✅ Instância criada');
    
    // Aguardar hidratação inicial (se houver dados existentes)
    await sleep(500);
    console.log('   🔄 Hidratação inicial concluída');
    process.stdout.write('   🔄 Hidratação inicial concluída\n');
    
    // Simular mensagem inbound para criar contato + conversa + mensagem
    const testExternalId = `${process.env.WHATSAPP_TEST_PHONE || '5551994096322'}_${Date.now()}`;
    const incoming: NormalizedIncomingMessage = {
      channel: 'whatsapp_evolution',
      externalMessageId: `test_msg_${Date.now()}`,
      externalContactId: testExternalId,
      senderName: 'Usuário Teste Persistência',
      text: 'Teste de persistência de inbox após restart',
      timestamp: new Date().toISOString(),
    };
    
    const result = await service1.processIncomingMessage(incoming);
    console.log('   ✅ Mensagem processada:', {
      contactId: result.contact.id,
      conversationId: result.conversation.id,
      messageId: result.message.id,
    });
    console.log('   📝 Conversation mapId:', result.conversation.id);
    console.log('   📝 Contact mapId:', result.contact.id);
    
    // Enviar resposta outbound
    const sendResult = await service1.sendMessage(
      result.conversation.id,
      'Resposta de teste do atendente',
      'atendente_teste',
      'Atendente Teste'
    );
    console.log('   ✅ Resposta enviada:', sendResult.message.id);
    
    // Aguardar persistência assíncrona completar
    await sleep(1000);
    console.log('   ⏱️ Aguardado persistência assíncrona');
    
    // Verificar se dados estão no banco
    console.log('\n🔍 Passo 2: Verificando persistência no Supabase...');
    const { data: contacts } = await client!.from('messaging_contacts').select('*').eq('external_id', testExternalId);
    const contactDbId = contacts?.[0]?.id;
    const { data: conversations } = await client!.from('messaging_conversations').select('*').eq('contact_id', contactDbId);
    const { data: messages } = await client!.from('messaging_messages').select('*').eq('conversation_id', conversations?.[0]?.id);
    
    console.log('   Contatos no DB:', contacts?.length || 0);
    console.log('   Conversas no DB:', conversations?.length || 0);
    console.log('   Mensagens no DB:', messages?.length || 0);
    
    if (!contacts?.length || !conversations?.length || !messages?.length) {
      throw new Error('Dados não persistidos no Supabase');
    }
    console.log('   ✅ Dados confirmados no banco');
    
    // Capturar UUID da conversa para verificação posterior
    const convDbId = conversations[0]?.id;
    
    // ===== PASSO 3: Simular RESTART - criar NOVA instância =====
    console.log('\n🔄 Passo 3: Simulando restart - criando NOVA instância...');
    
    // Destruir referência da primeira instância (simula GC/process exit)
    // Nota: messagingService é singleton, então criamos uma nova instância manualmente
    // para testar a hidratação isolada
    const service2 = new MessagingService();
    
    // Aguardar hidratação completar
    await sleep(1000);
    
    // ===== PASSO 4: Verificar se dados foram recuperados =====
    console.log('\n🔍 Passo 4: Verificando hidratação após restart...');
    
    const conversations2 = service2.getConversations({ channel: 'whatsapp_evolution' });
    console.log('   Conversas recuperadas:', conversations2.length);
    
    if (conversations2.length === 0) {
      throw new Error('Nenhuma conversa recuperada após restart');
    }
    
    const recoveredConv = conversations2[0];
    console.log('   ✅ Conversa recuperada:', {
      id: recoveredConv.id,
      contactName: recoveredConv.contact.name,
      status: recoveredConv.status,
      unreadCount: recoveredConv.unreadCount,
    });
    
    // Verificar mensagens
    const messages2 = service2.getMessages(recoveredConv.id);
    console.log('   Mensagens recuperadas:', messages2.length);
    
    if (messages2.length < 2) {
      throw new Error(`Esperava >=2 mensagens, recuperou ${messages2.length}`);
    }
    
    // Verificar ordem e conteúdo - filtrar apenas mensagens do nosso teste
    const inbound = messages2.find(m => m.direction === 'inbound' && m.text?.includes('Teste de persistência'));
    const outbound = messages2.find(m => m.direction === 'outbound' && m.text?.includes('Resposta de teste'));
    
    if (!inbound || !inbound.text?.includes('Teste de persistência')) {
      throw new Error('Mensagem inbound não recuperada corretamente');
    }
    
    if (!outbound || !outbound.text?.includes('Resposta de teste')) {
      throw new Error('Mensagem outbound não recuperada corretamente');
    }
    
    console.log('   ✅ Mensagens inbound + outbound recuperadas com conteúdo correto');
    
    // Verificar contato
    const contacts2 = Array.from((service2 as any).contacts.values()).filter(c => c.channel === 'whatsapp_evolution');
    console.log('   Contatos recuperados:', contacts2.length);
    
    if (contacts2.length === 0) {
      throw new Error('Contato não recuperado após restart');
    }
    
    console.log('   ✅ Contato recuperado:', contacts2[0].name);
    
    // ===== PASSO 5: Verificar integridade dos IDs (mapId preservado) =====
    console.log('\n🔍 Passo 5: Verificando integridade dos IDs legados (mapId)...');
    
    const originalConvId = recoveredConv.id;
    const originalContactId = recoveredConv.contact.id;
    
    // IDs devem ser os mesmos mapIds (cnt_*, conv_*) não os UUIDs do banco
    console.log('   Conversation ID (mapId):', originalConvId);
    console.log('   Contact ID (mapId):', originalContactId);
    
    if (!originalConvId.startsWith('conv_') || !originalContactId.startsWith('cnt_')) {
      throw new Error('IDs legados (mapId) não preservados - usando UUIDs do banco');
    }
    
    console.log('   ✅ IDs legados (mapId) preservados corretamente');
    
    // ===== LIMPEZA =====
    console.log('\n🧹 Passo 6: Limpeza de dados de teste...');
    await cleanupTestData(client, convDbId, testExternalId);
    console.log('   ✅ Dados de teste removidos');
    
    // ===== SUCESSO =====
    console.log('\n🎉 TESTE PASSOU: Inbox B2C sobrevive a restart!');
    console.log('   - Contatos, conversas e mensagens persistem no Supabase');
    console.log('   - Nova instância hidrata estado completo do banco');
    console.log('   - IDs legados (mapId) preservados para compatibilidade frontend');
    console.log('   - Conteúdo das mensagens mantido inalterado');
    
    return true;
    
  } catch (err: any) {
    console.error('\n❌ TESTE FALHOU:', err.message);
    console.error(err.stack);
    
    // Tentar limpeza mesmo em caso de erro
    try {
      await cleanupTestData(client, convDbId, testExternalId);
    } catch {}
    
    return false;
  }
}

runTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Erro fatal no teste:', err);
  process.exit(1);
});