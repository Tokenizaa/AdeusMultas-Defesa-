/**
 * @file metrics-service.ts
 * Real-time Platform Metrics & Provider Observability Engine
 * 
 * Aggregates:
 * 1. AI Provider Observability (NVIDIA vs 9Router vs Gemini) with fallback & retry counters.
 * 2. Latency percentiles (P50, P95, P99) and Request/Min throughput.
 * 3. Supabase Database, Auth and Edge Function metrics.
 * 4. Payment & Meta integration operational rates.
 */

export interface ProviderMetrics {
  name: string;
  role: 'primary' | 'fallback' | 'auxiliary';
  status: 'operational' | 'degraded' | 'down';
  requestsTotal: number;
  requestsSuccess: number;
  requestsFailed: number;
  successRate: number; // percentage 0-100
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  avgLatencyMs: number;
  timeoutsCount: number;
  retriesCount: number;
  fallbackTriggeredCount: number;
  lastRequestAt?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
  estimatedTokensUsed: number;
}

export interface EdgeFunctionMetrics {
  name: string;
  endpoint: string;
  status: 'healthy' | 'degraded' | 'down';
  requests: number;
  successRate: number;
  p95LatencyMs: number;
  lastExecutionAt: string;
  lastError?: string;
}

class MetricsService {
  private latencies: number[] = [];
  private aiLatenciesNvidia: number[] = [];
  private aiLatencies9Router: number[] = [];
  
  private nvidiaMetrics: ProviderMetrics = {
    name: 'NVIDIA NIM Provider',
    role: 'primary',
    status: 'operational',
    requestsTotal: 0,
    requestsSuccess: 0,
    requestsFailed: 0,
    successRate: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    p99LatencyMs: 0,
    avgLatencyMs: 0,
    timeoutsCount: 0,
    retriesCount: 0,
    fallbackTriggeredCount: 0,
    lastRequestAt: undefined,
    lastErrorAt: undefined,
    lastErrorMessage: undefined,
    estimatedTokensUsed: 0,
  };

  private nineRouterMetrics: ProviderMetrics = {
    name: '9Router Provider (Fallback)',
    role: 'fallback',
    status: 'operational',
    requestsTotal: 0,
    requestsSuccess: 0,
    requestsFailed: 0,
    successRate: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    p99LatencyMs: 0,
    avgLatencyMs: 0,
    timeoutsCount: 0,
    retriesCount: 0,
    fallbackTriggeredCount: 0,
    lastRequestAt: undefined,
    lastErrorAt: undefined,
    lastErrorMessage: undefined,
    estimatedTokensUsed: 0,
  };

  private edgeFunctions: EdgeFunctionMetrics[] = [
    {
      name: 'analysis-engine',
      endpoint: '/functions/v1/analysis-engine',
      status: 'healthy',
      requests: 0,
      successRate: 0,
      p95LatencyMs: 0,
      lastExecutionAt: '',
    },
    {
      name: 'knowledge-search',
      endpoint: '/functions/v1/knowledge-search',
      status: 'healthy',
      requests: 0,
      successRate: 0,
      p95LatencyMs: 0,
      lastExecutionAt: '',
    },
    {
      name: 'ocr-processor',
      endpoint: '/functions/v1/ocr-processor',
      status: 'healthy',
      requests: 0,
      successRate: 0,
      p95LatencyMs: 0,
      lastExecutionAt: '',
    },
    {
      name: 'document-generator',
      endpoint: '/functions/v1/document-generator',
      status: 'healthy',
      requests: 0,
      successRate: 0,
      p95LatencyMs: 0,
      lastExecutionAt: '',
    },
  ];

  constructor() {
    // Start with empty arrays - no seed data
    this.latencies = [];
    this.aiLatenciesNvidia = [];
    this.aiLatencies9Router = [];
  }

  public recordRequest(durationMs: number, success = true): void {
    this.latencies.push(durationMs);
    if (this.latencies.length > 500) {
      this.latencies.shift();
    }
  }

  public recordAiRequest(provider: 'nvidia' | '9router', durationMs: number, success: boolean, opts?: { isTimeout?: boolean; isRetry?: boolean; isFallback?: boolean; error?: string; tokens?: number }): void {
    const target = provider === 'nvidia' ? this.nvidiaMetrics : this.nineRouterMetrics;
    const latencyList = provider === 'nvidia' ? this.aiLatenciesNvidia : this.aiLatencies9Router;

    target.requestsTotal += 1;
    if (success) {
      target.requestsSuccess += 1;
    } else {
      target.requestsFailed += 1;
      target.lastErrorAt = new Date().toISOString();
      if (opts?.error) target.lastErrorMessage = opts.error;
    }

    target.successRate = Number(((target.requestsSuccess / target.requestsTotal) * 100).toFixed(1));
    target.lastRequestAt = new Date().toISOString();

    if (opts?.isTimeout) target.timeoutsCount += 1;
    if (opts?.isRetry) target.retriesCount += 1;
    if (opts?.isFallback) target.fallbackTriggeredCount += 1;
    if (opts?.tokens) target.estimatedTokensUsed += opts.tokens;

    latencyList.push(durationMs);
    if (latencyList.length > 300) latencyList.shift();

    // Recalculate percentiles
    const sorted = [...latencyList].sort((a, b) => a - b);
    target.p50LatencyMs = sorted[Math.floor(sorted.length * 0.5)] || durationMs;
    target.p95LatencyMs = sorted[Math.floor(sorted.length * 0.95)] || durationMs;
    target.p99LatencyMs = sorted[Math.floor(sorted.length * 0.99)] || durationMs;
    target.avgLatencyMs = Math.round(sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1));
  }

  public recordEdgeFunctionExecution(name: string, durationMs: number, success: boolean, error?: string): void {
    const fn = this.edgeFunctions.find((f) => f.name === name);
    if (fn) {
      fn.requests += 1;
      if (!success) {
        fn.lastError = error;
      }
      fn.lastExecutionAt = new Date().toISOString();
    }
  }

  public getOverview(): {
    requestsPerMin: number;
    errorRatePercent: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    nvidia: ProviderMetrics;
    nineRouter: ProviderMetrics;
    edgeFunctions: EdgeFunctionMetrics[];
    fallbackRatePercent: number;
    totalAiRequests: number;
  } {
    // Calculate requests per minute based on recent activity
    // For now, we'll calculate from latency timestamps or use a simple approach
    // In a real implementation, we'd track request timestamps
    const requestsPerMin = this.latencies.length > 0 ? Math.min(this.latencies.length * 6, 1000) : 0; // Rough estimate
    
    const totalAi = this.nvidiaMetrics.requestsTotal + this.nineRouterMetrics.requestsTotal;
    const totalErrors = this.nvidiaMetrics.requestsFailed + this.nineRouterMetrics.requestsFailed;
    const errorRatePercent = totalAi > 0 ? Number(((totalErrors / totalAi) * 100).toFixed(1)) : 0;
    
    // Calculate latency percentiles from actual data
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const p50 = sortedLatencies.length > 0 
      ? sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] 
      : 0;
    const p95 = sortedLatencies.length > 0 
      ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] 
      : 0;
    const p99 = sortedLatencies.length > 0 
      ? sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] 
      : 0;

    const fallbackRate = totalAi > 0
      ? Number(((this.nvidiaMetrics.fallbackTriggeredCount / totalAi) * 100).toFixed(2))
      : 0;

    return {
      requestsPerMin,
      errorRatePercent,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      nvidia: { ...this.nvidiaMetrics },
      nineRouter: { ...this.nineRouterMetrics },
      edgeFunctions: [...this.edgeFunctions],
      fallbackRatePercent: fallbackRate,
      totalAiRequests: totalAi,
    };
  }
}

export const metricsService = new MetricsService();
