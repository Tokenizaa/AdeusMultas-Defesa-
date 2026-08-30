/**
 * WhatsApp Journey Router (ADR-013 / P0.2)
 * 
 * Decide se um inbound WhatsApp segue jornada B2C_AUTO (IA auto-responder)
 * ou B2B_RELATIONSHIP (prospectado — sem auto-resposta, cadence preserva 'responded').
 * 
 * Query: marketing_leads where phone_normalized = incoming AND audience = 'B2B'
 * Retorna 'B2B_RELATIONSHIP' se achou, senão 'B2C_AUTO'.
 */

import { logger } from '../observability/logger';
import { getSupabaseServerClient } from '../db/supabase-server';
import { normalizeBrPhone } from './prospecting-responder';
import { NormalizedIncomingMessage } from '../../types/messaging';

export type JourneyType = 'B2C_AUTO' | 'B2B_RELATIONSHIP';

export interface WhatsAppJourneyRouter {
  resolveJourney(incoming: NormalizedIncomingMessage): Promise<JourneyType>;
}

const singletonRouter: WhatsAppJourneyRouter = {
  async resolveJourney(incoming: NormalizedIncomingMessage): Promise<JourneyType> {
    const start = Date.now();
    const client = getSupabaseServerClient();
    
    if (!client) {
      logger.warn('messaging', 'journey_router', 'no_client', 'Supabase client unavailable — defaulting to B2C_AUTO');
      return 'B2C_AUTO';
    }

    // 1. Normalize phone from incoming.externalContactId
    const phone = normalizeBrPhone(incoming.externalContactId);
    if (!phone) {
      logger.debug('messaging', 'journey_router', 'no_phone', 'Empty normalized phone — defaulting to B2C_AUTO');
      return 'B2C_AUTO';
    }

    try {
      // 2. Query marketing_leads where phone_normalized = phone AND audience = 'B2B'
      // Table not in generated types yet — cast to any to bypass TS check
      const { data: lead, error } = await (client as any)
        .from('marketing_leads')
        .select('id, lead_type, audience')
        .eq('phone_normalized', phone)
        .eq('audience', 'B2B')
        .maybeSingle();

      if (error) {
        logger.error('messaging', 'journey_router', 'query_error', `Supabase query failed: ${error.message}`);
        return 'B2C_AUTO';
      }

      // 3. If match → B2B_RELATIONSHIP, else → B2C_AUTO
      const journey = lead ? 'B2B_RELATIONSHIP' : 'B2C_AUTO';
      
      const duration = Date.now() - start;
      logger.debug('messaging', 'journey_router', 'resolved', `Journey resolved`, {
        phone: phone.slice(-4).padStart(4, '*'), // log last 4 digits only
        journey,
        durationMs: duration,
        leadId: lead?.id,
      });

      return journey;
    } catch (err: any) {
      logger.error('messaging', 'journey_router', 'unexpected_error', `Unexpected error: ${err.message}`);
      return 'B2C_AUTO';
    }
  },
};

export const whatsappJourneyRouter = singletonRouter;