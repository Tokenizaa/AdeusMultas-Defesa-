import { Router } from 'express';
import { databaseRows } from '../app';
import { CanonicalMapper } from '../../core/mappers/canonical-mapper';
import { authenticateToken } from '../middleware/auth-middleware';

const router = Router();

/**
 * GET /api/analytics/dashboard
 * Performance & Business Analytics Dashboard — real metrics from caseRepository.
 */
router.get('/analytics/dashboard', authenticateToken, (req, res) => {
  const allCases = Array.from(databaseRows.values()).map((r) => CanonicalMapper.rowToDomain(r));

  // Métricas REAIS calculadas do banco de dados
  const totalProcessed = allCases.length;
  const paidCases = allCases.filter(
    (c) =>
      Boolean(c.isPaid) ||
      c.payment?.status === 'approved' ||
      c.statusPagamento === 'pago' ||
      c.status === 'defesa_pronta'
  );

  // Taxa de deferimento baseada em cases com análise
  const analyzedCases = allCases.filter((c) => c.analysis || c.analiseIA);
  const successfulCases = analyzedCases.filter((c) => {
    const score = c.analysis?.overallSuccessRate || c.analiseIA?.scoreDeferimento || 0;
    return score >= 70;
  });
  const deferralRate =
    analyzedCases.length > 0
      ? Number(((successfulCases.length / analyzedCases.length) * 100).toFixed(1))
      : 0;

  // MRR baseado em pagamentos confirmados
  const mrr = paidCases.reduce((sum, c) => sum + (c.payment?.amount || 89.9), 0);

  // Economia gerada estimada (R$ 240 por caso processado)
  const economiasGeradasEstimadas = totalProcessed * 240.0;

  // Distribuição por órgão real
  const orgaosMap = new Map<string, { count: number; success: number }>();
  allCases.forEach((c) => {
    const orgao = c.infraction?.autuadorBody || 'Não informado';
    const current = orgaosMap.get(orgao) || { count: 0, success: 0 };
    current.count++;
    const score = c.analysis?.overallSuccessRate || c.analiseIA?.scoreDeferimento || 0;
    if (score >= 70) current.success++;
    orgaosMap.set(orgao, current);
  });

  const distribuicaoOrgaos = Array.from(orgaosMap.entries())
    .map(([orgao, data]) => ({
      orgao,
      percentual: totalProcessed > 0 ? Number(((data.count / totalProcessed) * 100).toFixed(1)) : 0,
      taxaSucesso: data.count > 0 ? Number(((data.success / data.count) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.percentual - a.percentual)
    .slice(0, 5);

  // Top infrações real
  const infracaoMap = new Map<string, { nome: string; count: number; gravidade: string }>();
  allCases.forEach((c) => {
    const code = c.infraction?.infractionCode || 'N/A';
    const desc = c.infraction?.description || 'Infração';
    const sev = c.infraction?.severity || 'N/A';
    const current = infracaoMap.get(code) || { nome: desc, count: 0, gravidade: sev };
    current.count++;
    infracaoMap.set(code, current);
  });

  const topInfracoes = Array.from(infracaoMap.entries())
    .map(([codigo, data]) => ({ codigo, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({
    totalProcessed,
    deferralRate,
    mrr,
    economiasGeradasEstimadas,
    distribuicaoOrgaos,
    topInfracoes,
  });
});

export default router;
