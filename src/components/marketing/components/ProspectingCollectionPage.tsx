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

  // Execution states
  const [isLoading, setIsLoading] = useState(false);
  const [executionPhase, setExecutionPhase] = useState<string>('');
  const [scrapeResult, setScrapeResult] = useState<any>(null);

  // Load Status
  useEffect(() => {
    authFetch('/api/marketing/automation/status')
      .then((r) => r.json())
      .then((data) => {
        if (data?.status) setStatus(data.status);
      })
      .catch(() => {});
  }, [authFetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalQuery = useCustomQuery ? customQuery : selectedQuery;
    const finalCity = city.trim();
    if (!finalQuery || !finalCity) return;

    setIsLoading(true);
    setExecutionPhase('Iniciando raspagem no Google Maps Places...');
    setScrapeResult(null);

    try {
      setExecutionPhase('Executando varredura incremental no Google Maps...');
      const res = await authFetch('/api/marketing/automation/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: [finalQuery],
          cities: [finalCity],
          limitPerQuery: limit,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setScrapeResult(data);
        setExecutionPhase('Varredura concluída! Persistindo leads no banco...');

        // Disparar evento global para que a página de Leads recarregue os dados do banco
        window.dispatchEvent(new CustomEvent('marketing:leads:invalidate'));

        setExecutionPhase('Varredura concluída com sucesso!');
      } else {
        alert(data.error || 'Falha ao executar raspagem.');
      }
    } catch (err) {
      alert('Erro de conexão ao executar scraper.');
    } finally {
      setIsLoading(false);
    }
  };

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

            {/* Real-time Execution Banner */}
            {isLoading && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-2 animate-pulse">
                <div className="flex items-center gap-2 text-orange-400 text-xs font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{executionPhase}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300 font-mono">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>1. Google Places Scraper</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-orange-400" />
                    <span>2. Normalização DDD / Tel</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                    <span>3. Deduplicação Supabase</span>
                  </div>
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

        {/* Real-time Scrape Results & Logs */}
        {scrapeResult && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Relatório da Última Varredura</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {scrapeResult.query} • {scrapeResult.source}
              </span>
            </div>

            {/* 4 Stat Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 text-center">
                <span className="text-[11px] text-slate-400 font-mono">ENCONTRADOS</span>
                <div className="text-xl font-black text-white mt-1">{scrapeResult.totalFound || 0}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 text-center">
                <span className="text-[11px] text-emerald-400 font-mono">INSERIDOS</span>
                <div className="text-xl font-black text-emerald-400 mt-1">{scrapeResult.inserted || 0}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 text-center">
                <span className="text-[11px] text-teal-400 font-mono">PREENCHIDOS</span>
                <div className="text-xl font-black text-teal-400 mt-1">{scrapeResult.filled || 0}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 text-center">
                <span className="text-[11px] text-amber-400 font-mono">DUPLICADOS</span>
                <div className="text-xl font-black text-amber-400 mt-1">{scrapeResult.duplicates || 0}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 text-center">
                <span className="text-[11px] text-rose-400 font-mono">REJEITADOS</span>
                <div className="text-xl font-black text-rose-400 mt-1">{scrapeResult.rejected || 0}</div>
              </div>
            </div>

            {/* Sample Leads Extracted */}
            {scrapeResult.leads && scrapeResult.leads.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Prévia dos Contatos Capturados ({scrapeResult.leads.length})
                </span>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {scrapeResult.leads.map((l: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-white">{l.name}</span>
                        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                          <span>{l.city}</span>
                          <span>•</span>
                          <span className="font-mono text-emerald-400">{l.phone || l.whatsapp || 'Sem tel'}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        {l.lead_type || 'B2B'}
                      </span>
                    </div>
                  ))}
                </div>
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
