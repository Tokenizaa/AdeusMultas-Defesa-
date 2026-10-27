import { describe, expect, it } from 'vitest';
import { buildAdminAiOverview } from './admin-ai-overview';

const base = {
  nvidiaConfigured: false,
  nvidiaModel: 'model-from-config',
  nineRouterConfigured: false,
  nineRouterModel: 'fallback-from-config',
  fallbackEnabled: true,
  geminiConfigured: false,
  embeddingModel: 'embedding-from-config',
  vectorStore: {
    isSupabaseConnected: false,
    sourcesCount: 2,
    documentsCount: 3,
    chunksCount: 4,
    embeddingsCount: 5,
  },
  metrics: {
    nvidia: { requestsTotal: 0, successRate: 0, avgLatencyMs: 0 },
    nineRouter: { requestsTotal: 0, successRate: 0, avgLatencyMs: 0 },
    totalAiRequests: 0,
    fallbackRatePercent: 0,
    errorRatePercent: 0,
    p95LatencyMs: 0,
  },
  recentTraceCount: 0,
};

describe('buildAdminAiOverview', () => {
  it('does not claim provider health or RAG sync when only in-memory state exists', () => {
    const result = buildAdminAiOverview(base);

    expect(result.provider.status).toBe('not_configured');
    expect(result.provider.name).toBe('Deterministic Legal RAG');
    expect(result.provider.fallback).toBeNull();
    expect(result.rag.status).toBe('MEMORY_ONLY_PERSISTENCE_NOT_VERIFIED');
    expect(result.rag.inMemoryCounts).toEqual({
      sources: 2,
      documents: 3,
      chunks: 4,
      embeddings: 5,
    });
    expect(result.observability.historicalMetrics).toBe(false);
    expect(result.observability.totalAiRequests).toBe(0);
  });

  it('uses runtime configuration and real counters instead of fixed provider data', () => {
    const result = buildAdminAiOverview({
      ...base,
      nvidiaConfigured: true,
      nineRouterConfigured: true,
      metrics: {
        ...base.metrics,
        nvidia: { requestsTotal: 7, successRate: 85.7, avgLatencyMs: 321 },
        totalAiRequests: 7,
      },
      vectorStore: { ...base.vectorStore, isSupabaseConnected: true },
    });

    expect(result.provider).toMatchObject({
      name: 'NVIDIA NIM',
      model: 'model-from-config',
      fallback: '9Router (fallback-from-config)',
      status: 'configured',
      requestsTotal: 7,
      successRate: 85.7,
      avgLatencyMs: 321,
    });
    expect(result.rag.status).toBe('CLIENT_CONFIGURED_HEALTH_NOT_CHECKED');
    expect(result.rag.dimensions).toBeNull();
  });
});
