/**
 * Agente: analytics-agent
 * Analisa métricas de uso do funil
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class AnalyticsAgent extends BaseAgent {
  protected name = "analytics-agent";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    const metrics = this.collectMetrics(context);
    context.metadata.analytics = metrics;
    this.recordUsage(["analytics-collection"]);

    return context;
  }

  private collectMetrics(context: CaseContext) {
    const steps = context.metadata.stepTimings || {};
    const errors = context.metadata.fieldErrors || {};
    const converted = context.metadata.converted || false;

    const stepTimings: Record<number, number> = {};
    Object.entries(steps).forEach(([step, time]) => {
      stepTimings[Number(step)] = time;
    });

    const errorRateByField: Record<string, number> = {};
    Object.entries(errors).forEach(([field, count]) => {
      errorRateByField[field] = Number(count);
    });

    // Taxa de abandono por step
    const dropoffByStep: Record<number, number> = {};
    const stepKeys = Object.keys(steps)
      .map(Number)
      .sort((a, b) => a - b);
    const totalSessions = 1; // sessão atual

    stepKeys.forEach((step, idx) => {
      const nextStep = stepKeys[idx + 1];
      const currentCount = stepTimings[step] ? 1 : 0;
      const nextCount = nextStep ? (stepTimings[nextStep] ? 1 : 0) : converted ? 1 : 0;

      if (currentCount > 0) {
        dropoffByStep[step] = Math.max(0, 1 - nextCount / currentCount);
      }
    });

    return {
      stepTimings,
      errorRateByField,
      dropoffByStep,
      converted,
      avgTimePerStep: this.calculateAvgTime(stepTimings),
      bottleneck: this.findBottleneck(stepTimings),
    };
  }

  private calculateAvgTime(stepTimings: Record<number, number>): number {
    const times = Object.values(stepTimings).filter((t) => t > 0);
    if (times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  private findBottleneck(stepTimings: Record<number, number>) {
    let maxTime = 0;
    let bottleneckStep = 1;

    Object.entries(stepTimings).forEach(([step, time]) => {
      if (time > maxTime) {
        maxTime = time;
        bottleneckStep = Number(step);
      }
    });

    return { step: bottleneckStep, timeSeconds: Math.round(maxTime / 1000) };
  }
}
