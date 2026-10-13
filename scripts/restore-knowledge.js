#!/usr/bin/env node
/**
 * Script to restore knowledge base data to Supabase
 * Reads the FASE-9 recovery SQL and executes it against the remote Supabase project
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Credentials must come from the environment; never commit service-role keys.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in the environment');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function executeSQL(sql, description) {
  console.log(`\n=== ${description} ===`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error(`Error executing ${description}:`, error.message);
      return false;
    }
    console.log(`Success: ${description}`);
    return true;
  } catch (err) {
    console.error(`Exception executing ${description}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('Starting knowledge base restoration...');

  // Read the recovery SQL file
  const sqlPath = path.join(__dirname, '..', 'supabase', 'recovery', 'FASE-9-RECONCILIACAO-DETERMINISTICA.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  // Split by semicolon followed by newline (simple approach)
  // The file has multiple INSERT statements separated by semicolons and newlines
  const statements = sqlContent
    .split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} SQL statements to execute`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt.length < 10) continue; // Skip very short statements

    const isInsert = stmt.toUpperCase().startsWith('INSERT');
    const isUpdate = stmt.toUpperCase().startsWith('UPDATE');
    const isSelect = stmt.toUpperCase().startsWith('SELECT');

    let desc = `Statement ${i + 1}`;
    if (isInsert) desc = `INSERT ${i + 1}`;
    else if (isUpdate) desc = `UPDATE ${i + 1}`;
    else if (isSelect) desc = `SELECT validation ${i + 1}`;

    const success = await executeSQL(stmt + ';', desc);
    if (success) successCount++;
    else errorCount++;

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  // Verify restoration
  console.log('\n=== VERIFICATION ===');
  await verifyRestoration();
}

async function verifyRestoration() {
  const tables = [
    'knowledge_sources',
    'knowledge_documents',
    'knowledge_document_versions',
    'knowledge_chunks',
    'knowledge_embeddings'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`${table}: Error - ${error.message}`);
      } else {
        console.log(`${table}: ${count} rows`);
      }
    } catch (err) {
      console.log(`${table}: Exception - ${err.message}`);
    }
  }
}

main().catch(console.error);
