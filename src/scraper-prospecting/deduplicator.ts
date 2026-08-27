import { Lead } from './types';
import { supabaseAdmin } from './supabase';
import { logger } from './logger';

export interface DedupResult {
  isDuplicate: boolean;
  reason?: string;
}

export async function checkDuplicate(lead: Lead): Promise<DedupResult> {
  const phone = lead.phone_normalized || lead.phone;
  const website = lead.website;
  const email = lead.email;
  const sourceUrl = lead.sourceUrl;

  const checks: Array<Promise<{ data: Lead[] | null; error?: unknown }>> = [];

  if (phone) {
    checks.push(
      supabaseAdmin
        .from('marketing_leads')
        .select('id, phone_normalized')
        .eq('phone_normalized', phone)
        .limit(1) as any
    );
  }
  if (website) {
    checks.push(
      supabaseAdmin
        .from('marketing_leads')
        .select('id, website')
        .eq('website', website)
        .limit(1) as any
    );
  }
  if (email) {
    checks.push(
      supabaseAdmin
        .from('marketing_leads')
        .select('id, email')
        .eq('email', email)
        .limit(1) as any
    );
  }
  if (sourceUrl) {
    checks.push(
      supabaseAdmin
        .from('marketing_leads')
        .select('id, source, source_url')
        .eq('source', lead.source)
        .eq('source_url', sourceUrl)
        .limit(1) as any
    );
  }

  const results = await Promise.all(checks);
  for (const r of results) {
    if ((r as { error?: unknown }).error) {
      logger.error('Erro ao consultar deduplicação', { error: (r as { error?: unknown }).error });
      continue;
    }
    const rows = (r as { data: Lead[] | null }).data;
    if (rows && rows.length > 0) {
      const found = rows[0];
      if (phone && found.phone_normalized === phone) return { isDuplicate: true, reason: 'phone' };
      if (website && found.website === website) return { isDuplicate: true, reason: 'website' };
      if (email && found.email === email) return { isDuplicate: true, reason: 'email' };
      if (sourceUrl && (found as { sourceUrl?: string }).sourceUrl === sourceUrl) return { isDuplicate: true, reason: 'source_url' };
    }
  }

  return { isDuplicate: false };
}