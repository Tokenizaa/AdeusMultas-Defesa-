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

  const handleSimulatePaymentForCase = async (targetCaseId: string, gateway: 'pagbank' | 'ggpixapi' = 'pagbank') => {
    if (!targetCaseId.trim()) {
      alert('Informe o ID do caso para simulação.');
      return;
    }
    try {
      setIsSimulating(true);
      const res = await fetch('/api/payments/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: targetCaseId.trim(),
          amount: 89.90,
          paymentMethod: 'pix',
          gateway,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao simular pagamento');
      setActionNotice(`✅ Pagamento simulado com sucesso para o caso #${targetCaseId} (${gateway.toUpperCase()})!`);
      fetchPayments();
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleTriggerSandboxWebhook = async (targetCaseId: string, gateway: 'pagbank' | 'ggpixapi' = 'pagbank') => {
    if (!targetCaseId.trim()) {
      alert('Informe o ID do caso para disparo de webhook.');
      return;
    }
    try {
      setIsSimulating(true);
      const res = await fetch('/api/payments/sandbox/trigger-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: targetCaseId.trim(),
          gateway,
          eventType: 'PAID',
          amount: 89.90,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao disparar webhook');
      setActionNotice(`⚡ Webhook ${gateway.toUpperCase()} disparado e processado com sucesso!`);
      fetchPayments();
      setTimeout(() => setActionNotice(null), 5000);
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

      {/* Admin Payment Simulator & Sandbox Facilitator */}
      <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
              Simulador de Gateway & Testes Sandbox (Admin)
            </h2>
          </div>
          <span className="text-xs text-amber-400/80 bg-amber-500/20 px-2.5 py-1 rounded-lg">
            PagBank Sandbox / GGPIX
          </span>
        </div>
        <p className="text-xs text-slate-300">
          Simule confirmações de pagamento instantâneas ou disparos de webhooks com geração automática de minuta jurídica e emissão de eventos.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <input
            type="text"
            placeholder="ID do Caso (ex: case_123...)"
            value={simulatingCaseId}
            onChange={(e) => setSimulatingCaseId(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-60"
          />
          <button
            type="button"
            onClick={() => handleSimulatePaymentForCase(simulatingCaseId, 'pagbank')}
            disabled={isSimulating || !simulatingCaseId.trim()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simular Pagamento (PagBank Sandbox)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSimulatePaymentForCase(simulatingCaseId, 'ggpixapi')}
            disabled={isSimulating || !simulatingCaseId.trim()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <CreditCard className="w-3.5 h-3.5 text-orange-400" />
            <span>Simular Pagamento (GGPIX)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTriggerSandboxWebhook(simulatingCaseId, 'pagbank')}
            disabled={isSimulating || !simulatingCaseId.trim()}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Disparar Webhook Sandbox</span>
          </button>
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
                            <>
                              <button
                                onClick={() => handleSimulatePaymentForCase(p.caseId, 'pagbank')}
                                disabled={isSimulating}
                                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                title="Simular aprovação imediata deste pagamento"
                              >
                                <Zap className="w-3 h-3 text-emerald-400" />
                                <span>Simular Pgto</span>
                              </button>
                              <button
                                onClick={() => handleCheckStatus(p.caseId)}
                                disabled={isSimulating}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                title="Consultar status no gateway"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Verificar Status</span>
                              </button>
                            </>
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
