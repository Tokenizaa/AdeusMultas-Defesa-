import React, { useState } from 'react';
import { 
  PenLine, 
  MessageSquareWarning, 
  CheckCircle2, 
  CalendarClock, 
  TrendingUp, 
  CalendarDays,
  Plus,
  Sparkles,
  ExternalLink,
  Instagram,
  Facebook,
  Globe,
  Mail,
  Linkedin,
  Video,
  FileText,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { EditorialContentItem } from '../../../types';

type ContentStatus = EditorialContentItem['status'];

/**
 * ContentKanban — Centro operacional do fluxo de marketing.
 * Fluxo: rascunho → aprovado_qualidade → agendado → publicado.
 * Clique no card abre o Editor de Conteúdo / Criativo diretamente.
 * Drag & drop move o status de forma intuitiva.
 */
const COLUMNS: {
  id: ContentStatus;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  headerClass: string;
  badgeClass: string;
  dropClass: string;
}[] = [
  {
    id: 'rascunho',
    label: 'Rascunho / Em produção',
    sublabel: 'Geração e redação inicial',
    icon: PenLine,
    headerClass: 'bg-blue-50/80 border-blue-200 text-blue-900',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    dropClass: 'border-blue-300 bg-blue-50/30',
  },
  {
    id: 'aprovado_qualidade',
    label: 'Revisão / Aprovação',
    sublabel: 'Pronto para revisão humana',
    icon: MessageSquareWarning,
    headerClass: 'bg-amber-50/80 border-amber-200 text-amber-900',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    dropClass: 'border-amber-300 bg-amber-50/30',
  },
  {
    id: 'agendado',
    label: 'Agendado',
    sublabel: 'Programado no calendário',
    icon: CalendarClock,
    headerClass: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dropClass: 'border-emerald-300 bg-emerald-50/30',
  },
  {
    id: 'publicado',
    label: 'Publicado',
    sublabel: 'Distribuído nos canais',
    icon: TrendingUp,
    headerClass: 'bg-indigo-50/80 border-indigo-200 text-indigo-900',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    dropClass: 'border-indigo-300 bg-indigo-50/30',
  },
];

const CHANNEL_ICONS: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  instagram: { icon: Instagram, label: 'Instagram', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  facebook: { icon: Facebook, label: 'Facebook', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  blog: { icon: Globe, label: 'Blog SEO', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  email: { icon: Mail, label: 'E-mail', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  tiktok: { icon: Video, label: 'TikTok', color: 'bg-slate-900 text-white border-slate-700' },
};

interface ContentKanbanProps {
  contents: EditorialContentItem[];
  onMove: (id: string, status: ContentStatus) => void;
  onSelectContent?: (item: EditorialContentItem) => void;
  onCreateNew?: () => void;
}

export const ContentKanban: React.FC<ContentKanbanProps> = ({ 
  contents, 
  onMove,
  onSelectContent,
  onCreateNew 
}) => {
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
    <div className="space-y-4">
      {/* Top Action & Summary Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-[#155BCB] rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Kanban Editorial de Conteúdos</h3>
            <p className="text-xs text-slate-500">
              Clique em qualquer card para abrir o editor ou arraste para avançar de etapa no fluxo
            </p>
          </div>
        </div>

        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-[#155BCB] hover:bg-[#1149a4] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Criar Conteúdo</span>
          </button>
        )}
      </div>

      {/* Kanban Board Columns */}
      <div className="flex gap-4 overflow-x-auto pb-6 min-h-[60vh] scrollbar-thin">
        {COLUMNS.map((col) => {
          const items = contents
            .filter((c) => c.status === col.id)
            .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''));
          const Icon = col.icon;
          const isOver = overColumn === col.id;

          return (
            <div 
              key={col.id} 
              className="flex-1 min-w-[280px] max-w-[340px] flex flex-col rounded-xl bg-slate-50/60 border border-slate-200 overflow-hidden shadow-xs"
            >
              {/* Column Header */}
              <div className={`flex items-center justify-between px-3.5 py-3 border-b ${col.headerClass}`}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">{col.label}</h4>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${col.badgeClass}`}>
                  {items.length}
                </span>
              </div>

              {/* Column Body & Drop Target */}
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
                className={`flex-1 p-3 space-y-3 min-h-[260px] transition-all overflow-y-auto ${
                  isOver ? col.dropClass : 'bg-transparent'
                }`}
              >
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 p-4 text-center">
                    <p className="font-medium">Nenhum conteúdo nesta etapa</p>
                    <p className="text-[11px] text-slate-400 mt-1">Arraste um card para cá ou crie uma nova publicação</p>
                  </div>
                ) : (
                  items.map((item) => {
                    const channelInfo = CHANNEL_ICONS[item.channel?.toLowerCase()] || {
                      icon: Globe,
                      label: item.channel || 'Canal',
                      color: 'bg-slate-100 text-slate-700 border-slate-200',
                    };
                    const ChannelIcon = channelInfo.icon;
                    const hasImage = Boolean(item.imageUrl || item.mediaUrl);

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          setDragId(item.id);
                        }}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => onSelectContent && onSelectContent(item)}
                        className={`group relative p-3.5 bg-white border border-slate-200 rounded-xl hover:border-[#155BCB] hover:shadow-md transition-all cursor-pointer text-xs space-y-2.5 ${
                          dragId === item.id ? 'opacity-40 scale-95 border-dashed border-blue-400' : ''
                        }`}
                      >
                        {/* Card Image Thumbnail if available */}
                        {hasImage && (
                          <div className="relative w-full h-28 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
                            <img
                              src={item.imageUrl || item.mediaUrl || ''}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-white font-mono flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              <span>{item.format}</span>
                            </div>
                          </div>
                        )}

                        {/* Title & Format Info */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1 text-[11px]">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border ${channelInfo.color}`}>
                              <ChannelIcon className="w-3 h-3" />
                              {channelInfo.label}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase">
                              {item.format}
                            </span>
                          </div>

                          <h5 className="font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-[#155BCB] transition-colors">
                            {item.title}
                          </h5>

                          {item.legalTheme && (
                            <p className="text-slate-500 text-[11px] line-clamp-1 italic">
                              {item.legalTheme}
                            </p>
                          )}
                        </div>

                        {/* Footer & Badges */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <div className="flex items-center gap-1.5">
                            {item.authorAgent && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                                {item.authorAgent}
                              </span>
                            )}
                            {item.qualityReviewScore && (
                              <span className="text-emerald-700 font-bold text-[10px]">
                                ★ {item.qualityReviewScore}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-slate-500 font-medium">
                            <CalendarDays className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px]">
                              {item.scheduledDate ? item.scheduledDate.split(' ')[0] : 'Hoje'}
                            </span>
                          </div>
                        </div>

                        {/* Quick edit hover button */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 bg-[#155BCB] text-white p-1 rounded-md shadow-xs pointer-events-none">
                          <PenLine className="w-3 h-3" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};