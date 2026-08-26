import React, { useState } from 'react';
import { PRICING } from '../../config/pricing';
import {
  FileText,
  PlusCircle,
  Search,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import { CaseDomain } from '../../types';
import { CasesTableUserView } from './CasesTableUserView';
import { CasesTableAdminView } from './CasesTableAdminView';

interface CasesTableProps {
  cases: CaseDomain[];
  onSelectCase: (caseItem: CaseDomain) => void;
  onNewCase?: () => void;
  showNewCaseButton?: boolean;
  showFilters?: boolean;
  showStats?: boolean;
  variant?: 'user' | 'admin';
  
  // Controlled props for search and filters
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  statusFilter?: 'ALL' | 'PAID' | 'READY' | 'ANALYZED';
  onStatusFilterChange?: (filter: 'ALL' | 'PAID' | 'READY' | 'ANALYZED') => void;
}

interface Stats {
  totalFinesSaved: number;
  totalPointsAtRisk: number;
}

export const CasesTable: React.FC<CasesTableProps> = ({
  cases,
  onSelectCase,
  onNewCase,
  showNewCaseButton = true,
  showFilters = true,
  showStats = true,
  variant = 'user',
  // Controlled props
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}) => {
  // Use controlled values if provided, otherwise use local state
  const [internalSearchTerm, setInternalSearchTerm] = useState(searchTerm ?? '');
  const [internalStatusFilter, setInternalStatusFilter] = useState<'ALL' | 'PAID' | 'READY' | 'ANALYZED'>(statusFilter ?? 'ALL');
  
  const effectiveSearchTerm = searchTerm ?? internalSearchTerm;
  const effectiveStatusFilter = statusFilter ?? internalStatusFilter;
  
  // Handle search change - update internal state or call back to parent
  const handleSearchChange = (term: string) => {
    if (!onSearchChange) {
      setInternalSearchTerm(term);
    }
    onSearchChange?.(term);
  };
  
  // Handle status filter change - update internal state or call back to parent
  const handleStatusFilterChange = (filter: 'ALL' | 'PAID' | 'READY' | 'ANALYZED') => {
    if (!onStatusFilterChange) {
      setInternalStatusFilter(filter);
    }
    onStatusFilterChange?.(filter);
  };
  
  // Calculate stats
  const stats: Stats = cases.reduce(
    (acc, c) => ({
      totalFinesSaved: acc.totalFinesSaved + (c.infraction?.fineAmount || 0),
      totalPointsAtRisk: acc.totalPointsAtRisk + (c.infraction?.points || 0),
    }),
    { totalFinesSaved: 0, totalPointsAtRisk: 0 }
  );
  
  // Filter cases based on variant and filters
  const filteredCases = cases.filter((c) => {
    // Text search
    const matchesSearch =
      c.title?.toLowerCase().includes(effectiveSearchTerm.toLowerCase()) ||
      c.vehicle?.plate?.toLowerCase().includes(effectiveSearchTerm.toLowerCase()) ||
      c.infraction?.aitNumber?.toLowerCase().includes(effectiveSearchTerm.toLowerCase()) ||
      c.clientName?.toLowerCase().includes(effectiveSearchTerm.toLowerCase()) ||
      c.id?.toLowerCase().includes(effectiveSearchTerm.toLowerCase()) ||
      c.infraction?.plate?.toLowerCase().includes(effectiveSearchTerm.toLowerCase()) ||
      c.infraction?.description?.toLowerCase().includes(effectiveSearchTerm.toLowerCase()) ||
      c.infraction?.autuadorBody?.toLowerCase().includes(effectiveSearchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter (for admin variant)
    if (variant === 'admin') {
      if (effectiveStatusFilter === 'PAID') return c.payment?.status === 'approved';
      if (effectiveStatusFilter === 'READY') return c.status === 'defesa_pronta';
      if (effectiveStatusFilter === 'ANALYZED') return c.status === 'analisado';
      // 'ALL' returns true
    }
    
    return true;
  });
  

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {variant === 'user' ? (
            <>
              <span className="text-sm font-bold text-orange-500 uppercase tracking-wider font-mono">
                Painel de Controle • Gestão de Recursos
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                Processos & Defesas Administrativas
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Gerencie todas as defesas administrativas, prazos fatais e protocolos perante os órgãos autuadores.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white font-mono">Gestão Operacional de Casos</h2>
              <p className="text-sm text-slate-400">
                Controle de diagnósticos, status de pagamento e geração de defesas do CTB.
              </p>
            </>
          )}
        </div>

        {showFilters && variant === 'admin' ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
              Total: <strong className="text-white">{filteredCases.length}</strong> casos
            </span>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          {showNewCaseButton && onNewCase && (
            <button
              id="new-analysis-button-list"
              onClick={onNewCase}
              className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xs shadow-orange-200 transition-all uppercase tracking-tight"
              aria-label="Nova análise gratuita"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Análise Gratuita</span>
            </button>
          )}

          {showFilters && variant === 'admin' && (
            <div className="flex flex-col sm:flex-row gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por placa, AIT, órgão ou descrição..."
                  value={effectiveSearchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-slate-400" />
                <select
                  value={effectiveStatusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value as 'ALL' | 'PAID' | 'READY' | 'ANALYZED')}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-3 text-sm text-slate-300 outline-none focus:border-orange-500 font-mono"
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="ANALYZED">Análise Concluída</option>
                  <option value="PAID">Pagos (Aguardando Minuta)</option>
                  <option value="READY">Defesas Prontas</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Section (User only) */}
      {showStats && variant === 'user' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <p className="text-sm uppercase font-bold text-slate-400 mb-1 font-mono">Processos Monitorados</p>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">{cases.length}</div>
            <span className="text-sm text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold font-mono">
              100% monitorados com IA
            </span>
          </div>

<div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
             <p className="text-sm uppercase font-bold text-slate-400 mb-1 font-mono">Pontos na CNH em Defesa</p>
             <div className="text-2xl font-extrabold text-amber-600 font-mono">{stats.totalPointsAtRisk} pts</div>
             <span className="text-sm text-slate-500 font-mono">Sob efeito suspensivo</span>
           </div>

<div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
             <p className="text-sm uppercase font-bold text-slate-400 mb-1 font-mono">Economia Potencial</p>
             <div className="text-2xl font-extrabold text-emerald-700 font-mono">
               R$ {stats.totalFinesSaved.toFixed(2)}
             </div>
             <span className="text-sm text-slate-500 font-mono">Valores em contestação</span>
           </div>
        </div>
      ) : null}

      {/* Search Input (User only when filters not shown) */}
      {!showFilters && variant === 'user' ? (
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por placa, número do auto (AIT) ou nome do motorista..."
            value={effectiveSearchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none shadow-2xs font-medium"
          />
        </div>
      ) : null}

      {/* Cases List */}
      <div className="space-y-2.5">
        {variant === 'user' ? (
          <CasesTableUserView
            filteredCases={filteredCases}
            onSelectCase={onSelectCase}
            showNewCaseButton={showNewCaseButton}
            onNewCase={onNewCase}
            variant={variant}
          />
        ) : (
          <CasesTableAdminView
            filteredCases={filteredCases}
            onSelectCase={onSelectCase}
            showNewCaseButton={showNewCaseButton}
            onNewCase={onNewCase}
          />
        )}
      </div>
    </div>
  );
};