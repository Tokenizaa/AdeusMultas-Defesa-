/**
 * @file scripts/apply-migrations.mjs
 * Aplica migrations SQL no Supabase via Management API (token em SUPABASE_ACCESS_TOKEN).
 * Uso: node scripts/apply-migrations.mjs <arquivo.sql> [...]
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';

const ref = process.env.SUPABASE_PROJECT_ID || 'sgomwklorpzdwdubtmgg';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN ausente');
  process.exit(1);
}
const base = `https://api.supabase.com/v1/projects/${ref}/database/query`;

for (const file of process.argv.slice(2)) {
  const sql = readFileSync(file, 'utf8');
  const stmts = sql
    .split(/;\s*\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !/^--/.test(s));
  for (const stmt of stmts) {
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: stmt }),
    });
    const text = await res.text();
    console.log(`[${res.status}] ${stmt.slice(0, 60).replace(/\n/g, ' ')}... => ${text.slice(0, 100)}`);
    if (!res.ok) process.exitCode = 1;
  }
}