/**
 * @file snapshot-store.ts
 * Armazenamento Canônico e Histórico de Snapshots de Monitoramento.
 */

import { KnowledgeSnapshot } from '../types';

export class SnapshotStore {
  private static snapshots: Map<string, KnowledgeSnapshot[]> = new Map(); // sourceId -> list of snapshots

  /**
   * Salva um snapshot para a fonte indicada.
   */
  public static saveSnapshot(snapshot: KnowledgeSnapshot): void {
    const list = this.snapshots.get(snapshot.sourceId) || [];
    list.unshift(snapshot); // mais recente no início
    // Mantém no máximo 50 snapshots por fonte para evitar estouro de memória
    if (list.length > 50) {
      list.length = 50;
    }
    this.snapshots.set(snapshot.sourceId, list);
  }

  /**
   * Obtém o snapshot mais recente de uma fonte.
   */
  public static getLatestSnapshot(sourceId: string): KnowledgeSnapshot | null {
    const list = this.snapshots.get(sourceId);
    if (!list || list.length === 0) return null;
    return list[0];
  }

  /**
   * Obtém o penúltimo snapshot para comparação de diff.
   */
  public static getPreviousSnapshot(sourceId: string): KnowledgeSnapshot | null {
    const list = this.snapshots.get(sourceId);
    if (!list || list.length < 2) return null;
    return list[1];
  }

  /**
   * Obtém todo o histórico de snapshots de uma fonte.
   */
  public static getHistory(sourceId: string): KnowledgeSnapshot[] {
    return this.snapshots.get(sourceId) || [];
  }

  /**
   * Obtém todos os snapshots armazenados no sistema.
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
}
