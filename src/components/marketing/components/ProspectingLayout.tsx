import React from 'react';
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Settings2,
  List,
  Bot,
  RefreshCw,
  Zap,
  Radio,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
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

interface NavItem {
  key: ProspectingTabKey;
  path: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface ProspectingLayoutProps {
  activeTab: ProspectingTabKey;
  status?: AutomationStatus;
  leadCount?: number;
  queueCount?: number;
  campaignCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children: React.ReactNode;
}

export const ProspectingLayout: React.FC<ProspectingLayoutProps> = ({
  activeTab,
  status = 'STOPPED',
  leadCount,
  queueCount,
  campaignCount,
  onRefresh,
  isRefreshing = false,
  children,
}) => {
  const { navigate } = useRouter();

  const navItems: NavItem[] = [
    {
      key: 'overview',
      path: '/admin/marketing/prospecting',
      label: 'Visão Geral',
      sublabel: 'Métricas, KPIs & Conversão',
      icon: LayoutDashboard,
    },
    {
      key: 'leads',
      path: '/admin/marketing/prospecting/leads',
      label: 'Base de Leads',
      sublabel: 'Despachantes & Advogados',
      icon: Users,
      badge: leadCount !== undefined ? leadCount : undefined,
    },
    {
      key: 'campaigns',
      path: '/admin/marketing/prospecting/campaigns',
      label: 'Campanhas',
      sublabel: 'Cadências & Segmentações',
      icon: ListChecks,
      badge: campaignCount !== undefined ? campaignCount : undefined,
    },
    {
      key: 'automation',
      path: '/admin/marketing/prospecting/automation',
      label: 'Automação & Worker',
      sublabel: 'Saúde do Motor & Evolution',
      icon: Settings2,
    },
    {
      key: 'queue',
      path: '/admin/marketing/prospecting/queue',
      label: 'Fila de Disparos',
      sublabel: 'Jobs Agendados & Retries',
      icon: List,
      badge: queueCount !== undefined && queueCount > 0 ? queueCount : undefined,
    },
    {
      key: 'collection',
      path: '/admin/marketing/prospecting/collection',
      label: 'Coleta & Scraping',
      sublabel: 'Mineração B2B Google Places',
      icon: Bot,
    },
  ];

  const statusConfig = {
    RUNNING: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      dot: 'bg-emerald-400 animate-pulse',
      label: 'MOTOR ATIVO',
    },
    PAUSED: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      dot: 'bg-amber-400',
      label: 'MOTOR PAUSADO',
    },
    STOPPED: {
      bg: 'bg-slate-500/10 border-slate-700 text-slate-400',
      dot: 'bg-slate-400',
      label: 'MOTOR PARADO',
    },
    ERROR: {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      dot: 'bg-rose-400 animate-ping',
      label: 'MOTOR COM ERRO',
    },
  }[status] || {
    bg: 'bg-slate-500/10 border-slate-700 text-slate-400',
    dot: 'bg-slate-400',
    label: 'MOTOR PARADO',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner (Meta Business Suite Style Header) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider font-mono bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                  Meta Business Suite • B2B Acquisition
                </span>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-bold ${statusConfig.bg}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                  {statusConfig.label}
                </div>
              </div>
              <h1 className="text-xl font-extrabold text-white mt-1">
                Central de Prospecção B2B Autônoma
              </h1>
              <p className="text-xs text-slate-400">
                Coleta autônoma, qualificação inteligente e disparo de cadências multicanal via WhatsApp Evolution API
              </p>
            </div>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
                title="Sincronizar dados em tempo real"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : 'text-slate-400'}`} />
                <span>{isRefreshing ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Navigation Pills */}
        <div className="border-t border-slate-800 pt-3">
          <nav
            className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
            aria-label="Navegação Prospecção B2B"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25 font-extrabold'
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                  title={item.sublabel}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                        isActive ? 'bg-black/30 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Viewport Content */}
      <main className="min-h-[500px]">
        {children}
      </main>
    </div>
  );
};
