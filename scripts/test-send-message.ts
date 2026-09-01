import 'dotenv/config';
import { whatsappService } from '../src/server/services/whatsapp-service';

async function testSendMessage() {
  console.log('Testing message send to EVOLUTION_TEST_PHONE...');
  
  const testPhone = process.env.EVOLUTION_TEST_PHONE || '5551994096322';
  const message = '🧪 Teste de integração DefesAi + Evolution API - se recebeu, está funcionando!';
  
  console.log(`Sending to: ${testPhone}`);
  console.log(`Message: ${message}`);
  
  const result = await whatsappService.sendText({
    to: testPhone,
    message,
  });
  
  console.log('Result:', JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('✅ Message sent successfully!');
  } else {
    console.log('❌ Message send failed:', result.error);
  }
}

testSendMessage().catch(console.error);
