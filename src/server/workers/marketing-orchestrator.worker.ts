import { logger } from '../observability/logger';
import { eventBus, EventTopics } from '../../core/events/topics';
import { marketingService } from '../services/marketing-service';
import { estrategicoAgent } from './agents/estrategico-agent.worker';
import { planejamentoAgent } from './agents/planejamento-agent.worker';
import { criadorAgent } from './agents/criador-agent.worker';
import { qualidadeAgent } from './agents/qualidade-agent.worker';
import { publicacaoAgent } from './agents/publicacao-agent.worker';
import { inteligenciaAgent } from './agents/inteligencia-agent.worker';
import { aprendizadoAgent } from './agents/aprendizado-agent.worker';

/**
 * MarketingOrchestrator (4.1) — roda o ciclo dos 7 agentes a cada 5 minutos
 * e reage a eventos da fila (MARKETING_*). Sem browser, apenas backend.
 */
const CYCLE_INTERVAL_MS = 5 * 60 * 1000;

export class MarketingOrchestrator {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastCycleAt: string | null = null;
  private cycleCount = 0;
  private running = false;

  private readonly agents = [
    estrategicoAgent,
    planejamentoAgent,
    criadorAgent,
    qualidadeAgent,
    publicacaoAgent,
    inteligenciaAgent,
    aprendizadoAgent,
  ];

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.runCycle().catch((err) => {
      logger.error('marketing', 'orchestrator', 'cycle', 'Ciclo autônomo falhou', { message: String(err) });
    }), CYCLE_INTERVAL_MS);
    logger.info('marketing', 'orchestrator', 'start', 'Orquestrador iniciado (cron 5min)');

    // Event-driven: reage ao tick manual/disparado por outras rotas
    eventBus.subscribe(EventTopics.MARKETING_CYCLE_TICK, () => {
      this.runCycle().catch(() => { /* error já logado no ciclo */ });
    });
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runCycle(): Promise<{ success: boolean; cycle: number; lastCycleAt: string }> {
    if (this.running) {
      return { success: false, cycle: this.cycleCount, lastCycleAt: this.lastCycleAt ?? '' };
    }
    this.running = true;
    try {
      const results = await Promise.allSettled(this.agents.map((a) => a.run()));
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failures.length > 0) {
        logger.error('marketing', 'orchestrator', 'cycle', `${failures.length} agente(s) falharam no ciclo`, {
          errors: failures.map((f) => String(f.reason)),
        });
      }
      this.cycleCount += 1;
      this.lastCycleAt = new Date().toISOString();
      marketingService.incrementCycleCount();
      eventBus.publish(EventTopics.MARKETING_CYCLE_TICK, {
        cycle: this.cycleCount,
        timestamp: this.lastCycleAt,
      }, 'marketing_os');
      return { success: true, cycle: this.cycleCount, lastCycleAt: this.lastCycleAt };
    } finally {
      this.running = false;
    }
  }

  getStatus() {
    return {
      running: this.running,
      cycleCount: this.cycleCount,
      lastCycleAt: this.lastCycleAt,
      intervalMs: CYCLE_INTERVAL_MS,
      agents: this.agents.map((a) => a.getStatus()),
    };
  }
}

export const marketingOrchestrator = new MarketingOrchestrator();