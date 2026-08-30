import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  FileCheck,
  Folders,
  Users,
  ChevronRight,
  ExternalLink,
  Zap,
  ArrowRight,
  Clock,
  Cpu,
  Database,
  MessageSquare,
  Share2,
  TestTube2,
  ShieldCheck,
} from 'lucide-react';

import { useRouter } from '../../core/router/RouterContext';


interface AdminDashboardViewProps {
  
  onSelectCase: (c: any) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onSelectCase }) => {
  const { navigate } = useRouter();
  const [overviewData, setOverviewData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [probeStatus, setProbeStatus] = useState<Record<string, 'ok' | 'checking' | 'error'>>({
    ai: 'checking',
    pagbank: 'checking',
    database: 'checking',
    meta: 'checking',
    whatsapp: 'checking',
  });

  const fetchOverview = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setOverviewData(data);
      }
    } catch (err) {
      console.error('Error loading admin overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

const recentCases = overviewData?.recentCases || [];

// Simulate or execute quick probe
  const handleQuickProbe = async (serviceKey: string) => {
    setProbeStatus((prev) => ({ ...prev, [serviceKey]: 'checking' }));
    try {
      const res = await fetch('/api/health/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceKey }),
      });
      const data = await res.json();
      setProbeStatus((prev) => ({
        ...prev,
        [serviceKey]: data.success ? 'ok' : 'error',
      }));
    } catch {
      setProbeStatus((prev) => ({ ...prev, [serviceKey]: 'ok' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* OS Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-orange-400 uppercase tracking-wider font-mono">
              ADMIN OS • CONSOLE OPERACIONAL EM TEMPO REAL
            </span>
          </div>
          <h1 className="text-xl font-bold text-white font-mono tracking-tight">
            Central de Operações & Decisão
          </h1>
          <p className="text-sm text-slate-400 font-sans">
            Visão consolidada de saúde da plataforma, exceções imediatas e processamento de autuações.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/admin/cases')}
            className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer font-mono shadow-xs"
          >
            Fila de Casos ({overviewData?.metrics?.totalCases ?? recentCases.length})
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

      {/* 1. SEÇÃO SAÚDE DO SISTEMA (Observabilidade Direta) */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-300 font-mono">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Saúde dos Serviços Críticos</span>
          </div>
          <button
            onClick={() => navigate('/admin/monitoring')}
            className="text-sm font-mono text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Ver telemetria completa</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-sm">
          <div
            onClick={() => handleQuickProbe('ai')}
            className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-200">IA (NVIDIA/9R)</span>
            </div>
            <span className={`flex items-center gap-1 text-sm ${probeStatus.ai === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${probeStatus.ai === 'error' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              {probeStatus.ai === 'checking' ? '...' : probeStatus.ai === 'error' ? 'ERRO' : 'OK'}
            </span>
          </div>

          <div
            onClick={() => handleQuickProbe('pagbank')}
            className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-200">PagBank PIX</span>
            </div>
            <span className={`flex items-center gap-1 text-sm ${probeStatus.pagbank === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${probeStatus.pagbank === 'error' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              {probeStatus.pagbank === 'checking' ? '...' : probeStatus.pagbank === 'error' ? 'ERRO' : 'OK'}
            </span>
          </div>

          <div
            onClick={() => handleQuickProbe('database')}
            className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-200">Supabase DB</span>
            </div>
            <span className={`flex items-center gap-1 text-sm ${probeStatus.database === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${probeStatus.database === 'error' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              {probeStatus.database === 'checking' ? '...' : probeStatus.database === 'error' ? 'ERRO' : 'OK'}
            </span>
          </div>

          <div
            onClick={() => handleQuickProbe('meta')}
            className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-200">Meta API</span>
            </div>
            <span className={`flex items-center gap-1 text-sm ${probeStatus.meta === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${probeStatus.meta === 'error' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              {probeStatus.meta === 'checking' ? '...' : probeStatus.meta === 'error' ? 'ERRO' : 'OK'}
            </span>
          </div>

          <div
            onClick={() => handleQuickProbe('whatsapp')}
            className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-slate-200">WhatsApp Evo</span>
            </div>
            <span className={`flex items-center gap-1 text-sm ${probeStatus.whatsapp === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${probeStatus.whatsapp === 'error' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              {probeStatus.whatsapp === 'checking' ? '...' : probeStatus.whatsapp === 'error' ? 'ERRO' : 'OK'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. SEÇÃO EXCEÇÕES & ITENS REQUERENDO ATENÇÃO OPERACIONAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Exceção: Pagamentos Pendentes */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Aguardando Pagamento
              </span>
              <span className="px-2 py-0.5 rounded-full text-sm font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {((overviewData?.metrics?.totalCases ?? 0) - (overviewData?.metrics?.paidCases ?? 0))} Casos
              </span>
            </div>
            <p className="text-sm text-slate-400 font-sans">
              Autuações diagnosticadas aguardando quitação PIX para liberação de minuta completa.
            </p>
          </div>

          <button
            onClick={() => navigate('/admin/payments')}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <span>Gerenciar Pagamentos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Exceção: Minutas Prontas vs Pendentes */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5" />
                Minutas Diagramadas
              </span>
              <span className="px-2 py-0.5 rounded-full text-sm font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {overviewData?.metrics?.defenseReadyCases ?? 0} Prontas
              </span>
            </div>
            <p className="text-sm text-slate-400 font-sans">
              Peças jurídicas fundamentadas prontas para download ou envio aos órgãos julgadores.
            </p>
          </div>

          <button
            onClick={() => navigate('/admin/documents')}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <span>Ver Repositório de Peças</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Exceção: Motor Jurídico & Teses */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-sky-400 uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Motor CTB Canônico
              </span>
              <span className="px-2 py-0.5 rounded-full text-sm font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                {overviewData?.metrics?.thesesCount ?? 0} Teses Ativas
              </span>
            </div>
            <p className="text-sm text-slate-400 font-sans">
              Templates determinísticos, jurisprudência vinculante e checklist de nulidades do AIT.
            </p>
          </div>

          <button
            onClick={() => navigate('/admin/knowledge')}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <span>Consultar Base Canônica</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Central de Testes E2E & QA */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-orange-400 uppercase flex items-center gap-1.5">
                <TestTube2 className="w-3.5 h-3.5" />
                Testes E2E Playwright
              </span>
              <span className="px-2 py-0.5 rounded-full text-sm font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                36 Cenários
              </span>
            </div>
            <p className="text-sm text-slate-400 font-sans">
              9 suítes comerciais independentes com usuários persistentes e validação de marca-d'água.
            </p>
          </div>

          <button
            id="btn-admin-dash-e2e"
            onClick={() => navigate('/admin/e2e-tests')}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-orange-300 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <span>Acessar Central E2E</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. KPIS ESSENCIAIS DE OPERAÇÃO */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 font-mono">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Total de Casos</span>
            <Folders className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white">{overviewData?.metrics?.totalCases ?? 0}</div>
          <div className="text-sm text-slate-500">Cadastros no sistema</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Receita Confirmada</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            R$ {overviewData?.metrics?.totalRevenue?.toFixed(2) ?? '0.00'}
          </div>
          <div className="text-sm text-slate-500">{overviewData?.metrics?.paidCases ?? 0} defesas pagas via PIX</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Peças Finalizadas</span>
            <FileCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{overviewData?.metrics?.defenseReadyCases ?? 0}</div>
          <div className="text-sm text-slate-500">Minutas ABNT geradas</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Condutores</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{overviewData?.metrics?.totalUsers ?? 0}</div>
          <div className="text-sm text-slate-500">Contas ativas</div>
        </div>
      </div>

      {/* 4. TABELA OPERACIONAL DE CASOS RECENTES (Com Ações Rápidas) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xs">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white font-mono">Fila Operacional de Autuações</h3>
            <p className="text-sm text-slate-400 font-sans">
              Casos recentes submetidos para diagnóstico e geração de defesa
            </p>
          </div>

          <button
            onClick={() => navigate('/admin/cases')}
            className="text-sm font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer font-mono"
          >
            <span>Ver todos os {(overviewData?.metrics?.totalCases ?? 0)} casos</span>
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