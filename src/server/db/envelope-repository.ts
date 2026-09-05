/**
 * @file envelope-repository.ts
 * EnvelopeRepository — Persistence Layer for Documenso Envelope Ownership
 *
 * FASE 1.2 CORREÇÃO: Substitui o Map<envelopeId, {caseId, userId}> em memória
 * que era perdido em restart/multi-instância por persistência em Supabase.
 *
 * Responsabilidade: registrar e consultar o ownership (user_id) de cada envelope
 * Documenso, permitindo authorization survive a restarts.
 *
 * O user_id almacenado corresponde a req.user.id do token JWT autenticado —
 * nunca derivável do cliente.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';
import { getSupabaseServerClient } from './supabase-server';
import { logger } from '../observability/logger';
import { EnvelopeStatus } from '@/types/documenso';

export interface EnvelopeRecord {
  id: string;                    // UUID local (pk)
  documenso_envelope_id: string; // env_xxx do Documenso
  external_id: string;           // id original do caso (case_* ou UUID)
  case_id: string;               // UUID FK → cases.id
  user_id: string;               // UUID do dono (来自 req.user.id)
  status: EnvelopeStatus;
  envelope_data: any;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Persiste e consulta o vínculo envelope ↔ user ownership em Supabase.
 * Cada envelope criado pela API routes é registrado aqui com o user_id do
 * criador (extraído do JWT, nunca do body).
 */
export class EnvelopeRepository {
  private client: SupabaseClient<Database> | null = getSupabaseServerClient();

  /**
   * Registra ownership de um envelope recém-criado.
   * Chamado por POST /api/documenso/envelopes após criar o envelope no Documenso.
   *
   * Fail closed: se o banco não estiver disponível, lança erro (não cria Map fallback).
   */
  async register({
    documensoEnvelopeId,
    externalId,
    caseId,
    userId,
    envelopeData,
  }: {
    documensoEnvelopeId: string;
    externalId: string;
    caseId: string;
    userId: string;
    envelopeData?: any;
  }): Promise<EnvelopeRecord | null> {
    if (!this.client) {
      logger.error('supabase', 'envelope_repository', 'register', 'Supabase client não configurado', {
        documensoEnvelopeId,
        status: 'no_client',
      });
      throw new Error('EnvelopeRepository: Supabase client não configurado — não é possível persistir ownership');
    }

    const { data, error } = await this.client
      .from('documenso_envelopes')
      .insert({
        documenso_envelope_id: documensoEnvelopeId,
        external_id: externalId,
        case_id: caseId,
        user_id: userId,
        status: 'DRAFT',
        envelope_data: envelopeData ?? {},
      })
      .select()
      .single();

    if (error) {
      logger.error('supabase', 'envelope_repository', 'register', `Falha ao registrar envelope: ${error.message}`, {
        documensoEnvelopeId,
        caseId,
        userId,
        status: 'failed',
      });
      throw new Error(`EnvelopeRepository: falha ao registrar ownership do envelope ${documensoEnvelopeId}: ${error.message}`);
    }

    logger.info('supabase', 'envelope_repository', 'register', 'Envelope ownership persistido', {
      id: data.id,
      documensoEnvelopeId,
      caseId,
      userId,
      status: 'success',
    });

    return data as EnvelopeRecord;
  }

  /**
   * Verifica se o usuário tem ownership sobre o envelope (via user_id direto).
   * Retorna true se o envelope existe E pertence ao userId.
   *
   * Fail closed: envelope desconhecido → false.
   * Esta é a base da autorização em todas as rotas Documenso.
   */
  async belongsToUser(documensoEnvelopeId: string, userId: string): Promise<boolean> {
    if (!this.client) {
      // Sem banco: fail closed — não podemos confirmar ownership
      logger.warn('supabase', 'envelope_repository', 'belongsToUser', 'Supabase client não configurado, fail-closed', {
        documensoEnvelopeId,
        status: 'no_client',
      });
      return false;
    }

    const { data, error } = await this.client
      .from('documenso_envelopes')
      .select('id, user_id')
      .eq('documenso_envelope_id', documensoEnvelopeId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('supabase', 'envelope_repository', 'belongsToUser', `Erro ao verificar ownership: ${error.message}`, {
        documensoEnvelopeId,
        userId,
        status: 'failed',
      });
      return false;
    }

    return !!data;
  }

  /**
   * Busca registro de envelope por documenso_envelope_id.
   * Usado pelo webhook handler para atualizar status.
   */
  async getByDocumensoId(documensoEnvelopeId: string): Promise<EnvelopeRecord | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('documenso_envelopes')
      .select('*')
      .eq('documenso_envelope_id', documensoEnvelopeId)
      .maybeSingle();

    if (error || !data) return null;
    return data as EnvelopeRecord;
  }

  /**
   * Atualiza status do envelope (chamado pelo webhook handler).
   */
  async updateStatus(
    documensoEnvelopeId: string,
    status: EnvelopeStatus,
    extraData?: { sent_at?: string; completed_at?: string }
  ): Promise<void> {
    if (!this.client) {
      logger.warn('supabase', 'envelope_repository', 'updateStatus', 'Supabase client não configurado — pulando update', {
        documensoEnvelopeId,
        status,
      });
      return;
    }

    const updates: Record<string, any> = { status };
    if (extraData?.sent_at) updates.sent_at = extraData.sent_at;
    if (extraData?.completed_at) updates.completed_at = extraData.completed_at;

    const { error } = await this.client
      .from('documenso_envelopes')
      .update(updates)
      .eq('documenso_envelope_id', documensoEnvelopeId);

    if (error) {
      logger.error('supabase', 'envelope_repository', 'updateStatus', `Falha ao atualizar status: ${error.message}`, {
        documensoEnvelopeId,
        envelopeStatus: status,
        persistenceResult: 'failed',
      });
      throw new Error(`EnvelopeRepository: falha ao atualizar status do envelope ${documensoEnvelopeId}: ${error.message}`);
    }
  }
}

export const envelopeRepository = new EnvelopeRepository();
