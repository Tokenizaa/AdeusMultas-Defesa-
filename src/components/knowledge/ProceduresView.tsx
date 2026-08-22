import React, { useState, useEffect } from 'react';
import {
  ListChecks,
  Search,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Eye,
  X,
  ChevronRight,
  Shield
} from 'lucide-react';
import { knowledgeService } from '../../server/knowledge/knowledge-service';

export const ProceduresView: React.FC<{
  searchQuery: string;
  categoryFilter: string | null;
}> = ({ searchQuery, categoryFilter }) => {
  const [procedures, setProcedures] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedProcedure, setSelectedProcedure] = useState<any | null>(null);
  const [localSearch, setLocalSearch] = useState<string>('');

  useEffect(() => {
    const loadProcedures = async () => {
      setLoading(true);
      try {
        const query = searchQuery || localSearch;
        const filters: any = {};
        if (categoryFilter && categoryFilter !== 'all') {
          filters.category = categoryFilter;
        }

        if (query.trim()) {
          const results = await knowledgeService.searchProcedures(query, {
            topK: 30,
            threshold: 0.2,
            filterJurisdiction: 'BR_FEDERAL'
          });
          setProcedures(results);
        } else {
          const allProcedures = knowledgeService.getAllProcedures();
          setProcedures(allProcedures);
        }
      } catch (error) {
        console.error('Failed to load procedures:', error);
        setProcedures([]);
      } finally {
        setLoading(false);
      }
    };

    loadProcedures();
  }, [searchQuery, categoryFilter, localSearch]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-amber-400" />
            Procedimentos Administrativos & Prazos Legais
            {procedures.length > 0 && (
              <span className="text-sm text-slate-400 font-mono font-normal">
                ({procedures.length} procedimentos)
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Fluxos processuais perante órgãos autuadores (JARI, CETRAN, CONTRAN) e prazos decadenciais do CTB.
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por fase, prazo ou órgão..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
          <div className="inline-block animate-spin rounded-full border-2 border-amber-500 border-t-transparent w-8 h-8"></div>
          <p className="mt-3 text-sm text-slate-400">Carregando procedimentos processuais...</p>
        </div>
      ) : procedures.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
          <p className="text-sm text-slate-400">Nenhum procedimento encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {procedures.map((proc) => (
            <div
              key={proc.id || proc.type}
              onClick={() => setSelectedProcedure(proc)}
              className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition-all cursor-pointer space-y-3 group shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md font-mono font-bold text-sm">
                    {proc.id || proc.code || 'PROC'}
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {proc.legalDeadlineDays ? `${proc.legalDeadlineDays} dias úteis` : (proc.deadline || '30 dias')}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  {proc.name || proc.title || proc.label}
                </h3>

                <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                  {proc.description || 'Rito procedimental com fundamentação legal e prazos perante a autoridade julgadora.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-900 text-sm">
                <span className="text-slate-400 text-sm font-mono">
                  Instância: {proc.instance || 'Administrativa'}
                </span>
                <span className="text-amber-400 font-bold group-hover:underline inline-flex items-center gap-0.5">
                  Ver Rito <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Procedure Modal */}
      {selectedProcedure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ListChecks className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedProcedure.name || selectedProcedure.title}
                  </h3>
                  <p className="text-sm font-mono text-amber-400">{selectedProcedure.id || selectedProcedure.code}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProcedure(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Descrição do Rito:</label>
                <p className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200">
                  {selectedProcedure.description || 'Procedimento legal para interposição de recurso de trânsito.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-sm text-slate-400 uppercase font-mono block">Prazo Legal de Interposição</span>
                  <span className="font-bold text-amber-400 text-sm font-mono mt-0.5 block">
                    {selectedProcedure.legalDeadlineDays ? `${selectedProcedure.legalDeadlineDays} dias` : (selectedProcedure.deadline || '30 dias da notificação')}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-sm text-slate-400 uppercase font-mono block">Órgão Julgador / Instância</span>
                  <span className="font-bold text-white text-sm mt-0.5 block">
                    {selectedProcedure.targetOrgan || selectedProcedure.instance || 'JARI / CETRAN'}
                  </span>
                </div>
              </div>

              {selectedProcedure.requirements && selectedProcedure.requirements.length > 0 && (
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Requisitos Obrigatórios:</label>
                  <ul className="space-y-1.5 p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    {selectedProcedure.requirements.map((req: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedProcedure(null)}
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
