// FASE 5.1 — critical env vars fail-closed behavior.
const criticalEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'];
const missing = criticalEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`Missing critical environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// optionalButImportant should not include the critical vars
const optionalButImportant = ['dummy'] as string[];
