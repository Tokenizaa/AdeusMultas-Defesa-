import React, { useState, useEffect } from 'react';
import {
  Code2,
  Search,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  Database
} from 'lucide-react';
import { knowledgeService } from '../../server/knowledge/knowledge-service';

interface JsonExplorerProps {
  query?: string;
  categoryFilter?: string | null;
  onResultSelect?: (result: {
    type: string;
    id: string;
    title: string;
  }) => void;
}

export const JsonExplorer: React.FC<JsonExplorerProps> = ({
  query = '',
  categoryFilter = null,
  onResultSelect
}) => {
  const [selectedEntity, setSelectedEntity] = useState<string>('infractions');
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>(query);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    switch (selectedEntity) {
      case 'infractions':
        setData(knowledgeService.getAllInfractions());
        break;
      case 'ctb':
        setData(knowledgeService.getAllCtbArticles());
        break;
      case 'arguments':
        setData(knowledgeService.getAllArguments());
        break;
      case 'templates':
        setData(knowledgeService.getAllTemplates());
        break;
      case 'procedures':
        setData(knowledgeService.getAllProcedures());
        break;
      case 'graph':
        setData(knowledgeService.getAllGraphRelationships());
        break;
      default:
        setData([]);
    }
  }, [selectedEntity]);

  const filteredData = data.filter((item) => {
    if (!searchTerm.trim()) return true;
    const str = JSON.stringify(item).toLowerCase();
    return str.includes(searchTerm.toLowerCase());
  });

  const handleCopyJson = () => {
    const textToCopy = selectedItem ? JSON.stringify(selectedItem, null, 2) : JSON.stringify(filteredData.slice(0, 10), null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Entity Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'infractions', label: 'Infrações' },
          { id: 'ctb', label: 'Artigos CTB' },
          { id: 'arguments', label: 'Teses' },
          { id: 'templates', label: 'Templates' },
          { id: 'procedures', label: 'Procedimentos' },
          { id: 'graph', label: 'Grafo' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedEntity(tab.id);
              setSelectedItem(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              selectedEntity === tab.id
                ? 'bg-orange-500 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar árvore JSON por qualquer campo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <button
          onClick={handleCopyJson}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-sm font-mono flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado!' : 'Copiar JSON'}
        </button>
      </div>

      {/* Split view: List & JSON View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left items list */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 max-h-[500px] overflow-y-auto space-y-1">
          <div className="text-sm uppercase font-mono text-slate-500 px-2 py-1">
            Entidades encontradas ({filteredData.length})
          </div>
          {filteredData.map((item, idx) => {
            const isSelected = selectedItem === item;
            return (
              <button
                key={idx}
                onClick={() => setSelectedItem(item)}
                className={`w-full text-left p-2.5 rounded-lg text-sm font-mono transition-all cursor-pointer truncate ${
                  isSelected
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                    : 'text-slate-300 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <div className="font-bold truncate">{item.id || item.code || item.articleNumber || `Item #${idx + 1}`}</div>
                <div className="text-sm text-slate-500 truncate">{item.title || item.description || item.name || item.caput || 'Detalhes...'}</div>
              </button>
            );
          })}
        </div>

        {/* Right JSON Preview */}
        <div className="md:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-[500px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 text-sm text-slate-400 font-mono">
            <span>{selectedItem ? `Objeto: ${selectedItem.id || selectedItem.code || 'Selecionado'}` : 'Visualizador JSON Canônico'}</span>
            <span>UTF-8 • JSON Schema v1</span>
          </div>
          <pre className="text-sm font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed">
            {selectedItem
              ? JSON.stringify(selectedItem, null, 2)
              : JSON.stringify(filteredData.slice(0, 5), null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};
