/* Auditoria E2E real — fluxo onboarding-v2 canônico contra servidor local + Supabase real + PagBank sandbox.
   Token: lido de token.tmp (JWT Supabase real do usuário fariasnetto01@gmail.com). NÃO imprime segredos. */
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:3100';
const TOKEN = readFileSync('token.tmp', 'utf8').trim();
const AUTH = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function call(path, options = {}, label = '') {
  const res = await fetch(BASE + path, options);
  const body = await res.json().catch(() => ({}));
  console.log(`[${label || path}] HTTP ${res.status}`);
  return { status: res.status, body, headers: res.headers };
}

async function main() {
  const stamp = Date.now().toString().slice(-6);

  // 1. Draft canônico (usuário autenticado → userId da sessão)
  const draft = await call('/api/onboarding-v2/draft', {
    method: 'POST', headers: AUTH,
    body: JSON.stringify({ payload: {
      procedureType: 'recurso_jari',
      vehicle: { plate: `TT${stamp}`, brandModel: 'VW GOL TESTE' },
      infraction: { aitNumber: `AIT-${stamp}`, infractionCode: '745-50', autuadorBody: 'PRF', description: 'Excesso de velocidade', dateTime: '2026-08-01T10:00:00Z', location: 'BR-101' },
      specificFacts: 'Teste E2E auditoria — conduzia o veículo dentro da velocidade da via no momento da autuação.',
    }, claimRequested: false }),
  }, 'POST draft');
  const caseId = draft.body?.case?.id;
  const claimToken = draft.body?.claimToken;
  console.log('caseId:', caseId, '| claimToken:', claimToken ? `present(${claimToken.length}ch)` : 'none');
  if (!caseId) { console.log('DRAFT FAILED', JSON.stringify(draft.body).slice(0, 300)); return; }

  // 2. Análise canônica
  const analysis = await call(`/api/onboarding-v2/cases/${caseId}/analysis`, { method: 'POST', headers: AUTH }, 'POST analysis');
  console.log('analysis:', analysis.body?.status, analysis.body?.analysis?.recommendedProcedure || '');

  // 3. Qualificação (dados válidos)
  const applicant = {
    applicantName: 'NETTO FARIAS TESTE', applicantCpf: '61256718010', applicantCnh: '05584043210',
    applicantPhone: '51994096322', applicantEmail: 'fariasnetto01@gmail.com',
    addressStreet: 'Rua Teste', addressNumber: '123', addressNeighborhood: 'Centro',
    addressZipCode: '90000000', addressCityState: 'Porto Alegre/RS',
  };
  const qual = await call(`/api/onboarding-v2/cases/${caseId}/qualification`, {
    method: 'PUT', headers: AUTH, body: JSON.stringify({ applicant }),
  }, 'PUT qualification');
  console.log('qualification status:', qual.body?.case?.status, 'stage:', qual.body?.case?.currentStage);

  // 4. Checkout PIX (PagBank sandbox)
  const pix = await call('/api/pix/create', {
    method: 'POST', headers: { ...AUTH, 'X-Claim-Token': claimToken || '' },
    body: JSON.stringify({ caseId, customerName: 'NETTO FARIAS TESTE', customerEmail: 'fariasnetto01@gmail.com', customerCpf: '61256718010', serviceType: 'recurso_jari', userId: '61256ed9-db81-4eff-a6ac-e3d23ae4f2a0' }),
  }, 'POST pix/create');
  const ref = pix.body?.referenceId || pix.body?.txId || pix.body?.paymentReference;
  console.log('pix/create:', pix.body?.status, '| ref:', ref, '| qrCodeText:', pix.body?.qrCodeText ? 'present' : 'none', '| gateway:', pix.body?.gateway || '?');
  if (!ref) { console.log('PIX_FAILED_BODY:', JSON.stringify(pix.body).slice(0, 400)); return; }

  // 5. Consulta status
  const status = await call(`/api/pix/status/${ref}`, { headers: AUTH }, 'GET pix/status');
  console.log('pix/status:', status.body?.status || status.body?.paymentStatus);

  // 6. Webhook PagBank (simulado sandbox — sem dinheiro real)
  const wh = await call('/api/sandbox/pagbank-webhook', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referenceId: ref, status: 'PAID' }),
  }, 'sandbox webhook');
  console.log('webhook:', wh.status, JSON.stringify(wh.body).slice(0, 150));

  // 7. Geração de defesa
  const gen = await call(`/api/cases/${caseId}/generate-defense`, {
    method: 'POST', headers: AUTH, body: JSON.stringify({ applicantData: { name: 'NETTO FARIAS TESTE' } }),
  }, 'POST generate-defense');
  console.log('generate-defense:', gen.status, '| defenseDraft:', gen.body?.defenseDraft ? 'present' : 'absent', '| status:', gen.body?.status);

  console.log('\n=== E2E DONE caseId=' + caseId + ' ===');
}

main().catch((e) => { console.error('E2E ERROR:', e.message); process.exit(1); });