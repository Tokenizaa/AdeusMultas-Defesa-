/**
 * @file webhook-repository.ts
 * WebhookRepository — Idempotência durável para webhooks de pagamento.
 *
 * Mantém a tabela public.webhook_events como fonte de verdade para detecção
 * de eventos duplicados e controle de processamento (claim/complete).
 *
 * Padrão idêntico ao case-repository.ts e payment-repository.ts: write-through
 * para Supabase com o client do service_role (bypassa RLS). Se o Supabase não
 * estiver configurado, aceita em memória apenas quando
 * ALLOW_IN_MEMORY_WEBHOOK_PERSISTENCE=true (dev isolado).
 *
 * Fluxo de cada webhook:
 *   1. accept(eventId, provider, payload)  → INSERT ... ON CONFLICT DO NOTHING
 *      Retorna true se o evento é novo (aceito), false se já existe (duplicado).
 *   2. Handler processa efeitos colaterais (apenas se accept retornou true).
 *   3. complete(eventId)                   → UPDATE status='processed', processed_at=now()
 *
 * Para processamento assíncrono separado (worker), existe claimPendingEvent
 * que faz lease (FOR UPDATE SKIP LOCKED) de eventos em status 'received'.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '../../types/supabase';
import { logger } from '../observability/logger';
import { getSupabaseServerClient } from './supabase-server';

function allowInMemoryWebhookPersistence(): boolean {
  return process.env.ALLOW_IN_MEMORY_WEBHOOK_PERSISTENCE === 'true';
}

export interface AcceptedWebhookEvent {
  eventId: string;
  provider: string;
  payload: unknown;
  isNew: boolean; // true = evento novo, false = duplicado (já aceito anteriormente)
}

export interface ClaimedWebhookEvent {
  eventId: string;
  provider: string;
  payload: unknown;
  attempts: number;
}

export class WebhookRepository {
  private client: SupabaseClient<Database> | null = getSupabaseServerClient();
  // Fallback em memória apenas para dev/isolado sem Supabase.
  private memoryEvents: Map<string, { provider: string; payload: unknown; status: string; attempts: number; processedAt?: Date }> = new Map();

  private getClient(): SupabaseClient<Database> | null {
    if (this.client) return this.client;
    this.client = getSupabaseServerClient();
    return this.client;
  }

  // =========================================================================
  // 1. accept — aceitar evento de forma durável e idempotente
  // =========================================================================

  /**
   * Insere o evento se for novo (event_id UNIQUE). Retorna isNew=true quando
   * o evento foi aceito pela primeira vez; isNew=false quando já existia
   * (entrega duplicada — deve ser ignorada sem aplicar efeitos colaterais).
   *
   * Lança erro se não conseguir persistir (FAIL CLOSED): nunca confirma 2xx
   * sem saber se o evento é novo ou duplicado.
   */
  async acceptEvent(eventId: string, provider: string, payload: unknown): Promise<AcceptedWebhookEvent> {
    const client = this.getClient();
    if (!client) {
      if (allowInMemoryWebhookPersistence()) {
        const existing = this.memoryEvents.get(eventId);
        if (existing) {
          logger.warn('supabase', 'webhook_repository', 'accept', 'Evento duplicado (memória)', { eventId, metadata: { provider } });
          return { eventId, provider, payload, isNew: false };
        }
        this.memoryEvents.set(eventId, { provider, payload, status: 'received', attempts: 0 });
        logger.info('supabase', 'webhook_repository', 'accept', 'Evento aceito (memória)', { eventId, metadata: { provider } });
        return { eventId, provider, payload, isNew: true };
      }
      throw new Error('WebhookRepository: Supabase client não configurado — aceitação durável obrigatória. Habilite ALLOW_IN_MEMORY_WEBHOOK_PERSISTENCE=true para dev isolado.');
    }

    try {
      const { data, error } = await client
        .from('webhook_events')
        .insert({
          event_id: eventId,
          provider,
          payload: (payload ?? null) as unknown as Json,
          status: 'received',
          attempts: 0,
        })
        .select('event_id')
        .maybeSingle();

      if (error) {
        // Código 23505 = unique_violation (evento duplicado entregue novamente)
        if (error.code === '23505') {
          logger.info('supabase', 'webhook_repository', 'accept', 'Evento duplicado ignorado (unique_violation)', { eventId, metadata: { provider } });
          return { eventId, provider, payload, isNew: false };
        }
        logger.error('supabase', 'webhook_repository', 'accept', `Falha ao aceitar evento webhook: ${error.message}`, { eventId, code: error.code, metadata: { provider } });
        throw new Error(`Falha ao aceitar evento webhook ${eventId}: ${error.message}`);
      }

      if (!data) {
        // maybeSingle retornou null sem erro: provavelmente conflito silencioso (duplicado)
        logger.info('supabase', 'webhook_repository', 'accept', 'Evento duplicado ignorado (sem dados retornados)', { eventId, metadata: { provider } });
        return { eventId, provider, payload, isNew: false };
      }

      logger.info('supabase', 'webhook_repository', 'accept', 'Evento aceito (durável)', { eventId, metadata: { provider } });
      return { eventId, provider, payload, isNew: true };
    } catch (err: any) {
      if (err?.code === '23505') {
        return { eventId, provider, payload, isNew: false };
      }
      throw err;
    }
  }

  // =========================================================================
  // 2. claim — lease de evento pendente para processamento (worker)
  // =========================================================================

  /**
   * Faz lease atômico de um evento em status 'received' com attempts < maxAttempts,
   * incrementando attempts e marcando status='processing'. Usa FOR UPDATE SKIP LOCKED
   * para que múltiplos workers não processem o mesmo evento simultaneamente.
   *
   * Retorna null se não houver eventos disponíveis.
   */
  async claimPendingEvent(maxAttempts: number = 5): Promise<ClaimedWebhookEvent | null> {
    const client = this.getClient();
    if (!client) {
      if (allowInMemoryWebhookPersistence()) {
        for (const [eventId, ev] of this.memoryEvents) {
          if (ev.status === 'received' && ev.attempts < maxAttempts) {
            ev.attempts += 1;
            ev.status = 'processing';
            return { eventId, provider: ev.provider, payload: ev.payload, attempts: ev.attempts };
          }
        }
        return null;
      }
      throw new Error('WebhookRepository: Supabase client não configurado — claim obrigatório.');
    }

    try {
      const { data, error } = await client.rpc('claim_webhook_event', { p_max_attempts: maxAttempts });
      if (error) {
        logger.error('supabase', 'webhook_repository', 'claim', `Falha ao claimar evento: ${error.message}`);
        return null;
      }
      if (!data || data.length === 0) return null;

      const row = data[0];
      return {
        eventId: row.event_id,
        provider: row.provider,
        payload: row.payload,
        attempts: row.attempts,
      };
    } catch (err: any) {
      logger.error('supabase', 'webhook_repository', 'claim', `Erro ao claimar evento: ${err?.message || err}`);
      return null;
    }
  }

  // =========================================================================
  // 3. complete — marcar evento como processado com sucesso
  // =========================================================================

  /**
   * Marca o evento como processado (status='processed', processed_at=now()).
   * Idempotente: chamar múltiplas vezes não causa erro.
   */
  async completeEvent(eventId: string): Promise<void> {
    const client = this.getClient();
    if (!client) {
      if (allowInMemoryWebhookPersistence()) {
        const ev = this.memoryEvents.get(eventId);
        if (ev) {
          ev.status = 'processed';
          ev.processedAt = new Date();
        }
        return;
      }
      throw new Error('WebhookRepository: Supabase client não configurado — complete obrigatório.');
    }

    try {
      const { error } = await client
        .from('webhook_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('event_id', eventId);

      if (error) {
        logger.error('supabase', 'webhook_repository', 'complete', `Falha ao completar evento ${eventId}: ${error.message}`);
        throw new Error(`Falha ao completar evento webhook ${eventId}: ${error.message}`);
      }
      logger.info('supabase', 'webhook_repository', 'complete', 'Evento marcado como processado', { eventId });
    } catch (err: any) {
      logger.error('supabase', 'webhook_repository', 'complete', `Erro ao completar evento ${eventId}: ${err?.message || err}`);
      throw err;
    }
  }

  // =========================================================================
  // 4. fail — marcar evento como falhado (para DLQ / inspeção)
  // =========================================================================

  async failEvent(eventId: string, errorMessage: string): Promise<void> {
    const client = this.getClient();
    if (!client) {
      if (allowInMemoryWebhookPersistence()) {
        const ev = this.memoryEvents.get(eventId);
        if (ev) {
          ev.status = 'failed';
        }
        return;
      }
      return;
    }

    try {
      await client
        .from('webhook_events')
        .update({ status: 'failed', processing_error: errorMessage })
        .eq('event_id', eventId);
    } catch (err: any) {
      logger.error('supabase', 'webhook_repository', 'fail', `Erro ao falhar evento ${eventId}: ${err?.message || err}`);
    }
  }

  // =========================================================================
  // 5. isProcessed — consulta rápida se evento já foi processado
  // =========================================================================

  async isProcessed(eventId: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) {
      if (allowInMemoryWebhookPersistence()) {
        const ev = this.memoryEvents.get(eventId);
        return !!ev && ev.status === 'processed';
      }
      return false;
    }

    try {
      const { data, error } = await client
        .from('webhook_events')
        .select('status')
        .eq('event_id', eventId)
        .maybeSingle();
      if (error || !data) return false;
      return data.status === 'processed';
    } catch {
      return false;
    }
  }
}

export const webhookRepository = new WebhookRepository();
