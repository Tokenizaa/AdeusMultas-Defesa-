import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Scale,
  Eye,
  X,
  FileText,
  Bookmark,
  ChevronRight
} from 'lucide-react';
import { knowledgeService } from '../../server/knowledge/knowledge-service';

export const CTBView: React.FC<{
  searchQuery: string;
  categoryFilter: string | null;
}> = ({ searchQuery, categoryFilter }) => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [localSearch, setLocalSearch] = useState<string>('');

  useEffect(() => {
    const loadArticles = async () => {
      setLoading(true);
      try {
        const query = searchQuery || localSearch;
        const filters: any = {};
        if (categoryFilter && categoryFilter !== 'all') {
          filters.category = categoryFilter;
        }

        if (query.trim()) {
          const results = await knowledgeService.searchCtbArticles(query, {
            topK: 30,
            threshold: 0.2,
            filterJurisdiction: 'BR_FEDERAL'
          });
          setArticles(results);
        } else {
          const allArticles = knowledgeService.getAllCtbArticles();
          setArticles(allArticles);
        }
      } catch (error) {
        console.error('Failed to load CTB articles:', error);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    loadArticles();
  }, [searchQuery, categoryFilter, localSearch]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Código de Trânsito Brasileiro (Lei nº 9.503/1997)
            {articles.length > 0 && (
              <span className="text-sm text-slate-400 font-mono font-normal">
                ({articles.length} artigos catalogados)
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Artigos processados com teses de nulidade, prazos decadenciais e resoluções do CONTRAN vinculadas.
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por artigo, texto ou tema..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
          <div className="inline-block animate-spin rounded-full border-2 border-blue-500 border-t-transparent w-8 h-8"></div>
          <p className="mt-3 text-sm text-slate-400">Carregando artigos do CTB...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
          <p className="text-sm text-slate-400">Nenhum artigo encontrado para a busca realizada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((art) => (
            <div
              key={art.id || art.articleNumber || art.article}
              onClick={() => setSelectedArticle(art)}
              className="bg-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-xl p-4 transition-all cursor-pointer space-y-2.5 group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md font-mono font-bold text-sm">
                    {art.articleNumber ? `Art. ${art.articleNumber}` : (art.title || art.id)}
                  </span>
                  {art.category && (
                    <span className="px-2 py-0.5 bg-slate-900 text-slate-400 border border-slate-800 rounded text-sm uppercase font-mono">
                      {art.category.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </div>

              <p className="text-sm text-slate-300 line-clamp-3 leading-relaxed">
                {art.caput || art.description || art.text || 'Texto do artigo CTB'}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-sm text-slate-400">
                <span>{art.penalties ? `Penalidade: ${art.penalties}` : 'Penalidades vigentes'}</span>
                <span className="text-blue-400 font-medium group-hover:underline">Inspecionar artigo</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedArticle.articleNumber ? `Artigo ${selectedArticle.articleNumber} — CTB` : (selectedArticle.title || selectedArticle.id)}
                  </h3>
                  <p className="text-sm text-slate-400">Lei nº 9.503/1997 • Código de Trânsito Brasileiro</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Caput do Artigo:</label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 leading-relaxed">
                  {selectedArticle.caput || selectedArticle.description || selectedArticle.text}
                </div>
              </div>

              {selectedArticle.paragraphs && selectedArticle.paragraphs.length > 0 && (
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Parágrafos & Incisos:</label>
                  <div className="space-y-2">
                    {selectedArticle.paragraphs.map((p: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-lg text-slate-300">
                        {typeof p === 'string' ? p : p.text || JSON.stringify(p)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedArticle.penalties && (
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Penalidades Aplicáveis:</label>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-amber-300 font-mono">
                    {selectedArticle.penalties}
                  </div>
                </div>
              )}

              {selectedArticle.resolutions && (
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Resoluções CONTRAN Regulamentadoras:</label>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-blue-300 font-mono">
                    {Array.isArray(selectedArticle.resolutions) ? selectedArticle.resolutions.join(', ') : selectedArticle.resolutions}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedArticle(null)}
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
