import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  CreditCard,
  Folders,
  Users,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { useAuthFetch } from '../../hooks/useAuthFetch';

interface AdminCaseSummary {
  id: string;
  title?: string;
  clientName?: string;
  isPaid: boolean;
  status?: string;
  createdAt?: string;
  infraction: {
    aitNumber?: string;
    description?: string;
    autuadorBody?: string;
  };
  vehicle: {
    plate?: string;
  };
}

interface AdminOverviewResponse {
  metrics: {
    totalUsers: number;
    totalCases: number;
    paidCases: number;
    totalRevenue: number;
  };
  recentCases: AdminCaseSummary[];
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const candidate = payload as { message?: unknown; error?: unknown };
    if (typeof candidate.message === 'string' && candidate.message.trim()) return candidate.message;
    if (typeof candidate.error === 'string' && candidate.error.trim()) return candidate.error;
    if (candidate.error && typeof candidate.error === 'object') {
      const nested = candidate.error as { message?: unknown };
      if (typeof nested.message === 'string' && nested.message.trim()) return nested.message;
    }
  }
  return fallback;
}

export const AdminDashboardView: React.FC<{ onSelectCase: (c: any) => void }> = () => {
  const { navigate } = useRouter();
  const authFetch = useAuthFetch();
  const [overviewData, setOverviewData] = useState<AdminOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await authFetch('/api/admin/overview');
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Não foi possível carregar a visão geral.'));
      }
      if (!payload || typeof payload !== 'object' || !('metrics' in payload)) {
        throw new Error('A API retornou dados operacionais em formato inválido.');
      }
      const parsed = payload as AdminOverviewResponse;
      if (!parsed.metrics || !Array.isArray(parsed.recentCases)) {
        throw new Error('A API não retornou todos os dados necessários para a visão geral.');
      }
      setOverviewData(parsed);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Falha inesperada ao carregar a visão geral.');
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const recentCases = overviewData?.recentCases ?? [];
  const metrics = overviewData?.metrics;
  const metricValue = (value: number | undefined) =>
    isLoading && !overviewData ? '…' : value ?? '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${loadError ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span className="text-sm font-bold text-orange-400 uppercase tracking-wider font-mono">
              VISÃO GERAL
            </span>
          </div>
          <h1 className="text-xl font-bold text-white font-mono tracking-tight">Resumo operacional</h1>
          <p className="text-sm text-slate-400 font-sans">
            Indicadores principais e casos recentes da plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/admin/cases')}
            className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer font-mono shadow-xs"
          >
            Fila de Casos ({metricValue(metrics?.totalCases)})
          </button>
          <button
            onClick={() => void fetchOverview()}
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer border border-slate-700 disabled:opacity-50"
            title="Recarregar visão geral"
            aria-label="Recarregar visão geral"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-700/60 bg-amber-950/30 p-4">
          <div>
            <p className="font-semibold text-amber-200">Não foi possível atualizar a operação</p>
            <p className="text-sm text-amber-100/80">{loadError}</p>
            {overviewData && <p className="mt-1 text-xs text-slate-400">Os dados anteriores permanecem visíveis até uma atualização bem-sucedida.</p>}
          </div>
          <button
            onClick={() => void fetchOverview()}
            disabled={isLoading}
            className="shrink-0 rounded-lg border border-amber-700 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-900/40 disabled:opacity-50"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Total de casos</span>
            <Folders className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metricValue(metrics?.totalCases)}</div>
          <div className="text-sm text-slate-500">Casos registrados na plataforma</div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Receita confirmada</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {metrics ? formatCurrency(metrics.totalRevenue) : '—'}
          </div>
          <div className="text-sm text-slate-500">{metricValue(metrics?.paidCases)} pagamentos confirmados</div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Contas cadastradas</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metricValue(metrics?.totalUsers)}</div>
          <div className="text-sm text-slate-500">Perfis registrados</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white font-mono">Casos recentes</h2>
            <p className="text-sm text-slate-400 font-sans">Últimos casos recebidos pela plataforma</p>
          </div>
          <button
            onClick={() => navigate('/admin/cases')}
            className="text-sm font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer font-mono"
          >
            <span>Ver todos os casos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-sm">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-sm border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Auto / ID</th>
                <th className="py-3 px-4">Placa / Veículo</th>
                <th className="py-3 px-4">Infração / CTB</th>
                <th className="py-3 px-4">Órgão</th>
                <th className="py-3 px-4">Pagamento</th>
                <th className="py-3 px-4 text-right">Ações operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {recentCases.map((item) => (
                <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">{item.infraction?.aitNumber || item.id}</td>
                  <td className="py-3 px-4 text-orange-300 font-bold">{item.vehicle?.plate || 'Não informado'}</td>
                  <td className="py-3 px-4 truncate max-w-xs text-slate-200">{item.infraction?.description || item.title || 'Não informado'}</td>
                  <td className="py-3 px-4 text-slate-400">{item.infraction?.autuadorBody || 'Não informado'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-sm font-bold border ${item.isPaid
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                      {item.isPaid ? 'PAGO' : 'NÃO CONFIRMADO'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => navigate(`/admin/cases/${item.id}`)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-orange-400 rounded-lg text-sm font-bold transition-colors cursor-pointer border border-slate-700"
                    >
                      Inspecionar
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && !loadError && recentCases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Nenhum caso encontrado.
                  </td>
                </tr>
              )}
              {isLoading && !overviewData && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Carregando casos…</td>
                </tr>
              )}
              {loadError && !overviewData && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Os casos não foram carregados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
