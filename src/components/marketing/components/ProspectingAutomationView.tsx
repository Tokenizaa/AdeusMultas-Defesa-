import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, RefreshCw, Users, Send, CheckCircle, XCircle, Clock, ArrowRight, Search } from 'lucide-react';
import { useAuthFetch } from '../../../hooks/useAuthFetch';

type AutomationStatus = 'RUNNING' | 'PAUSED' | 'STOPPED' | 'ERROR';

interface Stats {
  totalLeads: number;
  totalCampaigns: number;
  queued: number;
  sent: number;
  responded: number;
  converted: number;
  exhausted: number;
  totalMessages: number;
  pendingQueue: number;
}

interface AutomationStatusResponse {
  status: AutomationStatus;
  lastError?: string | null;
  lastProcessedAt?: string | null;
  processedCount: number;
}

export const ProspectingAutomationView: React.FC = () => {
  const authFetch = useAuthFetch();
  const [status, setStatus] = useState<AutomationStatus>('STOPPED');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [scrapeLoading, setScrapeLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/status');
      const data: AutomationStatusResponse = await res.json();
      setStatus(data.status);
    } catch (err) {
      console.error('Erro ao buscar status:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/stats');
      if (!res.ok) { setStats(null); return; }
      const data: Stats = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/campaigns');
      if (!res.ok) { setCampaigns([]); return; }
      const data: any[] = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error('Erro ao buscar campanhas:', err);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/leads');
      if (!res.ok) { setLeads([]); return; }
      const data: any[] = await res.json();
      setLeads(data);
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchStats();
    fetchCampaigns();
    fetchLeads();
    const interval = setInterval(() => {
      fetchStatus();
      fetchStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/marketing/automation/start', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatus('RUNNING');
      } else {
        alert(data.error || 'Falha ao iniciar');
      }
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
      if (data.success) {
        setStatus('PAUSED');
      } else {
        alert(data.error || 'Falha ao pausar');
      }
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
      if (data.success) {
        setStatus('STOPPED');
      } else {
        alert(data.error || 'Falha ao parar');
      }
    } catch (err) {
      alert('Erro ao parar automação');
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
        fetchStats();
        fetchLeads();
      } else {
        alert(data.error || 'Falha ao executar scraper');
      }
    } catch (err) {
      alert('Erro ao executar scraper');
    } finally {
      setScrapeLoading(false);
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
        alert(`Campanha iniciada! ${data.enqueued} leads na fila.`);
        fetchStats();
        fetchCampaigns();
      } else {
        alert(data.error || 'Falha ao iniciar campanha');
      }
    } catch (err) {
      alert('Erro ao iniciar campanha');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<AutomationStatus, { label: string; color: string; icon: React.ElementType }> = {
    RUNNING: { label: 'Executando', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: Play },
    PAUSED: { label: 'Pausado', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Pause },
    STOPPED: { label: 'Parado', color: 'text-slate-600 bg-slate-50 border-slate-200', icon: Square },
    ERROR: { label: 'Erro', color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
  };

  const currentStatus = statusConfig[status] || statusConfig.STOPPED;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 space-y-5">
      {/* Header com Status e Controles */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#155BCB] to-blue-700 flex items-center justify-center text-white shadow-xs shrink-0">
            <Send className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-bold font-mono ${currentStatus.color}`}>
                <StatusIcon className="w-3 h-3" />
                {currentStatus.label}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              Prospecção B2B Autônoma
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Motor automático de prospecção via WhatsApp
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleStart}
            disabled={loading || status === 'RUNNING'}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all hover:scale-[1.01] disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            <span>Iniciar</span>
          </button>
          <button
            onClick={handlePause}
            disabled={loading || status !== 'RUNNING'}
            className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all hover:scale-[1.01] disabled:cursor-not-allowed"
          >
            <Pause className="w-4 h-4" />
            <span>Pausar</span>
          </button>
          <button
            onClick={handleStop}
            disabled={loading || status === 'STOPPED'}
            className="px-3.5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all hover:scale-[1.01] disabled:cursor-not-allowed"
          >
            <Square className="w-4 h-4" />
            <span>Parar</span>
          </button>
          <button
            onClick={handleScrape}
            disabled={scrapeLoading}
            className="px-3.5 py-2.5 bg-[#155BCB] hover:bg-[#1149a4] disabled:bg-slate-300 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all hover:scale-[1.01] disabled:cursor-not-allowed"
          >
            <Search className={`w-4 h-4 ${scrapeLoading ? 'animate-spin' : ''}`} />
            <span>Executar Scraper</span>
          </button>
          <button
            onClick={() => { fetchStatus(); fetchStats(); fetchCampaigns(); fetchLeads(); }}
            disabled={loading}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all hover:scale-[1.01]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Resultado do Scraper */}
      {scrapeResult && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
          <h2 className="text-base font-bold text-slate-900 mb-3">Última Execução do Scraper</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <ResultCard label="Total Encontrado" value={scrapeResult.totalFound} color="blue" />
            <ResultCard label="Inseridos" value={scrapeResult.inserted} color="emerald" />
            <ResultCard label="Duplicatas" value={scrapeResult.duplicates} color="amber" />
            <ResultCard label="Rejeitados" value={scrapeResult.rejected} color="slate" />
          </div>
          {scrapeResult.errors && scrapeResult.errors.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs font-bold text-red-700 mb-1">Erros:</p>
              <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5">
                {scrapeResult.errors.map((err: string, idx: number) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Métricas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Leads" value={stats.totalLeads} icon={<Users className="w-5 h-5" />} color="blue" />
          <MetricCard label="Na Fila" value={stats.queued} icon={<Clock className="w-5 h-5" />} color="amber" />
          <MetricCard label="Enviadas" value={stats.sent} icon={<Send className="w-5 h-5" />} color="indigo" />
          <MetricCard label="Respondidas" value={stats.responded} icon={<ArrowRight className="w-5 h-5" />} color="emerald" />
          <MetricCard label="Convertidas" value={stats.converted} icon={<CheckCircle className="w-5 h-5" />} color="green" />
          <MetricCard label="Esgotadas" value={stats.exhausted} icon={<XCircle className="w-5 h-5" />} color="slate" />
          <MetricCard label="Mensagens Totais" value={stats.totalMessages} icon={<Send className="w-5 h-5" />} color="purple" />
          <MetricCard label="Fila Pendente" value={stats.pendingQueue} icon={<Clock className="w-5 h-5" />} color="orange" />
        </div>
      )}

      {/* Campanhas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <h2 className="text-base font-bold text-slate-900 mb-4">Campanhas</h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma campanha cadastrada.</p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign: any) => (
              <div key={campaign.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{campaign.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {campaign.lead_type} • {campaign.max_contacts} contatos • intervalo {campaign.min_interval_hours}h
                  </div>
                </div>
                <button
                  onClick={() => handleStartCampaign(campaign.id)}
                  disabled={loading || status !== 'RUNNING'}
                  className="px-3 py-2 bg-[#155BCB] hover:bg-[#1149a4] disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                  Executar Agora
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leads Recentes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <h2 className="text-base font-bold text-slate-900 mb-4">Leads Recentes</h2>
        {leads.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum lead coletado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2 font-semibold">Nome</th>
                  <th className="pb-2 font-semibold">Tipo</th>
                  <th className="pb-2 font-semibold">Cidade</th>
                  <th className="pb-2 font-semibold">Telefone</th>
                  <th className="pb-2 font-semibold">Fonte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.slice(0, 20).map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="py-2 font-medium text-slate-900">{lead.name}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${lead.lead_type === 'despachante' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {lead.lead_type === 'despachante' ? 'Despachante' : 'Advogado'}
                      </span>
                    </td>
                    <td className="py-2 text-slate-600">{lead.city || '—'}</td>
                    <td className="py-2 text-slate-600">{lead.phone || '—'}</td>
                    <td className="py-2 text-slate-500 text-xs">{lead.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
  };

  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${colorClasses[color] || colorClasses.slate}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-semibold opacity-80">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
};

const ResultCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${colorClasses[color] || colorClasses.slate}`}>
      <div className="text-xs font-semibold opacity-80 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
};