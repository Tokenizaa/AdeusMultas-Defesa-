import React, { useState } from 'react';
import {
  Bot,
  Search,
  MapPin,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Users,
  Database,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe2,
  Cpu,
} from 'lucide-react';

interface ProspectingCollectionTabProps {
  onScrape: (queries: string[], cities: string[], limit: number) => Promise<void>;
  isLoading: boolean;
  scrapeResult: any;
}

const PRESET_QUERIES = [
  'despachante de trânsito',
  'advogado direito de trânsito',
  'autoescola cnh cassada suspensa',
  'consultoria de recursos de multas',
];

const PRESET_CITIES = [
  'São Paulo',
  'Rio de Janeiro',
  'Curitiba',
  'Belo Horizonte',
  'Porto Alegre',
  'Brasília',
  'Salvador',
  'Campinas',
  'Goiânia',
  'Recife',
  'Fortaleza',
  'Manaus',
];

export const ProspectingCollectionTab: React.FC<ProspectingCollectionTabProps> = ({
  onScrape,
  isLoading,
  scrapeResult,
}) => {
  const [selectedQuery, setSelectedQuery] = useState<string>(PRESET_QUERIES[0]);
  const [customQuery, setCustomQuery] = useState<string>('');
  const [useCustomQuery, setUseCustomQuery] = useState<boolean>(false);
  const [city, setCity] = useState<string>('São Paulo');
  const [limit, setLimit] = useState<number>(10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalQuery = useCustomQuery && customQuery.trim() ? customQuery.trim() : selectedQuery;
    const finalCity = city.trim() ? city.trim() : 'São Paulo';
    await onScrape([finalQuery], [finalCity], limit);
  };

  const setPresetCity = (c: string) => {
    setCity(c);
  };

  return (
    <div className="space-y-6">
      {/* 1. Scraper Control Form Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
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
                <label className="text-xs font-bold text-slate-300">Termo de Busca / Segmento</label>
                <button
                  type="button"
                  onClick={() => setUseCustomQuery(!useCustomQuery)}
                  className="text-[11px] text-orange-400 hover:text-orange-300 font-mono cursor-pointer"
                >
                  {useCustomQuery ? 'Usar Predefinição' : 'Personalizar'}
                </button>
              </div>

              {useCustomQuery ? (
                <input
                  type="text"
                  placeholder="Ex: despachante cnh suspensa"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              ) : (
                <select
                  value={selectedQuery}
                  onChange={(e) => setSelectedQuery(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  {PRESET_QUERIES.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* City Selector */}
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>Município / Região Alvo</span>
              </label>
              <input
                type="text"
                placeholder="Ex: São Paulo"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                list="preset-cities"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 font-sans"
              />
              <datalist id="preset-cities">
                {PRESET_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* Quantity Limit */}
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Quantidade Máxima</span>
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-orange-500 cursor-pointer font-mono font-bold"
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
                onClick={() => setPresetCity(c)}
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

          {/* Execution Progress Banner (When Loading) */}
          {isLoading && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-2 animate-pulse">
              <div className="flex items-center gap-2 text-orange-400 text-xs font-bold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executando varredura automatizada...</span>
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
                  <Search className="w-4 h-4" />
                  <span>Iniciar Raspagem de Leads</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Scraping Execution Results Report */}
      {scrapeResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Relatório da Última Coleta</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Consulta: <strong className="text-orange-400">{scrapeResult.query || selectedQuery}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Encontrados */}
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="text-[11px] font-bold text-blue-300">Total Encontrados</div>
              <div className="text-2xl font-extrabold text-blue-400 font-mono mt-1">
                {scrapeResult.totalFound || 0}
              </div>
            </div>

            {/* Inseridos no Banco */}
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="text-[11px] font-bold text-emerald-300">Inseridos no Banco</div>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                {scrapeResult.inserted || 0}
              </div>
            </div>

            {/* Duplicatas */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="text-[11px] font-bold text-amber-300">Duplicatas Ignoradas</div>
              <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">
                {scrapeResult.duplicates || 0}
              </div>
            </div>

            {/* Rejeitados */}
            <div className="p-3.5 bg-slate-800 border border-slate-700 rounded-xl">
              <div className="text-[11px] font-bold text-slate-400">Rejeitados (Sem Tel)</div>
              <div className="text-2xl font-extrabold text-slate-300 font-mono mt-1">
                {scrapeResult.rejected || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Operational Best Practices */}
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
  );
};

