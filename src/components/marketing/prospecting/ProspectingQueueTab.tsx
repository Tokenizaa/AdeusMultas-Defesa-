import React, { useState, useMemo } from 'react';
import {
  List,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  RefreshCw,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import type { QueueJob } from '../types/prospecting';

interface ProspectingQueueTabProps {
  queue: QueueJob[];
  isLoading?: boolean;
}

export const ProspectingQueueTab: React.FC<ProspectingQueueTabProps> = ({
  queue,
  isLoading,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const pageSize = 20;

  const filteredJobs = useMemo(() => {
    return queue.filter((job) => {
      // 1. Status Filter
      const isFailed = job.attempts >= job.max_attempts;
      const isRetry = job.attempts > 0 && !isFailed;
      const isPending = job.attempts === 0;

      if (filter === 'pending' && !isPending) return false;
      if (filter === 'processing' && !isRetry) return false;
      if (filter === 'failed' && !isFailed) return false;

      // 2. Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const leadName = job.lead_campaign?.lead?.name?.toLowerCase() || '';
        const campaignName = job.lead_campaign?.campaign?.name?.toLowerCase() || '';
        const actionName = job.action?.toLowerCase() || '';
        if (!leadName.includes(query) && !campaignName.includes(query) && !actionName.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [queue, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const paginatedJobs = useMemo(() => {
    const start = page * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, page, pageSize]);

  const startRecord = filteredJobs.length === 0 ? 0 : page * pageSize + 1;
  const endRecord = Math.min((page + 1) * pageSize, filteredJobs.length);

  return (
    <div className="space-y-4">
      {/* 1. Filter and Control Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome do lead, campanha ou ação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">Todos os Jobs ({queue.length})</option>
              <option value="pending">Pendentes</option>
              <option value="processing">Em Retry / Processamento</option>
              <option value="failed">Com Falha</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
          <span>
            Exibindo <strong className="text-white font-mono">{startRecord}</strong>–<strong className="text-white font-mono">{endRecord}</strong> de{' '}
            <strong className="text-orange-400 font-mono">{filteredJobs.length}</strong> jobs na fila
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 font-semibold cursor-pointer"
            >
              Anterior
            </button>
            <span className="font-mono text-white text-xs">
              {page + 1}/{totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 font-semibold cursor-pointer"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* 2. Queue Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-bold">Lead Alvo</th>
                <th className="py-3 px-3 font-bold">Campanha</th>
                <th className="py-3 px-3 font-bold">Ação</th>
                <th className="py-3 px-3 font-bold">Status</th>
                <th className="py-3 px-3 font-bold">Tentativas</th>
                <th className="py-3 px-3 font-bold">Agendado Para</th>
                <th className="py-3 px-4 font-bold">Último Erro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {paginatedJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-slate-600" />
                      <span className="text-sm font-semibold">Nenhum job pendente na fila no momento.</span>
                      <span className="text-xs text-slate-500">
                        Os jobs são adicionados automaticamente quando campanhas de prospecção são disparadas.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedJobs.map((job) => {
                  const isFailed = job.attempts >= job.max_attempts;
                  const isRetry = job.attempts > 0 && !isFailed;

                  return (
                    <tr key={job.id} className="hover:bg-slate-800/60 transition-colors">
                      {/* Lead */}
                      <td className="py-3 px-4 font-bold text-white max-w-[200px] truncate">
                        {job.lead_campaign?.lead?.name || 'Lead sem nome'}
                      </td>

                      {/* Campaign */}
                      <td className="py-3 px-3 text-slate-300">
                        {job.lead_campaign?.campaign?.name || 'Campanha Padrão'}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {job.action || 'send_message'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                            isFailed
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isRetry
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {isFailed ? 'FAILED' : isRetry ? 'RETRY' : 'PENDING'}
                        </span>
                      </td>

                      {/* Attempts */}
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {job.attempts} / {job.max_attempts}
                      </td>

                      {/* Scheduled Time */}
                      <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {job.scheduled_at
                          ? new Date(job.scheduled_at).toLocaleString('pt-BR')
                          : '—'}
                      </td>

                      {/* Last Error */}
                      <td className="py-3 px-4 max-w-[220px] truncate text-rose-400 font-mono text-[11px]" title={job.last_error || ''}>
                        {job.last_error || <span className="text-slate-600 font-sans">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
