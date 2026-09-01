/**
 * @file prospecting-responder.ts
 * Acoplamento ADITIVO: webhook inbound (WhatsApp/Evolution) <-> prospecção B2B (Supabase).
 *
 * Quando um lead prospectado responde, persiste a mensagem em `marketing_messages`
 * e marca `marketing_lead_campaigns.status='responded'`.
 *
 * Nunca quebra o fluxo in-memory do inbox: qualquer erro é logado e engolido
 * (retorna resultado com matched=false).
 */

import { logger } from '../observability/logger';
import { getSupabaseServerClient } from '../db/supabase-server';

/**
 * Normaliza telefone BR para comparação: apenas dígitos; remove o 55 do DDI
 * quando presente (`/^55\d{10,11}$/` -> 12/13 dígitos).
 * Reutiliza o mesmo padrão de `src/scraper-prospecting/normalizer.ts` sem importar do scraper.
 */
export function normalizeBrPhone(input: string | null | undefined): string {
  if (!input) return '';
  let digits = String(input).replace(/\D/g, '');
  if (/^55\d{10,11}$/.test(digits)) {
    digits = digits.slice(2);
  }
  return digits;
}

export interface ProspectingResponseResult {
  matched: boolean;
  messageInserted: boolean;
  statusUpdated: boolean;
}

const ACTIVE_LC_STATUSES = ['queued', 'sent', 'delivered', 'paused'];
const RESPONDED_OR_BEYOND = ['responded', 'converted', 'exhausted'];

export async function persistProspectingResponse(
  incoming: {
    externalContactId?: string;
    externalMessageId?: string;
    text?: string;
    channel?: string;
    timestamp?: string;
  },
  client: any = getSupabaseServerClient()
): Promise<ProspectingResponseResult> {
  const none: ProspectingResponseResult = { matched: false, messageInserted: false, statusUpdated: false };
  if (!client) return none;

  const inboundPhone = normalizeBrPhone(incoming.externalContactId);
  if (!inboundPhone) return none;

  try {
    // 1. Encontra lead cujo phone/whatsapp (normalizado) == remetente
    const { data: leads } = await client.from('marketing_leads').select('id, phone, whatsapp').limit(50);
    const leadList = Array.isArray(leads) ? leads : [];
    const lead = leadList.find(
      (l: any) => normalizeBrPhone(l.phone) === inboundPhone || normalizeBrPhone(l.whatsapp) === inboundPhone
    );
    if (!lead) return none;

    // 2. Lead_campaign ativa (mais recente)
    const { data: lc } = await client
      .from('marketing_lead_campaigns')
      .select('id, campaign_id, lead_id, status')
      .eq('lead_id', lead.id)
      .in('status', ACTIVE_LC_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lc) return none;

    // 3. Idempotência: mensagem externa já persistida? (retry do webhook não duplica insert)
    const externalId = incoming.externalMessageId;
    let alreadyPersisted = false;
    if (externalId) {
      const { data: existing } = await client
        .from('marketing_messages')
        .select('id')
        .eq('lead_id', lead.id)
        .eq('external_id', externalId)
        .maybeSingle();
      alreadyPersisted = Boolean(existing);
    }

    // 4. Persiste mensagem inbound (se ainda não existir — sem duplicar)
    let inserted = false;
    const now = new Date().toISOString();
    if (!alreadyPersisted) {
      const { error: insError } = await client.from('marketing_messages').insert({
        lead_id: lead.id,
        campaign_id: lc.campaign_id,
        lead_campaign_id: lc.id,
        direction: 'inbound',
        text: incoming.text || '',
        channel: incoming.channel || 'whatsapp_evolution',
        status: 'delivered',
        external_id: externalId || null,
        sent_at: incoming.timestamp || now,
      });
      if (insError) {
        logger.warn('messaging', 'prospecting', 'insert_error', `Falha ao inserir mensagem inbound de prospecção: ${insError.message}`);
        return { matched: true, messageInserted: false, statusUpdated: false };
      }
      inserted = true;
    }

    // 5. Detecta se é opt-out ou resposta normal
    const textLower = (incoming.text || '').trim().toLowerCase();
    const isOptOut =
      /^(sair|parar|stop|descadastrar|cancelar|não quero|nao quero|remover|optout|opt-out)$/i.test(textLower) ||
      /(quero sair|me tire|pare de enviar|não me mande|nao me mande)/i.test(textLower);

    let statusUpdated = false;
    if (isOptOut) {
      // Opt-out é estado terminal: atualiza lead e lead_campaign
      await client.from('marketing_leads').update({ status: 'opt_out', updated_at: now }).eq('id', lead.id);
      await client.from('marketing_lead_campaigns').update({ status: 'opt_out', updated_at: now }).eq('id', lc.id);
      // Cancela quaisquer automações/follow-ups agendados
      await client.from('marketing_automation_queue').delete().eq('lead_campaign_id', lc.id);
      statusUpdated = true;
      logger.info('messaging', 'prospecting', 'opt_out', `Lead ${lead.id} solicitou opt-out. Automações canceladas.`);
    } else {
      // Status responded — idempotente, sem downgrade de responded/converted/exhausted
      if (!RESPONDED_OR_BEYOND.includes(lc.status)) {
        await client.from('marketing_lead_campaigns').update({ status: 'responded', updated_at: now }).eq('id', lc.id);
        // Cancela follow-ups agendados porque o lead já respondeu
        await client.from('marketing_automation_queue').delete().eq('lead_campaign_id', lc.id);
        statusUpdated = true;
      }
      logger.info('messaging', 'prospecting', 'responded', `Lead ${lead.id} marcado como responded (inbound ${incoming.channel || 'whatsapp_evolution'}). Follow-ups pendentes cancelados.`);
    }

    return { matched: true, messageInserted: inserted, statusUpdated };
  } catch (err: any) {
    logger.warn('messaging', 'prospecting', 'responder_error', `Falha ao persistir resposta de prospecção: ${err.message}`);
    return none;
  }
}