import React, { useState, useEffect } from 'react';
import {
  Coins,
  DollarSign,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Search,
  Filter,
  CreditCard,
  ShieldAlert,
  AlertTriangle,
  Send,
  X,
} from 'lucide-react';
import { CommissionLedgerEntry } from '../../types/commercial';
import { useAuthFetch } from '../../hooks/useAuthFetch';

export const AdminCommercialCommissionsView: React.FC = () => {
  const authFetch = useAuthFetch();
  const [commissions, setCommissions] = useState<CommissionLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    totalEarned: 0,
    totalAvailable: 0,
    totalPaid: 0,
    totalReversed: 0,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Reversal Modal
  const [reversalPaymentId, setReversalPaymentId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalLoading, setReversalLoading] = useState(false);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      // FIX 1: sessão injetada (fetch cru resultava em 401 silenciado).
      const res = await authFetch('/api/admin/commercial/commissions');
      const data = await res.json();
      setCommissions(data.commissions || []);
      setTotals({
        totalEarned: data.totalEarned || 0,
        totalAvailable: data.totalAvailable || 0,
        totalPaid: data.totalPaid || 0,
        totalReversed: data.totalReversed || 0,
      });
    } catch (err) {
      console.error('Failed to load commissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  const handleMarkPaid = async (commId: string) => {
    if (!confirm('Deseja marcar esta comissão como PAGA?')) return;
    try {
      // FIX 1: sessão injetada.
      const res = await authFetch(`/api/admin/commercial/commissions/${commId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'Admin Financeiro' }),
      });
      if (res.ok) {
        setFeedback('Comissão liquidada com sucesso!');
        setTimeout(() => setFeedback(null), 3000);
        fetchCommissions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalPaymentId || !reversalReason.trim()) return;

    setReversalLoading(true);
    try {
      // FIX 1: sessão injetada.
      const res = await authFetch('/api/admin/commercial/commissions/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: reversalPaymentId,
          reason: reversalReason,
          author: 'Admin Financeiro',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback('Reversão de comissões executada com sucesso!');
        setTimeout(() => setFeedback(null), 3000);
        setReversalPaymentId(null);
        setReversalReason('');
        fetchCommissions();
      } else {
        alert(data.error || 'Erro na reversão');
      }
    } catch (err: any) {
      alert(err.message || 'Erro');
    } finally {
      setReversalLoading(false);
    }
  };

  const filteredCommissions = commissions.filter((c) => {
    const matchSearch =
      c.beneficiaryName.toLowerCase().includes(search.toLowerCase()) ||
      c.beneficiaryId.toLowerCase().includes(search.toLowerCase()) ||
      c.buyerName.toLowerCase().includes(search.toLowerCase()) ||
      c.paymentId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchLevel = levelFilter === 'ALL' || String(c.level) === levelFilter;
    return matchSearch && matchStatus && matchLevel;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-sm font-bold uppercase tracking-wider bg-violet-500/20 text-violet-400 border border-violet-500/30 font-mono">
              Livro de Comissões
            </span>
            <span className="text-slate-500 text-sm font-mono">•</span>
            <span className="text-slate-400 text-sm">Eventos de Pagamento & Liquidações</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1">
            Ledger de Comissões de Afiliados & Indicadores
          </h1>
        </div>

        {feedback && (
          <div className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {feedback}
          </div>
        )}
      </div>

      {/* Summary KPI Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-sm font-medium">Total de Comissões Geradas</span>
          <div className="mt-1 text-2xl font-black text-white font-mono">
            R$ {totals.totalEarned.toFixed(2)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-sm font-medium">Disponíveis para Saque</span>
          <div className="mt-1 text-2xl font-black text-emerald-400 font-mono">
            R$ {totals.totalAvailable.toFixed(2)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-sm font-medium">Liquidadas / Pagas</span>
          <div className="mt-1 text-2xl font-black text-blue-400 font-mono">
            R$ {totals.totalPaid.toFixed(2)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-sm font-medium">Revertidas / Canceladas</span>
          <div className="mt-1 text-2xl font-black text-rose-400 font-mono">
            R$ {totals.totalReversed.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por beneficiário, comprador ou pedido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-white text-sm focus:outline-hidden focus:border-violet-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-mono text-sm">Nível:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-sm font-mono focus:outline-hidden"
            >
              <option value="ALL">Todos os Níveis</option>
              <option value="1">Nível 1 (Direto)</option>
              <option value="2">Nível 2 (Indireto)</option>
              <option value="3">Nível 3 (Ancestral)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-mono text-sm">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-sm font-mono focus:outline-hidden"
            >
              <option value="ALL">Todos os Status</option>
              <option value="AVAILABLE">AVAILABLE (Disponível)</option>
              <option value="PENDING">PENDING (Em Maturação)</option>
              <option value="PAID">PAID (Pago)</option>
              <option value="REVERSED">REVERSED (Revertido)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Commissions Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-bold text-white">
              Ledger de Comissões ({filteredCommissions.length} registros)
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-sm border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Data Compra</th>
                <th className="px-4 py-3">Beneficiário</th>
                <th className="px-4 py-3">Nível</th>
                <th className="px-4 py-3">Comprador</th>
                <th className="px-4 py-3">Base de Cálculo</th>
                <th className="px-4 py-3">Taxa (%)</th>
                <th className="px-4 py-3">Comissão (R$)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredCommissions.map((c) => {
                const isAvail = c.status === 'AVAILABLE';
                const isPaid = c.status === 'PAID';
                const isPending = c.status === 'PENDING';
                const isReversed = c.status === 'REVERSED';

                return (
                  <tr key={c.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{c.beneficiaryName}</div>
                      <div className="text-sm text-slate-500">{c.beneficiaryId}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-sm ${
                          c.level === 1
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : c.level === 2
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                        }`}
                      >
                        Nível {c.level}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      <div>{c.buyerName}</div>
                      <div className="text-sm text-slate-500">{c.paymentId}</div>
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      R$ {c.calculationBaseAmount.toFixed(2)}
                    </td>

                    <td className="px-4 py-3 font-bold text-slate-200">
                      {c.appliedPercent}%
                    </td>

                    <td className={`px-4 py-3 font-black ${isReversed ? 'line-through text-slate-600' : 'text-emerald-400'}`}>
                      R$ {c.commissionAmount.toFixed(2)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-sm font-bold ${
                          isPaid
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : isAvail
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isPending
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAvail && (
                          <button
                            onClick={() => handleMarkPaid(c.id)}
                            className="px-2.5 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm font-bold border border-blue-500/30 transition-colors cursor-pointer"
                          >
                            Pagar
                          </button>
                        )}
                        {!isReversed && (
                          <button
                            onClick={() => setReversalPaymentId(c.paymentId)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                            title="Reverter comissão (Estorno)"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reversal Modal */}
      {reversalPaymentId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-sm font-mono uppercase text-rose-400 font-bold">
                  Reversão Financeira
                </span>
                <h3 className="text-base font-bold text-white">Reverter Comissões do Pedido</h3>
              </div>
              <button
                onClick={() => setReversalPaymentId(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteReversal} className="space-y-3 text-sm">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-slate-500 text-sm font-mono uppercase">ID do Pagamento:</span>
                <div className="text-white font-mono font-bold">{reversalPaymentId}</div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Motivo da Reversão / Cancelamento * (Auditoria Obrigatória)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Chargeback PagBank, cancelamento solicitado pelo cliente..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReversalPaymentId(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reversalLoading}
                  className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  {reversalLoading ? 'Processando...' : 'Confirmar Reversão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
