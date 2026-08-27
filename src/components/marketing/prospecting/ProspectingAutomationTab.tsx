import React from 'react';
import {
  Play,
  Pause,
  Square,
  Zap,
  Activity,
  Database,
  Clock,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Server,
  Radio,
} from 'lucide-react';
import type { AutomationStatus, HealthResponse } from '../types/prospecting';

interface ProspectingAutomationTabProps {
  status: AutomationStatus;
  health: HealthResponse | null;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onRefresh?: () => void;
  isLoading: boolean;
  isRefreshing?: boolean;
}

export const ProspectingAutomationTab: React.FC<ProspectingAutomationTabProps> = ({
  status,
  health,
  onStart,
  onPause,
  onStop,
  onRefresh,
  isLoading,
  isRefreshing = false,
}) => {
  const statusConfig: Record<
    AutomationStatus,
    {
      label: string;
      color: string;
      bg: string;
      border: string;
      icon: React.ElementType;
      desc: string;
    }
  > = {
    RUNNING: {
      label: 'EM EXECUÇÃO (RUNNING)',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      icon: Play,
      desc: 'O motor está consumindo jobs da fila e enviando mensagens via Evolution API nos intervalos programados.',
    },
    PAUSED: {
      label: 'PAUSADO (PAUSED)',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      icon: Pause,
      desc: 'O processamento de novos jobs está suspenso temporariamente. A fila permanece intacta.',
    },
    STOPPED: {
      label: 'PARADO (STOPPED)',
      color: 'text-slate-400',
      bg: 'bg-slate-500/10',
      border: 'border-slate-700',
      icon: Square,
      desc: 'O worker está desligado. Nenhuma mensagem ou cadência será processada até novo acionamento.',
    },
    ERROR: {
      label: 'ERRO OPERACIONAL',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      icon: XCircle,
      desc: 'Foi detectado um erro no fluxo do worker. Verifique o log de auditoria abaixo.',
    },
  };

  const current = statusConfig[status] || statusConfig.STOPPED;
  const StatusIcon = current.icon;

  const isDbHealthy = health?.database?.status === 'online';
  const isQueueHealthy = health?.queue?.status === 'online';
  const isEvolutionOnline = health?.evolution?.status === 'online' || health?.evolution?.status === 'open';

  return (
    <div className="space-y-6">
      {/* 1. Master Control Panel Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Controlador Central do Worker
                </span>
                <h2 className="text-lg font-extrabold text-white">
                  Motor de Automação & Prospecção B2B
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Gerencie o ciclo de vida do worker autônomo. O motor despacha abordagens automáticas, respeita regras de aquecimento de chip e executa cadências de até 3 etapas.
            </p>
          </div>

          {/* Engine Action Controls: Iniciar, Pausar, Parar, Atualizar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800">
            {/* Start Button */}
            <button
              onClick={onStart}
              disabled={isLoading || status === 'RUNNING'}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                status === 'RUNNING'
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
              }`}
            >
              {isLoading && status !== 'RUNNING' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>Iniciar</span>
            </button>

            {/* Pause Button */}
            <button
              onClick={onPause}
              disabled={isLoading || status !== 'RUNNING'}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                status !== 'RUNNING'
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                  : 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-lg shadow-amber-600/20'
              }`}
            >
              <Pause className="w-4 h-4" />
              <span>Pausar</span>
            </button>

            {/* Stop Button */}
            <button
              onClick={onStop}
              disabled={isLoading || status === 'STOPPED'}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                status === 'STOPPED'
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                  : 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-lg shadow-rose-600/20'
              }`}
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Parar</span>
            </button>

            {/* Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing || isLoading}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Atualizar status e telemetria"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : 'text-slate-300'}`} />
                <span>Atualizar</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Status Highlight Box */}
        <div className={`p-4 rounded-xl border ${current.bg} ${current.border} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-black/20 ${current.color}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <div className={`text-xs font-mono font-bold tracking-wider ${current.color}`}>
                {current.label}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{current.desc}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400 self-end sm:self-auto shrink-0">
            {health?.worker?.processedCount !== undefined && (
              <span className="bg-black/30 px-2.5 py-1 rounded-md border border-slate-700/50">
                <strong className="text-white">{health.worker.processedCount}</strong> jobs processados
              </span>
            )}
            {health?.worker?.lastProcessedAt && (
              <span className="text-[11px] text-slate-500">
                Última atividade: {new Date(health.worker.lastProcessedAt).toLocaleTimeString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Worker Diagnostics & Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Worker Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-orange-400" />
              Worker de Automação
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${status === 'RUNNING' ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : status === 'PAUSED' ? 'bg-amber-400' : 'bg-slate-500'}`} />
          </div>
          <div className="text-lg font-bold text-white font-mono uppercase">
            {status}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Intervalo de Polling:</span>
            <span className="font-mono text-emerald-400">10 segundos</span>
          </div>
        </div>

        {/* Evolution API Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Evolution API (WhatsApp)
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${isEvolutionOnline ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-amber-400'}`} />
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {isEvolutionOnline ? 'CONECTADO' : 'AGUARDANDO'}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Instância:</span>
            <span className="font-mono text-slate-200 truncate max-w-[130px]" title={health?.evolution?.instance || 'defesai'}>
              {health?.evolution?.instance || 'defesai'}
            </span>
          </div>
        </div>

        {/* Queue Buffer Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              Fila de Disparos (Queue)
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${isQueueHealthy ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-rose-400'}`} />
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {health?.queue?.pendingJobs ?? 0} <span className="text-xs text-slate-400 font-sans font-normal">jobs pendentes</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Política de Retries:</span>
            <span className="font-mono text-amber-400">Até 3 tentativas</span>
          </div>
        </div>
      </div>

      {/* 3. Database & System Architecture Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">PostgreSQL Supabase</div>
              <div className="text-[11px] text-slate-400">Tabelas marketing_leads, campaigns, queue</div>
            </div>
          </div>
          <div className="text-right">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {health?.database?.latencyMs ?? 12}ms
            </span>
          </div>
        </div>

        {/* Security & Cadence Rule */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Anti-Ban & Aquecimento</div>
              <div className="text-[11px] text-slate-400">Delays randômicos entre mensagens (48h min)</div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
            PROTEGIDO
          </span>
        </div>
      </div>

      {/* 4. Error Diagnostic & Audit Console */}
      {health?.lastError && (
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-sm font-bold text-white">Log de Exceção Operacional</h3>
          </div>
          <div className="p-3.5 bg-slate-950 rounded-xl border border-rose-500/20 font-mono text-xs text-rose-300">
            {health.lastError}
          </div>
          <p className="text-xs text-slate-400">
            Verifique as credenciais da Evolution API e a conectividade com o Supabase nas configurações do sistema.
          </p>
        </div>
      )}
    </div>
  );
};

