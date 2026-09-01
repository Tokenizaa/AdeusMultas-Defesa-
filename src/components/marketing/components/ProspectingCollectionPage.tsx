import React, { useState, useEffect } from 'react';
import {
  Bot,
  Search,
  MapPin,
  ListFilter,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Clock,
  Sparkles,
  Loader2,
  Database,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe2,
  Cpu,
  Layers,
  Download,
} from 'lucide-react';
import { useAuthFetch } from '../../../hooks/useAuthFetch';
import type { AutomationStatus } from '../types/prospecting';
import { ProspectingLayout } from './ProspectingLayout';

const PRESET_QUERIES = [
  'despachante de trânsito',
  'despachante veicular',
  'advogado direito de trânsito',
  'advogado especialista em multas',
  'autoescola cfc',
];

const PRESET_CITIES = [
  'São Paulo',
  'Rio de Janeiro',
  'Belo Horizonte',
  'Curitiba',
  'Porto Alegre',
  'Campinas',
  'Goiânia',
  'Recife',
  'Fortaleza',
  'Manaus',
];

export const ProspectingCollectionPage: React.FC = () => {
  const authFetch = useAuthFetch();
  const [status, setStatus] = useState<AutomationStatus>('STOPPED');
  const [selectedQuery, setSelectedQuery] = useState(PRESET_QUERIES[0]);
  const [useCustomQuery, setUseCustomQuery] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [city, setCity] = useState(PRESET_CITIES[0]);
  const [limit, setLimit] = useState(20);

  // Load Status
  useEffect(() => {
    authFetch('/api/marketing/automation/status')
      .then((r) => r.json())
      .then((data) => {
        if (data?.status) setStatus(data.status);
      })
      .catch(() => {});
  }, [authFetch]);

  // Execution states
  const [isLoading, setIsLoading] = useState(false);
  const [executionPhase, setExecutionPhase] = useState<string>('');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [cancelRequested, setCancelRequested] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalQuery = useCustomQuery ? customQuery : selectedQuery;
    const finalCity = city.trim();
    if (!finalQuery || !finalCity) return;

    setIsLoading(true);
    setExecutionPhase('Enfileirando job de scraping...');
    setCancelRequested(false);
    setJobStatus(null);

    try {
      const res = await authFetch('/api/marketing/automation/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: [finalQuery],
          cities: [finalCity],
          limitPerQuery: limit,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        console.error('Erro ao enfileirar scrape:', res.status, errorText);
        alert(`Erro ${res.status}: ${errorText || 'Falha ao enfileirar raspagem'}`);
        return;
      }

      const data = await res.json();
      if (data.jobId) {
        setCurrentJobId(data.jobId);
        setExecutionPhase(`Job #${data.jobId.slice(-8)} enfileirado. Aguarde início do processamento...`);
        // Iniciar polling
        pollJobStatus(data.jobId);
      } else {
        alert(data.error || 'Falha ao enfileirar raspagem.');
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
      alert('Erro de conexão ao enfileirar scraper.');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelJob = async () => {
    if (!currentJobId) return;
    setCancelRequested(true);
    try {
      await authFetch(`/api/marketing/automation/scrape/${currentJobId}/cancel`, { method: 'POST' });
      setExecutionPhase('Cancelamento solicitado. Aguarde o worker parar...');
      setCurrentJobId(null);
    } catch (err) {
      console.error('Erro ao cancelar job:', err);
    }
  };

  const pollJobStatus = (jobId: string) => {
    const interval = setInterval(async () => {
      if (cancelRequested) {
        clearInterval(interval);
        return;
      }

      try {
        const res = await authFetch(`/api/marketing/automation/scrape/${jobId}`);
        if (!res.ok) {
          clearInterval(interval);
          setExecutionPhase('Erro ao consultar status do job.');
          return;
        }

        const data = await res.json();
        setJobStatus(data);

        if (data.status === 'running') {
          const p = data.progress || { discovered: 0, processed: 0, persisted: 0, duplicates: 0 };
          const percent = p.discovered > 0 ? Math.round((p.processed / p.discovered) * 100) : 0;
          setExecutionPhase(`Processando: ${p.processed}/${p.discovered} cards (${percent}%). Inseridos: ${p.persisted}, Duplicatas: ${p.duplicates}`);
        } else if (data.status === 'completed') {
          clearInterval(interval);
          setCurrentJobId(null);
          setExecutionPhase('Varredura concluída! Leads persistidos no banco.');
          window.dispatchEvent(new CustomEvent('marketing:leads:invalidate'));
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setCurrentJobId(null);
          setExecutionPhase(`Falha: ${data.error || 'Erro desconhecido'}`);
          console.error('Job falhou:', data.error);
        } else if (data.status === 'cancelled') {
          clearInterval(interval);
          setCurrentJobId(null);
          setExecutionPhase('Job cancelado.');
        }
      } catch (err) {
        clearInterval(interval);
        setExecutionPhase('Erro de conexão no polling do job.');
        console.error('Polling error:', err);
      }
    }, 3000);

    // Limpar polling após 30 minutos (timeout de segurança)
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
  };

  // Também buscar scraping status via evento de invalidação
  const [scrapesList, setScrapesList] = useState<any[]>([]);

  const loadScrapes = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/scrapes');
      if (res.ok) {
        const data = await res.json();
        setScrapesList(data.jobs || []);
      }
    } catch {
      // Silencioso - polling já mostra status do job ativo
    }
  };

  useEffect(() => {
    loadScrapes();
    const interval = setInterval(loadScrapes, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ProspectingLayout activeTab="collection" status={status}>
      <div className="space-y-6">
        {/* Header & Scraper Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Mecanismo de Aquisição & Mineração B2B
                </span>
                <h2 className="text-lg font-extrabold text-white">
                  Coleta & Raspagem Autônoma de Contatos
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Descubra estabelecimentos, advogados e despachantes com telefones válidos, WhatsApp e endereços normalizados diretamente da API pública do Google Maps Places e OAB.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Query Selector */}
              <div className="space-y-1.5 md:col-span-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-slate-400">Nicho / Especialidade</label>
                  <button
                    type="button"
                    onClick={() => setUseCustomQuery(!useCustomQuery)}
                    className="text-[11px] text-orange-400 hover:text-orange-300 font-mono cursor-pointer"
                  >
                    {useCustomQuery ? 'Usar Predefinição' : 'Personalizar'}
                  </button>
                </div>

                {useCustomQuery ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={customQuery}
                      onChange={(e) => setCustomQuery(e.target.value)}
                      placeholder="Ex: despachante cnh suspensa"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                      required
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                  </div>
                ) : (
                  <select
                    value={selectedQuery}
                    onChange={(e) => setSelectedQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    {PRESET_QUERIES.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* City Input */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-xs font-mono text-slate-400">Cidade Alvo</label>
                <div className="relative">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Curitiba"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                    required
                  />
                  <MapPin className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Limit Selector */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-xs font-mono text-slate-400">Limite de Resultados</label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value={10}>10 contatos (Rápido)</option>
                  <option value={20}>20 contatos (Padrão)</option>
                  <option value={30}>30 contatos</option>
                  <option value={50}>50 contatos (Lote Máximo)</option>
                </select>
              </div>
            </div>

            {/* Quick City Tags */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500 font-mono">Cidades rápidas:</span>
              {PRESET_CITIES.slice(0, 6).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    city.toLowerCase() === c.toLowerCase()
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Real-time Execution Banner with Cancel */}
            {isLoading && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-2 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-400 text-xs font-bold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{executionPhase}</span>
                  </div>
                  {currentJobId && (
                    <button
                      type="button"
                      onClick={cancelJob}
                      disabled={!jobStatus || jobStatus.status === 'queued'}
                      className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      title="Cancelar job de scraping"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300 font-mono">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>1. Google Maps Discovery</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-orange-400" />
                    <span>2. Extração de Detalhes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                    <span>3. Persistência no Supabase</span>
                  </div>
                </div>
              </div>
            )}

            {/* Cancel Request Confirmation */}
            {cancelRequested && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-400">
                Cancelamento solicitado. Aguarde o worker parar com segurança.
              </div>
            )}

            {/* Job Status Box */}
            {jobStatus && !isLoading && jobStatus.status !== 'completed' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
                <div className="flex items-center gap-2 text-orange-400 text-xs font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Job #{jobStatus.id?.slice(-8)} em andamento ({jobStatus.status})</span>
                </div>
                {jobStatus.progress && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px]">
                    <div>
                      <span className="text-slate-500 font-mono">Encontrados</span>
                      <div className="text-white font-bold">{jobStatus.progress.discovered}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono">Processados</span>
                      <div className="text-white font-bold">{jobStatus.progress.processed}</div>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-mono">Inseridos</span>
                      <div className="text-emerald-400 font-bold">{jobStatus.progress.persisted}</div>
                    </div>
                    <div>
                      <span className="text-amber-400 font-mono">Duplicados</span>
                      <div className="text-amber-400 font-bold">{jobStatus.progress.duplicates}</div>
                    </div>
                    <div>
                      <span className="text-rose-400 font-mono">Erros</span>
                      <div className="text-rose-400 font-bold">{jobStatus.progress.errors}</div>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => authFetch(`/api/marketing/automation/scrape/${jobStatus.id}/cancel`, { method: 'POST' })}
                  className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-all"
                >
                  Cancelar Job
                </button>
              </div>
            )}

            {/* Recent Jobs List */}
            {scrapesList.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-3">Jobs Recentes</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {scrapesList.map((j) => (
                    <div
                      key={j.id}
                      className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800/60 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          j.status === 'completed' ? 'bg-emerald-400' :
                          j.status === 'running' ? 'bg-orange-400 animate-pulse' :
                          j.status === 'queued' ? 'bg-slate-500' :
                          j.status === 'failed' ? 'bg-rose-400' :
                          'bg-slate-600'
                        }`} />
                        <span className="font-mono text-slate-400">#{j.id.slice(-8)}</span>
                        <span className="text-slate-300 capitalize">{j.status}</span>
                        {j.progress && (
                          <span className="text-slate-500">
                            {j.progress.persisted} leads • {j.progress.duplicates} dup
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        j.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        j.status === 'failed' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-slate-500/10 text-slate-400'
                      }`}>
                        {j.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trigger Button */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Coletando Leads...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Iniciar Raspagem de Leads</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Job Result Details (when completed/failed/cancelled) */}
        {jobStatus && ['completed', 'failed', 'cancelled'].includes(jobStatus.status) && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {jobStatus.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                )}
                <h3 className="text-sm font-bold text-white">
                  Job #{jobStatus.id?.slice(-8)} - {jobStatus.status === 'completed' ? 'Concluído' : jobStatus.status === 'failed' ? 'Falhou' : 'Cancelado'}
                </h3>
              </div>
              {jobStatus.collectionRunId && jobStatus.status === 'completed' && (
                <button
                  onClick={() => {
                    const url = `/api/marketing/automation/export/${jobStatus.collectionRunId}`;
                    window.open(url, '_blank');
                  }}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Baixar XLSX desta coleta"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar XLSX</span>
                </button>
              )}
            </div>

            {/* Stat Boxes from progress */}
            {jobStatus.progress && (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 text-center">
                  <span className="text-[11px] text-slate-400 font-mono">ENCONTRADOS</span>
                  <div className="text-xl font-black text-white mt-1">{jobStatus.progress.discovered}</div>
                </div>
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 text-center">
                  <span className="text-[11px] text-emerald-400 font-mono">INSERIDOS</span>
                  <div className="text-xl font-black text-emerald-400 mt-1">{jobStatus.progress.persisted}</div>
                </div>
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 text-center">
                  <span className="text-[11px] text-amber-400 font-mono">DUPLICADOS</span>
                  <div className="text-xl font-black text-amber-400 mt-1">{jobStatus.progress.duplicates}</div>
                </div>
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 text-center">
                  <span className="text-[11px] text-rose-400 font-mono">REJEITADOS</span>
                  <div className="text-xl font-black text-rose-400 mt-1">0</div>
                </div>
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 text-center">
                  <span className="text-[11px] text-rose-400 font-mono">ERROS</span>
                  <div className="text-xl font-black text-rose-400 mt-1">{jobStatus.progress.errors || 0}</div>
                </div>
              </div>
            )}

            {/* Error details */}
            {jobStatus.error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300">
                {jobStatus.error}
              </div>
            )}

            {/* Show sample leads if completed */}
            {jobStatus.status === 'completed' && jobStatus.progress?.persisted > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  {jobStatus.progress.persisted} novos leads salvos. Acesse a aba "Leads" para visualizar todos.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Operational Best Practices Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Filtro de Qualidade Automático</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              O coletor valida se o contato possui telefone celular com DDD brasileiro antes de salvar em <code className="text-slate-300 font-mono">marketing_leads</code>. Contatos sem telefone válido são descartados para não sujar a fila de disparos.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-orange-400 font-bold">
              <Zap className="w-4 h-4" />
              <span>Deduplicação Inteligente</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              O banco utiliza índice único por telefone e nome. Se um despachante ou advogado já tiver sido cadastrado anteriormente em outra varredura, ele não será duplicado.
            </p>
          </div>
        </div>
      </div>
    </ProspectingLayout>
  );
};
