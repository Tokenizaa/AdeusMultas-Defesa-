/**
 * @file monitor-runtime.ts
 * Inicialização explícita e gerenciamento do ciclo de vida do monitor
 * nacional de fontes oficiais (SNM-JO).
 *
 * Reutiliza os componentes existentes sem duplicar arquitetura:
 *   - WeeklyMonitorScheduler.runCycle() — ciclo sob demanda (já exposto via POST /monitor/run)
 *   - WeeklyMonitorService.startScheduledService() — agendamento automático (7 dias)
 *   - SnapshotStore — snapshots duráveis (memória + Supabase)
 *
 * Não cria novo monitor, catálogo ou raspador.
 */

import { WeeklyMonitorScheduler } from './weekly-monitor-scheduler';
import { WeeklyMonitorService } from './weekly-monitor-service';
import { SnapshotStore } from '../monitoring/snapshot-store';

export interface MonitorRuntimeStatus {
  initialized: boolean;
  scheduled: boolean;
  running: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalCycles: number;
  latestCycle: any | null;
  pendingReviews: number;
  supabaseConfigured: boolean;
}

/**
 * Estado do runtime do monitor.
 */
let monitorInitialized = false;
let monitorScheduled = false;

/**
 * Inicializa o monitor de forma explícita e idempotente.
 * Não cria agendamentos duplicados: se já foi inicializado, retorna o status atual.
 *
 * @param startScheduled - se true, inicia o agendamento automático de 7 dias
 *   (WeeklyMonitorService.startScheduledService). Apenas em ambientes Node.js
 *   com suporte a setInterval persistente (não em Cloudflare Worker sem cron).
 */
export function initializeMonitor(startScheduled: boolean = false): MonitorRuntimeStatus {
  if (monitorInitialized) {
    return getMonitorStatus();
  }

  monitorInitialized = true;

  if (startScheduled && !monitorScheduled) {
    WeeklyMonitorService.startScheduledService(7 * 24 * 60 * 60 * 1000); // 7 dias
    monitorScheduled = true;
  }

  // Carrega snapshots persistidos do Supabase (se disponível) para retomar após reinício
  SnapshotStore.loadFromSupabase().catch((err) => {
    // Falha ao carregar snapshots do Supabase não impede a inicialização
    console.warn('[monitor-runtime] Falha ao carregar snapshots persistidos:', err);
  });

  return getMonitorStatus();
}

/**
 * Para o agendamento automático do monitor (apenas em ambientes Node.js).
 */
export function stopMonitor(): void {
  if (monitorScheduled) {
    WeeklyMonitorService.stopScheduledService();
    monitorScheduled = false;
  }
}

/**
 * Executa um ciclo de monitoramento manual (sob demanda).
 * Compatível com Cloudflare Worker via rota POST /monitor/run e com
 * execução administrativa em servidor Node.js.
 */
export async function runMonitorCycle(customSources?: any, fetchTimeoutMs: number = 6000): Promise<{
  summary: any;
  reportMarkdown: string;
}> {
  if (!monitorInitialized) {
    // Inicializa implicitamente se ainda não foi feito
    initializeMonitor(false);
  }
  return WeeklyMonitorScheduler.runCycle(customSources, fetchTimeoutMs);
}

/**
 * Retorna o status real do monitor: se está inicializado, agendado,
 * executando, último ciclo, próximo ciclo e pendências de revisão.
 */
export function getMonitorStatus(): MonitorRuntimeStatus {
  const serviceStatus = WeeklyMonitorService.getStatus();
  const cycleHistory = WeeklyMonitorScheduler.getCycleHistory();

  return {
    initialized: monitorInitialized,
    scheduled: monitorScheduled,
    running: serviceStatus.isRunning,
    lastRunAt: serviceStatus.lastRunAt,
    nextRunAt: serviceStatus.nextRunAt,
    totalCycles: cycleHistory.length,
    latestCycle: cycleHistory.length > 0 ? cycleHistory[0] : null,
    pendingReviews: serviceStatus.pendingReviewsCount,
    supabaseConfigured: SnapshotStore.isSupabaseConfigured(),
  };
}

/**
 * Verifica se o runtime atual suporta agendamento automático (setInterval).
 * Retorna false em ambientes Serverless/Cloudflare Worker sem cron configurado.
 */
export function supportsScheduledMonitoring(): boolean {
  // Em Cloudflare Worker sem crons configurados no wrangler.jsonc, setInterval
  // não é confiável. Retorna false para forçar uso de execução sob demanda.
  return typeof process !== 'undefined' && process.versions?.node !== undefined;
}
