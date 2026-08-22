import React from 'react';
import { TrendingUp, Users, Percent, CheckCircle2, CalendarClock } from 'lucide-react';
import { MarketingOverallMetrics } from '../hooks/use-marketing-service';

export const ResultsView: React.FC<{
  metrics: MarketingOverallMetrics | null;
  loading: boolean;
}> = ({ metrics, loading }) => {
  if (loading) return <p className="text-sm text-slate-500 font-mono">Coletando métricas...</p>;
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">Resultados do Organismo</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Alcance Mensal</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-black font-mono">
            {metrics ? (metrics.monthlyReach / 1000).toFixed(1) + 'k' : '—'}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Novos Casos</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-xl font-black font-mono">{metrics?.newCasesGenerated ?? '—'}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Conversão</span>
            <Percent className="w-4 h-4 text-violet-400" />
          </div>
          <div className="mt-2 text-xl font-black font-mono">
            {metrics ? metrics.conversionRate.toFixed(1) + '%' : '—'}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Publicados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-black font-mono">{metrics?.publishedPosts ?? '—'}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Agendados</span>
            <CalendarClock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-black font-mono">{metrics?.scheduledPosts ?? '—'}</div>
        </div>
      </div>
      {metrics && metrics.publishedPosts === 0 && (
        <p className="text-sm text-slate-400 font-mono">
          Sem publicações ainda — métricas reais aparecem quando o ciclo publicar conteúdo.
        </p>
      )}
    </div>
  );
};