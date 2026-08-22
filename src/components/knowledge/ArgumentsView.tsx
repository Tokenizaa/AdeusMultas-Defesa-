import React, { useState, useEffect } from 'react';
import {
  Scale,
  Search,
  CheckCircle2,
  AlertTriangle,
  Eye,
  X,
  ShieldCheck,
  Zap,
  Bookmark
} from 'lucide-react';
import { knowledgeService } from '../../server/knowledge/knowledge-service';

export const ArgumentsView: React.FC<{
  searchQuery: string;
  categoryFilter: string | null;
}> = ({ searchQuery, categoryFilter }) => {
  const [argumentsList, setArgumentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedArgument, setSelectedArgument] = useState<any | null>(null);
  const [localSearch, setLocalSearch] = useState<string>('');

  useEffect(() => {
    const loadArguments = async () => {
      setLoading(true);
      try {
        const query = searchQuery || localSearch;
        const filters: any = {};
        if (categoryFilter && categoryFilter !== 'all') {
          filters.category = categoryFilter;
        }

        if (query.trim()) {
          const results = await knowledgeService.searchArguments(query, {
            topK: 30,
            threshold: 0.2,
            filterJurisdiction: 'BR_FEDERAL'
          });
          setArgumentsList(results);
        } else {
          const allArguments = knowledgeService.getAllArguments();
          setArgumentsList(allArguments);
        }
      } catch (error) {
        console.error('Failed to load arguments:', error);
        setArgumentsList([]);
      } finally {
        setLoading(false);
      }
    };

    loadArguments();
  }, [searchQuery, categoryFilter, localSearch]);

  const getCategoryBadge = (category: string) => {
    const c = (category || '').toLowerCase();
    switch (c) {
      case 'preliminar':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'merito':
      case 'mérito':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'formal':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'constitucional':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-400" />
            Catálogo Canônico de Argumentos & Teses Jurídicas
            {argumentsList.length > 0 && (
              <span className="text-sm text-slate-400 font-mono font-normal">
                ({argumentsList.length} teses fundamentadas)
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Teses técnicas e preliminares de nulidade amparadas em jurisprudência do STJ, STF e Resoluções CONTRAN.
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por tese, súmula, artigo..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
          <div className="inline-block animate-spin rounded-full border-2 border-emerald-500 border-t-transparent w-8 h-8"></div>
          <p className="mt-3 text-sm text-slate-400">Carregando teses jurídicas...</p>
        </div>
      ) : argumentsList.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
          <p className="text-sm text-slate-400">Nenhum argumento encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 font-mono text-sm uppercase">
                <tr>
                  <th className="py-3 px-4">Código da Tese</th>
                  <th className="py-3 px-4">Título do Argumento</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Fundamentação</th>
                  <th className="py-3 px-4">Eficácia / Impacto</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-sans text-slate-300">
                {argumentsList.map((arg) => (
                  <tr key={arg.id || arg.code} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {arg.code || arg.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200 max-w-sm truncate">
                      {arg.title || arg.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-sm font-bold border uppercase ${getCategoryBadge(arg.category)}`}>
                        {arg.category || 'mérito'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-sm truncate max-w-xs">
                      {arg.legalBasis || arg.legalReference || 'Art. 281 CTB'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-400 font-medium text-sm flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {arg.confidenceScore ? `${arg.confidenceScore}% sucesso` : (arg.impactType || 'Nulidade do AIT')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedArgument(arg)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-emerald-400 rounded-lg text-sm font-bold transition-colors border border-slate-800 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspecionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Argument Detail Modal */}
      {selectedArgument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedArgument.title || selectedArgument.name}
                  </h3>
                  <p className="text-sm font-mono text-emerald-400">{selectedArgument.code || selectedArgument.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedArgument(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Fundamentação & Doutrina:</label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {selectedArgument.content || selectedArgument.description || selectedArgument.thesisText || 'Texto descritivo da tese jurídica.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-sm text-slate-400 uppercase font-mono block">Base Normativa</span>
                  <span className="font-mono text-slate-200 text-sm mt-0.5 block">
                    {selectedArgument.legalBasis || selectedArgument.legalReference || 'Art. 280/281 CTB'}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-sm text-slate-400 uppercase font-mono block">Efeito Pretendido</span>
                  <span className="font-bold text-emerald-400 text-sm mt-0.5 block">
                    {selectedArgument.impactType || 'Extinção da Autuação & Cancelamento de Pontos'}
                  </span>
                </div>
              </div>

              {selectedArgument.jurisprudence && (
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Jurisprudência Vinculada:</label>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-blue-300 font-mono text-sm">
                    {selectedArgument.jurisprudence}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedArgument(null)}
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
