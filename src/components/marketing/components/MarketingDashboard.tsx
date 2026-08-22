import React from 'react';
import { Bot, CheckCircle2 } from 'lucide-react';
import { MarketingAgentState } from '../../../types';
import { ExceptionAlert } from './ExceptionAlert';
import { MarketingOverallMetrics, PublisherQueueItem } from '../hooks/use-marketing-service';

export const MarketingDashboard: React.FC<{
  agents: MarketingAgentState[];
  metrics: MarketingOverallMetrics | null;
  cycleCount: number;
  lastCycleAt: string | null;
  publisherQueue: PublisherQueueItem[];
  scheduledPosts: number;
  metaConnected: boolean;
  onVerifyChannel: () => void;
  onOpenStudio?: () => void;
}> = ({ agents, metrics, cycleCount, lastCycleAt, publisherQueue, scheduledPosts, metaConnected, onVerifyChannel, onOpenStudio }) => {
  const activeAgents = agents.filter((a) => a.status === 'running').length;
  const inAlert = agents.filter((a) => a.status === 'alert').length;

return (
    <div className="space-y-4">
      {/* AI Studio & 7-Day Campaign Quick Launcher */}
      {onOpenStudio && (
        <div className="p-4 bg-gradient-to-r from-[#071D41] via-[#0C326F] to-[#155BCB] rounded-xl text-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-900/60 text-[#FFCD07] text-sm font-bold uppercase tracking-wider">
              <span>Novas Ferramentas de IA Generativa</span>
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Gerador de Imagens HD (1K, 2K, 4K) & Animação de Vídeos Veo 3.1
            </h3>
            <p className="text-sm text-blue-100 max-w-xl">
              Crie peças visuais em alta resolução para seus recursos e gere campanhas completas de 7 dias de postagens automaticamente.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenStudio}
            className="px-4 py-2.5 bg-[#FFCD07] hover:bg-[#F5A623] text-[#071D41] font-bold rounded-lg text-sm transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
            aria-label="Abrir Estúdio IA e gerar posts"
          >
            <span>Abrir Estúdio IA & Gerar Posts</span>
          </button>
        </div>
      )}
      {/* Supervisão: estado real do organismo */}
      <div className="flex flex-wrap items-center gap-3 text-sm font-mono">
        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {activeAgents}/{agents.length} agentes ativos
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
          Ciclos: {cycleCount}
        </span>
        {lastCycleAt && (
          <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-500">
            Último ciclo: {new Date(lastCycleAt).toLocaleString('pt-BR')}
          </span>
        )}
        {inAlert > 0 ? (
          <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">⚠ {inAlert} em alerta</span>
        ) : (
          <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-400">Sem alertas</span>
        )}
      </div>

      {/* Exceções — só aparecem quando existem (4.8) */}
      <ExceptionAlert
        agents={agents}
        publisherQueue={publisherQueue}
        metrics={metrics}
        scheduledPosts={scheduledPosts}
        metaConnected={metaConnected}
        onRetry={onVerifyChannel}
      />

      {/* KPIs resumidos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
          <span className="text-slate-400 text-sm font-medium block">Alcance Mensal</span>
          <span className="text-xl font-black font-mono mt-1 block">
            {metrics ? (metrics.monthlyReach / 1000).toFixed(1) + 'k' : '—'}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
          <span className="text-slate-400 text-sm font-medium block">Novos Casos</span>
          <span className="text-xl font-black font-mono mt-1 block">{metrics?.newCasesGenerated ?? '—'}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
          <span className="text-slate-400 text-sm font-medium block">Conversão</span>
          <span className="text-xl font-black font-mono mt-1 block">
            {metrics ? metrics.conversionRate.toFixed(1) + '%' : '—'}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
          <span className="text-slate-400 text-sm font-medium block">Publicados</span>
          <span className="text-xl font-black font-mono mt-1 block">
            {metrics?.publishedPosts ?? '—'}
            <span className="text-sm text-slate-400"> / {metrics?.scheduledPosts ?? 0} agendados</span>
          </span>
        </div>
      </div>

      <p className="text-sm text-slate-400 font-mono flex items-center gap-1">
        <Bot className="w-3 h-3" />
        Organismo autônomo — nenhuma intervenção manual necessária. Exceções reais aparecem acima.
      </p>
    </div>
  );
};