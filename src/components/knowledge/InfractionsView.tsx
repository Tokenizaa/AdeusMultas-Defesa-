import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  Eye,
  X,
  Scale,
  Shield,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { knowledgeService } from '../../server/knowledge/knowledge-service';
import type { InfractionCatalogItem } from '../../data/knowledge-base';

export const InfractionsView: React.FC<{
  searchQuery: string;
  categoryFilter: string | null;
}> = ({ searchQuery, categoryFilter }) => {
  const [infractions, setInfractions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedInfraction, setSelectedInfraction] = useState<any | null>(null);
  const [localSearch, setLocalSearch] = useState<string>('');

  useEffect(() => {
    const loadInfractions = async () => {
      setLoading(true);
      try {
        const query = searchQuery || localSearch;
        const filters: any = {};
        if (categoryFilter && categoryFilter !== 'all') {
          filters.category = categoryFilter;
        }

        if (query.trim()) {
          const results = await knowledgeService.searchInfractions(query, {
            topK: 30,
            threshold: 0.2,
            filterJurisdiction: 'BR_FEDERAL'
          });
          setInfractions(results);
        } else {
          const allInfractions = knowledgeService.getAllInfractions();
          setInfractions(allInfractions);
        }
      } catch (error) {
        console.error('Failed to load infractions:', error);
        setInfractions([]);
      } finally {
        setLoading(false);
      }
    };

    loadInfractions();
  }, [searchQuery, categoryFilter, localSearch]);

  const getSeverityBadge = (severity: string) => {
    const s = (severity || '').toLowerCase();
    switch (s) {
      case 'gravissima':
      case 'gravíssima':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'grave':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'media':
      case 'média':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'leve':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Local Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Catálogo Canônico de Infrações de Trânsito
            {infractions.length > 0 && (
              <span className="text-sm text-slate-400 font-mono font-normal">
                ({infractions.length} infrações)
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Tabela estruturada do CTB com tipificação, gravidade, pontuação e competência fiscalizatória.
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar por código ou descrição..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
          <div className="inline-block animate-spin rounded-full border-2 border-orange-500 border-t-transparent w-8 h-8"></div>
          <p className="mt-3 text-sm text-slate-400">Carregando base canônica de infrações...</p>
        </div>
      ) : infractions.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
          <p className="text-sm text-slate-400">Nenhuma infração encontrada para os critérios informados.</p>
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 font-mono text-sm uppercase">
                <tr>
                  <th className="py-3 px-4">Código / Enquadramento</th>
                  <th className="py-3 px-4">Artigo CTB</th>
                  <th className="py-3 px-4">Descrição da Infração</th>
                  <th className="py-3 px-4">Gravidade</th>
                  <th className="py-3 px-4">Pontos</th>
                  <th className="py-3 px-4">Valor Base</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-sans text-slate-300">
                {infractions.map((item) => (
                  <tr key={item.id || item.code} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-orange-400">
                      {item.code || item.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {item.ctbArticle || item.article || 'CTB'}
                    </td>
                    <td className="py-3 px-4 max-w-md truncate font-medium text-slate-200">
                      {item.description || item.title}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-sm font-bold border uppercase ${getSeverityBadge(item.severity)}`}>
                        {item.severity || 'N/I'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-300">
                      {item.points ? `${item.points} pts` : '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {item.baseFineAmount ? `R$ ${Number(item.baseFineAmount).toFixed(2)}` : (item.fineAmount ? `R$ ${Number(item.fineAmount).toFixed(2)}` : 'R$ 130,16')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedInfraction(item)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-orange-400 rounded-lg text-sm font-bold transition-colors border border-slate-800 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Infraction Detail Modal */}
      {selectedInfraction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Código: <span className="font-mono text-orange-400">{selectedInfraction.code || selectedInfraction.id}</span>
                  </h3>
                  <p className="text-sm text-slate-400">{selectedInfraction.ctbArticle || selectedInfraction.article || 'Código de Trânsito Brasileiro'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInfraction(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Descrição Tipificada:</label>
                <p className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200">
                  {selectedInfraction.description || selectedInfraction.title}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-sm text-slate-400 uppercase font-mono block">Gravidade</span>
                  <span className="font-bold text-white text-sm capitalize">{selectedInfraction.severity || 'Média'}</span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-sm text-slate-400 uppercase font-mono block">Pontos CNH</span>
                  <span className="font-bold text-rose-400 text-sm font-mono">{selectedInfraction.points || 4} pontos</span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-sm text-slate-400 uppercase font-mono block">Valor da Multa</span>
                  <span className="font-bold text-emerald-400 text-sm font-mono">
                    {selectedInfraction.baseFineAmount ? `R$ ${Number(selectedInfraction.baseFineAmount).toFixed(2)}` : 'R$ 195,23'}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-sm text-slate-400 uppercase font-mono block">Competência</span>
                  <span className="font-bold text-slate-200 text-sm uppercase">{selectedInfraction.competence || 'Órgão de Trânsito'}</span>
                </div>
              </div>

              {selectedInfraction.legalBasis && (
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Fundamentação Legal / CONTRAN:</label>
                  <p className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-slate-300">
                    {selectedInfraction.legalBasis}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedInfraction(null)}
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
