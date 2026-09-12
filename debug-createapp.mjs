process.on('uncaughtException', (e) => {
  console.error('[DEBUG] uncaughtException:', e.message, e.stack?.slice(0, 500));
  process.exit(1);
});

process.on('unhandledRejection', (r) => {
  console.error('[DEBUG] unhandledRejection:', r?.message || r);
  process.exit(1);
});

console.log('[DEBUG] STEP 0 - start');

import express from 'express';
console.log('[DEBUG] STEP 1 - express loaded');

// Test import chain step by step
console.log('[DEBUG] STEP 2 - importing createApp');
const { createApp } = await import('./src/server/app.ts');
console.log('[DEBUG] STEP 3 - createApp imported');

console.log('[DEBUG] STEP 4 - calling createApp()');
const app = createApp();
console.log('[DEBUG] STEP 5 - createApp() returned');

app.get('/test-debug', (req, res) => res.json({ ok: true }));

app.listen(5000, () => {
  console.log('[DEBUG] STEP 6 - LISTENING on 5000');
});
