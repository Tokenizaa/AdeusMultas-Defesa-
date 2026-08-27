import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings2,
  Play,
  Pause,
  Square,
  RefreshCw,
  Cpu,
  Database,
  Radio,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  Terminal,
  ShieldCheck,
  Server,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { useAuthFetch } from '../../../hooks/useAuthFetch';
import type { AutomationStatus, HealthResponse, AutomationStatusResponse } from '../types/prospecting';
import { ProspectingLayout } from './ProspectingLayout';

export const ProspectingAutomationPage: React.FC = () => {
  const authFetch = useAuthFetch();
  const [status, setStatus] = useState<AutomationStatus>('STOPPED');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());

  const fetchHealthAndStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const [resHealth, resStatus] = await Promise.allSettled([
        authFetch('/api/marketing/automation/health'),
        authFetch('/api/marketing/automation/status'),
      ]);

      if (resHealth.status === 'fulfilled' && resHealth.value.ok) {
        const hData = await resHealth.value.json();
        setHealth(hData);
      }

      if (resStatus.status === 'fulfilled' && resStatus.value.ok) {
        const sData: AutomationStatusResponse = await resStatus.value.json();
        if (sData?.status) {
          setStatus(sData.status);
        }
      }
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Erro ao carregar telemetria de automação:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchHealthAndStatus();
    const interval = setInterval(fetchHealthAndStatus, 6000);
    return () => clearInterval(interval);
  }, [fetchHealthAndStatus]);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      const res = await authFetch('/api/marketing/automation/start', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatus('RUNNING');
        await fetchHealthAndStatus();
      } else {
        alert(data.error || 'Falha ao iniciar motor de automação.');
      }
    } catch (err) {
      alert('Erro de conexão ao iniciar automação.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      const res = await authFetch('/api/marketing/automation/pause', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatus('PAUSED');
        await fetchHealthAndStatus();
      } else {
        alert(data.error || 'Falha ao pausar motor.');
      }
    } catch (err) {
      alert('Erro de conexão ao pausar automação.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      const res = await authFetch('/api/marketing/automation/stop', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatus('STOPPED');
        await fetchHealthAndStatus();
      } else {
        alert(data.error || 'Falha ao parar motor.');
      }
    } catch (err) {
      alert('Erro de conexão ao parar automação.');
    } finally {
      setActionLoading(false);
    }
  };

  const isRunning = status === 'RUNNING';
  const isPaused = status === 'PAUSED';

  // Subsystem status detection
  const isDbOnline = health?.database?.status === 'online';
  const isWorkerOnline = health?.worker?.status === 'running' || status === 'RUNNING';
  const isEvolutionOnline = health?.evolution?.status === 'online' || health?.evolution?.status === 'open';

  return (
    <ProspectingLayout
      activeTab="automation"
      status={status}
      onRefresh={fetchHealthAndStatus}
      isRefreshing={isLoading}
    >
      <div className="space-y-6">
        {/* 1. Main Master Switch Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Painel de Controle Central
              </span>
              <span className="text-xs text-slate-500 font-mono">• Sincronizado às {lastSyncTime}</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">
              Motor de Execução Autônoma de Disparos
            </h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Quando ativo, o worker avalia a fila a cada 10 segundos, consulta a cadência de cada lead e realiza envios via WhatsApp Evolution API respeitando intervalos e limites operacionais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Start Button */}
            <button
              onClick={handleStart}
              disabled={isRunning || actionLoading}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                isRunning
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 opacity-60 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-emerald-500/20'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>{isRunning ? 'Em Execução' : 'Iniciar Motor'}</span>
            </button>

            {/* Pause Button */}
            <button
              onClick={handlePause}
              disabled={!isRunning || actionLoading}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                isPaused
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              <Pause className="w-4 h-4" />
              <span>{isPaused ? 'Pausado' : 'Pausar Motor'}</span>
            </button>

            {/* Stop Button */}
            <button
              onClick={handleStop}
              disabled={status === 'STOPPED' || actionLoading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-rose-500/20 active:bg-rose-500/30 text-slate-200 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Square className="w-4 h-4" />
              <span>Parar</span>
            </button>
          </div>
        </div>

        {/* 2. Subsystem Health Diagnostics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Worker Subsystem */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Worker Autônomo</h3>
                  <span className="text-[11px] text-slate-400 font-mono">Loop de Processamento</span>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                  isWorkerOnline
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {isWorkerOnline ? 'ONLINE' : 'PARADO'}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>Ciclo Poll:</span>
                <span className="text-white">10 segundos</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Jobs Processados:</span>
                <span className="text-emerald-400 font-bold">{health?.worker?.processedCount || 0}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Última Execução:</span>
                <span className="text-white text-[11px]">
                  {health?.worker?.lastProcessedAt
                    ? new Date(health.worker.lastProcessedAt).toLocaleTimeString()
                    : 'Aguardando'}
                </span>
              </div>
            </div>
          </div>

          {/* WhatsApp Evolution API Subsystem */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Evolution API</h3>
                  <span className="text-[11px] text-slate-400 font-mono">WhatsApp Gateway</span>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                  isEvolutionOnline
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                {isEvolutionOnline ? 'CONECTADO' : 'STANDBY'}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>Instância:</span>
                <span className="text-white font-bold">{health?.evolution?.instance || 'defesai'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Telefone Conectado:</span>
                <span className="text-emerald-400 font-bold">
                  {health?.evolution?.phone || 'Instância Configurada'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Protocolo:</span>
                <span className="text-white text-[11px]">HTTP REST + Webhook</span>
              </div>
            </div>
          </div>

          {/* Database Subsystem */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">PostgreSQL & Fila</h3>
                  <span className="text-[11px] text-slate-400 font-mono">Supabase Realtime</span>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                  isDbOnline
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {isDbOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>Latência DB:</span>
                <span className="text-emerald-400 font-bold">{health?.database?.latencyMs || 12}ms</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Fila Pendente:</span>
                <span className="text-white font-bold">{health?.queue?.pendingJobs || 0} jobs</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Persistência:</span>
                <span className="text-white text-[11px]">Transacional RLS</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Safety Guardrails & Governance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
            <span>Políticas de Segurança e Proteção Antiban do WhatsApp</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-1.5">
              <span className="font-bold text-emerald-400 font-mono">1. Delay Randômico</span>
              <p className="text-slate-400 leading-relaxed">
                Cada envio na fila aplica um intervalo randômico de 15 a 45 segundos entre mensagens para evitar identificação de padrão robótico pela Meta.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-1.5">
              <span className="font-bold text-orange-400 font-mono">2. Variáveis Dinâmicas</span>
              <p className="text-slate-400 leading-relaxed">
                O corpo da mensagem interpola <code className="text-slate-300 font-mono">{'{nome}'}</code>, <code className="text-slate-300 font-mono">{'{cidade}'}</code> e o segmento para gerar textos únicos a cada disparo.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-1.5">
              <span className="font-bold text-blue-400 font-mono">3. Limite de Tentativas (Backoff)</span>
              <p className="text-slate-400 leading-relaxed">
                Falhas de conexão aplicam retry com backoff exponencial até 3 tentativas. Se o número for inválido, o lead é marcado como esgotado sem travar a campanha.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProspectingLayout>
  );
};
