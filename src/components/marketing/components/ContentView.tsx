import React, { useState, useMemo } from 'react';
import {
  PenLine, MessageSquareWarning, CalendarClock, TrendingUp, Plus,
  Search, LayoutGrid, List, Eye, ImageIcon, CalendarDays,
  Instagram, Facebook, Globe, Mail, Linkedin, Video, FileText, Layers,
} from 'lucide-react';
import { EditorialContentItem } from '../../../types';

type ContentStatus = EditorialContentItem['status'];
type ViewMode = 'list' | 'cards' | 'kanban';

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

const CHANNELS = [
  { value: 'all', label: 'Todos os canais' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'blog', label: 'Blog' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'E-mail' },
];

const FORMATS = [
  { value: 'all', label: 'Todos os formatos' },
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'artigo_seo', label: 'Artigo SEO' },
  { value: 'reels_roteiro', label: 'Reels' },
  { value: 'infografico', label: 'Infográfico' },
  { value: 'newsletter', label: 'Newsletter' },
];

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  aprovado_qualidade: 'Aprovado',
  agendado: 'Agendado',
  publicado: 'Publicado',
};

const STATUS_PILL: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-700',
  aprovado_qualidade: 'bg-amber-50 text-amber-700 border border-amber-200',
  agendado: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  publicado: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
};

export const ContentView: React.FC<{
  contents: EditorialContentItem[];
  loading: boolean;
  onMove: (id: string, status: ContentStatus) => void;
  onSelectContent?: (item: EditorialContentItem) => void;
  onCreateNew?: () => void;
  defaultViewMode?: ViewMode;
}> = ({
  contents,
  loading,
  onMove,
  onSelectContent,
  onCreateNew,
  defaultViewMode = 'kanban',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [filter, setFilter] = useState<string>('all');
  const [channel, setChannel] = useState('all');
  const [format, setFormat] = useState('all');
  const [query, setQuery] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ContentStatus | null>(null);

  const counts = useMemo(
    () => ({
      all: contents.length,
      rascunho: contents.filter((c) => c.status === 'rascunho').length,
      aprovado_qualidade: contents.filter((c) => c.status === 'aprovado_qualidade').length,
      agendado: contents.filter((c) => c.status === 'agendado').length,
      publicado: contents.filter((c) => c.status === 'publicado').length,
    }),
    [contents],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return contents
      .filter((c) => {
        if (filter !== 'all' && c.status !== filter) return false;
        if (channel !== 'all' && c.channel !== channel) return false;
        if (format !== 'all' && c.format !== format) return false;
        if (q && !c.title.toLowerCase().includes(q) && !(c.legalTheme || '').toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (b.scheduledDate || '').localeCompare(a.scheduledDate || ''));
  }, [contents, filter, channel, format, query]);

  const handleDrop = (target: ContentStatus) => {
    setOverColumn(null);
    if (!dragId) return;
    const item = contents.find((c) => c.id === dragId);
    if (item && item.status !== target) onMove(dragId, target);
    setDragId(null);
  };

  const renderKanban = () => (
    <div className="flex gap-4 overflow-x-auto pb-6 min-h-[60vh] scrollbar-thin">
      {COLUMNS.map((col) => {
        const items = filtered
          .filter((c) => c.status === col.id)
          .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''));
        const Icon = col.icon;
        const isOver = overColumn === col.id;

        return (
          <div
            key={col.id}
            className="flex-1 min-w-[280px] max-w-[340px] flex flex-col rounded-xl bg-slate-50/60 border border-slate-200 overflow-hidden shadow-xs"
          >
            <div className={`flex items-center justify-between px-3.5 py-3 border-b ${col.headerClass}`}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">{col.label}</h4>
                  <p className="text-[10px] opacity-75">{col.sublabel}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${col.badgeClass}`}>
                {items.length}
              </span>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setOverColumn(col.id); }}
              onDragLeave={() => setOverColumn((c) => (c === col.id ? null : c))}
              onDrop={(e) => { e.preventDefault(); handleDrop(col.id); }}
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
                    icon: Globe, label: item.channel || 'Canal', color: 'bg-slate-100 text-slate-700 border-slate-200',
                  };
                  const ChannelIcon = channelInfo.icon;
                  const hasImage = Boolean(item.imageUrl || item.mediaUrl);

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); setDragId(item.id); }}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => onSelectContent && onSelectContent(item)}
                      className={`group relative p-3.5 bg-white border border-slate-200 rounded-xl hover:border-[#155BCB] hover:shadow-md transition-all cursor-pointer text-xs space-y-2.5 ${
                        dragId === item.id ? 'opacity-40 scale-95 border-dashed border-blue-400' : ''
                      }`}
                    >
                      {hasImage && (
                        <div className="relative w-full h-28 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
                          <img src={item.imageUrl || item.mediaUrl || ''} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-white font-mono flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /><span>{item.format}</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border ${channelInfo.color}`}>
                            <ChannelIcon className="w-3 h-3" />{channelInfo.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">{item.format}</span>
                        </div>
                        <h5 className="font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-[#155BCB] transition-colors">{item.title}</h5>
                        {item.legalTheme && (
                          <p className="text-slate-500 text-[11px] line-clamp-1 italic">{item.legalTheme}</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <div className="flex items-center gap-1.5">
                          {item.authorAgent && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">{item.authorAgent}</span>}
                          {item.qualityReviewScore && <span className="text-emerald-700 font-bold text-[10px]">★ {item.qualityReviewScore}</span>}
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 font-medium">
                          <CalendarDays className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px]">{item.scheduledDate ? item.scheduledDate.split(' ')[0] : 'Hoje'}</span>
                        </div>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 bg-[#155BCB] text-white p-1 rounded-md shadow-xs pointer-events-none">
                        <Eye className="w-3 h-3" />
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
  );

  const renderList = () => (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { id: 'all', label: `Todos (${counts.all})` },
          { id: 'rascunho', label: `Rascunho (${counts.rascunho})` },
          { id: 'aprovado_qualidade', label: `Aprovados (${counts.aprovado_qualidade})` },
          { id: 'agendado', label: `Agendados (${counts.agendado})` },
          { id: 'publicado', label: `Publicados (${counts.publicado})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer border ${
              filter === t.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Buscar por título ou tese jurídica..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <select value={channel} onChange={(e) => setChannel(e.target.value)} className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500">
          {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={format} onChange={(e) => setFormat(e.target.value)} className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500">
          {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
          <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:text-slate-600'}`} title="Lista"><List className="w-3.5 h-3.5" /></button>
          <button onClick={() => setViewMode('cards')} className={`p-2 ${viewMode === 'cards' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:text-slate-600'}`} title="Cards"><LayoutGrid className="w-3.5 h-3.5" /></button>
          <button onClick={() => setViewMode('kanban')} className={`p-2 ${viewMode === 'kanban' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Kanban"><Layers className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center text-slate-400 bg-white border border-dashed border-slate-300 rounded-xl">
          <FileText className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
          <p className="text-sm">Nenhum conteúdo encontrado para estes filtros.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 bg-slate-50 text-sm uppercase font-mono text-slate-500">
                <th className="px-3 py-2.5">Título</th>
                <th className="px-3 py-2.5">Canal / Formato</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Agendado</th>
                <th className="px-3 py-2.5">Qualidade</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} onClick={() => onSelectContent && onSelectContent(item)} className="border-b border-slate-100 last:border-0 hover:bg-orange-50/30 cursor-pointer transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500 font-mono">Tese: {item.legalTheme}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 font-mono">{item.channel} • {item.format}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_PILL[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 font-mono">{item.scheduledDate}</td>
                  <td className="px-3 py-2.5 font-mono text-emerald-700">{item.qualityReviewScore}/10</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => {
            const channelInfo = CHANNEL_ICONS[item.channel?.toLowerCase()] || {
              icon: Globe, label: item.channel || 'Canal', color: 'bg-slate-100 text-slate-700 border-slate-200',
            };
            return (
              <div
                key={item.id}
                onClick={() => onSelectContent && onSelectContent(item)}
                className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-orange-500 transition-all cursor-pointer space-y-2 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold uppercase font-mono`}>
                    {channelInfo.label} • {item.format}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_PILL[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                </div>
                <h4 className="font-bold text-slate-900 line-clamp-2 leading-snug">{item.title}</h4>
                {item.imageUrl && (
                  <div className="rounded-lg overflow-hidden h-32 bg-slate-100 border border-slate-100">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
                <p className="text-slate-500 text-sm line-clamp-2">Tese: {item.legalTheme}</p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-sm text-slate-400 font-mono">
                  <span>{item.scheduledDate}</span>
                  <span className="text-emerald-700 font-semibold">{item.qualityReviewScore}/10</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-[#155BCB] rounded-lg"><Layers className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Conteúdo</h3>
            <p className="text-xs text-slate-500">Kanban editorial e biblioteca de conteúdos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
            <button onClick={() => setViewMode('kanban')} className={`p-2 ${viewMode === 'kanban' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Kanban"><Layers className="w-3.5 h-3.5" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:text-slate-600'}`} title="Lista"><List className="w-3.5 h-3.5" /></button>
            <button onClick={() => setViewMode('cards')} className={`p-2 ${viewMode === 'cards' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:text-slate-600'}`} title="Cards"><LayoutGrid className="w-3.5 h-3.5" /></button>
          </div>
          {onCreateNew && (
            <button onClick={onCreateNew} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-[#155BCB] hover:bg-[#1149a4] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer">
              <Plus className="w-4 h-4" /><span>+ Criar Conteúdo</span>
            </button>
          )}
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-500 font-mono">Carregando conteúdos...</p> : viewMode === 'kanban' ? renderKanban() : renderList()}
    </div>
  );
};