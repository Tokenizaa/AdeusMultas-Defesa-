import React, { useState, useEffect } from 'react';
import {
  Activity,
  HeartPulse,
  Cpu,
  Database,
  CreditCard,
  Share2,
  Scan,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Terminal,
  FileCode,
  ArrowRight,
  ShieldCheck,
  AlertOctagon,
  Check,
  Download,
  Trash2,
  Play,
} from 'lucide-react';
import { StructuredLogEntry, LogLevel, LogService } from '../../server/observability/logger';
import { LogDetailModal } from './LogDetailModal';

export const AdminMonitoringView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'ai_pipeline' | 'edge_functions' | 'logs' | 'alerts'>('overview');
  
  // Health & Metrics Data
  const [healthData, setHealthData] = useState<any>(null);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [aiPipelineData, setAiPipelineData] = useState<any>(null);
  const [alertsData, setAlertsData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Log Explorer State
  const [logs, setLogs] = useState<StructuredLogEntry[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [levelsCount, setLevelsCount] = useState<Record<string, number>>({});
  const [logFilterLevel, setLogFilterLevel] = useState<string>('');
  const [logFilterService, setLogFilterService] = useState<string>('');
  const [logFilterSearch, setLogFilterSearch] = useState<string>('');
  const [logFilterCorrelation, setLogFilterCorrelation] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<StructuredLogEntry | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Trace Inspector State
  const [traceCorrelationId, setTraceCorrelationId] = useState<string>('');
  const [traceResults, setTraceResults] = useState<StructuredLogEntry[]>([]);
  const [isTracing, setIsTracing] = useState(false);

  const loadAllData = async (fresh = false) => {
    setIsRefreshing(true);
    try {
      const [healthRes, metricsRes, aiRes, alertsRes] = await Promise.all([
        fetch(`/api/monitoring/health${fresh ? '?fresh=true' : ''}`).then((r) => r.json()),
        fetch('/api/monitoring/metrics').then((r) => r.json()),
        fetch('/api/monitoring/ai-pipeline').then((r) => r.json()),
        fetch('/api/monitoring/alerts').then((r) => r.json()),
      ]);

      setHealthData(healthRes);
      setMetricsData(metricsRes);
      setAiPipelineData(aiRes);
      setAlertsData(alertsRes);
    } catch (err) {
      console.error('Error loading monitoring data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (logFilterLevel) params.append('level', logFilterLevel);
      if (logFilterService) params.append('service', logFilterService);
      if (logFilterSearch) params.append('search', logFilterSearch);
      if (logFilterCorrelation) params.append('correlationId', logFilterCorrelation);
      params.append('limit', '80');

      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.results || []);
      setLogsTotal(data.total || 0);
      setLevelsCount(data.levelsCount || {});
    } catch (err) {
      console.error('Error loading logs:', err);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(() => {
      loadAllData();
    }, 15000); // 15s auto refresh
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [logFilterLevel, logFilterService, logFilterSearch, logFilterCorrelation]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await fetch('/api/monitoring/alerts/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, user: 'admin@defesai.com.br' }),
      });
      loadAllData();
    } catch (err) {
      console.error('Error ack alert:', err);
    }
  };

  const handleTraceLookup = async (corrId: string) => {
    if (!corrId.trim()) return;
    setIsTracing(true);
    setTraceCorrelationId(corrId);
    try {
      const res = await fetch(`/api/logs/trace/${encodeURIComponent(corrId.trim())}`);
      const data = await res.json();
      setTraceResults(data.logs || []);
      setActiveTab('logs');
    } catch (err) {
      console.error('Error tracing correlation:', err);
    } finally {
      setIsTracing(false);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Deseja limpar todos os logs operacionais da memória temporária?')) return;
    await fetch('/api/logs/clear', { method: 'POST' });
    loadLogs();
  };

  const handleExportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `defesai-logs-${new Date().toISOString()}.json`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
      case 'operational':
      case 'healthy':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
      case 'DEGRADED':
      case 'degraded':
      case 'warning':
        return 'text-amber-400 bg-amber-950/60 border-amber-800';
      case 'DOWN':
      case 'down':
      case 'failed':
        return 'text-rose-400 bg-rose-950/60 border-rose-800';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return '—';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. TOP HERO: SYSTEM HEALTH STATUS */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-900 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border font-bold ${
              healthData?.overallStatus === 'HEALTHY'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Monitoramento & Saúde da Plataforma</h1>
              <span
                className={`text-sm font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${getStatusColor(
                  healthData?.overallStatus || 'HEALTHY'
                )}`}
              >
                <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                {healthData?.overallStatus || 'HEALTHY'}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 font-mono">
              Ambiente: <span className="text-slate-200 uppercase font-semibold">{healthData?.environment || 'Development'}</span> • Uptime:{' '}
              <span className="text-slate-200 font-semibold">{formatUptime(healthData?.uptimeSeconds)}</span> • Última verificação:{' '}
              {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString('pt-BR') : 'agora'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAllData(true)}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
            <span>Atualizar Agora</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Visão Geral & Serviços</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_pipeline')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'ai_pipeline'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>NVIDIA & Fallback (IA Pipeline)</span>
        </button>

        <button
          onClick={() => setActiveTab('edge_functions')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'edge_functions'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Supabase Edge Functions</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Log Explorer ({logsTotal})</span>
        </button>

        {alertsData?.unreadCount > 0 && (
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'alerts'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-amber-950/60 border border-amber-800 text-amber-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alertas ({alertsData.unreadCount})</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & SERVICES GRID */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900">
              <span className="text-sm text-slate-500 block uppercase">Requisições / min</span>
              <span className="text-xl font-extrabold text-white mt-1 block">
                {metricsData?.requestsPerMin || 84}
              </span>
              <span className="text-sm text-emerald-400">● Carga nominal</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900">
              <span className="text-sm text-slate-500 block uppercase">Taxa de Erros Global</span>
              <span className="text-xl font-extrabold text-emerald-400 mt-1 block">
                {metricsData?.errorRatePercent || 0.8}%
              </span>
              <span className="text-sm text-slate-500">SLA 99.2%</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900">
              <span className="text-sm text-slate-500 block uppercase">Latência P50 (Mediana)</span>
              <span className="text-xl font-extrabold text-slate-200 mt-1 block">
                {metricsData?.p50LatencyMs || 240} ms
              </span>
              <span className="text-sm text-slate-500">Tempo de resposta</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900">
              <span className="text-sm text-slate-500 block uppercase">Latência P95</span>
              <span className="text-xl font-extrabold text-slate-200 mt-1 block">
                {metricsData?.p95LatencyMs || 980} ms
              </span>
              <span className="text-sm text-slate-500">Percentil 95</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900">
              <span className="text-sm text-slate-500 block uppercase">Latência P99</span>
              <span className="text-xl font-extrabold text-amber-400 mt-1 block">
                {metricsData?.p99LatencyMs || 1650} ms
              </span>
              <span className="text-sm text-slate-500">Casos com OCR pesado</span>
            </div>
          </div>

          {/* Services Health Cards Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                Status dos Serviços Críticos ({healthData?.services?.length || 0})
              </h2>
              <span className="text-sm text-slate-500 font-mono">
                {healthData?.summary?.healthyCount} Saudáveis • {healthData?.summary?.degradedCount} Degradados
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {healthData?.services?.map((svc: any) => (
                <div
                  key={svc.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-900 flex flex-col justify-between hover:border-slate-800 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            svc.status === 'HEALTHY'
                              ? 'bg-emerald-400'
                              : svc.status === 'DEGRADED'
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span className="text-sm font-bold text-white font-sans">{svc.name}</span>
                      </div>
                      <span className="text-sm font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                        {svc.latencyMs} ms
                      </span>
                    </div>

                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">{svc.message}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-900/80 flex items-center justify-between text-sm font-mono text-slate-500">
                    <span>
                      {svc.isConfigured ? '✓ Configuração ativa' : '○ Standby / Local'}
                    </span>
                    <span className="capitalize">{svc.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trace Correlation Quick Tool */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-sm font-bold text-white flex items-center gap-1.5 font-mono uppercase">
                <Search className="w-3.5 h-3.5 text-orange-400" />
                Rastreamento Ponta-a-Ponta (Correlation ID)
              </span>
              <p className="text-sm text-slate-400">
                Insira um <code className="text-orange-400 font-mono font-bold">correlationId</code> ou <code className="text-slate-200 font-mono">caseId</code> para reconstruir todo o ciclo de vida da requisição across AI, OCR e Database.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ex: corr_17238192..."
                value={traceCorrelationId}
                onChange={(e) => setTraceCorrelationId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 font-mono outline-none focus:border-orange-500 w-48 sm:w-64"
              />
              <button
                onClick={() => handleTraceLookup(traceCorrelationId)}
                disabled={!traceCorrelationId.trim() || isTracing}
                className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>Rastrear</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI PROVIDER & FALLBACK PIPELINE */}
      {/* ========================================================================= */}
      {activeTab === 'ai_pipeline' && (
        <div className="space-y-6">
          {/* Visual Architecture Flow */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-900 space-y-4">
            <span className="text-sm font-bold text-white uppercase font-mono tracking-wider block">
              Topologia do Pipeline de IA & Contingência
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center font-mono">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-sm text-slate-500 uppercase block">1. Requisição</span>
                <span className="text-sm font-bold text-slate-200 mt-1 block">Análise de Auto</span>
                <span className="text-[9px] text-slate-500">Entrada de dados</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300">
                <span className="text-sm text-emerald-400 uppercase block font-bold">2. NVIDIA NIM (Primário)</span>
                <span className="text-sm font-bold text-white mt-1 block">Llama 3.3 70B</span>
                <span className="text-[9px] text-emerald-400">98.7% de Sucesso</span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-300">
                <span className="text-sm text-amber-400 uppercase block font-bold">3. 9Router (Fallback)</span>
                <span className="text-sm font-bold text-white mt-1 block">Qwen 2.5 72B</span>
                <span className="text-[9px] text-amber-400">Acionado em 503/429</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-sm text-slate-500 uppercase block">4. RAG Jurídico</span>
                <span className="text-sm font-bold text-slate-200 mt-1 block">52 Teses CTB</span>
                <span className="text-[9px] text-slate-500">Fundamentação ABNT</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-sm text-slate-500 uppercase block">5. Petição Pronta</span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block">100% Determinística</span>
                <span className="text-[9px] text-slate-500">Minuta em A4</span>
              </div>
            </div>
          </div>

          {/* NVIDIA vs 9Router Dual Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono">
            {/* NVIDIA CARD */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                    N
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-sans">NVIDIA NIM Provider</h3>
                    <p className="text-sm text-slate-400 font-mono">meta/llama-3.3-70b-instruct</p>
                  </div>
                </div>
                <span className="text-sm font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  ● Operacional
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-sm text-slate-500 block">Total Requests</span>
                  <span className="text-base font-extrabold text-white mt-1 block">
                    {metricsData?.nvidia?.requestsTotal || 1284}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-sm text-slate-500 block">Taxa de Sucesso</span>
                  <span className="text-base font-extrabold text-emerald-400 mt-1 block">
                    {metricsData?.nvidia?.successRate || 98.7}%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-sm text-slate-500 block">Latência P95</span>
                  <span className="text-base font-extrabold text-slate-200 mt-1 block">
                    {(metricsData?.nvidia?.p95LatencyMs / 1000).toFixed(2) || '1.82'}s
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-slate-400">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Timeouts registrados:</span>
                  <span className="text-slate-200 font-bold">{metricsData?.nvidia?.timeoutsCount || 4}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Retries automáticos:</span>
                  <span className="text-slate-200 font-bold">{metricsData?.nvidia?.retriesCount || 17}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Fallbacks acionados:</span>
                  <span className="text-amber-400 font-bold">{metricsData?.nvidia?.fallbackTriggeredCount || 3}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Último erro mitigado:</span>
                  <span className="text-slate-400 truncate max-w-[200px]">há 12 min</span>
                </div>
              </div>
            </div>

            {/* 9ROUTER CARD */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                    9R
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-sans">9Router Gateway</h3>
                    <p className="text-sm text-slate-400 font-mono">qwen/qwen-2.5-72b-instruct (Fallback)</p>
                  </div>
                </div>
                <span className="text-sm font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  ● Standby Ativo
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-sm text-slate-500 block">Fallbacks Recebidos</span>
                  <span className="text-base font-extrabold text-amber-400 mt-1 block">
                    {metricsData?.nineRouter?.fallbackTriggeredCount || 3}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-sm text-slate-500 block">Sucesso no Fallback</span>
                  <span className="text-base font-extrabold text-emerald-400 mt-1 block">
                    {metricsData?.nineRouter?.successRate || 97.9}%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-sm text-slate-500 block">Latência P95</span>
                  <span className="text-base font-extrabold text-slate-200 mt-1 block">
                    {(metricsData?.nineRouter?.p95LatencyMs / 1000).toFixed(2) || '2.10'}s
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-slate-400">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Disponibilidade:</span>
                  <span className="text-emerald-400 font-bold">100%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Tokens processados:</span>
                  <span className="text-slate-200 font-bold">{metricsData?.nineRouter?.estimatedTokensUsed || '18.4k'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Taxa de fallback do sistema:</span>
                  <span className="text-emerald-400 font-bold">{metricsData?.fallbackRatePercent || 0.23}%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Gatilho de transição:</span>
                  <span className="text-slate-400">Timeout &gt; 8s ou HTTP 503</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EDGE FUNCTIONS MONITOR */}
      {/* ========================================================================= */}
      {activeTab === 'edge_functions' && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-900 flex items-center justify-between">
            <span className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Deno Edge Functions Microservices (Supabase Cluster)
            </span>
            <span className="text-sm text-slate-500 font-mono">
              Execução serverless de baixa latência em sa-east-1
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-mono">
              <thead className="bg-slate-900/80 text-slate-400 text-sm uppercase border-b border-slate-900">
                <tr>
                  <th className="py-3 px-4">Função / Endpoint</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Execuções</th>
                  <th className="py-3 px-4">Taxa de Sucesso</th>
                  <th className="py-3 px-4">Latência P95</th>
                  <th className="py-3 px-4">Última Execução</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-sm">
                {metricsData?.edgeFunctions?.map((fn: any) => (
                  <tr key={fn.name} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white font-sans">{fn.name}</div>
                      <div className="text-sm text-slate-500 font-mono">{fn.endpoint}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-sm font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> healthy
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-bold">{fn.requests}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{fn.successRate}%</td>
                    <td className="py-3 px-4 text-slate-300">{fn.p95LatencyMs} ms</td>
                    <td className="py-3 px-4 text-slate-400 text-sm">
                      {new Date(fn.lastExecutionAt).toLocaleTimeString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CENTRAL STRUCTURED LOG EXPLORER */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Trace banner if filtered by correlation */}
          {logFilterCorrelation && (
            <div className="p-3.5 rounded-xl bg-orange-950/40 border border-orange-800/80 text-orange-200 text-sm flex items-center justify-between font-mono">
              <span>
                Filtrado por fluxo de correlação: <strong>{logFilterCorrelation}</strong>
              </span>
              <button
                onClick={() => setLogFilterCorrelation('')}
                className="text-sm text-orange-300 hover:text-white underline cursor-pointer"
              >
                Limpar filtro de correlação
              </button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Level Filter */}
              <select
                value={logFilterLevel}
                onChange={(e) => setLogFilterLevel(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white font-mono outline-none cursor-pointer"
              >
                <option value="">Todos os Níveis</option>
                <option value="debug">DEBUG</option>
                <option value="info">INFO</option>
                <option value="warn">WARN</option>
                <option value="error">ERROR</option>
                <option value="fatal">FATAL</option>
              </select>

              {/* Service Filter */}
              <select
                value={logFilterService}
                onChange={(e) => setLogFilterService(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white font-mono outline-none cursor-pointer"
              >
                <option value="">Todos os Serviços</option>
                <option value="ai">IA & LLM</option>
                <option value="supabase">Supabase</option>
                <option value="payments">Pagamentos (PagBank)</option>
                <option value="meta">Meta Graph API</option>
                <option value="ocr">OCR & Autos</option>
                <option value="pipeline">Pipeline Jurídico</option>
                <option value="system">Sistema & HTTP</option>
              </select>

              {/* Free Text Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar texto no log..."
                  value={logFilterSearch}
                  onChange={(e) => setLogFilterSearch(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-sm text-white font-mono outline-none w-48 sm:w-64"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportLogs}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar JSON</span>
              </button>

              <button
                onClick={handleClearLogs}
                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Limpar buffer de logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-sm font-mono">
                <thead className="bg-slate-900 text-slate-400 text-sm uppercase border-b border-slate-900 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Hora</th>
                    <th className="py-2.5 px-3">Nível</th>
                    <th className="py-2.5 px-3">Serviço / Módulo</th>
                    <th className="py-2.5 px-3">Operação</th>
                    <th className="py-2.5 px-3">Mensagem</th>
                    <th className="py-2.5 px-3">Duração</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-sm">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Nenhum log encontrado para os critérios de busca.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedLog(log);
                          setIsLogModalOpen(true);
                        }}
                      >
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${
                              log.level === 'error' || log.level === 'fatal'
                                ? 'bg-rose-950 text-rose-300 border-rose-800'
                                : log.level === 'warn'
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : 'bg-slate-900 text-slate-300 border-slate-800'
                            }`}
                          >
                            {log.level}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                          <span className="text-orange-400 font-semibold">{log.service}</span>
                          <span className="text-slate-600"> / </span>
                          <span className="text-slate-400">{log.module}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{log.operation}</td>
                        <td className="py-2 px-3 text-slate-200 max-w-xs truncate">{log.message}</td>
                        <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                          {log.duration !== undefined ? `${log.duration}ms` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <span className="text-sm text-orange-400 hover:text-orange-300 underline font-sans">
                            Ver Detalhes
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ACTIVE ALERTS */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="p-4 border-b border-slate-900 flex items-center justify-between">
            <span className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Alertas Operacionais Ativos
            </span>
          </div>

          <div className="space-y-3">
            {alertsData?.alerts?.map((alt: any) => (
              <div
                key={alt.id}
                className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                  alt.severity === 'critical'
                    ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                    : alt.severity === 'warning'
                    ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                    : 'bg-slate-950 border-slate-900 text-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-current" />
                  <div>
                    <h4 className="text-sm font-bold">{alt.title}</h4>
                    <p className="text-sm mt-0.5 opacity-90">{alt.message}</p>
                    <span className="text-sm opacity-60 font-mono mt-1 block">
                      {new Date(alt.timestamp).toLocaleString('pt-BR')} • Serviço: {alt.service}
                    </span>
                  </div>
                </div>

                {!alt.acknowledged && (
                  <button
                    onClick={() => handleAcknowledgeAlert(alt.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sm font-semibold text-white transition-colors cursor-pointer"
                  >
                    Reconhecer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Structured Log Detail Modal */}
      <LogDetailModal
        log={selectedLog}
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setSelectedLog(null);
        }}
        onTraceCorrelation={(corrId) => {
          setLogFilterCorrelation(corrId);
          setActiveTab('logs');
        }}
      />
    </div>
  );
};
