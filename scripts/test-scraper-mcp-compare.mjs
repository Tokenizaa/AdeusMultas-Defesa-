/**
 * Teste de comparação: Scraper Automático vs MCP Playwright
 * Obtém JWT dinamicamente via login no Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Carregar .env
dotenv.config({ path: path.resolve('.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const ADMIN_EMAIL = process.env.ADMIN_TEST_LOGIN;
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD;

async function getJwt() {
  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Login falhou: ${error?.message}`);
  }
  return data.session.access_token;
}

async function runScrape(jwt) {
  const res = await fetch('http://localhost:3000/api/marketing/automation/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      queries: ['despachante de trânsito'],
      cities: ['São Paulo'],
      limitPerQuery: 50,
    }),
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  console.log('🔐 Obtendo JWT via login...');
  const jwt = await getJwt();
  console.log(`✅ JWT obtido (expira em 1h)\n`);

  console.log('=== EXECUTANDO SCRAPER AUTOMÁTICO ===');
  const start = Date.now();
  const result = await runScrape(jwt);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`totalFound: ${result.totalFound ?? 'N/A'}`);
  console.log(`inserted:   ${result.inserted ?? 'N/A'}`);
  console.log(`duplicates: ${result.duplicates ?? 'N/A'}`);
  console.log(`rejected:   ${result.rejected ?? 'N/A'}`);
  console.log(`errors:     ${result.errors?.length ?? 0}`);
  console.log(`tempo:      ${elapsed}s`);
  console.log('');
  console.log('Referência MCP (scrollTop container + 3s): 56');

  if (result.totalFound >= 50) {
    console.log('\n✅ SCRAPER atingiu >= 50 resultados (igual ou melhor que MCP)');
  } else if (result.totalFound >= 40) {
    console.log(`\n⚠️  SCRAPER com ${result.totalFound} — gap de ${56 - result.totalFound} vs MCP`);
  } else {
    console.log(`\n❌ SCRAPER com ${result.totalFound} — gap grande de ${56 - result.totalFound} vs MCP`);
  }
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});