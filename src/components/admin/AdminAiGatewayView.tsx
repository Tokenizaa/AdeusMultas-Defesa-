import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cpu, Play, RefreshCw, Sparkles } from 'lucide-react';
import { useAuthFetch } from '../../hooks/useAuthFetch';

interface AiOverview {
  provider: {
    name: string;
    runtime: string;
    model: string;
    fallback: string | null;
    status: 'configured' | 'not_configured';
    statusMeaning: string;
  };
  rag: {
    provider: string;
    index: string;
    embeddingModel: string;
    dimensions: number | null;
    status: 'configured' | 'not_configured';
    statusMeaning: string;
  };
  capabilities: {
    infractionAnalysis: string;
    defenseGeneration: string;
    ocr: string;
  };
  observability: {
    historicalMetrics: boolean;
    totalAiRequests: number;
    errorRatePercent: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    metricsScope: string;
  };
}

export const AdminAiGatewayView: React.FC = () => {
  const authFetch = useAuthFetch();
  const [data, setData] = useState<AiOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testPrompt, setTestPrompt] = useState('Analisar auto de infração por excesso de velocidade art. 218 I CTB com radar sem aferição anual do INMETRO.');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchAiOverview = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [overviewRes, metricsRes] = await Promise.all([
        authFetch('/api/admin/ai/overview'),
        authFetch('/api/admin/ai/metrics'),
      ]);
      if (!overviewRes.ok) throw new Error(`HTTP ${overviewRes.status} ao carregar configuração de IA`);
      const overview = await overviewRes.json();
      const metrics = metricsRes.ok ? await metricsRes.json() : null;
      setData({
        ...overview,
        provider: {
          ...overview.provider,
          status: overview.provider?.status === 'configured' ? 'configured' : 'not_configured',
          statusMeaning: overview.provider?.statusMeaning || 'Saúde do provedor não foi verificada.',
        },
        rag: {
          ...overview.rag,
          status: overview.rag?.status === 'configured' ? 'configured' : 'not_configured',
          statusMeaning: overview.rag?.statusMeaning || 'Saúde do índice vetorial não foi verificada.',
        },
        observability: {
          historicalMetrics: metrics?.available === true,
          totalAiRequests: Number(metrics?.totalCalls ?? 0),
          errorRatePercent: Number(metrics?.errorRatePercent ?? 0),
          avgLatencyMs: Number(metrics?.avgLatencyMs ?? 0),
          p95LatencyMs: Number(metrics?.p95LatencyMs ?? 0),
          metricsScope: metrics?.available
            ? `Logs persistidos das últimas ${Number(metrics.windowHours) || 24} horas.`
            : 'Métricas históricas indisponíveis; nenhum valor foi estimado.',
        },
      });
    } catch (err) {
      setLoadError('Não foi possível carregar o estado real do gateway de IA.');
      console.error('Error fetching AI overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAiOverview();
  }, []);

  const handleRunAiTest = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const startTime = performance.now();
      const res = await authFetch('/api/ocr/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: testPrompt, presetId: 'velocidade' }),
      });
      const json = await res.json();
      setTestResult({ success: res.ok, error: res.ok ? undefined : (json?.error || `HTTP ${res.status}`), durationMs: Math.round(performance.now() - startTime), data: json, timestamp: new Date().toISOString() });
    } catch (err: any) {
      setTestResult({ success: false, error: err.message, timestamp: new Date().toISOString() });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-orange-400" />
            <h1 className="text-lg font-bold text-white font-mono">IA Core & Gateway</h1>
          </div>
          <p className="text-sm text-slate-400 font-mono mt-1">
            Fonte: API administrativa. Configuração não equivale a saúde operacional.
          </p>
        </div>
        <button onClick={fetchAiOverview} disabled={isLoading} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl disabled:opacity-50" title="Recarregar configuração">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loadError && <div role="alert" className="rounded-xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-200">{loadError}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
        <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase">Runtime de inferência</h2>
          <div className={`flex items-center gap-2 ${data?.provider.status === 'configured' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {data?.provider.status === 'configured' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {data?.provider.name || 'Runtime não identificado'} · {data?.provider.status === 'configured' ? 'Binding configurado; saúde não verificada' : 'Binding não configurado'}
          </div>
          <p className="text-sm text-slate-400">Runtime: <span className="text-slate-200">{data?.provider.runtime || '—'}</span></p>
          <p className="text-sm text-slate-400">Modelo configurado: <span className="text-slate-200">{data?.provider.model || '—'}</span></p>
          <p className="text-sm text-slate-400">Fallback configurado: <span className="text-slate-200">{data?.provider.fallback ?? 'nenhum'}</span></p>
          <p className="text-xs text-slate-500">{data?.provider.statusMeaning || 'Saúde operacional não verificada.'}</p>
        </section>

        <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 font-mono">
          <h2 className="text-sm font-bold text-slate-300 uppercase">RAG jurídico</h2>
          <div className={`flex items-center gap-2 ${data?.rag.status === 'configured' ? 'text-emerald-300' : 'text-amber-300'}`}>
            {data?.rag.status === 'configured' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {data?.rag.status === 'configured' ? 'Binding Vectorize configurado; consulta não verificada' : 'Binding Vectorize não configurado'}
          </div>
          <p className="text-sm text-slate-400">Index/persistência: <span className="text-slate-200">{data?.rag.index || '—'}</span></p>
          <p className="text-sm text-slate-400">Modelo de embedding configurado: <span className="text-slate-200">{data?.rag.embeddingModel || '—'}</span> · Dimensões: <span className="text-slate-200">{data?.rag.dimensions ?? 'não informadas'}</span></p>
          <p className="text-xs text-slate-500">{data?.rag.statusMeaning || 'O estado do índice não foi verificado por consulta.'} Nenhuma contagem de vetores é estimada neste painel.</p>
        </section>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono">
        <h2 className="text-sm font-bold text-slate-300 uppercase">Capacidades migradas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-slate-950 rounded-xl p-3 text-slate-300">Análise de infração<br /><span className="text-slate-500">{data?.capabilities.infractionAnalysis || '—'}</span></div>
          <div className="bg-slate-950 rounded-xl p-3 text-slate-300">Geração de defesa<br /><span className="text-slate-500">{data?.capabilities.defenseGeneration || '—'}</span></div>
          <div className="bg-slate-950 rounded-xl p-3 text-slate-300">OCR<br /><span className="text-slate-500">{data?.capabilities.ocr || '—'}</span></div>
        </div>
        <p className="text-xs text-slate-500">
          {data?.observability.metricsScope || 'Métricas de execução não verificadas.'}
          {' '}Chamadas registradas: {data?.observability.totalAiRequests ?? 0}; latência média: {data?.observability.avgLatencyMs ?? 0} ms; erros: {data?.observability.errorRatePercent ?? 0}%; p95: {data?.observability.p95LatencyMs ?? 0} ms.
          {' '}Histórico persistente: {data?.observability.historicalMetrics ? 'disponível' : 'indisponível'}.
        </p>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 font-mono">
        <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-orange-400" /><h2 className="text-sm font-bold text-white uppercase">Teste de OCR/IA</h2></div>
        <textarea value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} rows={3} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-orange-500 text-sm" />
        <button onClick={handleRunAiTest} disabled={isTesting} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50">
          <Play className="w-3.5 h-3.5" /> {isTesting ? 'Executando...' : 'Testar pipeline'}
        </button>
        {testResult && (
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-sm">
            <div className={testResult.success ? 'text-emerald-400' : 'text-red-400'}>
              {testResult.success ? `Execução concluída em ${testResult.durationMs}ms` : `Falha: ${testResult.error || 'erro desconhecido'}`}
            </div>
            <pre className="text-slate-300 overflow-x-auto max-h-60">{JSON.stringify(testResult.data, null, 2)}</pre>
          </div>
        )}
      </section>
    </div>
  );
};
