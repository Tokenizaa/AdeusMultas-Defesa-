import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const supabaseAdmin = url && serviceRoleKey
  ? createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;