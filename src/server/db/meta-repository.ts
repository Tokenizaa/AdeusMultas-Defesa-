/**
 * @file meta-repository.ts
 * MetaRepository — Dual-Engine Persistence Layer (DefesAi / Meta)
 *
 * Espelha o estado de conexão do MetaIntegrationService (MetaConnectionState)
 * na tabela public.meta_accounts com write-through best-effort.
 *
 * Padrão (idêntico aos demais repositories): a memória continua sendo a fonte
 * de leitura síncrona do serviço; cada escrita é persistida de forma assíncrona
 * (fire-and-forget) quando o Supabase está configurado. Nunca lança erros do
 * banco para o fluxo HTTP.
 *
 * Regras de mapeamento:
 *  - `meta_accounts`: upsert por `user_id` (UNIQUE natural; 1 conta/usuário).
 *    Só é persistido quando existe um `userId` UUID válido — a coluna é FK
 *    NOT NULL para `auth.users(id)`. O domínio Meta guarda apenas o ID do
 *    Facebook (texto/numérico) no connection.user.id; o userId interno do
 *    DefesAi deve ser fornecido pelo chamador quando disponível.
 *  - Segurança: os `access_token` das páginas NUNCA vão para o JSONB `pages`
 *    (intenção do schema); são extraídos para a coluna protegida
 *    `access_token` (acesso exclusivo service_role/admin via RLS).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '../../types/supabase';
import { logger } from '../observability/logger';
import { getSupabaseServerClient } from './supabase-server';
import { MetaConnectionState, MetaPage } from '../integrations/meta';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Páginas sanitizadas (sem access_token) para o JSONB público. */
interface SanitizedMetaPage {
  id: string;
  name: string;
  category?: string;
  instagram_business_account?: {
    id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
  };
}

export class MetaRepository {
  private client: SupabaseClient<Database> | null = getSupabaseServerClient();

  // ==========================================
  // Helpers
  // ==========================================

  private isUuid(value: string): boolean {
    return UUID_RE.test(value);
  }

  private toJson(value: unknown): Json {
    return JSON.parse(JSON.stringify(value ?? null)) as Json;
  }

  private sanitizePages(pages: MetaPage[]): SanitizedMetaPage[] {
    return pages.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      instagram_business_account: p.instagram_business_account
        ? {
            id: p.instagram_business_account.id,
            username: p.instagram_business_account.username,
            name: p.instagram_business_account.name,
            profile_picture_url: p.instagram_business_account.profile_picture_url,
          }
        : undefined,
    }));
  }

  private warn(domain: string, operation: string, message: string, extra?: Record<string, unknown>) {
    logger.warn('supabase', 'meta_repository', operation, `[${domain}] ${message}`, extra);
  }

  /**
   * Executa uma query Supabase em fire-and-forget, convertendo o PromiseLike
   * retornado pelos builders em Promise real e engolindo qualquer erro.
   */
  private fire(
    domain: string,
    query: PromiseLike<{ error: { message: string } | null }>,
    meta?: Record<string, unknown>
  ): void {
    if (!this.client) return;
    Promise.resolve(query)
      .then(({ error }) => {
        if (error) this.warn(domain, 'persist', error.message, meta);
      })
      .catch((err: any) => this.warn(domain, 'persist', err?.message || err, meta));
  }

  // ==========================================
  // Meta Connection State → meta_accounts
  // ==========================================

  /**
   * Upsert por `user_id` (1 conta por usuário). Requer userId UUID válido
   * (FK NOT NULL para auth.users(id)); conexões demo (IDs de texto) são
   * mantidas apenas em memória.
   */
  persistConnection(connection: MetaConnectionState, userId?: string): void {
    if (!this.client) return;

    // userId explícito do chamador tem prioridade; fallback para o id do
    // usuário conectado quando ele for um UUID válido (raro no fluxo Meta,
    // que usa IDs de texto/numéricos — nesses casos, só memória).
    const candidateUserId = userId || connection.user?.id || '';
    const targetUserId = this.isUuid(candidateUserId) ? candidateUserId : undefined;
    if (!targetUserId) {
      return;
    }

    const pages = this.sanitizePages(connection.pages);
    const selectedPage =
      connection.pages.find((p) => p.id === connection.selectedPageId) || connection.pages[0];
    const selectedInstagramId =
      connection.selectedInstagramId || selectedPage?.instagram_business_account?.id || null;

    const payload: Database['public']['Tables']['meta_accounts']['Insert'] = {
      user_id: targetUserId,
      is_connected: connection.isConnected,
      meta_user_id: connection.user?.id ?? null,
      meta_user_name: connection.user?.name ?? null,
      meta_user_email: connection.user?.email ?? null,
      pages: this.toJson(pages),
      selected_page_id: connection.selectedPageId ?? selectedPage?.id ?? null,
      selected_instagram_id: selectedInstagramId,
      access_token: selectedPage?.access_token ?? null,
      token_expires_at: connection.tokenExpiresAt ?? null,
      connected_at: connection.connectedAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.fire('meta_accounts', this.client.from('meta_accounts').upsert(payload, { onConflict: 'user_id' }), {
      userId: targetUserId,
    });
  }

  // ==========================================
  // Warm-up (opcional, não utilizado no boot)
  // ==========================================

  /**
   * Carrega do Supabase a conta Meta persistida do usuário (warm-up futuro).
   */
  async loadConnectionFromSupabase(userId: string): Promise<void> {
    if (!this.client) return;
    const { data, error } = await this.client
      .from('meta_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      this.warn('meta_accounts', 'loadConnection', error.message, { userId });
    } else if (data) {
      logger.info('supabase', 'meta_repository', 'loadConnection', 'Meta account carregada do Supabase.', {
        userId,
        isConnected: data.is_connected,
      });
    }
  }
}

export const metaRepository = new MetaRepository();
