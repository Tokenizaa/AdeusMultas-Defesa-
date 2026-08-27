import React from 'react';
import {
  Users,
  Send,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Database,
  Clock,
  ArrowRight,
  ListChecks,
  List,
  Play,
  Pause,
  Bot,
  Zap,
} from 'lucide-react';
import { useRouter } from '../../../core/router/RouterContext';
import type {
  StatsResponse,
  HealthResponse,
  Campaign,
  QueueJob,
  AutomationStatus,
} from '../types/prospecting';

interface ProspectingOverviewTabProps {
  stats: StatsResponse | null;
  health: HealthResponse | null;
  campaigns: Campaign[];
  queue: QueueJob[];
  status: AutomationStatus;
  onStartEngine: () => void;
  onPauseEngine: () => void;
  isLoadingAction?: boolean;
}

export const ProspectingOverviewTab: React.FC<ProspectingOverviewTabProps> = ({
  stats,
  health,
  campaigns,
  queue,
  status,
  onStartEngine,
  onPauseEngine,
  isLoadingAction,
}) => {
  const { navigate } = useRouter();

  const totalLeads = stats?.totalLeads ?? 0;
  const queued = stats?.queued ?? 0;
  const contacted = stats?.contacted ?? 0;
  const responded = stats?.responded ?? 0;
  const interested = stats?.interested ?? 0;
  const converted = stats?.converted ?? 0;
  const errors = stats?.errors ?? 0;

  // Calculate conversion rates safely
  const responseRate = contacted > 0 ? ((responded / contacted) * 100).toFixed(1) : '0.0';
  const conversionRate = contacted > 0 ? ((converted / contacted) * 100).toFixed(1) : '0.0';

  const isDbHealthy = health?.database?.status === 'online';
  const isQueueHealthy = health?.queue?.status === 'online';
  const isWorkerRunning = status === 'RUNNING';

  return (
    <div className="space-y-6">
      {/* 1. Operational KPI Metric Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono">
              Funil de Prospecção & Conversão B2B
            </h2>
            <p className="text-xs text-slate-500">Métricas em tempo real sincronizadas do banco Supabase</p>
          </div>
          <button
            onClick={() => navigate('/admin/marketing/prospecting/leads')}
            className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Ver todos os leads</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Leads */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Total Leads</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">{totalLeads}</div>
            <div className="text-[11px] text-slate-500 mt-1">Base coletada</div>
          </div>

          {/* Na Fila */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Na Fila</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-amber-400 font-mono">{queued}</div>
            <div className="text-[11px] text-slate-500 mt-1">Aguardando disparo</div>
          </div>

          {/* Contatados */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Contatados</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Send className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-indigo-400 font-mono">{contacted}</div>
            <div className="text-[11px] text-slate-500 mt-1">Mensagens enviadas</div>
          </div>

          {/* Responderam */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Responderam</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">{responded}</div>
            <div className="text-[11px] text-emerald-500/80 mt-1">{responseRate}% taxa resp.</div>
          </div>

          {/* Interessados */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Interessados</span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-purple-400 font-mono">{interested}</div>
            <div className="text-[11px] text-slate-500 mt-1">Lead qualificado</div>
          </div>

          {/* Convertidos */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Convertidos</span>
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-teal-400 font-mono">{converted}</div>
            <div className="text-[11px] text-teal-500/80 mt-1">{conversionRate}% conversão</div>
          </div>
        </div>
      </div>

      {/* 2. Automation Health & System Diagnostics */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Saúde da Automação & Infraestrutura</h3>
              <p className="text-xs text-slate-400">Status dos componentes de background e gateways</p>
            </div>
          </div>

          {/* Quick Engine Switcher */}
          <div className="flex items-center gap-2">
            {status === 'RUNNING' ? (
              <button
                onClick={onPauseEngine}
                disabled={isLoadingAction}
                className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar Motor</span>
              </button>
            ) : (
              <button
                onClick={onStartEngine}
                disabled={isLoadingAction}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Iniciar Motor</span>
              </button>
            )}
            <button
              onClick={() => navigate('/admin/marketing/prospecting/automation')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Gerenciar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Database */}
          <div className={`p-3.5 rounded-xl border ${isDbHealthy ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                Database (Supabase)
              </span>
              <span className={`w-2 h-2 rounded-full ${isDbHealthy ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            </div>
            <div className="flex items-baseline justify-between">
              <span className={`text-xs font-bold font-mono ${isDbHealthy ? 'text-emerald-400' : 'text-rose-400'}`}>
                {health?.database?.status?.toUpperCase() || 'ONLINE'}
              </span>
              {health?.database?.latencyMs !== undefined && (
                <span className="text-[11px] font-mono text-slate-400">{health.database.latencyMs}ms</span>
              )}
            </div>
          </div>

          {/* Queue */}
          <div className={`p-3.5 rounded-xl border ${isQueueHealthy ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Queue (Fila)
              </span>
              <span className={`w-2 h-2 rounded-full ${isQueueHealthy ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold font-mono text-emerald-400">
                {health?.queue?.status?.toUpperCase() || 'ONLINE'}
              </span>
              <span className="text-[11px] font-mono text-amber-400">
                {health?.queue?.pendingJobs ?? queue.length} pendentes
              </span>
            </div>
          </div>

          {/* Worker */}
          <div className={`p-3.5 rounded-xl border ${isWorkerRunning ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-800/60 border-slate-700'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                Worker Autônomo
              </span>
              <span className={`w-2 h-2 rounded-full ${isWorkerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            </div>
            <div className="flex items-baseline justify-between">
              <span className={`text-xs font-bold font-mono ${isWorkerRunning ? 'text-emerald-400' : 'text-slate-400'}`}>
                {status}
              </span>
              {health?.worker?.processedCount !== undefined && (
                <span className="text-[11px] font-mono text-slate-400">
                  {health.worker.processedCount} processados
                </span>
              )}
            </div>
          </div>

          {/* Evolution API */}
          <div className="p-3.5 rounded-xl border bg-slate-800/50 border-slate-700">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-green-400" />
                WhatsApp Evolution
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold font-mono text-emerald-400">CONFIGURADO</span>
              <span className="text-[11px] text-slate-400">v2 HTTP API</span>
            </div>
          </div>
        </div>

        {health?.lastError && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Último erro registrado pelo worker: </span>
              <span className="font-mono">{health.lastError}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Operational Grid: Active Campaigns & Live Queue Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Campaigns Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white">Campanhas em Cadência</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                {campaigns.length} cadastradas
              </span>
            </div>

            {campaigns.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Nenhuma campanha configurada no momento.
              </div>
            ) : (
              <div className="space-y-2">
                {campaigns.slice(0, 3).map((camp) => (
                  <div
                    key={camp.id}
                    className="p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{camp.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span className="capitalize">{camp.lead_type || 'Geral'}</span>
                        <span>•</span>
                        <span>{camp.target_cities?.length ? `${camp.target_cities.length} cidades` : 'Todas cidades'}</span>
                        <span>•</span>
                        <span>Intervalo: {camp.min_interval_hours || 48}h</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      ATIVA
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Gerencie regras e cadências</span>
            <button
              onClick={() => navigate('/admin/marketing/prospecting/campaigns')}
              className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Ver campanhas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Queue Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Próximos Jobs na Fila</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                {queue.length} pendentes
              </span>
            </div>

            {queue.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500/40" />
                <span>Fila de disparos vazia no momento.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.slice(0, 3).map((job) => (
                  <div
                    key={job.id}
                    className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">
                        {job.lead_campaign?.lead?.name || 'Lead sem nome'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {job.lead_campaign?.campaign?.name || 'Campanha Padrão'} • Tentativa {job.attempts}/{job.max_attempts}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {new Date(job.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Acompanhe retries e falhas</span>
            <button
              onClick={() => navigate('/admin/marketing/prospecting/queue')}
              className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Abrir fila completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Quick Action Shortcuts Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Precisa de mais contatos qualificados?</div>
            <div className="text-[11px] text-slate-400">Execute raspagens automáticas segmentadas por município</div>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/marketing/prospecting/collection')}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
        >
          <Bot className="w-4 h-4" />
          <span>Iniciar Nova Raspagem</span>
        </button>
      </div>
    </div>
  );
};
