import React, { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle2, CreditCard, Cpu, Database, RefreshCw, Settings, ShieldCheck, XCircle, Zap } from 'lucide-react';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { useRouter } from '../../contexts/RouterContext';

type RuntimeStatus = 'configured' | 'not_configured' | 'connected' | 'degraded' | 'unknown';
type IntegrationCheck = { label: string; passed: boolean; detail: string };
type IntegrationTest = {
  success: boolean;
  serviceName: string;
  latencyMs?: number;
  message: string;
  checks?: IntegrationCheck[];
};
type Health = {
  status?: string;
  worker?: string;
  timestamp?: string;
  database?: { status?: string };
  payments?: { status?: string; gateway?: string; environment?: string };
};
type AiOverview = {
  provider?: { name?: string; model?: string; status?: RuntimeStatus; statusMeaning?: string };
  rag?: { provider?: string; index?: string; status?: RuntimeStatus; statusMeaning?: string };
};

async function readApi(path: string, authFetch: (url: string, init?: RequestInit) => Promise<Response>, authenticated = true) {
  const response = authenticated ? await authFetch(path) : await fetch(path);
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error?.message || body?.message || `HTTP ${response.status} em ${path}`);
  }
  return body?.ok === true && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body;
}

function statusLabel(status?: string) {
  switch (String(status || '').toLowerCase()) {
    case 'configured': return 'Binding configurado';
    case 'connected':
    case 'ok':
    case 'healthy': return 'Conexão verificada';
    case 'not_configured': return 'Não configurado';
    case 'degraded': return 'Degradado';
    default: return 'Não verificado';
  }
}

function statusClass(status?: string) {
  const normalized = String(status || '').toLowerCase();
  if (['configured', 'connected', 'ok', 'healthy'].includes(normalized)) return 'border-emerald-800 bg-emerald-950/40 text-emerald-300';
  if (normalized === 'degraded') return 'border-amber-800 bg-amber-950/40 text-amber-300';
  if (normalized === 'not_configured') return 'border-rose-800 bg-rose-950/40 text-rose-300';
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

export const AdminIntegrationsView: React.FC = () => {
  const authFetch = useAuthFetch();
  const { navigate } = useRouter();
  const [health, setHealth] = useState<Health | null>(null);
  const [aiOverview, setAiOverview] = useState<AiOverview | null>(null);
  const [runtimeSettings, setRuntimeSettings] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<Record<string, IntegrationTest>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadIntegrations = useCallback(async () => {
    setIsRefreshing(true);
    const results = await Promise.allSettled([
      readApi('/api/health', authFetch, false),
      readApi('/api/admin/ai/overview', authFetch),
      readApi('/api/settings', authFetch),
    ]);
    const failures: string[] = [];
    const [healthResult, aiResult, settingsResult] = results;
    if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
    else failures.push('saúde do Worker');
    if (aiResult.status === 'fulfilled') setAiOverview(aiResult.value);
    else failures.push('status de IA/Vectorize');
    if (settingsResult.status === 'fulfilled') setRuntimeSettings(Array.isArray(settingsResult.value?.settings) ? settingsResult.value.settings : []);
    else failures.push('bindings de runtime');
    setError(failures.length ? `Não foi possível carregar: ${failures.join(', ')}.` : null);
    setLastUpdated(new Date().toISOString());
    setIsRefreshing(false);
  }, [authFetch]);

  useEffect(() => { void loadIntegrations(); }, [loadIntegrations]);

  const runIntegrationTest = async (serviceId: string) => {
    setTesting(serviceId);
    setTestResults((current) => {
      const next = { ...current };
      delete next[serviceId];
      return next;
    });
    try {
      const response = await authFetch('/api/settings/test-integration', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ serviceId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || body?.message || `HTTP ${response.status}`);
      setTestResults((current) => ({ ...current, [serviceId]: body }));
    } catch (err) {
      setTestResults((current) => ({
        ...current,
        [serviceId]: {
          success: false,
          serviceName: serviceId,
          message: err instanceof Error ? err.message : 'Falha ao testar integração.',
        },
      }));
    } finally {
      setTesting(null);
    }
  };

  const supabaseUrl = runtimeSettings.find((setting) => setting.key === 'SUPABASE_URL')?.currentValue;
  const appUrl = runtimeSettings.find((setting) => setting.key === 'APP_URL')?.currentValue;

  const integrations = [
    {
      id: 'cloudflare-ai',
      title: 'Cloudflare Workers AI',
      category: 'Inteligência artificial',
      description: 'Binding de inferência usado pelo Worker. O teste executa uma inferência mínima real.',
      status: aiOverview?.provider?.status,
      detail: `Modelo: ${aiOverview?.provider?.model || '—'}`,
      icon: Cpu,
      action: 'Executar inferência de teste',
    },
    {
      id: 'vectorize',
      title: 'Cloudflare Vectorize',
      category: 'Busca vetorial',
      description: 'Binding e índice configurados não comprovam que uma consulta vetorial está saudável.',
      status: aiOverview?.rag?.status,
      detail: `Índice: ${aiOverview?.rag?.index || '—'}`,
      icon: Zap,
      action: null,
    },
    {
      id: 'supabase',
      title: 'Supabase',
      category: 'Banco de dados',
      description: 'Probe real de conectividade, sem ler registros de usuários.',
      status: health?.database?.status,
      detail: `Endpoint: ${supabaseUrl || 'Não configurado'}`,
      icon: Database,
      action: 'Executar probe seguro',
    },
    {
      id: 'venopag',
      title: 'VenoPag',
      category: 'Pagamentos',
      description: 'Verifica a presença das credenciais configuradas; não chama o gateway nem cria transações.',
      status: health?.payments?.status,
      detail: `Gateway: ${health?.payments?.gateway || '—'} · Modo: ${health?.payments?.environment || '—'}`,
      icon: CreditCard,
      action: 'Verificar credenciais',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> Integrações do runtime
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Integrações</h1>
          <p className="mt-1 text-sm text-slate-400">Estado do Cloudflare Worker e testes reais das integrações suportadas.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Atualizado: {lastUpdated ? new Date(lastUpdated).toLocaleString('pt-BR') : '—'}</span>
          <button onClick={() => void loadIntegrations()} disabled={isRefreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-amber-800 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">{error}</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const result = testResults[integration.id];
          return (
            <section key={integration.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3"><Icon className="h-5 w-5 text-slate-200" /></div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{integration.category}</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">{integration.title}</h2>
                    <p className="mt-2 text-sm text-slate-400">{integration.description}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${statusClass(integration.status)}`}>{statusLabel(integration.status)}</span>
              </div>
              <p className="mt-4 text-xs text-slate-500">{integration.detail}</p>

              {integration.action && (
                <div className="mt-4">
                  <button onClick={() => void runIntegrationTest(integration.id)} disabled={testing !== null} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-50">
                    {testing === integration.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                    {testing === integration.id ? 'Executando…' : integration.action}
                  </button>
                </div>
              )}

              {result && (
                <div className={`mt-4 rounded-xl border p-3 ${result.success ? 'border-emerald-800 bg-emerald-950/30' : 'border-rose-800 bg-rose-950/30'}`}>
                  <div className="flex items-start gap-2">
                    {result.success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100">{result.serviceName}</p>
                      <p className="mt-1 text-sm text-slate-300">{result.message}</p>
                      {result.latencyMs !== undefined && <p className="mt-1 text-xs text-slate-500">Duração: {result.latencyMs} ms</p>}
                    </div>
                  </div>
                  {result.checks && result.checks.length > 0 && (
                    <ul className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                      {result.checks.map((check) => (
                        <li key={check.label} className="flex items-start gap-2 text-xs">
                          {check.passed ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-300" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 text-rose-300" />}
                          <span><strong className="text-slate-200">{check.label}:</strong> <span className="text-slate-400">{check.detail}</span></span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="flex items-start gap-3">
          <Settings className="mt-0.5 h-5 w-5 text-slate-400" />
          <div className="min-w-0 flex-1">
            <h2 className="font-medium text-white">Provisionamento de variáveis e segredos</h2>
            <p className="mt-1 text-sm text-slate-400">O painel exibe os bindings efetivos, mas não altera secrets/vars do Cloudflare. Use o ambiente de deploy para provisioná-los.</p>
            <p className="mt-2 text-xs text-slate-500">Origem configurada: {appUrl || 'Não configurada'} · Os valores secretos não são retornados pela API.</p>
          </div>
          <button onClick={() => navigate('/admin/settings')} className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900">Ver configurações</button>
        </div>
      </section>
    </div>
  );
};
