import React, { useMemo } from 'react';
import {
  Clock, CheckCircle2, AlertCircle, RefreshCw, Facebook, Instagram, Globe,
  MessageCircle, Mail, CalendarClock, TrendingUp, Lightbulb,
} from 'lucide-react';
import { EditorialContentItem } from '../../../types';
import { PublisherJobRecord, PublisherQueueItem, MarketingOverallMetrics } from '../hooks/use-marketing-service';
import { MetaAccountState } from '../../../types';

/**
 * AutomationsView — automação real (inspirada no admin.automation v1, sem mocks).
 * Tudo deriva de estado verdadeiro: fila MetaPublisher, histórico de jobs,
 * canais conectados e métricas coletadas.
 */
const JOB_STATUS: Record<PublisherJobRecord['status'], { label: string; dot: string; icon: React.ElementType }> = {
  delivered: { label: 'Entregue', dot: 'bg-emerald-500', icon: CheckCircle2 },
  retrying: { label: 'Fila', dot: 'bg-amber-500', icon: Clock },
  failed: { label: 'Falhou', dot: 'bg-rose-500', icon: AlertCircle },
  rejected: { label: 'Rejeitada', dot: 'bg-red-500', icon: AlertCircle },
};

export const AutomationsView: React.FC<{
  publisherQueue: PublisherQueueItem[];
  publisherJobs: PublisherJobRecord[];
  contents: EditorialContentItem[];
  metrics: MarketingOverallMetrics | null;
  metaState: MetaAccountState | null;
  cycleCount: number;
}> = ({ publisherQueue, publisherJobs, contents, metrics, metaState, cycleCount }) => {
  const queueStats = useMemo(() => {
    const active = publisherQueue.filter((q) => q.attempts === 0).length;
    const retrying = publisherQueue.filter((q) => q.attempts >= 1).length;
    const delivered = publisherJobs.filter((j) => j.status === 'delivered').length;
    const failed = publisherJobs.filter((j) => j.status === 'failed').length;
    return { active, retrying, delivered, failed };
  }, [publisherQueue, publisherJobs]);

  const channels = useMemo(() => {
    const connected = metaState?.isConnected ?? false;
    return [
      { channel: 'Instagram', status: connected ? 'connected' : 'disconnected', detail: connected ? 'Graph API v20.0' : 'Não conectado', icon: Instagram },
      { channel: 'Facebook', status: connected ? 'connected' : 'disconnected', detail: connected ? 'Graph API v20.0' : 'Não conectado', icon: Facebook },
      { channel: 'Blog', status: contents.length > 0 ? 'connected' : 'disconnected', detail: `${contents.length} conteúdos`, icon: Globe },
      { channel: 'WhatsApp', status: 'disconnected', detail: 'Não configurado neste servidor', icon: MessageCircle },
      { channel: 'E-mail', status: 'disconnected', detail: 'Não configurado neste servidor', icon: Mail },
    ];
  }, [metaState, contents]);

  const recentJobs = useMemo(() => {
    const jobs: { id: string; channel: string; title: string; status: PublisherJobRecord['status']; scheduledAt: string }[] =
      publisherJobs.map((j) => ({
        id: j.id,
        channel: j.channel,
        title: contents.find((c) => c.id === j.contentId)?.title ?? 'Publicação',
        status: j.status,
        scheduledAt: j.resolvedAt ?? j.createdAt,
      }));
    // Conteúdos publicados/agendados sem job em memória (estado persistido) completam o histórico
    [...contents]
      .filter((c) => c.status === 'publicado' || c.status === 'agendado')
      .forEach((c) => {
        const exists = jobs.some((j) => j.id === c.id || j.title === c.title);
        if (!exists) {
          jobs.push({
            id: c.id,
            channel: c.channel,
            title: c.title,
            status: c.status === 'publicado' ? 'delivered' : 'retrying',
            scheduledAt: c.scheduledDate,
          });
        }
      });
    return jobs.slice(0, 10);
  }, [publisherJobs, contents]);

  const insights = useMemo(() => {
    const list: string[] = [];
    const byChannel: Record<string, number> = {};
    contents.forEach((c) => {
      if (c.status === 'publicado') byChannel[c.channel] = (byChannel[c.channel] ?? 0) + 1;
    });
    const top = Object.entries(byChannel).sort((a, b) => b[1] - a[1])[0];
    if (top) list.push(`📊 Canal com mais publicações: ${top[0]} (${top[1]}).`);
    const avgQuality = contents.length
      ? (contents.reduce((s, c) => s + c.qualityReviewScore, 0) / contents.length).toFixed(1)
      : null;
    if (avgQuality) list.push(`📋 Qualidade média dos conteúdos: ${avgQuality}/10.`);
    if (metrics && metrics.conversionRate > 0) list.push(`⏰ Conversão atual: ${metrics.conversionRate.toFixed(1)}%.`);
    if (metrics && metrics.publishedPosts === 0) list.push('🚀 Nenhuma publicação: o ciclo autônomo ainda não entregou conteúdo.');
    if (list.length === 0) list.push('ℹ️ Insights aparecerão após o primeiro ciclo completo.');
    return list;
  }, [contents, metrics]);

  return (
    <div className="space-y-5">
      {/* Fila de automação */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Na fila', value: queueStats.active, icon: Clock, cls: 'text-amber-600 bg-amber-50' },
          { label: 'Em retry', value: queueStats.retrying, icon: RefreshCw, cls: 'text-orange-600 bg-orange-50' },
          { label: 'Entregues', value: queueStats.delivered, icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50' },
          { label: 'Falhas', value: queueStats.failed, icon: AlertCircle, cls: 'text-rose-600 bg-rose-50' },
          { label: 'Ciclos rodados', value: cycleCount, icon: CalendarClock, cls: 'text-blue-600 bg-blue-50' },
        ].map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 font-medium">{label}</span>
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${cls}`}>
                <Icon className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-1.5 text-xl font-black font-mono text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Canais conectados */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono mb-2.5">Canais de Publicação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {channels.map(({ channel, status, detail, icon: Icon }) => (
            <div key={channel} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center gap-3">
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${status === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  {channel}
                  <span className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </p>
                <p className="text-sm text-slate-500 font-mono truncate">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Jobs recentes */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono mb-2.5">Execuções Recentes</h3>
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {recentJobs.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">Nenhuma execução ainda — o ciclo autônomo vai preencher.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50 text-sm uppercase font-mono text-slate-500">
                  <th className="px-3 py-2.5">Execução</th>
                  <th className="px-3 py-2.5">Canal</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Quando</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => {
                  const st = JOB_STATUS[job.status];
                  const Icon = st.icon;
                  return (
                    <tr key={job.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2.5 font-semibold text-slate-900">{job.title}</td>
                      <td className="px-3 py-2.5 text-slate-600 font-mono">{job.channel}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {job.status === 'retrying' && <RefreshCw className="w-3 h-3 text-amber-500" />}
                          <Icon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 font-mono text-sm">
                        {new Date(job.scheduledAt).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Insights reais */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono mb-2.5 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Insights Automáticos
        </h3>
        <div className="space-y-2">
          {insights.map((line) => (
            <p key={line} className="p-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-mono">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};