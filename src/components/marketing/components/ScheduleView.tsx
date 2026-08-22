import React from 'react';
import { CalendarClock, RefreshCw } from 'lucide-react';
import { EditorialContentItem } from '../../../types';
import { PublisherQueueItem } from '../hooks/use-marketing-service';

/**
 * ScheduleView — agendamento e fila de publicação (estilo v1 "Agendamento").
 * Estado real da MetaPublisher + conteúdos agendados.
 */
export const ScheduleView: React.FC<{
  contents: EditorialContentItem[];
  publisherQueue: PublisherQueueItem[];
  cycleCount: number;
  lastCycleAt: string | null;
}> = ({ contents, publisherQueue, cycleCount, lastCycleAt }) => {
  const scheduled = contents
    .filter((c) => c.status === 'agendado')
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const inRetry = publisherQueue.filter((q) => q.attempts >= 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
          <CalendarClock className="w-3.5 h-3.5 text-slate-600" />
          Fila de Publicação (MetaPublisher)
        </h3>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2 text-sm">
          <div className="flex justify-between text-sm text-slate-500 font-mono">
            <span>Total na fila: {publisherQueue.length}</span>
            <span>Ciclos: {cycleCount}</span>
          </div>
          {lastCycleAt && (
            <p className="text-sm text-slate-400 font-mono">
              Último ciclo: {new Date(lastCycleAt).toLocaleString('pt-BR')}
            </p>
          )}
          {publisherQueue.length === 0 ? (
            <p className="text-sm text-slate-400 py-3 text-center">Nenhuma publicação pendente na fila.</p>
          ) : (
            <div className="space-y-1.5">
              {publisherQueue.map((q) => {
                const retrying = q.attempts >= 1;
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <span className="font-mono text-sm text-slate-700">{q.id}</span>
                    <span className="flex items-center gap-1 text-sm font-mono">
                      {retrying && <RefreshCw className="w-3 h-3 text-amber-500" />}
                      <span className={retrying ? 'text-amber-700' : 'text-slate-500'}>
                        {q.destination} • tentativa {q.attempts}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {inRetry.length > 0 && (
            <p className="text-sm text-amber-700 font-mono">
              ⚠ {inRetry.length} em retry — entrega automática no próximo ciclo.
            </p>
          )}
        </div>
      </div>

      <div className="lg:col-span-7 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
          Agendados ({scheduled.length})
        </h3>
        {scheduled.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white border border-dashed border-slate-300 rounded-xl">
            <p className="text-sm">Nada agendado. O ciclo autônomo agenda conforme aprova.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scheduled.map((c) => (
              <div key={c.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{c.title}</span>
                  <span className="text-sm font-bold font-mono text-emerald-700">{c.scheduledDate}</span>
                </div>
                <p className="text-slate-500 text-sm mt-1 font-mono">
                  {c.channel} • {c.format} • qualidade {c.qualityReviewScore}/10
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};