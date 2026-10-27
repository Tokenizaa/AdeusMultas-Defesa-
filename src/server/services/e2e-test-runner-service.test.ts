import { describe, expect, it } from 'vitest';
import { e2eTestRunnerService } from './e2e-test-runner-service';

describe('E2ETestRunnerService without a real Playwright executor', () => {
  it('does not seed synthetic historical PASS runs', async () => {
    expect(await e2eTestRunnerService.listRuns()).toEqual([]);
    expect(await e2eTestRunnerService.getLatestRun()).toBeUndefined();
  });

  it('rejects execution instead of creating a fake queued or passed run', async () => {
    await expect(e2eTestRunnerService.startRun()).rejects.toMatchObject({
      code: 'E2E_RUNNER_NOT_CONFIGURED',
    });
    expect(await e2eTestRunnerService.listRuns()).toEqual([]);
  });
});
