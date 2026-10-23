/**
 * @file snapshot-store.ts
 * Armazenamento Canônico e Histórico de Snapshots de Monitoramento.
 *
 * Mantém snapshots em memória (cache primário) e persiste no Supabase
 * quando o cliente estiver disponível, garantindo que snapshots sobrevivam
 * à reinicialização do processo. Nunca remove o último snapshot válido de
 * uma fonte mesmo quando a coleta subsequente falha.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { KnowledgeSnapshot, SnapshotStatus } from '../types';

const SUPABASE_TABLE = 'knowledge_monitoring_snapshots';
const MAX_SNAPSHOTS_PER_SOURCE = 50;

// Logger interno mínimo para evitar dependência do módulo de observabilidade
// em ambientes de teste onde a cadeia de imports pode não estar disponível.
const log = (level: 'info' | 'warn' | 'error', component: string, operation: string, message: string, meta?: any) => {
  const entry = { level, component, operation, message, meta, ts: new Date().toISOString() };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.info(JSON.stringify(entry));
  }
};

export class SnapshotStore {
  private static snapshots: Map<string, KnowledgeSnapshot[]> = new Map(); // sourceId -> list of snapshots
  private static supabaseClient: SupabaseClient | null = null;
  private static initialized = false;

  private static initSupabaseClient(): void {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceKey && url.startsWith('https://')) {
      try {
        this.supabaseClient = createClient(url, serviceKey);
        log('info', 'snapshot_store', 'supabase_init', 'Supabase client inicializado para persistência de snapshots.');
      } catch (err: any) {
        log('warn', 'snapshot_store', 'supabase_init', `Falha ao inicializar Supabase para snapshots: ${err.message}. Operando apenas em memória.`);
      }
    }
  }

  private static ensureInitialized(): void {
    if (!this.initialized) {
      this.initSupabaseClient();
      this.initialized = true;
    }
  }

  /**
   * Verifica se o cliente Supabase está configurado.
   */
  public static isSupabaseConfigured(): boolean {
    this.ensureInitialized();
    return this.supabaseClient !== null;
  }

  /**
   * Salva um snapshot para a fonte indicada.
   * Persiste em memória e, quando disponível, no Supabase.
   * Nunca remove o último snapshot válido: se a coleta falhar, o snapshot anterior permanece.
   */
  public static saveSnapshot(snapshot: KnowledgeSnapshot): void {
    this.ensureInitialized();

    const list = this.snapshots.get(snapshot.sourceId) || [];
    list.unshift(snapshot); // mais recente no início
    if (list.length > MAX_SNAPSHOTS_PER_SOURCE) {
      list.length = MAX_SNAPSHOTS_PER_SOURCE;
    }
    this.snapshots.set(snapshot.sourceId, list);

    // Persiste no Supabase quando disponível
    if (this.supabaseClient) {
      this.persistSnapshotToSupabase(snapshot).catch((err) => {
        log('error', 'snapshot_store', 'supabase_persist_failed', `Falha ao persistir snapshot no Supabase: ${err instanceof Error ? err.message : String(err)}`, {
          sourceId: snapshot.sourceId,
          snapshotId: snapshot.id,
        });
      });
    }

    log('info', 'snapshot_store', 'snapshot_saved', `Snapshot salvo para fonte ${snapshot.sourceId} (status: ${snapshot.status ?? 'confirmed'})`, {
      sourceId: snapshot.sourceId,
      snapshotId: snapshot.id,
      contentHash: snapshot.contentHash,
      status: snapshot.status,
    });
  }

  /**
   * Persiste um snapshot individual no Supabase.
   */
  private static async persistSnapshotToSupabase(snapshot: KnowledgeSnapshot): Promise<void> {
    if (!this.supabaseClient) return;
    await this.supabaseClient.from(SUPABASE_TABLE).upsert({
      id: snapshot.id,
      source_id: snapshot.sourceId,
      url: snapshot.url,
      uf: snapshot.uf,
      fetched_at: snapshot.fetchedAt,
      http_status: snapshot.httpStatus,
      content_length: snapshot.contentLength,
      content_hash: snapshot.contentHash,
      normalized_text: snapshot.normalizedText,
      raw_sample: snapshot.rawSample ?? null,
      status: snapshot.status ?? 'confirmed',
      error_message: snapshot.errorMessage ?? null,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Carrega snapshots persistidos do Supabase para a memória.
   * Útil após reinicialização do processo.
   */
  public static async loadFromSupabase(): Promise<void> {
    this.ensureInitialized();
    if (!this.supabaseClient) return;

    try {
      const { data, error } = await this.supabaseClient
        .from(SUPABASE_TABLE)
        .select('*')
        .order('fetched_at', { ascending: false });

      if (error) {
        log('error', 'snapshot_store', 'supabase_load_failed', `Falha ao carregar snapshots do Supabase: ${error.message}`);
        return;
      }

      const rows = data || [];
      const bySource = new Map<string, KnowledgeSnapshot[]>();

      for (const row of rows) {
        const snapshot: KnowledgeSnapshot = {
          id: row.id,
          sourceId: row.source_id,
          url: row.url,
          uf: row.uf,
          fetchedAt: row.fetched_at,
          httpStatus: row.http_status,
          contentLength: row.content_length,
          contentHash: row.content_hash,
          normalizedText: row.normalized_text,
          rawSample: row.raw_sample ?? undefined,
          status: (row.status as SnapshotStatus) ?? 'confirmed',
          errorMessage: row.error_message ?? undefined,
        };

        const list = bySource.get(snapshot.sourceId) || [];
        list.push(snapshot);
        bySource.set(snapshot.sourceId, list);
      }

      // Limita a MAX_SNAPSHOTS_PER_SOURCE por fonte e define mais recente primeiro
      for (const [sourceId, list] of bySource.entries()) {
        list.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
        if (list.length > MAX_SNAPSHOTS_PER_SOURCE) {
          list.length = MAX_SNAPSHOTS_PER_SOURCE;
        }
        this.snapshots.set(sourceId, list);
      }

      log('info', 'snapshot_store', 'supabase_loaded', `Snapshots carregados do Supabase: ${bySource.size} fontes, ${rows.length} snapshots.`);
    } catch (err: any) {
      log('error', 'snapshot_store', 'supabase_load_failed', `Exceção ao carregar snapshots do Supabase: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Obtém o snapshot mais recente de uma fonte.
   * Retorna da memória se disponível; caso contrário, tenta carregar do Supabase.
   */
  public static async getLatestSnapshot(sourceId: string): Promise<KnowledgeSnapshot | null> {
    this.ensureInitialized();

    const list = this.snapshots.get(sourceId);
    if (list && list.length > 0) {
      return list[0];
    }

    // Se não há em memória, tenta carregar do Supabase
    await this.loadFromSupabase();
    const listAfterLoad = this.snapshots.get(sourceId);
    return listAfterLoad && listAfterLoad.length > 0 ? listAfterLoad[0] : null;
  }

  /**
   * Obtém o penúltimo snapshot para comparação de diff.
   */
  public static async getPreviousSnapshot(sourceId: string): Promise<KnowledgeSnapshot | null> {
    this.ensureInitialized();

    let list = this.snapshots.get(sourceId);
    if (!list || list.length === 0) {
      await this.loadFromSupabase();
      list = this.snapshots.get(sourceId);
    }
    if (!list || list.length < 2) return null;
    return list[1];
  }

  /**
   * Obtém todo o histórico de snapshots de uma fonte.
   */
  public static async getHistory(sourceId: string): Promise<KnowledgeSnapshot[]> {
    this.ensureInitialized();

    let list = this.snapshots.get(sourceId);
    if (!list || list.length === 0) {
      await this.loadFromSupabase();
      list = this.snapshots.get(sourceId);
    }
    return list || [];
  }

  /**
   * Obtém todos os snapshots armazenados na memória.
   */
  public static getAllSnapshots(): KnowledgeSnapshot[] {
    const all: KnowledgeSnapshot[] = [];
    for (const list of this.snapshots.values()) {
      all.push(...list);
    }
    return all;
  }

  /**
   * Limpa todos os snapshots (útil para testes unitários).
   */
  public static clear(): void {
    this.snapshots.clear();
  }

  /**
   * Obtém o snapshot mais recente de uma fonte (versão síncrona para compatibilidade com
   * código existente que não usa await). Preferir getLatestSnapshot quando possível.
   * @deprecated Use getLatestSnapshot (async) para garantir dados do Supabase.
   */
  public static getLatestSnapshotSync(sourceId: string): KnowledgeSnapshot | null {
    const list = this.snapshots.get(sourceId);
    return list && list.length > 0 ? list[0] : null;
  }
}
