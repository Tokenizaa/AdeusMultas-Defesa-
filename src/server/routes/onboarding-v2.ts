import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { databaseRows } from '../app';
import { CanonicalMapper } from '../../core/mappers/canonical-mapper';
import { RagPipeline } from '../../core/rag/rag-pipeline';

const router = Router();
const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const authorized = (req: any, row: any): boolean => {
  const uid = isUuid(req.user?.id) ? req.user.id : undefined;
  return row.user_id === uid || (!row.user_id && req.header('X-Claim-Token') === row.claim_token);
};

router.post('/onboarding-v2/draft', async (req, res) => {
  const p = req.body?.payload;
  if (!p?.vehicle?.plate || !p.vehicle.brandModel || !p.infraction?.aitNumber || !p.infraction.infractionCode || !p.infraction.autuadorBody) return res.status(400).json({ error: 'Dados mínimos do caso incompletos.', code: 'DRAFT_MINIMUM_DATA_REQUIRED' });
  const now = new Date().toISOString();
  const claimToken = randomUUID();
  const userId = isUuid(req.user?.id) ? req.user.id : undefined;
  const domain: any = { id: `case_${randomUUID()}`, title: `Defesa — ${p.infraction.aitNumber}`, clientName: p.leadName || 'Anônimo', userId, isAnonymous: !userId, status: 'rascunho', currentStage: 0, isPaid: false, createdAt: now, updatedAt: now, serviceType: p.procedureType, vehicle: p.vehicle, infraction: p.infraction, specificFacts: p.specificFacts, evidence: p.evidence, claimToken, timeline: [] };
  const row = CanonicalMapper.domainToRow(domain);
  await databaseRows.set(domain.id, row);
  res.status(201).json({ case: CanonicalMapper.rowToDomain(row), claimToken });
});

router.put('/onboarding-v2/draft', async (req, res) => {
  const { caseId, payload, claimToken } = req.body || {};
  const row = databaseRows.get(caseId);
  if (!row) return res.status(404).json({ error: 'Caso não encontrado.' });
  if (!authorized(req, row) && claimToken !== row.claim_token) return res.status(403).json({ error: 'Acesso ao caso não autorizado.' });
  const domain: any = CanonicalMapper.rowToDomain(row);
  Object.assign(domain, { serviceType: payload?.procedureType, vehicle: payload?.vehicle, infraction: payload?.infraction, specificFacts: payload?.specificFacts, evidence: payload?.evidence, updatedAt: new Date().toISOString() });
  const updated = CanonicalMapper.domainToRow(domain); await databaseRows.set(caseId, updated);
  res.json({ case: CanonicalMapper.rowToDomain(updated) });
});

router.post('/onboarding-v2/cases/:id/analysis', async (req, res) => {
  const row = databaseRows.get(req.params.id);
  if (!row || !authorized(req, row)) return res.status(row ? 403 : 404).json({ error: row ? 'Acesso ao caso não autorizado.' : 'Caso não encontrado.' });
  const domain: any = CanonicalMapper.rowToDomain(row);
  if (!domain.infraction) return res.status(400).json({ error: 'Infração incompleta para análise.' });
  domain.analysis = RagPipeline.analyzeInfraction(domain.id, domain.infraction); domain.status = 'analisado'; domain.currentStage = 3; domain.updatedAt = new Date().toISOString();
  const updated = CanonicalMapper.domainToRow(domain); await databaseRows.set(domain.id, updated);
  res.json({ status: 'completed', analysis: domain.analysis });
});

export default router;
