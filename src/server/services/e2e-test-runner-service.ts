/**
 * @file e2e-test-runner-service.ts
 * Runner E2E administrativo.
 *
 * Segurança: esta implementação não simula execuções, não semeia histórico aprovado
 * e não grava casos/usuários de teste. Até existir um executor Playwright real e
 * isolado, solicitações de execução falham explicitamente com E2E_RUNNER_NOT_CONFIGURED.
 */
export type E2ERunStatus = 'QUEUED' | 'RUNNING' | 'PASSED' | 'FAILED' | 'PARTIAL' | 'CANCELLED';

export interface E2ETestUserRecord {
  index: number;
  userId: string;
  name: string;
  email: string;
  cpf: string;
  cnh: string;
  role: 'citizen';
  service: string;
  createdAt: string;
}

export interface E2EScenarioResult {
  scenarioId: string;
  scenarioName: string;
  serviceKey: string;
  userIndex: number;
  userName: string;
  userEmail: string;
  caseId: string;
  aitNumber: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  integrityScore: number;
  watermark: string;
  steps: {
    name: string;
    status: 'PASSED' | 'FAILED';
    durationMs: number;
    details?: string;
  }[];
  errorMessage?: string;
  assembledDocumentSnippet?: string;
}

export interface E2EServiceSuiteResult {
  serviceKey: string;
  serviceName: string;
  totalScenarios: number;
  passed: number;
  failed: number;
  status: 'PASSED' | 'FAILED' | 'RUNNING' | 'PENDING';
  durationMs: number;
  scenarios: E2EScenarioResult[];
}

export interface E2ETestRun {
  id: string;
  status: E2ERunStatus;
  startedAt: string;
  completedAt?: string;
  triggeredBy: string;
  selectedServices: string[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  durationMs: number;
  suites: E2EServiceSuiteResult[];
  createdUsers: E2ETestUserRecord[];
  createdCases: string[];
  logs: string[];
}

class E2ETestRunnerService {
  // Legacy rows are intentionally hidden until their execution provenance can be verified.
  // No historical synthetic run is deleted from storage; it is simply not certified as evidence.
  public async listRuns(): Promise<E2ETestRun[]> {
    return [];
  }

  public async getRunById(_id: string): Promise<E2ETestRun | undefined> {
    return undefined;
  }

  public async getLatestRun(): Promise<E2ETestRun | undefined> {
    return undefined;
  }

  public async startRun(_services?: string[], _triggeredBy = 'Admin Console'): Promise<E2ETestRun> {
    const error = new Error(
      'Execução E2E real indisponível: o runner Playwright não está configurado para este ambiente. Nenhum resultado sintético foi criado.'
    ) as Error & { code: string };
    error.code = 'E2E_RUNNER_NOT_CONFIGURED';
    throw error;
  }
}

export const e2eTestRunnerService = new E2ETestRunnerService();
