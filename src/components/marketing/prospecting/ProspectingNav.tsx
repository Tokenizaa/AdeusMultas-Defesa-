import React from 'react';
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Settings2,
  List,
  Bot,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { useRouter } from '../../../core/router/RouterContext';
import type { AutomationStatus } from '../types/prospecting';

export type ProspectingTabKey =
  | 'overview'
  | 'leads'
  | 'campaigns'
  | 'automation'
  | 'queue'
  | 'collection';

interface TabItem {
  key: ProspectingTabKey;
  path: string;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface ProspectingNavProps {
  activeTab: ProspectingTabKey;
  status: AutomationStatus;
  leadCount?: number;
  queueCount?: number;
  campaignCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const ProspectingNav: React.FC<ProspectingNavProps> = ({
  activeTab,
  status,
  leadCount,
  queueCount,
  campaignCount,
  onRefresh,
  isRefreshing,
}) => {
  const { navigate } = useRouter();

  const tabs: TabItem[] = [
    {
      key: 'overview',
      path: '/admin/marketing/prospecting',
      label: 'Visão Geral',
      description: 'Métricas, KPIs e saúde do motor',
      icon: LayoutDashboard,
    },
    {
      key: 'leads',
      path: '/admin/marketing/prospecting/leads',
      label: 'Base de Leads',
      description: 'Despachantes e advogados qualificados',
      icon: Users,
      badge: leadCount !== undefined ? leadCount : undefined,
    },
    {
      key: 'campaigns',
      path: '/admin/marketing/prospecting/campaigns',
      label: 'Campanhas',
      description: 'Segmentação e cadências de disparo',
      icon: ListChecks,
      badge: campaignCount !== undefined ? campaignCount : undefined,
    },
    {
      key: 'automation',
      path: '/admin/marketing/prospecting/automation',
      label: 'Automação & Worker',
      description: 'Status do motor, worker e Evolution',
      icon: Settings2,
    },
    {
      key: 'queue',
      path: '/admin/marketing/prospecting/queue',
      label: 'Fila de Disparos',
      description: 'Jobs pendentes, retries e erros',
      icon: List,
      badge: queueCount !== undefined && queueCount > 0 ? queueCount : undefined,
    },
    {
      key: 'collection',
      path: '/admin/marketing/prospecting/collection',
      label: 'Coleta & Scraping',
      description: 'Aquisição autônoma de contatos',
      icon: Bot,
    },
  ];

  const statusColorMap: Record<AutomationStatus, { bg: string; text: string; dot: string; label: string }> = {
    RUNNING: {
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400 animate-pulse',
      label: 'MOTOR ATIVO',
    },
    PAUSED: {
      bg: 'bg-amber-500/10 border-amber-500/30',
      text: 'text-amber-400',
      dot: 'bg-amber-400',
      label: 'PAUSADO',
    },
    STOPPED: {
      bg: 'bg-slate-500/10 border-slate-700',
      text: 'text-slate-400',
      dot: 'bg-slate-400',
      label: 'PARADO',
    },
    ERROR: {
      bg: 'bg-rose-500/10 border-rose-500/30',
      text: 'text-rose-400',
      dot: 'bg-rose-400 animate-ping',
      label: 'ERRO',
    },
  };

  const currentStatusConfig = statusColorMap[status] || statusColorMap.STOPPED;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
      {/* Top Banner: Context and Fast Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider font-mono bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                Meta Business Suite • B2B Acquisition
              </span>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-bold ${currentStatusConfig.bg} ${currentStatusConfig.text}`}
              >
                <span className={`w-2 h-2 rounded-full ${currentStatusConfig.dot}`} />
                {currentStatusConfig.label}
              </div>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white mt-1">
              Prospecção B2B Autônoma
            </h1>
            <p className="text-xs text-slate-400">
              Motor autônomo de inteligência e disparo de cadências via WhatsApp Evolution API
            </p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
              title="Atualizar todos os dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : 'text-slate-400'}`} />
              <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Meta-style Sub-navigation Tabs */}
      <div className="border-t border-slate-800 pt-3">
        <nav
          className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
          aria-label="Navegação do Módulo de Prospecção"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.path)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-extrabold'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50'
                }`}
                title={tab.description}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                      isActive ? 'bg-black/30 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
