import React, { useState, useEffect } from 'react';
import {

  RefreshCw,
  CreditCard,
  Folders,
  Users,
  ChevronRight,
} from 'lucide-react';

import { useRouter } from '../../core/router/RouterContext';
import { useAuthFetch } from '../../hooks/useAuthFetch';


interface AdminDashboardViewProps {
  
  onSelectCase: (c: any) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onSelectCase }) => {
  const { navigate } = useRouter();
  const authFetch = useAuthFetch();
  const [overviewData, setOverviewData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/admin/overview');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error?.message || data?.message || `HTTP ${res.status}`);
      }
      setOverviewData(data);
    } catch (err) {
      setOverviewData(null);
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a visão geral.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

const recentCases = Array.isArray(overviewData?.recentCases) ? overviewData.recentCases : [];


  return (
    <div className="space-y-6">
      {/* OS Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-orange-400 uppercase tracking-wider font-mono">
              VISÃO GERAL
            </span>
          </div>
          <h1 className="text-xl font-bold text-white font-mono tracking-tight">
            Resumo operacional
          </h1>
          <p className="text-sm text-slate-400 font-sans">
            Indicadores principais e casos recentes da plataforma.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/admin/cases')}
            className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer font-mono shadow-xs"
          >
            Fila de Casos ({overviewData?.metrics?.totalCases ?? '—'})
          </button>
          <button
            onClick={fetchOverview}
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer border border-slate-700"
            title="Recarregar Estado"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-800 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">Falha ao carregar indicadores reais: {error}</div>}

      {/* Indicadores principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Total de Casos</span>
            <Folders className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white">{overviewData?.metrics?.totalCases ?? '—'}</div>
          <div className="text-sm text-slate-500">Cadastros no sistema</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Receita Confirmada</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            R$ {overviewData?.metrics?.totalRevenue !== undefined ? Number(overviewData.metrics.totalRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
          </div>
          <div className="text-sm text-slate-500">{overviewData?.metrics?.paidCases ?? '—'} defesas pagas via PIX</div>
        </div>



        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Condutores</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{overviewData?.metrics?.totalUsers ?? '—'}</div>
          <div className="text-sm text-slate-500">Contas ativas</div>
        </div>
      </div>

      {/* 4. TABELA OPERACIONAL DE CASOS RECENTES (Com Ações Rápidas) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xs">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white font-mono">Casos recentes</h3>
            <p className="text-sm text-slate-400 font-sans">
              Últimos casos recebidos pela plataforma
            </p>
          </div>

          <button
            onClick={() => navigate('/admin/cases')}
            className="text-sm font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer font-mono"
          >
            <span>Ver todos os {(overviewData?.metrics?.totalCases ?? '—')} casos</span>
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
                <th className="py-3 px-4">Status Pagamento</th>
                <th className="py-3 px-4 text-right">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {recentCases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    {isLoading ? 'Carregando casos recentes…' : error ? 'Casos recentes indisponíveis.' : 'Nenhum caso recente retornado pela API.'}
                  </td>
                </tr>
              )}
              {recentCases.map((c) => {
                const isPaid = c.isPaid || c.payment?.status === 'paid' || c.payment?.status === 'approved';
                return (
                  <tr key={c.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      {c.infraction?.aitNumber || c.id}
                    </td>
                    <td className="py-3 px-4 text-orange-300 font-bold">
                      {c.vehicle?.plate || 'SEM PLACA'}
                    </td>
                    <td className="py-3 px-4 truncate max-w-xs text-slate-200">
                      {c.infraction?.description || 'Infração de trânsito'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {c.infraction?.autuadorBody || 'Não informado'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-sm font-bold border ${
                          isPaid
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isPaid ? 'PAGO (PIX)' : 'AGUARDANDO PIX'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      
                      <button
                        onClick={() => navigate(`/admin/cases/${c.id}`)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-orange-400 rounded-lg text-sm font-bold transition-colors cursor-pointer border border-slate-700"
                      >
                        Inspecionar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};