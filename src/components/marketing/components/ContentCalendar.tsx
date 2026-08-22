import React from 'react';
import { Calendar, Eye } from 'lucide-react';
import { EditorialContentItem } from '../../../types';

export const ContentCalendar: React.FC<{
  contents: EditorialContentItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (item: EditorialContentItem) => void;
}> = ({ contents, loading, selectedId, onSelect }) => {
  if (loading) return <p className="text-sm text-slate-500 font-mono">Carregando conteúdos...</p>;
  if (contents.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 bg-white border border-dashed border-slate-300 rounded-xl">
        <p className="text-sm">Nenhum conteúdo produzido ainda. O ciclo autônomo vai gerar pautas ao longo do dia.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
        <Calendar className="w-3.5 h-3.5 text-slate-600" />
        Grade de Conteúdos Produzidos pelos Agentes
      </h3>
      <div className="space-y-2">
        {contents.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer text-sm ${
              selectedId === item.id
                ? 'border-orange-500 bg-orange-50/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-400 bg-white shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-1.5 py-0.2 rounded text-sm font-bold bg-slate-100 text-slate-800 uppercase font-mono">
                {item.channel} • {item.format}
              </span>
              <span
                className={`text-sm font-bold font-mono ${
                  item.status === 'publicado'
                    ? 'text-emerald-700'
                    : item.status === 'agendado'
                    ? 'text-blue-700'
                    : 'text-slate-500'
                }`}
              >
                {item.status}
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm mt-1">{item.title}</h4>
            <p className="text-slate-500 text-sm mt-0.5">Tese: {item.legalTheme}</p>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-400 font-mono">
              <span>Alcance est.: {item.estimatedReach.toLocaleString()}</span>
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <Eye className="w-3 h-3" /> Ver Copy
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};