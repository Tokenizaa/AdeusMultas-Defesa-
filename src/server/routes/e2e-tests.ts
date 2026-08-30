/**
 * @file e2e-tests.ts
 * DefesAi — Rotas Administrativas e de Consulta de Testes E2E
 */

import { Router } from 'express';
import { e2eTestRunnerService, ALL_E2E_SERVICES } from '../services/e2e-test-runner-service';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware';

const router = Router();

// ==========================================
// Rotas Administrativas Protegidas
// ==========================================

// Inicia uma nova execução de testes E2E
router.post('/admin/e2e-tests/run', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { services, triggeredBy } = req.body || {};
    const run = await e2eTestRunnerService.startRun(
      services,
      triggeredBy || (req.user ? req.user.email : 'Admin UI')
    );
    res.status(202).json({ success: true, run });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao iniciar execução de testes E2E', details: err.message });
  }
});

// Lista todas as execuções de testes E2E
router.get('/admin/e2e-tests/runs', authenticateToken, requireAdmin, async (req, res) => {
  const runs = await e2eTestRunnerService.listRuns();
  res.json({ runs, total: runs.length });
});

// Retorna detalhes de uma execução específica
router.get('/admin/e2e-tests/runs/:runId', authenticateToken, requireAdmin, async (req, res) => {
  const run = await e2eTestRunnerService.getRunById(req.params.runId);
  if (!run) {
    return res.status(404).json({ error: 'Execução E2E não encontrada' });
  }
  res.json({ run });
});

// Retorna a última execução de testes E2E
router.get('/admin/e2e-tests/latest', authenticateToken, requireAdmin, async (req, res) => {
  const run = await e2eTestRunnerService.getLatestRun();
  res.json({ run: run || null });
});

// Retorna estatísticas e metadados dos serviços E2E
router.get('/admin/e2e-tests/stats', authenticateToken, requireAdmin, async (req, res) => {
  const runs = await e2eTestRunnerService.listRuns();
  const latest = await e2eTestRunnerService.getLatestRun();
  
  const totalUnitTests = 216; // Suíte unitária perene do projeto
  const totalE2ETests = ALL_E2E_SERVICES.length * 4; // 36 cenários

  res.json({
    totalUnitTests,
    totalE2ETests,
    availableServices: ALL_E2E_SERVICES,
    totalRuns: runs.length,
    latestRun: latest || null,
    passRate: latest && latest.totalTests > 0
      ? Math.round((latest.passedTests / latest.totalTests) * 100)
      : 100,
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
