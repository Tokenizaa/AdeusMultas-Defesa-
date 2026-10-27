import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, CreditCard, Cpu, Database, HeartPulse, RefreshCw, XCircle } from 'lucide-react';
import { useAuthFetch } from '../../hooks/useAuthFetch';

type HealthResponse = {
  status: string;
  worker?: string;
  timestamp?: string;
  latency_ms?: number;
  database?: { status?: string };
  payments?: { status?: string; gateway?: string; environment?: string };
};

type AiMetrics = {
  available?: boolean;
  windowHours?: number;
  totalCalls?: number;
  errorRatePercent?: number;
  avgLatencyMs?: number;
  p50LatencyMs?: number;
  p95LatencyMs?: number;
  p99LatencyMs?: number;
  byOperation?: Record<string, number>;
};

type AlertItem = {
  id: string;
  timestamp?: string;
  level?: string;
  title?: string;
  body?: string;
  sourceUrl?: string;
  requiresImmediateAction?: boolean;
};

type MonitorCycle = {
  cycleId?: string;
  startedAt?: string;
  completedAt?: string;
  totalSources?: number;
  successfulFetches?: number;
  failedFetches?: number;
  changesDetected?: number;
  sentToReviewQueue?: number;
};

async function readApi(path: string, authFetch: (input: string, init?: RequestInit) => Promise<Response>, authenticated = true) {
  const response = authenticated ? await authFetch(path) : await fetch(path);
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error?.message || body?.message || `HTTP ${response.status} em ${path}`);
  }
  return body?.ok === true && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body;
}

const display = (value: unknown) => value === null || value === undefined || value === '' ? '—' : String(value);
const dateTime = (value?: string) => value ? new Date(value).toLocaleString('pt-BR') : '—';

export const AdminMonitoringView: React.FC = () => {
  const authFetch = useAuthFetch();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [aiOverview, setAiOverview] = useState<any>(null);
  const [metrics, setMetrics] = useState<AiMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [cycles, setCycles] = useState<MonitorCycle[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    setIsRefreshing(true);
    const results = await Promise.allSettled([
      readApi('/api/health', authFetch, false),
      readApi('/api/admin/ai/overview', authFetch),
      readApi('/api/admin/ai/metrics', authFetch),
      readApi('/api/monitor/alerts', authFetch),
      readApi('/api/monitor/history', authFetch),
    ]);

    const failures: string[] = [];
    const [healthResult, overviewResult, metricsResult, alertsResult, cyclesResult] = results;
    if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
    else failures.push('saúde do Worker');
    if (overviewResult.status === 'fulfilled') setAiOverview(overviewResult.value);
    else failures.push('configuração de IA');
    if (metricsResult.status === 'fulfilled') setMetrics(metricsResult.value);
    else failures.push('métricas persistidas de IA');
    if (alertsResult.status === 'fulfilled') {
      const value = alertsResult.value;
      setAlerts(Array.isArray(value) ? value : Array.isArray(value?.alerts) ? value.alerts : []);
    } else failures.push('alertas');
    if (cyclesResult.status === 'fulfilled') {
      const value = cyclesResult.value;
      setCycles(Array.isArray(value) ? value : Array.isArray(value?.cycles) ? value.cycles : []);
    } else failures.push('histórico do monitor de conhecimento');

    setError(failures.length ? `Dados indisponíveis: ${failures.join(', ')}.` : null);
    setLastUpdated(new Date().toISOString());
    setIsRefreshing(false);
  }, [authFetch]);

  useEffect(() => { void loadAllData(); }, [loadAllData]);

  const healthy = health?.status === 'ok';
  const healthLabel = !health ? 'Indisponível' : healthy ? 'Operacional' : 'Degradado';
  const healthColor = !health
    ? 'border-slate-700 bg-slate-900 text-slate-300'
    : healthy
      ? 'border-emerald-800 bg-emerald-950/50 text-emerald-300'
      : 'border-amber-800 bg-amber-950/50 text-amber-300';

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
            <HeartPulse className="h-4 w-4" /> Runtime Cloudflare
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Monitoramento & Saúde</h1>
          <p className="mt-1 text-sm text-slate-400">Somente dados retornados pelos endpoints reais do Worker e métricas persistidas.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Atualizado: {dateTime(lastUpdated || undefined)}</span>
          <button onClick={() => void loadAllData()} disabled={isRefreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-amber-800 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">{error}</div>}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between text-sm text-slate-400"><span>Worker</span><Activity className="h-4 w-4" /></div>
          <p className="mt-3 text-lg font-semibold text-white">{display(health?.worker)}</p>
          <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs ${healthColor}`}>{healthLabel}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between text-sm text-slate-400"><span>Supabase</span><Database className="h-4 w-4" /></div>
          <p className="mt-3 text-lg font-semibold text-white">{display(health?.database?.status)}</p>
          <p className="mt-2 text-xs text-slate-500">Probe sem leitura de registros</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between text-sm text-slate-400"><span>Gateway</span><CreditCard className="h-4 w-4" /></div>
          <p className="mt-3 text-lg font-semibold text-white">{display(health?.payments?.gateway)}</p>
          <p className="mt-2 text-xs text-slate-500">Configuração: {display(health?.payments?.status)} · {display(health?.payments?.environment)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between text-sm text-slate-400"><span>Latência do health check</span><Activity className="h-4 w-4" /></div>
          <p className="mt-3 text-2xl font-semibold text-white">{health?.latency_ms === undefined ? '—' : `${health.latency_ms} ms`}</p>
          <p className="mt-2 text-xs text-slate-500">Medição desta requisição, não uptime acumulado</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-emerald-300" />
          <h2 className="text-lg font-semibold text-white">Cloudflare AI & Vectorize</h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Chamadas IA (24h)', metrics?.available ? display(metrics.totalCalls) : '—'],
            ['Taxa de erro', metrics?.available ? `${display(metrics.errorRatePercent)}%` : '—'],
            ['Latência média', metrics?.available ? `${display(metrics.avgLatencyMs)} ms` : '—'],
            ['Latência p95', metrics?.available ? `${display(metrics.p95LatencyMs)} ms` : '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="mt-2 text-xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2 text-sm text-slate-300 sm:flex-row sm:gap-8">
          <p className="flex items-center gap-2">
            {aiOverview?.provider?.status === 'configured' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-amber-400" />}
            Workers AI: {aiOverview?.provider?.status === 'configured' ? 'binding configurado; saúde verificada separadamente' : 'binding não configurado'}
          </p>
          <p className="flex items-center gap-2">
            {aiOverview?.rag?.status === 'configured' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-amber-400" />}
            Vectorize: {aiOverview?.rag?.status === 'configured' ? 'binding configurado; consulta não executada' : 'binding não configurado'}
          </p>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {metrics?.available ? `Métricas persistidas das últimas ${metrics.windowHours || 24} horas.` : 'Métricas históricas indisponíveis; nenhum valor foi estimado.'}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Alertas do monitor de conhecimento</h2>
              <p className="mt-1 text-xs text-slate-500">Histórico em memória do Worker; pode reiniciar com novo processo.</p>
            </div>
            <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{alerts.length}</span>
          </div>
          {alerts.length === 0 ? (
            <p className="mt-5 rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">Nenhum alerta registrado neste processo do Worker.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {alerts.slice(0, 8).map((alert) => (
                <li key={alert.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="flex items-start gap-2">
                    {alert.level === 'CRITICAL' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-100">{alert.title || alert.id}</p>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-slate-400">{alert.body || 'Sem detalhes adicionais.'}</p>
                      <p className="mt-2 text-xs text-slate-500">{display(alert.level)} · {dateTime(alert.timestamp)}</p>
                      {alert.sourceUrl && <a className="mt-2 inline-block text-xs text-sky-300 underline" href={alert.sourceUrl} target="_blank" rel="noreferrer">Abrir fonte</a>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Ciclos de monitoramento</h2>
              <p className="mt-1 text-xs text-slate-500">Histórico mantido em memória pelo scheduler.</p>
            </div>
            <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{cycles.length}</span>
          </div>
          {cycles.length === 0 ? (
            <p className="mt-5 rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">Nenhum ciclo registrado neste processo do Worker.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {cycles.slice(0, 8).map((cycle, index) => (
                <li key={cycle.cycleId || `${cycle.startedAt || 'cycle'}-${index}`} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-100">{cycle.cycleId || 'Ciclo de monitoramento'}</p>
                    <span className="text-xs text-slate-500">{dateTime(cycle.completedAt || cycle.startedAt)}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Fontes: {display(cycle.totalSources)} · Coletas OK: {display(cycle.successfulFetches)} · Falhas: {display(cycle.failedFetches)} · Mudanças: {display(cycle.changesDetected)} · Para revisão: {display(cycle.sentToReviewQueue)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
