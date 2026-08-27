import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '../../../core/router/RouterContext';
import { useAuthFetch } from '../../../hooks/useAuthFetch';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Search,
  Activity,
  Database,
  Workflow,
  MessageSquare,
  AlertTriangle,
  Loader2,
  Users,
  List,
  Settings2,
  ListChecks,
  Scraper as ScraperIcon,
  LayoutDashboard,
  Filter,
} from 'lucide-react';
import type { AutomationStatus, AutomationStatusResponse, HealthResponse, StatsResponse, Campaign, Lead, QueueJob } from '../types/prospecting';

type ProspectingTab = 'overview' | 'leads' | 'campaigns' | 'automation' | 'queue' | 'collection';

const TABS: { key: ProspectingTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { key: 'leads', label: 'Leads', icon: Users },
  { key: 'campaigns', label: 'Campanhas', icon: ListChecks },
  { key: 'automation', label: 'Automação', icon: Settings2 },
  { key: 'queue', label: 'Fila', icon: List },
  { key: 'collection', label: 'Coleta', icon: ScraperIcon },
];

export const ProspectingPage: React.FC = () => {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const activeTab: ProspectingTab = (router.params.prospectingView as ProspectingTab) || 'overview';

  const [status, setStatus] = useState<AutomationStatus>('STOPPED');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const fetchAll = async () => {
    await Promise.all([fetchStatus(), fetchHealth(), fetchStats(), fetchCampaigns(), fetchLeads(), fetchQueue()]);
  };

  const fetchStatus = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/status');
      const data: AutomationStatusResponse = await res.json();
      setStatus(data.status);
    } catch (err) {
      console.error('Erro ao buscar status:', err);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/health');
      if (!res.ok) return;
      const data: HealthResponse = await res.json();
      setHealth(data);
    } catch (err) {
      console.error('Erro ao buscar health:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/stats');
      if (!res.ok) return;
      const data: StatsResponse = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/campaigns');
      if (!res.ok) return;
      const data: Campaign[] = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error('Erro ao buscar campanhas:', err);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/leads');
      if (!res.ok) return;
      const data: Lead[] = await res.json();
      setLeads(data);
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/queue');
      if (!res.ok) return;
      const data: QueueJob[] = await res.json();
      setQueue(data);
    } catch (err) {
      console.error('Erro ao buscar fila:', err);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/marketing/automation/start', { method: 'POST' });
      const data = await res.json();
      if (data.success) setStatus('RUNNING');
      else alert(data.error || 'Falha ao iniciar');
    } catch (err) {
      alert('Erro ao iniciar automação');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/marketing/automation/pause', { method: 'POST' });
      const data = await res.json();
      if (data.success) setStatus('PAUSED');
      else alert(data.error || 'Falha ao pausar');
    } catch (err) {
      alert('Erro ao pausar automação');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/marketing/automation/stop', { method: 'POST' });
      const data = await res.json();
      if (data.success) setStatus('STOPPED');
      else alert(data.error || 'Falha ao parar');
    } catch (err) {
      alert('Erro ao parar automação');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCampaign = async (campaignId: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/marketing/automation/campaigns/${campaignId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Campanha "${data.campaign}" adicionada à fila: ${data.enqueued} jobs criados.`);
        fetchAll();
      } else {
        alert(data.error || 'Falha ao iniciar campanha');
      }
    } catch (err) {
      alert('Erro ao iniciar campanha');
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    setScrapeLoading(true);
    setScrapeResult(null);
    try {
      const res = await authFetch('/api/marketing/automation/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: ['despachante de trânsito', 'advogado direito de trânsito'],
          cities: ['São Paulo'],
          limitPerQuery: 10,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScrapeResult(data);
        fetchAll();
      } else {
        alert(data.error || 'Falha ao executar scraper');
      }
    } catch (err) {
      alert('Erro ao executar scraper');
    } finally {
      setScrapeLoading(false);
    }
  };

  const handleLeadClick = async (lead: Lead) => {
    setSelectedLead(lead);
    try {
      const res = await authFetch(`/api/marketing/automation/leads/${lead.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLead(data);
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes do lead:', err);
    }
  };

  const navigateTo = (tab: ProspectingTab) => {
    router.navigate(`/admin/marketing/prospecting/${tab === 'overview' ? '' : tab}`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'leads':
        return <LeadsTab leads={leads} onLeadClick={handleLeadClick} />;
      case 'campaigns':
        return <CampaignsTab campaigns={campaigns} onStart={handleStartCampaign} loading={loading} status={status} />;
      case 'automation':
        return <AutomationTab status={status} health={health} onStart={handleStart} onPause={handlePause} onStop={handleStop} loading={loading} />;
      case 'queue':
        return <QueueTab queue={queue} />;
      case 'collection':
        return <CollectionTab onScrape={handleScrape} scrapeLoading={scrapeLoading} scrapeResult={scrapeResult} />;
      default:
        return <OverviewTab stats={stats} health={health} campaigns={campaigns} queue={queue} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#155BCB] to-blue-700 flex items-center justify-center text-white shadow-xs shrink-0">
              <Send className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">Prospecção B2B Autônoma</h1>
              <p className="text-xs text-slate-500 mt-0.5">Motor automático de prospecção via WhatsApp</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-1.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => navigateTo(tab.key)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeTab === tab.key
                      ? 'bg-[#155BCB] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {renderContent()}

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedLead(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Detalhes do Lead</h3>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <LeadDetail lead={selectedLead} />
          </div>
        </div>
      )}
    </div>
  );
};

/* ==================== ABAS ==================== */

const OverviewTab: React.FC<{ stats: StatsResponse | null; health: HealthResponse | null; campaigns: Campaign[]; queue: QueueJob[] }> = ({ stats, health, campaigns, queue }) => (
  <div className="space-y-5">
    {stats && (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniMetric label="Total Leads" value={stats.totalLeads} color="blue" />
        <MiniMetric label="Na Fila" value={stats.queued} color="amber" />
        <MiniMetric label="Contatados" value={stats.contacted} color="indigo" />
        <MiniMetric label="Responderam" value={stats.responded} color="emerald" />
        <MiniMetric label="Interessados" value={stats.interested} color="purple" />
        <MiniMetric label="Convertidos" value={stats.converted} color="green" />
      </div>
    )}

    {health && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-[#155BCB]" />Status da Automação</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <HealthItem label="Database" status={health.database.status} latencyMs={health.database.latencyMs} />
          <HealthItem label="Queue" status={health.queue.status} pendingJobs={health.queue.pendingJobs} />
          <HealthItem label="Worker" status={health.worker.status} />
          <HealthItem label="Evolution API" status={health.evolution.status} />
        </div>
        {health.lastError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs font-bold text-red-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Último erro: {health.lastError}</p>
          </div>
        )}
      </div>
    )}

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <SummaryItem label="Campanhas ativas" value={campaigns.length} />
      <SummaryItem label="Jobs pendentes" value={queue.length} />
    </div>
  </div>
);

const LeadsTab: React.FC<{ leads: Lead[]; onLeadClick: (lead: Lead) => void }> = ({ leads, onLeadClick }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const term = search.toLowerCase();
      return !term || l.name?.toLowerCase().includes(term) || l.city?.toLowerCase().includes(term) || l.email?.toLowerCase().includes(term);
    });
  }, [leads, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const start = filtered.length === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, filtered.length);

  useEffect(() => { setPage(0); }, [search]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, cidade ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#155BCB]/20"
            />
          </div>
          <select className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
            <option>Todos os tipos</option>
            <option>Despachante</option>
            <option>Advogado</option>
          </select>
          <select className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
            <option>Todas as cidades</option>
          </select>
          <select className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
            <option>Qualquer status</option>
          </select>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Mostrando {start}–{end} de {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40">Anterior</button>
            <span className="px-2 font-mono">{page + 1}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40">Próxima</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-2 font-semibold">Nome</th>
              <th className="pb-2 font-semibold">Tipo</th>
              <th className="pb-2 font-semibold">Cidade</th>
              <th className="pb-2 font-semibold">Estado</th>
              <th className="pb-2 font-semibold">Telefone</th>
              <th className="pb-2 font-semibold">WhatsApp</th>
              <th className="pb-2 font-semibold">E-mail</th>
              <th className="pb-2 font-semibold">Website</th>
              <th className="pb-2 font-semibold">Fonte</th>
              <th className="pb-2 font-semibold">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr><td colSpan={10} className="py-6 text-center text-sm text-slate-500">Nenhum lead encontrado.</td></tr>
            ) : (
              paginated.map((lead) => (
                <tr key={lead.id} onClick={() => onLeadClick(lead)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="py-2 font-medium text-slate-900">{lead.name}</td>
                  <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${lead.lead_type === 'despachante' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{lead.lead_type === 'despachante' ? 'Despachante' : 'Advogado'}</span></td>
                  <td className="py-2 text-slate-600">{lead.city || '—'}</td>
                  <td className="py-2 text-slate-600">{lead.state || '—'}</td>
                  <td className="py-2 text-slate-600">{lead.phone || '—'}</td>
                  <td className="py-2 text-slate-600">{lead.whatsapp || '—'}</td>
                  <td className="py-2 text-slate-600">{lead.email || '—'}</td>
                  <td className="py-2 text-slate-600">{lead.website ? <a href={lead.website} target="_blank" rel="noreferrer" className="text-[#155BCB] hover:underline">link</a> : '—'}</td>
                  <td className="py-2 text-slate-500 text-xs">{lead.source}</td>
                  <td className="py-2 text-slate-500 text-xs">{lead.scraped_at ? new Date(lead.scraped_at).toLocaleDateString('pt-BR') : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CampaignsTab: React.FC<{ campaigns: Campaign[]; onStart: (id: string) => void; loading: boolean; status: AutomationStatus }> = ({ campaigns, onStart, loading, status }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
    <h2 className="text-base font-bold text-slate-900 mb-4">Campanhas de Prospecção</h2>
    {campaigns.length === 0 ? (
      <p className="text-sm text-slate-500">Nenhuma campanha cadastrada.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-2 font-semibold">Nome</th>
              <th className="pb-2 font-semibold">Tipo</th>
              <th className="pb-2 font-semibold">Cidades</th>
              <th className="pb-2 font-semibold">Intervalo</th>
              <th className="pb-2 font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-slate-50">
                <td className="py-2 font-medium text-slate-900">{campaign.name}</td>
                <td className="py-2"><span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">{campaign.lead_type}</span></td>
                <td className="py-2 text-slate-600">{campaign.target_cities?.length || 0}</td>
                <td className="py-2 text-slate-600">{campaign.min_interval_hours}h</td>
                <td className="py-2">
                  <button
                    onClick={() => onStart(campaign.id)}
                    disabled={loading || status !== 'RUNNING'}
                    className="px-3 py-1.5 bg-[#155BCB] hover:bg-[#1149a4] disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" /> Executar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const AutomationTab: React.FC<{ status: AutomationStatus; health: HealthResponse | null; onStart: () => void; onPause: () => void; onStop: () => void; loading: boolean }> = ({ status, health, onStart, onPause, onStop, loading }) => {
  const statusConfig: Record<AutomationStatus, { label: string; color: string; icon: React.ElementType }> = {
    RUNNING: { label: 'Executando', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: Play },
    PAUSED: { label: 'Pausado', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Pause },
    STOPPED: { label: 'Parado', color: 'text-slate-600 bg-slate-50 border-slate-200', icon: Square },
    ERROR: { label: 'Erro', color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
  };
  const current = statusConfig[status] || statusConfig.STOPPED;
  const StatusIcon = current.icon;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-bold font-mono ${current.color}`}>
              <StatusIcon className="w-3 h-3" />
              {current.label}
            </span>
            {health && (
              <span className="text-xs text-slate-500">Processados: {health.worker.processedCount}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onStart} disabled={loading || status === 'RUNNING'} className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5"><Play className="w-4 h-4" /> Iniciar</button>
            <button onClick={onPause} disabled={loading || status !== 'RUNNING'} className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5"><Pause className="w-4 h-4" /> Pausar</button>
            <button onClick={onStop} disabled={loading || status === 'STOPPED'} className="px-3.5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5"><Square className="w-4 h-4" /> Parar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const QueueTab: React.FC<{ queue: QueueJob[] }> = ({ queue }) => {
  const [filter, setFilter] = useState<string>('all');
  const filtered = useMemo(() => {
    if (filter === 'all') return queue;
    if (filter === 'processing') return queue.filter((q) => q.attempts > 0 && q.attempts < q.max_attempts);
    if (filter === 'failed') return queue.filter((q) => q.attempts >= q.max_attempts);
    if (filter === 'pending') return queue.filter((q) => q.attempts === 0);
    return queue;
  }, [queue, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
          <option value="all">Todos</option>
          <option value="pending">Pendentes</option>
          <option value="processing">Processando</option>
          <option value="failed">Falhos</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-2 font-semibold">Lead</th>
              <th className="pb-2 font-semibold">Campanha</th>
              <th className="pb-2 font-semibold">Ação</th>
              <th className="pb-2 font-semibold">Status</th>
              <th className="pb-2 font-semibold">Tentativa</th>
              <th className="pb-2 font-semibold">Agendado</th>
              <th className="pb-2 font-semibold">Erro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-6 text-center text-sm text-slate-500">Fila vazia — 0 jobs pendentes</td></tr>
            ) : (
              filtered.slice(0, 50).map((job) => {
                const isFailed = job.attempts >= job.max_attempts;
                const isRetry = job.attempts > 0 && !isFailed;
                return (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="py-2 font-medium text-slate-900">{job.lead_campaign?.lead?.name || '—'}</td>
                    <td className="py-2 text-slate-600">{job.lead_campaign?.campaign?.name || '—'}</td>
                    <td className="py-2 text-slate-600">{job.action}</td>
                    <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${isFailed ? 'bg-red-50 text-red-700' : isRetry ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{isFailed ? 'FAILED' : isRetry ? 'RETRY' : 'PENDING'}</span></td>
                    <td className="py-2 text-slate-600">{job.attempts}/{job.max_attempts}</td>
                    <td className="py-2 text-slate-500">{new Date(job.scheduled_at).toLocaleString('pt-BR')}</td>
                    <td className="py-2 text-red-600 text-xs">{job.last_error || '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CollectionTab: React.FC<{ onScrape: () => void; scrapeLoading: boolean; scrapeResult: any }> = ({ onScrape, scrapeLoading, scrapeResult }) => (
  <div className="space-y-4">
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
      <h2 className="text-base font-bold text-slate-900 mb-4">Nova Raspagem</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Consulta</label>
          <select className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
            <option>despachante de trânsito</option>
            <option>advogado direito de trânsito</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Cidade</label>
          <input type="text" defaultValue="São Paulo" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Quantidade máxima</label>
          <input type="number" defaultValue={10} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
        </div>
      </div>
      <button
        onClick={onScrape}
        disabled={scrapeLoading}
        className="px-4 py-2.5 bg-[#155BCB] hover:bg-[#1149a4] disabled:bg-slate-300 text-white rounded-xl text-sm font-bold flex items-center gap-1.5"
      >
        {scrapeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        Iniciar Raspagem
      </button>
      {scrapeResult && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <ResultMini label="Encontrados" value={scrapeResult.totalFound || 0} color="blue" />
          <ResultMini label="Inseridos" value={scrapeResult.inserted || 0} color="emerald" />
          <ResultMini label="Duplicatas" value={scrapeResult.duplicates || 0} color="amber" />
          <ResultMini label="Rejeitados" value={scrapeResult.rejected || 0} color="slate" />
        </div>
      )}
    </div>
  </div>
);

/* ==================== COMPONENTES AUXILIARES ==================== */

const MiniMetric: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
  const classes: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    green: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <div className={`rounded-xl border p-3 ${classes[color] || classes.blue}`}>
      <div className="text-[11px] font-bold opacity-80">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
};

const HealthItem: React.FC<{ label: string; status: string; latencyMs?: number; pendingJobs?: number }> = ({ label, status, latencyMs, pendingJobs }) => {
  const isHealthy = ['online', 'connected', 'running'].includes(status);
  return (
    <div className={`rounded-xl border p-3 ${isHealthy ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
      <div className="text-[11px] font-bold">{label}</div>
      <div className={`text-xs font-mono font-bold ${isHealthy ? 'text-emerald-700' : 'text-red-700'}`}>{status.toUpperCase()}</div>
      {latencyMs !== undefined && <div className="text-[11px] text-slate-500">{latencyMs}ms</div>}
      {pendingJobs !== undefined && <div className="text-[11px] text-slate-500">{pendingJobs} pendentes</div>}
    </div>
  );
};

const SummaryItem: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
    <div className="text-[11px] font-bold text-slate-500">{label}</div>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
  </div>
);

const ResultMini: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
  const classes: Record<string, string> = { blue: 'bg-blue-50 text-blue-700 border-blue-200', emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200', amber: 'bg-amber-50 text-amber-700 border-amber-200', slate: 'bg-slate-50 text-slate-700 border-slate-200' };
  return (
    <div className={`rounded-xl border p-3 ${classes[color] || classes.slate}`}>
      <div className="text-[11px] font-bold opacity-80">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
};

const LeadDetail: React.FC<{ lead: Lead }> = ({ lead }) => (
  <div className="p-5 space-y-4">
    <Section title="Identificação">
      <Field label="Nome" value={lead.name} />
      <Field label="Tipo" value={lead.lead_type} />
      <Field label="Categoria" value={lead.category} />
    </Section>
    <Section title="Localização">
      <Field label="Endereço" value={lead.address} />
      <Field label="Cidade" value={lead.city} />
      <Field label="Estado" value={lead.state} />
      <Field label="CEP" value={lead.zip_code} />
    </Section>
    <Section title="Contato">
      <Field label="Telefone" value={lead.phone} />
      <Field label="WhatsApp" value={lead.whatsapp} />
      <Field label="E-mail" value={lead.email} />
      <Field label="Website" value={lead.website} />
    </Section>
    <Section title="Origem">
      <Field label="Fonte" value={lead.source} />
      <Field label="URL" value={lead.source_url} />
      <Field label="Google Maps" value={lead.google_maps_url} />
      <Field label="Data da coleta" value={lead.scraped_at ? new Date(lead.scraped_at).toLocaleString('pt-BR') : '—'} />
    </Section>
    <Section title="Dados Brutos">
      <pre className="text-xs bg-slate-50 p-3 rounded-xl overflow-x-auto border border-slate-200">{JSON.stringify(lead, null, 2)}</pre>
    </Section>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</h4>
    <div className="space-y-1">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="flex text-sm">
    <span className="text-slate-500 w-32 shrink-0">{label}</span>
    <span className="text-slate-900 font-medium">{value || '—'}</span>
  </div>
);