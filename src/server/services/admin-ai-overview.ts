export interface AdminAiOverviewInput {
  nvidiaConfigured: boolean;
  nvidiaModel: string;
  nineRouterConfigured: boolean;
  nineRouterModel: string;
  fallbackEnabled: boolean;
  geminiConfigured: boolean;
  embeddingModel: string;
  vectorStore: {
    isSupabaseConnected: boolean;
    sourcesCount: number;
    documentsCount: number;
    chunksCount: number;
    embeddingsCount: number;
  };
  metrics: {
    nvidia: { requestsTotal: number; successRate: number; avgLatencyMs: number };
    nineRouter: { requestsTotal: number; successRate: number; avgLatencyMs: number };
    totalAiRequests: number;
    fallbackRatePercent: number;
    errorRatePercent: number;
    p95LatencyMs: number;
  };
  recentTraceCount: number;
}

export function buildAdminAiOverview(input: AdminAiOverviewInput) {
  const primaryName = input.nvidiaConfigured ? 'NVIDIA NIM' : 'Deterministic Legal RAG';
  const fallback = input.fallbackEnabled && input.nineRouterConfigured
    ? `9Router (${input.nineRouterModel})`
    : input.geminiConfigured
      ? 'Google Gemini'
      : null;

  return {
    provider: {
      name: primaryName,
      runtime: 'Node.js API',
      model: input.nvidiaConfigured ? input.nvidiaModel : 'defesai-legal-vectorizer-v1',
      fallback,
      status: input.nvidiaConfigured ? 'configured' : 'not_configured',
      statusMeaning: 'Configuração de chave/modelo; não é prova de saúde do provedor.',
      requestsTotal: input.metrics.nvidia.requestsTotal,
      successRate: input.metrics.nvidia.successRate,
      avgLatencyMs: input.metrics.nvidia.avgLatencyMs,
    },
    rag: {
      provider: input.vectorStore.isSupabaseConnected ? 'Supabase pgvector + memória' : 'VectorStore em memória',
      index: input.vectorStore.isSupabaseConnected
        ? 'Cliente Supabase configurado; conectividade não verificada'
        : 'Somente memória; persistência não verificada',
      embeddingModel: input.embeddingModel,
      dimensions: null,
      status: input.vectorStore.isSupabaseConnected
        ? 'CLIENT_CONFIGURED_HEALTH_NOT_CHECKED'
        : 'MEMORY_ONLY_PERSISTENCE_NOT_VERIFIED',
      inMemoryCounts: {
        sources: input.vectorStore.sourcesCount,
        documents: input.vectorStore.documentsCount,
        chunks: input.vectorStore.chunksCount,
        embeddings: input.vectorStore.embeddingsCount,
      },
    },
    capabilities: {
      infractionAnalysis: 'Implementação presente; saúde operacional não medida neste endpoint.',
      defenseGeneration: 'Implementação presente; saúde operacional não medida neste endpoint.',
      ocr: 'Implementação presente; saúde operacional não medida neste endpoint.',
    },
    observability: {
      historicalMetrics: false,
      totalAiRequests: input.metrics.totalAiRequests,
      fallbackRatePercent: input.metrics.fallbackRatePercent,
      errorRatePercent: input.metrics.errorRatePercent,
      p95LatencyMs: input.metrics.p95LatencyMs,
      recentTraceCount: input.recentTraceCount,
      metricsScope: 'Contadores em memória do processo atual; não são histórico persistente.',
      providerMetrics: {
        nvidia: input.metrics.nvidia,
        nineRouter: input.metrics.nineRouter,
      },
    },
  };
}
