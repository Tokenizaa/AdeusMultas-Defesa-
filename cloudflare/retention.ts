import { createSupabaseAdminClient } from './supabase';
import { recordAuditLog } from './routes/audit';
import type { Env } from './supabase';

const DOCUMENTS_BUCKET = 'case-documents';

export interface RetentionPolicy {
  id: string;
  category: string;
  description: string;
  retention_days: number;
  legal_basis: string;
  legal_basis_article: string;
  applies_to_anonymous: boolean;
  applies_to_authenticated: boolean;
  hard_delete_after_days: number | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface RetentionExecutionResult {
  executionId: string;
  status: 'completed' | 'failed';
  startedAt: string;
  finishedAt: string;
  casesConsidered: number;
  casesDeleted: number;
  casesRetainedLegalBasis: number;
  errorMessage: string | null;
  details: Array<{ caseId: string; action: 'deleted' | 'retained'; reason: string }>;
}

/** Remove dependentes diretos do caso (documentos + storage + payment_orders) antes de excluir a linha de cases. */
async function purgeCaseDependencies(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  caseId: string,
): Promise<void> {
  // 1. Documentos: remover arquivos do storage, depois as linhas da tabela.
  const { data: documents } = await supabase
    .from('documents')
    .select('id, storage_path')
    .eq('case_id', caseId);
  const storagePaths = (documents || []).map((d: any) => d.storage_path).filter(Boolean);
  if (storagePaths.length) {
    try {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove(storagePaths);
    } catch (err) {
      console.error(`[retention] storage.remove falhou para caso ${caseId}`, err);
    }
  }
  if ((documents || []).length) {
    const { error: docsError } = await supabase.from('documents').delete().eq('case_id', caseId);
    if (docsError) throw new Error(`Falha ao excluir documentos vinculados ao caso ${caseId}: ${docsError.message}`);
  }

  // 2. Payment orders: exclusão da reconciliação interna.
  const { error: payError } = await supabase.from('payment_orders').delete().eq('case_id', caseId);
  if (payError) throw new Error(`Falha ao excluir ordens de pagamento vinculadas ao caso ${caseId}: ${payError.message}`);
}

/** Lista todas as políticas de retenção cadastradas. */
export async function getRetentionPolicies(env: Env): Promise<RetentionPolicy[]> {
  const supabase = createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from('data_retention_policies')
    .select('*')
    .order('category', { ascending: true });
  if (error) throw new Error(`Falha ao consultar políticas de retenção: ${error.message}`);
  return (data || []) as RetentionPolicy[];
}

/** Atualiza uma política de retenção por categoria. */
export async function updateRetentionPolicy(
  env: Env,
  category: string,
  fields: Partial<Pick<RetentionPolicy, 'retention_days' | 'description' | 'legal_basis' | 'legal_basis_article' | 'applies_to_anonymous' | 'applies_to_authenticated' | 'hard_delete_after_days'>>,
  actor: string,
): Promise<RetentionPolicy> {
  const supabase = createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from('data_retention_policies')
    .update({ ...fields, updated_by: actor, updated_at: new Date().toISOString() })
    .eq('category', category)
    .select()
    .single();
  if (error) throw new Error(`Falha ao atualizar política de retenção: ${error.message}`);
  if (!data) throw new Error(`Política de retenção não encontrada para categoria: ${category}`);
  return data as RetentionPolicy;
}

/** Histórico de execuções do job de retenção. */
export async function getRetentionExecutions(env: Env, limit: number = 50): Promise<any[]> {
  const supabase = createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from('retention_executions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Falha ao consultar execuções de retenção: ${error.message}`);
  return data || [];
}

/**
 * Executa o job de retenção de dados pessoais.
 *
 * Regras:
 * 1. Considera casos com created_at anterior ao cutoff da política 'cases' (retention_days).
 * 2. Casos com pagamento confirmado (payment_orders.status = 'PAID') são RETIDOS por base legal
 *    de obrigação legal (LGPD Art. 7º, II) — não são excluídos.
 * 3. Casos antigos sem pagamento são excluídos completamente (documentos, storage, payment_orders,
 *    linha de cases) com auditoria de cada exclusão.
 * 4. Toda execução é registrada em retention_executions (prova de conformidade para DPO/auditor).
 */
export async function runRetention(
  env: Env,
  triggerType: 'cron' | 'manual' | 'api' = 'manual',
  triggeredBy: string = 'system',
): Promise<RetentionExecutionResult> {
  const supabase = createSupabaseAdminClient(env);
  const executionId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Registra execução em andamento
  await supabase.from('retention_executions').insert({
    id: executionId,
    started_at: startedAt,
    status: 'running',
    trigger_type: triggerType,
    triggered_by: triggeredBy,
  });

  const details: Array<{ caseId: string; action: 'deleted' | 'retained'; reason: string }> = [];
  let casesConsidered = 0;
  let casesDeleted = 0;
  let casesRetainedLegalBasis = 0;

  try {
    const { data: policies, error: policiesError } = await supabase
      .from('data_retention_policies')
      .select('*');
    if (policiesError) throw new Error(`Falha ao carregar políticas de retenção: ${policiesError.message}`);
    const policyByCategory = new Map((policies || []).map((p: any) => [p.category, p]));

    const casesPolicy = policyByCategory.get('cases');
    if (!casesPolicy) {
      throw new Error('Política de retenção para categoria "cases" não encontrada.');
    }

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - casesPolicy.retention_days * 24 * 60 * 60 * 1000).toISOString();

    // Casos antigos: criados antes do período de retenção (anônimos e autenticados).
    const { data: oldCases, error: oldCasesError } = await supabase
      .from('cases')
      .select('id, user_id, is_anonymous, is_paid, created_at, client_name')
      .lt('created_at', cutoffDate)
      .order('created_at', { ascending: true });

    if (oldCasesError) throw new Error(`Falha ao consultar casos para retenção: ${oldCasesError.message}`);
    const cases = oldCases || [];

    // Verifica payment_orders confirmados para base legal de retenção financeira.
    const caseIds = cases.map((c: any) => c.id).filter(Boolean);
    const paidCaseIds = new Set<string>();
    if (caseIds.length) {
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_orders')
        .select('case_id, status')
        .in('case_id', caseIds);
      if (paymentsError) throw new Error(`Falha ao consultar payment_orders para retenção: ${paymentsError.message}`);
      for (const p of (payments || [])) {
        if (p.status === 'PAID') paidCaseIds.add(String(p.case_id));
      }
    }

    for (const row of cases) {
      casesConsidered += 1;
      const caseId = String(row.id);
      const isAnonymous = Boolean(row.is_anonymous);
      const isPaid = paidCaseIds.has(caseId) || Boolean(row.is_paid);

      // Base legal de obrigação legal (pagamento confirmado): retém.
      if (isPaid) {
        casesRetainedLegalBasis += 1;
        details.push({
          caseId,
          action: 'retained',
          reason: 'Pagamento confirmado — obrigação legal de retenção de registro financeiro (LGPD Art. 7º, II).',
        });
        continue;
      }

      // Caso antigo, sem pagamento: exclusão completa por expiração de retenção.
      await purgeCaseDependencies(supabase, caseId);
      const { error: delError } = await supabase.from('cases').delete().eq('id', caseId);
      if (delError) throw new Error(`Falha ao excluir caso ${caseId} na retenção: ${delError.message}`);

      casesDeleted += 1;
      details.push({
        caseId,
        action: 'deleted',
        reason: `Excedido prazo de retenção de ${casesPolicy.retention_days} dias (LGPD Art. 18, VI — eliminação).`,
      });

      await recordAuditLog(env, {
        actor: triggeredBy,
        actorRole: 'system',
        action: 'case.deleted.retention',
        targetResource: 'cases',
        targetId: caseId,
        details: {
          deletedAt: new Date().toISOString(),
          scope: 'full_deletion',
          dependenciesPurged: ['documents', 'payment_orders', 'cases'],
          legalBasis: 'LGPD Art. 18, VI — eliminação por expiração de política de retenção',
          retentionPolicy: casesPolicy.category,
          retentionDays: casesPolicy.retention_days,
          isAnonymous,
        },
        correlationId: executionId,
        gdprCompliant: true,
      });
    }

    const finishedAt = new Date().toISOString();

    await supabase
      .from('retention_executions')
      .update({ finished_at: finishedAt, status: 'completed', cases_considered: casesConsidered, cases_deleted: casesDeleted, cases_retained_legal_basis: casesRetainedLegalBasis })
      .eq('id', executionId);

    await recordAuditLog(env, {
      actor: triggeredBy,
      actorRole: 'system',
      action: 'retention.execution.completed',
      targetResource: 'retention_executions',
      targetId: executionId,
      details: {
        startedAt, finishedAt, status: 'completed',
        casesConsidered, casesDeleted, casesRetainedLegalBasis,
        triggerType,
        retentionPolicyCategory: 'cases',
        retentionDays: casesPolicy.retention_days,
      },
      correlationId: executionId,
      gdprCompliant: true,
    });

    return {
      executionId,
      status: 'completed',
      startedAt,
      finishedAt,
      casesConsidered,
      casesDeleted,
      casesRetainedLegalBasis,
      errorMessage: null,
      details,
    };
  } catch (err: any) {
    const finishedAt = new Date().toISOString();
    await supabase
      .from('retention_executions')
      .update({ finished_at: finishedAt, status: 'failed', error_message: String(err?.message || err) })
      .eq('id', executionId);

    await recordAuditLog(env, {
      actor: triggeredBy,
      actorRole: 'system',
      action: 'retention.execution.failed',
      targetResource: 'retention_executions',
      targetId: executionId,
      details: { startedAt, finishedAt, error: String(err?.message || err), triggerType },
      correlationId: executionId,
      gdprCompliant: true,
    });

    return {
      executionId,
      status: 'failed',
      startedAt,
      finishedAt,
      casesConsidered,
      casesDeleted,
      casesRetainedLegalBasis,
      errorMessage: String(err?.message || err),
      details,
    };
  }
}
