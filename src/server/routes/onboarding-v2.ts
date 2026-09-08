import crypto from 'node:crypto';
import { Router } from 'express';
import { databaseRows } from '../app';
import { CanonicalMapper } from '../../core/mappers/canonical-mapper';
import { RagPipeline } from '../../core/rag/rag-pipeline';
import { ocrService } from '../services/ocr-service';
import type { CanonicalOnboardingPayload, CaseDomain, CaseApplicantData } from '../../types';
import { authenticateToken } from '../middleware/auth-middleware';

const router = Router();
router.use(authenticateToken);

const CLAIM_HEADER = 'X-Claim-Token';

function tokenMatches(provided: unknown, stored: unknown): boolean {
  if (typeof provided !== 'string' || typeof stored !== 'string' || !provided || !stored) return false;
  const a = Buffer.from(provided); const b = Buffer.from(stored);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function authorized(req: any, row: any): boolean {
  if (req.user?.role === 'admin') return true;
  if (req.user?.id && row.user_id === req.user.id) return true;
  return tokenMatches(req.header(CLAIM_HEADER), row.claim_token);
}

async function getAuthorizedCase(req: any, res: any, id: string) {
  try {
    const row = await databaseRows.getPersisted(id);
    if (!row) { res.status(404).json({ error: 'Caso não encontrado.' }); return null; }
    if (!authorized(req, row)) { res.status(403).json({ error: 'Acesso ao caso não autorizado.' }); return null; }
    return row;
  } catch (error) {
    console.error('[onboarding-v2] read persisted case', error);
    res.status(503).json({ error: 'Persistência do caso indisponível.', code: 'CASE_PERSISTENCE_UNAVAILABLE' });
    return null;
  }
}

router.post('/onboarding-v2/draft', async (req, res) => {
  try {
    const payload = req.body?.payload as CanonicalOnboardingPayload | undefined;
    if (!payload?.vehicle?.plate || !payload.vehicle.brandModel || !payload.infraction?.aitNumber || !payload.infraction.infractionCode || !payload.infraction.autuadorBody) return res.status(400).json({ error: 'Dados mínimos do caso incompletos.', code: 'DRAFT_MINIMUM_DATA_REQUIRED' });
    const id = `case_${crypto.randomUUID()}`; const claimToken = crypto.randomBytes(32).toString('hex');
    const domain = CanonicalMapper.onboardingPayloadToDomain(payload, id);
    const caseDomain: CaseDomain = { ...domain, userId: req.user?.id, isAnonymous: !req.user?.id, claimToken, status: 'draft', currentStage: 1, createdAt: domain.createdAt, updatedAt: new Date().toISOString() };
    const row = CanonicalMapper.domainToRow(caseDomain); await databaseRows.set(id, row);
    return res.status(201).json({ case: CanonicalMapper.rowToDomain(row), claimToken });
  } catch (error) { console.error('[onboarding-v2] create draft', error); return res.status(500).json({ error: 'Falha ao criar caso.' }); }
});

router.put('/onboarding-v2/draft', async (req, res) => {
  const { caseId, payload } = req.body || {};
  const row = await getAuthorizedCase(req, res, String(caseId || '')); if (!row) return;
  const current = CanonicalMapper.rowToDomain(row); const nextPayload = payload as CanonicalOnboardingPayload | undefined;
  if (!nextPayload) return res.status(400).json({ error: 'Payload canônico obrigatório.' });
  const next = CanonicalMapper.onboardingPayloadToDomain(nextPayload, current.id);
  const merged: CaseDomain = { ...current, ...next, id: current.id, userId: current.userId, claimToken: current.claimToken, isAnonymous: current.isAnonymous, isPaid: current.isPaid, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
  await databaseRows.set(current.id, CanonicalMapper.domainToRow(merged)); return res.json({ case: merged });
});

router.get('/onboarding-v2/draft/:id', async (req, res) => { const row = await getAuthorizedCase(req, res, req.params.id); if (!row) return; return res.json(CanonicalMapper.rowToDomain(row)); });

router.post('/onboarding-v2/cases/:id/evidence', async (req, res) => {
  const row = await getAuthorizedCase(req, res, req.params.id); if (!row) return;
  const { base64, filename, mimeType } = req.body || {};
  if (typeof base64 !== 'string' || !base64) return res.status(400).json({ error: 'Conteúdo da evidência obrigatório.', code: 'EVIDENCE_CONTENT_REQUIRED' });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(String(mimeType))) return res.status(415).json({ error: 'Formato não suportado para OCR de imagem.', code: 'EVIDENCE_MIME_UNSUPPORTED' });
  const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, ''); const bytes = Buffer.from(cleanBase64, 'base64');
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'Evidência deve ter entre 1 byte e 5MB.', code: 'EVIDENCE_SIZE_INVALID' });
  try {
    const result = await ocrService.analyzeImage(cleanBase64); const current = CanonicalMapper.rowToDomain(row); const matched = RagPipeline.findInfraction(result.dadosExtraidos.codigoInfracao);
    const infraction = { ...current.infraction, aitNumber: result.dadosExtraidos.aitNumber || current.infraction.aitNumber, infractionCode: result.dadosExtraidos.codigoInfracao || current.infraction.infractionCode, description: result.dadosExtraidos.descricao || current.infraction.description, ctbArticle: result.dadosExtraidos.artigoCtb || current.infraction.ctbArticle, autuadorBody: result.dadosExtraidos.orgaoAutuador || current.infraction.autuadorBody, dateTime: result.dadosExtraidos.dataInfracao || current.infraction.dateTime, location: result.dadosExtraidos.localInfracao || current.infraction.location, severity: matched?.severity || current.infraction.severity, points: matched?.points ?? current.infraction.points, fineAmount: matched?.fineAmount ?? current.infraction.fineAmount };
    const vehicle = { ...current.vehicle, plate: result.dadosExtraidos.placa || current.vehicle.plate };
    const ocrAuxiliaryData = { ...(current.ocrAuxiliaryData || {}), extractedText: result.textoCompleto, confidenceScore: result.confianca, provider: result.provedor, filename, mimeType, processedAt: new Date().toISOString() };
    const next: CaseDomain = { ...current, infraction, vehicle, ocrAuxiliaryData, updatedAt: new Date().toISOString() }; await databaseRows.set(current.id, CanonicalMapper.domainToRow(next));
    return res.json({ case: next, ocr: { provider: result.provedor, confidence: result.confianca, rawText: result.textoCompleto } });
  } catch (error) { console.error('[onboarding-v2] evidence OCR', error); return res.status(502).json({ error: 'Falha ao processar evidência.', code: 'EVIDENCE_OCR_FAILED' }); }
});

router.post('/onboarding-v2/cases/:id/analysis', async (req, res) => { const row = await getAuthorizedCase(req, res, req.params.id); if (!row) return; const domain = CanonicalMapper.rowToDomain(row); if (!domain.infraction?.aitNumber || !domain.infraction?.infractionCode) return res.status(400).json({ error: 'Infração incompleta para análise.' }); const analysis = RagPipeline.analyzeInfraction(domain.id, domain.infraction); const updated: CaseDomain = { ...domain, analysis, status: 'analisado', currentStage: 2, updatedAt: new Date().toISOString() }; await databaseRows.set(domain.id, CanonicalMapper.domainToRow(updated)); return res.json({ caseId: domain.id, status: 'completed', analysis }); });

router.get('/onboarding-v2/cases/:id/analysis', async (req, res) => { const row = await getAuthorizedCase(req, res, req.params.id); if (!row) return; const domain = CanonicalMapper.rowToDomain(row); if (!domain.analysis) return res.status(404).json({ caseId: domain.id, status: 'pending' }); return res.json({ caseId: domain.id, status: 'completed', analysis: domain.analysis }); });

router.put('/onboarding-v2/cases/:id/qualification', async (req, res) => {
  const row = await getAuthorizedCase(req, res, req.params.id); if (!row) return;
  const applicant = req.body?.applicant as CaseApplicantData | undefined;
  if (!applicant?.applicantName || !applicant.applicantCpf || !applicant.applicantCnh || !applicant.applicantPhone || !applicant.applicantEmail || !applicant.addressStreet || !applicant.addressNumber || !applicant.addressNeighborhood || !applicant.addressZipCode || !applicant.addressCityState) return res.status(400).json({ error: 'Dados de qualificação incompletos.', code: 'QUALIFICATION_REQUIRED' });
  const cpf = applicant.applicantCpf.replace(/\D/g, '');
  if (!/^\d{11}$/.test(cpf)) return res.status(400).json({ error: 'CPF inválido.', code: 'QUALIFICATION_CPF_INVALID' });
  const current = CanonicalMapper.rowToDomain(row); const updated: CaseDomain = { ...current, applicant: { ...applicant, applicantCpf: cpf }, clientName: applicant.applicantName, clientCpf: cpf, clientEmail: applicant.applicantEmail, clientPhone: applicant.applicantPhone, status: 'aguardando_pagamento', currentStage: 3, updatedAt: new Date().toISOString() };
  await databaseRows.set(current.id, CanonicalMapper.domainToRow(updated)); return res.json({ case: updated });
});

export default router;
