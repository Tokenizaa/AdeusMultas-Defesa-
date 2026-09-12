// Dispara webhook PagBank com assinatura HMAC-SHA256 válida (como o gateway real faria).
import 'dotenv/config';
const crypto = await import('node:crypto');

const base = process.argv[2] || 'http://localhost:3001';
const caseId = process.argv[3];
if (!caseId) { console.error('uso: tsx scripts/sim-webhook.mjs <base> <caseId>'); process.exit(1); }

const payload = {
  id: `evt_real_${Date.now()}`,
  reference_id: `defesai_case_${caseId}`,
  created_at: new Date().toISOString(),
  charges: [{
    id: `ch_real_${Date.now()}`,
    reference_id: `defesai_case_${caseId}`,
    status: 'PAID',
    created_at: new Date().toISOString(),
    paid_at: new Date().toISOString(),
    amount: { value: 2997, currency: 'BRL' },
    payment_method: { type: 'PIX' },
  }],
};
const rawBody = JSON.stringify(payload);
const secret = process.env.PAGBANK_WEBHOOK_SECRET || '';
const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
const res = await fetch(`${base}/api/payments/webhooks/pagbank`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': `sha256=${sig}` },
  body: rawBody,
});
console.log(`HTTP=${res.status}`);
console.log((await res.text()).slice(0, 500));