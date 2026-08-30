import React, { useState, useEffect } from 'react';
import {
  Globe2,
  RefreshCw,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Building2,
  ExternalLink,
  Search,
  FileText,
  Filter,
  Check,
  X,
  AlertTriangle,
  Play,
  Download,
  Flame,
} from 'lucide-react';
import {
  KnowledgeState,
  KnowledgeOrgan,
  KnowledgeCetran,
  KnowledgeSource,
  ReviewQueueItem,
  MonitoringCycleSummary,
} from '../../core/knowledge/types';
import {
  getAllNationalStates,
  getAllNationalOrgans,
  getAllNationalCetrans,
  OFFICIAL_SOURCES_REGISTRY,
  WeeklyMonitorScheduler,
  ReviewQueueService,
  NotificationAlertService,
} from '../../core/knowledge';

export const NationalMonitorView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'sources' | 'review' | 'report' | 'alerts'>('matrix');
  const [states, setStates] = useState<KnowledgeState[]>([]);
  const [organs, setOrgans] = useState<KnowledgeOrgan[]>([]);
  const [cetrans, setCetrans] = useState<KnowledgeCetran[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewQueueItem[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [latestReport, setLatestReport] = useState<string>('');
  const [lastSummary, setLastSummary] = useState<MonitoringCycleSummary | null>(null);
  const [selectedUfFilter, setSelectedUfFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setStates(getAllNationalStates());
    setOrgans(getAllNationalOrgans());
    setCetrans(getAllNationalCetrans());
    setSources([...OFFICIAL_SOURCES_REGISTRY]);
    setReviewItems(ReviewQueueService.getAll());
    setLatestReport(WeeklyMonitorScheduler.getLatestReport());
    const history = WeeklyMonitorScheduler.getCycleHistory();
    if (history.length > 0) {
      setLastSummary(history[0]);
    }
  };

  const handleRunMonitorCycle = async () => {
    setIsScanning(true);
    setScanMessage('Iniciando varredura das fontes oficiais dos 26 estados, DF e órgãos federais...');
    try {
      const result = await WeeklyMonitorScheduler.runCycle(undefined, 3000);
      setLastSummary(result.summary);
      setLatestReport(result.reportMarkdown);
      setScanMessage(`Ciclo ${result.summary.cycleId} concluído com sucesso!`);
      loadData();
    } catch (error: any) {
      setScanMessage(`Erro ao executar ciclo: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleApprove = (id: string) => {
    ReviewQueueService.approve(id, 'Auditor Chefe');
    loadData();
  };

  const handleReject = (id: string) => {
    ReviewQueueService.reject(id, 'Auditor Chefe', 'Rejeitado após checagem técnica');
    loadData();
  };

  const handleFalsePositive = (id: string) => {
    ReviewQueueService.markFalsePositive(id, 'Ruído de renderização dinâmica');
    loadData();
  };

  const filteredStates = states.filter((st) => {
    const matchesUf = selectedUfFilter === 'ALL' || st.uf === selectedUfFilter;
    const matchesSearch =
      searchQuery === '' ||
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.uf.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.capital.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.detranId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesUf && matchesSearch;
  });

  const pendingCount = reviewItems.filter((i) => i.status === 'PENDING_REVIEW').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Globe2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white">
                  Sistema Nacional de Monitoramento Jurídico-Operacional (SNM-JO)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                  27 UFs Ativas
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Varredura contínua e versionamento temporal de 27 DETRANs, CETRANs, CONTRANDIFE, PRF, DNIT, SENATRAN e Planalto.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunMonitorCycle}
              disabled={isScanning}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg ${
                isScanning
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Varrendo Fontes Oficiais...' : 'Executar Varredura Agora'}
            </button>
          </div>
        </div>

        {scanMessage && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-indigo-300 flex items-center justify-between">
            <span>{scanMessage}</span>
            <button onClick={() => setScanMessage('')} className="text-slate-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6">
          <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div className="text-xs text-slate-400">Cobertura Nacional</div>
            <div className="text-xl font-bold text-white mt-1">27 / 27 UFs</div>
            <div className="text-[11px] text-emerald-400 font-medium mt-0.5">100% Estados + DF</div>
          </div>
          <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div className="text-xs text-slate-400">Fontes Oficiais Cadastradas</div>
            <div className="text-xl font-bold text-white mt-1">{sources.length}</div>
            <div className="text-[11px] text-indigo-400 font-medium mt-0.5">Tier 1 a Tier 3</div>
          </div>
          <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div className="text-xs text-slate-400">Fila de Revisão Humana</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{pendingCount} Pendentes</div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">Gate de Segurança Ativo</div>
          </div>
          <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div className="text-xs text-slate-400">Versionamento Temporal</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">Ativo</div>
            <div className="text-[11px] text-emerald-400 font-medium mt-0.5">Vigência por Fato Gerador</div>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeSubTab === 'matrix'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-400" />
          Matriz das 27 UFs ({states.length})
        </button>

        <button
          onClick={() => setActiveSubTab('sources')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeSubTab === 'sources'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Globe2 className="w-4 h-4 text-blue-400" />
          Fontes Oficiais ({sources.length})
        </button>

        <button
          onClick={() => setActiveSubTab('review')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${
            activeSubTab === 'review'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Fila de Revisão Humana
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950 ml-1">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('report')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeSubTab === 'report'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-400" />
          Relatório Semanal Markdown
        </button>
      </div>

      {/* SUBTAB 1: MATRIX DAS 27 UFS */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar estado, sigla, capital ou DETRAN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={selectedUfFilter}
                onChange={(e) => setSelectedUfFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Todas as UFs (27)</option>
                {states.map((st) => (
                  <option key={st.uf} value={st.uf}>
                    {st.uf} - {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredStates.map((st) => {
              const detran = organs.find((o) => o.id === st.detranId);
              const cetran = cetrans.find((c) => c.id === st.cetranId);

              return (
                <div
                  key={st.uf}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono font-bold flex items-center justify-center text-sm">
                          {st.uf}
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{st.name}</h3>
                          <p className="text-xs text-slate-400">
                            Capital: {st.capital} • Região {st.region}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                        v{detran?.version || 1}.0
                      </span>
                    </div>

                    <div className="mt-3.5 space-y-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/60">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                          DETRAN Oficial
                        </span>
                        <span className="text-slate-200 font-medium block truncate">
                          {detran?.name || st.detranId}
                        </span>
                        {detran?.onlinePortalUrl && (
                          <a
                            href={detran.onlinePortalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:underline flex items-center gap-1 mt-1 text-[11px]"
                          >
                            Portal de Recursos <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/60">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                          Instância Recursal Superior
                        </span>
                        <span className="text-slate-200 font-medium block truncate">
                          {cetran?.name || st.cetranId}
                        </span>
                        <span className="text-slate-400 text-[11px] block mt-0.5">
                          Prazo recursal: {st.appealDeadlineDays} dias
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Rede: {st.serviceNetworkName}</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Validado
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: FONTES OFICIAIS */}
      {activeSubTab === 'sources' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Tier</th>
                    <th className="p-3.5">Órgão / UF</th>
                    <th className="p-3.5">Fonte Oficial</th>
                    <th className="p-3.5">Frequência</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Última Checagem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {sources.map((src) => (
                    <tr key={src.id} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            src.tier === 1
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : src.tier === 2
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}
                        >
                          Tier {src.tier}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium">
                        <div className="text-white">{src.title}</div>
                        <div className="text-[11px] text-slate-400">UF: {src.uf}</div>
                      </td>
                      <td className="p-3.5 max-w-xs truncate">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          {src.url} <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="p-3.5 uppercase text-slate-400 font-mono text-[11px]">
                        {src.frequency}
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Online
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {src.lastCheckedAt ? src.lastCheckedAt.split('T')[0] : 'Hoje'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: FILA DE REVISÃO HUMANA */}
      {activeSubTab === 'review' && (
        <div className="space-y-4">
          {reviewItems.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-white">Fila de Revisão Jurídica Limpa</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Não há alterações críticas (P0/P1) pendentes. As regras em vigor nas 27 UFs estão 100% auditadas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.riskLevel === 'P0_LEGAL_CRITICAL'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.riskLevel}
                        </span>
                        <span className="text-xs font-semibold text-white">{item.sourceTitle}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{item.summary}</p>
                    </div>

                    <div className="text-xs font-mono text-slate-400">
                      Status: <span className="text-amber-400 font-bold">{item.status}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-slate-300 border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Impacto:</div>
                    <div>{item.impact}</div>
                  </div>

                  {item.status === 'PENDING_REVIEW' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleFalsePositive(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-all"
                      >
                        Marcar Falso Positivo
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 text-xs transition-all"
                      >
                        Rejeitar Alteração
                      </button>
                      <button
                        onClick={() => handleApprove(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-medium transition-all shadow-md shadow-emerald-500/20"
                      >
                        Aprovar e Versionar no Registro
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: RELATÓRIO SEMANAL MARKDOWN */}
      {activeSubTab === 'report' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Relatório Oficial Semanal de Monitoramento Nacional
              </h3>
              <button
                onClick={() => {
                  const blob = new Blob([latestReport || 'Relatório inicial gerado.'], {
                    type: 'text/markdown',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `relatorio-monitoramento-nacional-${new Date().toISOString().split('T')[0]}.md`;
                  a.click();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
              >
                <Download className="w-3.5 h-3.5" /> Baixar .MD
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 max-h-[500px] overflow-y-auto whitespace-pre-wrap">
              {latestReport || 'Nenhum relatório compilado ainda. Clique em "Executar Varredura Agora" acima para gerar o primeiro relatório semanal.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
