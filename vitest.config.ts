import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Gate jurídico determinístico: testes do núcleo legal, marketing-automation
    // e contratos Cloudflare. Suítes que exigem ambiente próprio (Supabase/DB)
    // ficam fora deste gate.
    include: [
      'src/core/**/*.test.ts',
      'src/components/checkout/checkout-pix-only.test.tsx',
      'src/server/services/marketing-automation/**/*.test.ts',
      'cloudflare/routes/**/*.test.ts',
      'cloudflare/venopag.test.ts',
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
