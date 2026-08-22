import React, { useState, useEffect } from 'react';
import {
  GitFork,
  Search,
  ArrowRight,
  Eye,
  X,
  Layers,
  FileText,
  AlertTriangle,
  Scale,
  BookOpen
} from 'lucide-react';
import { knowledgeService } from '../../server/knowledge/knowledge-service';

export const GraphView: React.FC<{
  searchQuery: string;
  categoryFilter: string | null;
}> = ({ searchQuery, categoryFilter }) => {
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedRel, setSelectedRel] = useState<any | null>(null);
  const [localSearch, setLocalSearch] = useState<string>('');

  useEffect(() => {
    const loadGraph = async () => {
      setLoading(true);
      try {
        const query = searchQuery || localSearch;
        const filters: any = {};
        if (categoryFilter && categoryFilter !== 'all') {
          filters.category = categoryFilter;
        }

        if (query.trim()) {
          const results = await knowledgeService.searchGraphRelationships(query, {
            topK: 30,
            threshold: 0.2,
            filterJurisdiction: 'BR_FEDERAL'
          });
          setRelationships(results);
        } else {
          const allRels = knowledgeService.getAllGraphRelationships();
          setRelationships(allRels);
        }
      } catch (error) {
        console.error('Failed to load graph relationships:', error);
        setRelationships([]);
      } finally {
        setLoading(false);
      }
    };

    loadGraph();
  }, [searchQuery, categoryFilter, localSearch]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <GitFork className="w-5 h-5 text-indigo-400" />
            Grafo de Conhecimento & Relações Canônicas
            {relationships.length > 0 && (
              <span className="text-sm text-slate-400 font-mono font-normal">
                ({relationships.length} conexões mapeadas)
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Mapeamento relacional: Infração ➔ Artigo CTB ➔ Teses Jurídicas ➔ Templates de Peça ➔ Rito Procedimental.
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar conexões no grafo..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
          <div className="inline-block animate-spin rounded-full border-2 border-indigo-500 border-t-transparent w-8 h-8"></div>
          <p className="mt-3 text-sm text-slate-400">Carregando nós e arestas do grafo jurídico...</p>
        </div>
      ) : relationships.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
          <p className="text-sm text-slate-400">Nenhuma relação encontrada no grafo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {relationships.map((rel, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedRel(rel)}
              className="bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 transition-all cursor-pointer space-y-3 group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-mono font-bold text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Infração: {rel.infractionId || rel.infractionCode || '745-5-0'}
                </span>
                <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono font-bold text-sm flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {rel.ctbArticleId || 'Art. 218'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-400 py-1">
                <div className="p-1.5 bg-slate-900 rounded border border-slate-800 text-emerald-400 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5" />
                  <span>{Array.isArray(rel.argumentIds) ? `${rel.argumentIds.length} teses` : 'Teses'}</span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                <div className="p-1.5 bg-slate-900 rounded border border-slate-800 text-purple-400 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{rel.templateId || 'Template'}</span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                <div className="p-1.5 bg-slate-900 rounded border border-slate-800 text-amber-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{rel.procedureId || 'Defesa'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-sm text-slate-500">
                <span>Conexão determinística canônica</span>
                <span className="text-indigo-400 font-bold group-hover:underline">Inspecionar nó</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Relationship Modal */}
      {selectedRel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <GitFork className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Inspeção de Vínculo Relacional</h3>
                  <p className="text-sm text-slate-400">Grafo Canônico de Conhecimento DefesAi</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRel(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-mono">Infração Alvo:</span>
                  <span className="font-bold text-amber-400 font-mono">{selectedRel.infractionId || selectedRel.infractionCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-mono">Artigo do CTB:</span>
                  <span className="font-bold text-blue-400 font-mono">{selectedRel.ctbArticleId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-mono">Template Associado:</span>
                  <span className="font-bold text-purple-400 font-mono">{selectedRel.templateId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-mono">Rito Procedimental:</span>
                  <span className="font-bold text-amber-400 font-mono">{selectedRel.procedureId}</span>
                </div>
              </div>

              {selectedRel.argumentIds && (
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Teses & Argumentos Vinculados:</label>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-wrap gap-2">
                    {Array.isArray(selectedRel.argumentIds) ? (
                      selectedRel.argumentIds.map((argId: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-sm">
                          {argId}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400">{selectedRel.argumentIds}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedRel(null)}
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
