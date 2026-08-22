import React, { useMemo, useState } from 'react';
import { Search, FileText, LayoutGrid, List, Eye } from 'lucide-react';
import { EditorialContentItem } from '../../../types';

/**
 * PublicationsView — biblioteca de conteúdos (versão estável anterior).
 * Filtros por status/canal/formato, busca, lista/cards, prévia do copy.
 */
type StatusFilter = 'all' | EditorialContentItem['status'];
type ViewMode = 'list' | 'cards';

const CHANNELS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos os canais' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'blog', label: 'Blog' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'E-mail' },
];

const FORMATS: { value: string; label: string }[] = [
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

export const PublicationsView: React.FC<{
  contents: EditorialContentItem[];
  loading: boolean;
  onSelect: (item: EditorialContentItem) => void;
}> = ({ contents, loading, onSelect }) => {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [channel, setChannel] = useState('all');
  const [format, setFormat] = useState('all');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

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
        if (q && !c.title.toLowerCase().includes(q) && !c.legalTheme.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
  }, [contents, filter, channel, format, query]);

  const filterTabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: `Todos (${counts.all})` },
    { id: 'rascunho', label: `Rascunho (${counts.rascunho})` },
    { id: 'aprovado_qualidade', label: `Aprovados (${counts.aprovado_qualidade})` },
    { id: 'agendado', label: `Agendados (${counts.agendado})` },
    { id: 'publicado', label: `Publicados (${counts.publicado})` },
  ];

  if (loading) return <p className="text-sm text-slate-500 font-mono">Carregando conteúdos...</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {filterTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer border ${
              filter === t.id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título ou tese jurídica..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
        >
          {CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
        >
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="Lista"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 ${viewMode === 'cards' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="Cards"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
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
                <tr
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="border-b border-slate-100 last:border-0 hover:bg-orange-50/30 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500 font-mono">Tese: {item.legalTheme}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 font-mono">
                    {item.channel} • {item.format}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_PILL[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
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
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-orange-500 transition-all cursor-pointer space-y-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold uppercase font-mono">
                  {item.channel} • {item.format}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_PILL[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 line-clamp-2 leading-snug">{item.title}</h4>
              <p className="text-slate-500 text-sm line-clamp-2">Tese: {item.legalTheme}</p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-sm text-slate-400 font-mono">
                <span>{item.scheduledDate}</span>
                <span className="text-emerald-700 font-semibold">{item.qualityReviewScore}/10</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};