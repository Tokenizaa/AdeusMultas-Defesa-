/**
 * @file e2e-tests.ts
 * DefesAi — Rotas Administrativas e de Consulta de Testes E2E
 */

import { Router } from 'express';
import { e2eTestRunnerService } from '../services/e2e-test-runner-service';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware';

const router = Router();

// ==========================================
// Rotas Administrativas Protegidas
// ==========================================

// A execução permanece bloqueada até existir um runner Playwright real e isolado.
router.post('/admin/e2e-tests/run', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    await e2eTestRunnerService.startRun();
    return res.status(202).json({ success: true });
  } catch (err: any) {
    if (err?.code === 'E2E_RUNNER_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Execução E2E indisponível neste ambiente.',
        code: 'E2E_RUNNER_NOT_CONFIGURED',
      });
    }
    return res.status(500).json({ error: 'Erro ao iniciar execução E2E.' });
  }
});

router.get('/admin/e2e-tests/runs', authenticateToken, requireAdmin, async (_req, res) => {
  const runs = await e2eTestRunnerService.listRuns();
  return res.json({ runs, total: runs.length, runnerStatus: 'NOT_CONFIGURED' });
});

router.get('/admin/e2e-tests/runs/:runId', authenticateToken, requireAdmin, async (_req, res) => {
  return res.status(404).json({ error: 'Nenhuma execução E2E verificada encontrada.' });
});

router.get('/admin/e2e-tests/latest', authenticateToken, requireAdmin, async (_req, res) => {
  return res.json({ run: null, runnerStatus: 'NOT_CONFIGURED' });
});

router.get('/admin/e2e-tests/stats', authenticateToken, requireAdmin, async (_req, res) => {
  return res.json({
    runnerStatus: 'NOT_CONFIGURED',
    executionEnabled: false,
    totalUnitTests: null,
    totalE2ETests: null,
    availableServices: [],
    totalRuns: 0,
    latestRun: null,
    passRate: null,
    message: 'Nenhuma execução é certificada até que o runner Playwright real esteja configurado.',
  });
});

// ==========================================
// Rota para o Dashboard do Usuário de Teste
// ==========================================

router.get('/e2e-tests/user-results', authenticateToken, async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const runs = await e2eTestRunnerService.listRuns();
  const matchedScenarios = [];

  for (const run of runs) {
    for (const suite of run.suites) {
      for (const scenario of suite.scenarios) {
        if (
          scenario.userEmail.toLowerCase() === user.email.toLowerCase() ||
          scenario.userName.toLowerCase() === (user.name || '').toLowerCase()
        ) {
          matchedScenarios.push({
            ...scenario,
            runId: run.id,
            runDate: run.startedAt,
          });
        }
      }
    }
  }

  res.json({
    userEmail: user.email,
    isTestUser: user.email.includes('@e2e.local') || user.email.startsWith('teste'),
    testScenarios: matchedScenarios,
  });
});

export default router;
