import React, { useState } from 'react';
import { PenLine, MessageSquareWarning, CheckCircle2, CalendarClock, TrendingUp, CalendarDays } from 'lucide-react';
import { EditorialContentItem } from '../../../types';

type ContentStatus = EditorialContentItem['status'];

/**
 * ContentKanban — inspirado no módulo v1 (DefesAi).
 * Fluxo: rascunho → aprovado_qualidade → agendado → publicado.
 * Drag & drop move o status (intervenção manual explícita, persistida via PUT).
 */
const COLUMNS: {
  id: ContentStatus;
  label: string;
  icon: React.ElementType;
  headerClass: string;
}[] = [
  {
    id: 'rascunho',
    label: 'Em produção',
    icon: PenLine,
    headerClass: 'bg-blue-50 border-blue-100 text-blue-800',
  },
  {
    id: 'aprovado_qualidade',
    label: 'Aguardando aprovação',
    icon: MessageSquareWarning,
    headerClass: 'bg-amber-50 border-amber-100 text-amber-800',
  },
  {
    id: 'agendado',
    label: 'Agendado',
    icon: CalendarClock,
    headerClass: 'bg-emerald-50 border-emerald-100 text-emerald-800',
  },
  {
    id: 'publicado',
    label: 'Publicado',
    icon: TrendingUp,
    headerClass: 'bg-indigo-50 border-indigo-100 text-indigo-800',
  },
];

const STATUS_LABEL: Record<ContentStatus, string> = {
  rascunho: 'Rascunho',
  aprovado_qualidade: 'Aprovado Qualidade',
  agendado: 'Agendado',
  publicado: 'Publicado',
};

const STATUS_PILL: Record<ContentStatus, string> = {
  rascunho: 'bg-slate-100 text-slate-700',
  aprovado_qualidade: 'bg-amber-50 text-amber-700 border border-amber-200',
  agendado: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  publicado: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
};

interface ContentKanbanProps {
  contents: EditorialContentItem[];
  onMove: (id: string, status: ContentStatus) => void;
}

export const ContentKanban: React.FC<ContentKanbanProps> = ({ contents, onMove }) => {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ContentStatus | null>(null);

  const handleDrop = (target: ContentStatus) => {
    setOverColumn(null);
    if (!dragId) return;
    const item = contents.find((c) => c.id === dragId);
    if (item && item.status !== target) onMove(dragId, target);
    setDragId(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 min-h-[55vh]">
      {COLUMNS.map((col) => {
        const items = contents
          .filter((c) => c.status === col.id)
          .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
        const Icon = col.icon;
        return (
          <div key={col.id} className="flex-1 min-w-[270px] max-w-[340px] flex flex-col">
            <div className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-t-xl border ${col.headerClass}`}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <h3 className="text-sm font-bold">{col.label}</h3>
              </div>
              <span className="px-2 py-0.5 text-sm font-bold bg-white/70 text-slate-600 rounded-full border border-slate-200">
                {items.length}
              </span>
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setOverColumn(col.id);
              }}
              onDragLeave={() => setOverColumn((c) => (c === col.id ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(col.id);
              }}
              className={`flex-1 p-3 space-y-3 border-x border-b rounded-b-xl min-h-[200px] transition-colors ${
                overColumn === col.id ? 'bg-orange-50' : 'bg-slate-50'
              }`}
            >
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-slate-400 py-8">
                  Arraste itens aqui
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDragId(item.id)}
                    onDragEnd={() => setDragId(null)}
                    className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing text-sm space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
                        <CalendarDays className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 line-clamp-2 leading-snug">{item.title}</h4>
                        <p className="text-slate-500 text-sm mt-0.5 font-mono">
                          {item.channel} • {item.format}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_PILL[item.status]}`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-mono">
                        qualidade {item.qualityReviewScore}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-400 font-mono">
                      <span>{item.scheduledDate}</span>
                      <span>~{item.estimatedReach.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};