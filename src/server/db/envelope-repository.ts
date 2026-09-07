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
        persistenceResult: 'no_client',
      });
      throw new Error('EnvelopeRepository: Supabase client não configurado — não é possível persistir ownership');
    }

    // Cast through 'any' — Database type não inclui documenso_envelopes
    // (schema gerado não reflete migrations adicionadas dinamicamente).
    // O comportamento em runtime é correto; a tipagem statica é incompleta.
    const { data, error } = await (this.client as any)
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
        persistenceResult: 'failed',
      });
      throw new Error(`EnvelopeRepository: falha ao registrar ownership do envelope ${documensoEnvelopeId}: ${error.message}`);
    }

    logger.info('supabase', 'envelope_repository', 'register', 'Envelope ownership persistido', {
      id: data.id,
      documensoEnvelopeId,
      caseId,
      userId,
      persistenceResult: 'success',
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
        persistenceResult: 'no_client',
      });
      return false;
    }

    // Cast through 'any' — Database type não inclui documenso_envelopes
    const { data, error } = await (this.client as any)
      .from('documenso_envelopes')
      .select('id, user_id')
      .eq('documenso_envelope_id', documensoEnvelopeId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('supabase', 'envelope_repository', 'belongsToUser', `Erro ao verificar ownership: ${error.message}`, {
        documensoEnvelopeId,
        userId,
        persistenceResult: 'failed',
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

    // Cast through 'any' — Database type não inclui documenso_envelopes
    const { data, error } = await (this.client as any)
      .from('documenso_envelopes')
      .select('*')
      .eq('documenso_envelope_id', documensoEnvelopeId)
      .maybeSingle();

    if (error || !data) return null;
    return data as EnvelopeRecord;
  }

  /**
   * Anonimiza envelope_data JSONB — remove PII de signatários (email + name).
   * LGPD Art. 18: direito à eliminação; Art. 4: anonimização suficiente.
   * Preserva a estrutura do envelope para auditoria; remove dados pessoais.
   */
  private anonymizeEnvelopeData(envelopeData: any): any {
    if (!envelopeData || typeof envelopeData !== 'object') {
      return envelopeData;
    }

    // Deep-clone para não mutar o original
    const anonymized = JSON.parse(JSON.stringify(envelopeData));

    if (Array.isArray(anonymized.recipients)) {
      anonymized.recipients = anonymized.recipients.map((recipient: any) => ({
        ...recipient,
        email: undefined,
        name: '[REMOVIDO]',
      }));
    }

    return anonymized;
  }

  /**
   * Remove PII de signatários de envelope_data para todos os envelopes de um caso.
   * Chamado pelo DELETE /cases/:id antes da cascade delete do envelope.
   */
  async anonymizeEnvelopesByCaseId(caseId: string): Promise<void> {
    if (!this.client) {
      logger.warn('supabase', 'envelope_repository', 'anonymizeEnvelopesByCaseId', 'Supabase client não configurado — pulando anonimização', {
        caseId,
      });
      return;
    }

    const { data: envelopes, error } = await (this.client as any)
      .from('documenso_envelopes')
      .select('id, envelope_data')
      .eq('case_id', caseId);

    if (error) {
      logger.error('supabase', 'envelope_repository', 'anonymizeEnvelopesByCaseId', `Erro ao buscar envelopes: ${error.message}`, {
        caseId,
        persistenceResult: 'failed',
      });
      return;
    }

    if (!envelopes || envelopes.length === 0) {
      logger.info('supabase', 'envelope_repository', 'anonymizeEnvelopesByCaseId', 'Nenhum envelope encontrado para o caso', { caseId });
      return;
    }

    for (const envelope of envelopes) {
      const anonymizedData = this.anonymizeEnvelopeData(envelope.envelope_data);
      const { error: updateError } = await (this.client as any)
        .from('documenso_envelopes')
        .update({ envelope_data: anonymizedData })
        .eq('id', envelope.id);

      if (updateError) {
        logger.error('supabase', 'envelope_repository', 'anonymizeEnvelopesByCaseId', `Falha ao anonimizar envelope ${envelope.id}: ${updateError.message}`, {
          caseId,
          envelopeId: envelope.id,
          persistenceResult: 'failed',
        });
      } else {
        logger.info('supabase', 'envelope_repository', 'anonymizeEnvelopesByCaseId', 'Envelope anonimizado', {
          caseId,
          envelopeId: envelope.id,
          persistenceResult: 'success',
        });
      }
    }
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
        persistenceResult: 'no_client',
      });
      return;
    }

    const updates: Record<string, any> = { status };
    if (extraData?.sent_at) updates.sent_at = extraData.sent_at;
    if (extraData?.completed_at) updates.completed_at = extraData.completed_at;

    // Cast through 'any' — Database type não inclui documenso_envelopes
    const { error } = await (this.client as any)
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
