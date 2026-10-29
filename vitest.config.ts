import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Gate jurídico determinístico: testes do núcleo legal, marketing-automation
    // e contratos Cloudflare. Suítes que exigem ambiente próprio (Supabase/DB)
    // ficam fora deste gate.
    include: [
      'src/core/**/*.test.ts',
      'src/core/onboarding/legal-validation.test.ts',
      'src/core/onboarding/reference-cases-legal-validation.test.ts',
      'src/components/checkout/checkout-pix-only.test.tsx',
      'src/components/onboarding/steps/onboarding-copy-regression.test.tsx',
      'src/lib/supabase.test.ts',
      'src/server/services/marketing-automation/**/*.test.ts',
      'src/server/middleware/auth-middleware.test.ts',
      'src/server/routes/monitoring.test.ts',
      'src/server/services/admin-user-detail-service.test.ts',
      'src/server/services/e2e-test-runner-service.test.ts',
      'src/server/services/admin-ai-overview.test.ts',
      'src/server/observability/ai-provider-manager.test.ts',
      'src/server/services/admin-integrations-overview.test.ts',
      'src/server/services/admin-integrations-overview.test.ts',
      'cloudflare/middleware.test.ts',
      'cloudflare/routes/**/*.test.ts',
      'cloudflare/venopag.test.ts',
      'cloudflare/defense-integrity.test.ts',
    ],
    setupFiles: ['./tests/vitest.env.setup.ts', './tests/vitest-network.setup.ts'],
    environment: 'node',
    fileParallelism: false,
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
