import React, { useEffect, useState } from 'react';
import { CheckCircle2, Cpu, Play, RefreshCw, Sparkles } from 'lucide-react';

interface AiOverview {
  provider: {
    name: string;
    runtime: string;
    model: string;
    fallback: string | null;
  };
  rag: {
    provider: string;
    index: string;
    embeddingModel: string;
    dimensions: number;
    status: string;
  };
  capabilities: {
    infractionAnalysis: string;
    defenseGeneration: string;
    ocr: string;
  };
  observability: {
    historicalMetrics: boolean;
    metricsPhase: number;
  };
}

export const AdminAiGatewayView: React.FC = () => {
  const [data, setData] = useState<AiOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testPrompt, setTestPrompt] = useState('Analisar auto de infração por excesso de velocidade art. 218 I CTB com radar sem aferição anual do INMETRO.');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchAiOverview = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/ai/overview');
      if (!res.ok) throw new Error('Falha ao carregar configuração de IA');
      setData(await res.json());
    } catch (err) {
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
      const res = await fetch('/api/ocr/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: testPrompt, presetId: 'velocidade' }),
      });
      const json = await res.json();
      setTestResult({ success: res.ok, durationMs: Math.round(performance.now() - startTime), data: json, timestamp: new Date().toISOString() });
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
            Runtime atual: Cloudflare Workers AI + Vectorize. Sem fallback Vercel/NVIDIA/9Router.
          </p>
        </div>
        <button onClick={fetchAiOverview} disabled={isLoading} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl disabled:opacity-50" title="Recarregar configuração">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
        <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase">Runtime de inferência</h2>
          <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-4 h-4" /> Cloudflare Workers AI</div>
          <p className="text-sm text-slate-400">Modelo: <span className="text-slate-200">{data?.provider.model || '—'}</span></p>
          <p className="text-sm text-slate-400">Fallback: <span className="text-slate-200">{data?.provider.fallback ?? 'nenhum'}</span></p>
        </section>

        <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 font-mono">
          <h2 className="text-sm font-bold text-slate-300 uppercase">RAG jurídico</h2>
          <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-4 h-4" /> {data?.rag.status || '—'}</div>
          <p className="text-sm text-slate-400">Index: <span className="text-slate-200">{data?.rag.index || '—'}</span></p>
          <p className="text-sm text-slate-400">Embedding: <span className="text-slate-200">{data?.rag.embeddingModel || '—'}</span> ({data?.rag.dimensions || '—'} dimensões)</p>
        </section>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono">
        <h2 className="text-sm font-bold text-slate-300 uppercase">Capacidades migradas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-slate-950 rounded-xl p-3 text-slate-300">Análise de infração<br /><span className="text-slate-500">{data?.capabilities.infractionAnalysis || '—'}</span></div>
          <div className="bg-slate-950 rounded-xl p-3 text-slate-300">Geração de defesa<br /><span className="text-slate-500">{data?.capabilities.defenseGeneration || '—'}</span></div>
          <div className="bg-slate-950 rounded-xl p-3 text-slate-300">OCR<br /><span className="text-slate-500">{data?.capabilities.ocr || '—'}</span></div>
        </div>
        <p className="text-xs text-slate-500">Métricas históricas de volume, erro, fallback, p95 e uptime serão fornecidas pela Fase {data?.observability.metricsPhase || 13} de observabilidade.</p>
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
