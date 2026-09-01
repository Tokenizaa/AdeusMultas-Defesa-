import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!url || !serviceRoleKey) {
  logger.warn('Supabase environment variables missing for scraper service client.');
}

const safeUrl = url.startsWith('http') ? url : 'https://placeholder.supabase.co';
const safeKey = serviceRoleKey || 'placeholder-key';

export const supabaseAdmin = createClient(safeUrl, safeKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});