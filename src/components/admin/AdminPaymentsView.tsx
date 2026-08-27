import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Zap,
  ArrowUpDown,
  Download,
  ExternalLink,
  ShieldCheck,
  DollarSign,
  QrCode,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { PRICING } from '../../config/pricing';

interface PaymentOrder {
  id: string;
  caseId: string;
  caseTitle: string;
  customerName: string;
  customerEmail: string;
  customerCpf: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'WAITING' | 'DECLINED' | 'CANCELED';
  method: string;
  createdAt: string;
  paidAt: string | null;
  externalId: string;
  infractionCode: string;
  organ: string;
}

export const AdminPaymentsView: React.FC = () => {
  const { navigate } = useRouter();
  const [payments, setPayments] = useState<PaymentOrder[]>([]);
  const [summary, setSummary] = useState({
    totalVolume: 0,
    paidCount: 0,
    pendingCount: 0,
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [simulatingCaseId, setSimulatingCaseId] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/payments');
      if (!res.ok) throw new Error('Falha ao carregar pagamentos');
      const data = await res.json();
      setPayments(data.payments || []);
      setSummary({
        totalVolume: data.totalVolume || 0,
        paidCount: data.paidCount || 0,
        pendingCount: data.pendingCount || 0,
        totalCount: data.totalCount || 0,
      });
    } catch (err: any) {
      console.error('Error fetching payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleCheckStatus = async (caseId: string) => {
    try {
      setIsSimulating(true);
      const res = await fetch(`/api/payments/pix/status/${encodeURIComponent(caseId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao consultar gateway');
      setActionNotice(`Status da transação para o caso #${caseId}: ${data.status || 'PENDING'}`);
      fetchPayments();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'paid'
        ? p.status === 'PAID'
        : p.status !== 'PAID';

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-orange-400" />
            <h1 className="text-lg font-bold text-white font-mono">
              Gestão Financeira & PagBank Orders v2
            </h1>
          </div>
          <p className="text-sm text-slate-400 font-mono mt-0.5">
            Monitoramento de liquidação PIX, conciliação e simulação de webhooks com idempotência
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPayments}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Recarregar dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 rounded-xl text-sm font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
          <span className="text-sm text-slate-400 uppercase font-bold">Pedidos Aprovados</span>
          <p className="text-xl font-bold text-white">
            {summary.paidCount} <span className="text-sm text-slate-500">/ {summary.totalCount}</span>
          </p>
          <p className="text-sm text-emerald-400">
            {summary.totalCount > 0 ? ((summary.paidCount / summary.totalCount) * 100).toFixed(1) : 0}% taxa de conversão
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, e-mail ou caso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto font-mono text-sm">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
              statusFilter === 'all'
                ? 'bg-orange-500 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Todos ({payments.length})
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Pagos ({summary.paidCount})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Pendentes ({summary.pendingCount})
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase text-sm">
                <th className="p-3.5">ID Transação / Caso</th>
                <th className="p-3.5">Cliente</th>
                <th className="p-3.5">Valor</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Método</th>
                <th className="p-3.5">Data / Liquidação</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
                    Carregando transações do PagBank...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Nenhuma transação encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isPaid = p.status === 'PAID';
                  return (
                    <tr key={p.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{p.id}</div>
                        <div
                          onClick={() => navigate(`/admin/cases/${p.caseId}`)}
                          className="text-sm text-orange-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>Caso #{p.caseId}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-white font-medium">{p.customerName}</div>
                        <div className="text-sm text-slate-500">{p.customerEmail}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-emerald-400">
                          R$ {p.amount.toFixed(2)}
                        </div>
                      </td>
                      <td className="p-3.5">
                        {isPaid ? (
                          <span className="px-2 py-0.5 rounded text-sm font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> PAGO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-sm font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> AGUARDANDO PIX
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="text-slate-300 uppercase">{p.method}</span>
                      </td>
                      <td className="p-3.5 text-slate-400 text-sm">
                        <div>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</div>
                        <div className="text-[9px] text-slate-500">
                          {p.paidAt ? new Date(p.paidAt).toLocaleTimeString('pt-BR') : 'Pendente'}
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && (
                            <button
                              onClick={() => handleCheckStatus(p.caseId)}
                              disabled={isSimulating}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium flex items-center gap-1 cursor-pointer transition-colors"
                              title="Consultar status no gateway"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Verificar Status</span>
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/admin/cases/${p.caseId}`)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-colors"
                            title="Ver caso completo"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
