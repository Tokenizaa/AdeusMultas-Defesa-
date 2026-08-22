import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Eye,
  X,
  Layers,
  Copy,
  Check,
  ChevronRight,
  Download
} from 'lucide-react';
import { knowledgeService } from '../../server/knowledge/knowledge-service';

export const TemplatesView: React.FC<{
  searchQuery: string;
  categoryFilter: string | null;
}> = ({ searchQuery, categoryFilter }) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [localSearch, setLocalSearch] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      try {
        const query = searchQuery || localSearch;
        const filters: any = {};
        if (categoryFilter && categoryFilter !== 'all') {
          filters.category = categoryFilter;
        }

        if (query.trim()) {
          const results = await knowledgeService.searchTemplates(query, {
            topK: 30,
            threshold: 0.2,
            filterJurisdiction: 'BR_FEDERAL'
          });
          setTemplates(results);
        } else {
          const allTemplates = knowledgeService.getAllTemplates();
          setTemplates(allTemplates);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [searchQuery, categoryFilter, localSearch]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Templates Canônicos de Petições & Recursos
            {templates.length > 0 && (
              <span className="text-sm text-slate-400 font-mono font-normal">
                ({templates.length} templates)
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Modelos de peças determinísticas compostas por blocos parametrizáveis para Defesa Prévia, JARI e CETRAN.
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por template, fase ou tipo..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
          <div className="inline-block animate-spin rounded-full border-2 border-purple-500 border-t-transparent w-8 h-8"></div>
          <p className="mt-3 text-sm text-slate-400">Carregando catálogo de templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
          <p className="text-sm text-slate-400">Nenhum template encontrado para os filtros informados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => setSelectedTemplate(tpl)}
              className="bg-slate-950 border border-slate-800 hover:border-purple-500/50 rounded-xl p-4 transition-all cursor-pointer space-y-3 group shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-mono font-bold text-sm">
                    {tpl.id || tpl.code}
                  </span>
                  <span className="text-sm uppercase font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {tpl.procedureType || 'Recurso'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                  {tpl.title || tpl.name}
                </h3>

                <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                  {tpl.description || 'Template determinístico com estrutura padronizada perante a autoridade de trânsito.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-900 text-sm">
                <span className="text-slate-500 flex items-center gap-1 font-mono text-sm">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  {tpl.blocks ? `${tpl.blocks.length} blocos` : '5 seções'}
                </span>
                <span className="text-purple-400 font-bold group-hover:underline inline-flex items-center gap-0.5">
                  Visualizar <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Template Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedTemplate.title || selectedTemplate.name}
                  </h3>
                  <p className="text-sm font-mono text-purple-400">{selectedTemplate.id || selectedTemplate.code}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Finalidade do Modelo:</label>
                <p className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200">
                  {selectedTemplate.description || 'Modelo de petição para defesa contra penalidade de trânsito.'}
                </p>
              </div>

              {selectedTemplate.rawTemplate || selectedTemplate.templateText ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-medium">Estrutura da Minuta:</label>
                    <button
                      onClick={() => handleCopy(selectedTemplate.rawTemplate || selectedTemplate.templateText)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copiado!' : 'Copiar Texto'}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg font-mono text-sm text-slate-200 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                    {selectedTemplate.rawTemplate || selectedTemplate.templateText}
                  </pre>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
