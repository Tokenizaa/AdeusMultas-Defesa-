import fetch from 'node-fetch';
import 'dotenv/config';

const token = process.env.PAGBANK_TOKEN;
const env = process.env.PAGBANK_ENV;
const url = env === 'production' ? 'https://api.pagseguro.com' : 'https://sandbox.api.pagseguro.com';

console.log('Token:', token?.substring(0, 10) + '...');
console.log('Env:', env);
console.log('URL:', url);

const testUrl = url + '/orders';
console.log('Testando:', testUrl);

try {
  const res = await fetch(testUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify({
      reference_id: 'test_phase4_' + Date.now(),
      customer: {
        name: 'Teste Fase 4',
        email: 'teste@email.com',
        tax_id: '12345678909',
      },
      items: [{
        reference_id: 'service_test',
        name: 'Teste Fase 4',
        quantity: 1,
        unit_amount: 100,
      }],
      qr_codes: [{
        amount: { value: 100 },
        expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }],
      // notification_urls removido para teste local
    }),
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
} catch (err) {
  console.error('Error:', err);
}