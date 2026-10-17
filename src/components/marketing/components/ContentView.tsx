import React, { useState, useMemo } from 'react';
import {
  PenLine, MessageSquareWarning, CalendarClock, TrendingUp, Plus,
  Search, LayoutGrid, List, Eye, ImageIcon, CalendarDays,
  Instagram, Facebook, Globe, Mail, Linkedin, Video, FileText, Layers,
} from 'lucide-react';
import { EditorialContentItem } from '../../../types';

type ContentStatus = EditorialContentItem['status'];
type ViewMode = 'list' | 'cards';

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
    id: 'reprovado_qualidade',
    label: 'Reprovado',
    sublabel: 'Bloqueado pelo gate de qualidade',
    icon: MessageSquareWarning,
    headerClass: 'bg-red-50/80 border-red-200 text-red-900',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
    dropClass: 'border-red-300 bg-red-50/30',
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
  reprovado_qualidade: 'Reprovado',
  agendado: 'Agendado',
  publicado: 'Publicado',
};

const STATUS_PILL: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-700',
  aprovado_qualidade: 'bg-amber-50 text-amber-700 border border-amber-200',
  reprovado_qualidade: 'bg-red-50 text-red-700 border border-red-200',
  agendado: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  publicado: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
};

export const ContentView: React.FC<{
  contents: EditorialContentItem[];
  loading: boolean;
  onSelectContent?: (item: EditorialContentItem) => void;
  onCreateNew?: () => void;
  defaultViewMode?: ViewMode;
}> = ({
  contents,
  loading,
  onSelectContent,
  onCreateNew,
  defaultViewMode = 'list',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [filter, setFilter] = useState<string>('all');
  const [channel, setChannel] = useState('all');
  const [format, setFormat] = useState('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(
    () => ({
      all: contents.length,
      rascunho: contents.filter((c) => c.status === 'rascunho').length,
      aprovado_qualidade: contents.filter((c) => c.status === 'aprovado_qualidade').length,
      reprovado_qualidade: contents.filter((c) => c.status === 'reprovado_qualidade').length,
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

  const renderList = () => (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { id: 'all', label: `Todos (${counts.all})` },
          { id: 'rascunho', label: `Rascunho (${counts.rascunho})` },
          { id: 'aprovado_qualidade', label: `Aprovados (${counts.aprovado_qualidade})` },
          { id: 'reprovado_qualidade', label: `Reprovados (${counts.reprovado_qualidade})` },
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
            <p className="text-xs text-slate-500">Conteúdos preparados e materiais reutilizáveis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
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

      {loading ? <p className="text-sm text-slate-500 font-mono">Carregando conteúdos...</p> : renderList()}
    </div>
  );
};