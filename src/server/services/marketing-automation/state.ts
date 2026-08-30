/**
 * @file state.ts
 * Leitura/escrita do estado do worker de automação (`marketing_automation_state`).
 *
 * Regra corrigida: `processed_count` conta APENAS envios reais bem-sucedidos
 * (via `recordSuccessfulSend`), NÃO ticks do loop de polling.
 */

export const AUTOMATION_STATE_ID = '00000000-0000-0000-0000-000000000001';

export type AutomationStatus = 'RUNNING' | 'PAUSED' | 'STOPPED' | 'ERROR';

export interface AutomationState {
  status: AutomationStatus;
  last_error?: string | null;
  last_processed_at?: string | null;
  processed_count: number;
}

export async function loadAutomationState(client: any): Promise<AutomationState> {
  const { data } = await client
    .from('marketing_automation_state')
    .select('*')
    .eq('id', AUTOMATION_STATE_ID)
    .single();

  return {
    status: (data?.status || 'STOPPED') as AutomationStatus,
    last_error: data?.last_error,
    last_processed_at: data?.last_processed_at,
    processed_count: data?.processed_count || 0,
  };
}

/** Grava status; NUNCA toca em processed_count. `last_processed_at` mantém semântica (só em RUNNING). */
export async function updateAutomationState(client: any, status: AutomationStatus, lastError?: string): Promise<void> {
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (status === 'RUNNING') {
    updates.last_processed_at = new Date().toISOString();
  }
  if (lastError) {
    updates.last_error = lastError;
  }
  await client.from('marketing_automation_state').upsert({ id: AUTOMATION_STATE_ID, ...updates });
}

/** Incrementa processed_count em +1 (envio real bem-sucedido) e atualiza last_processed_at. */
export async function recordSuccessfulSend(client: any): Promise<number> {
  const state = await loadAutomationState(client);
  const next = state.processed_count + 1;
  await client.from('marketing_automation_state').upsert({
    id: AUTOMATION_STATE_ID,
    status: state.status,
    processed_count: next,
    last_processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return next;
}

/**
 * Status "honesto": se o DB diz RUNNING mas o timer in-process está morto
 * (worker não iniciado / reiniciado), reporta STOPPED. Não auto-inicia.
 */
export function resolveEffectiveStatus(
  dbStatus: AutomationStatus,
  timerAlive: boolean,
  _lastError?: string | null
): AutomationStatus {
  return dbStatus === 'RUNNING' && !timerAlive ? 'STOPPED' : dbStatus;
}