import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Gate jurídico determinístico: suíte de auditoria + testes do núcleo legal.
    // Suítes pré-existentes (invariants/settings/workers/media) exigem ambiente
    // próprio (Supabase/DB) e ficam fora deste gate (ver docs/audit P3-1).
    include: [
      'tests/audit/**/*.test.ts',
      'src/core/**/*.test.ts',
      'tests/payments/**/*.test.ts',
      'tests/unit/**/*.test.ts',
    ],
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