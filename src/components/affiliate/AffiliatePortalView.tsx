import React, { useState, useEffect } from 'react';
import {
  Share2,
  DollarSign,
  TrendingUp,
  Users,
  Copy,
  Check,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Wallet,
  Building2,
  ExternalLink,
  ChevronRight,
  Send,
  Layers,
  Award,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { CommissionLedgerEntry, BonusLedgerEntry, ReferralTreeResponse } from '../../types/commercial';

type AffiliateTab = 'overview' | 'links' | 'sales' | 'commissions' | 'network' | 'statement' | 'withdraw';

interface AffiliateStats {
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  totalEarned: number;
  directReferralsCount: number;
  networkTotalCount: number;
  totalSalesVolume: number;
  conversionRate: number;
  clicksCount: number;
}

export const AffiliatePortalView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AffiliateTab>('overview');
  const [currentUserId, setCurrentUserId] = useState<string>('usr_carlos');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Affiliate State
  const [stats, setStats] = useState<AffiliateStats>({
    availableBalance: 32.48,
    pendingBalance: 14.50,
    totalWithdrawn: 150.00,
    totalEarned: 196.98,
    directReferralsCount: 5,
    networkTotalCount: 14,
    totalSalesVolume: 1420.80,
    conversionRate: 8.4,
    clicksCount: 168,
  });

  const [commissions, setCommissions] = useState<CommissionLedgerEntry[]>([]);
  const [bonusLedger, setBonusLedger] = useState<BonusLedgerEntry[]>([]);
  const [treeData, setTreeData] = useState<ReferralTreeResponse | null>(null);

  // Withdraw Modal / Form State
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'email' | 'phone' | 'random'>('cpf');
  const [pixKey, setPixKey] = useState('123.456.789-00');
  const [withdrawAmount, setWithdrawAmount] = useState<number>(30);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState<Array<{
    id: string;
    amount: number;
    pixKey: string;
    pixKeyType: string;
    status: 'COMPLETED' | 'PROCESSING' | 'PENDING';
    createdAt: string;
    paidAt?: string;
  }>>([
    {
      id: 'wd_001',
      amount: 150.00,
      pixKey: '123.456.789-00',
      pixKeyType: 'CPF',
      status: 'COMPLETED',
      createdAt: '2026-08-01T14:30:00Z',
      paidAt: '2026-08-01T14:32:00Z',
    },
  ]);

  const affiliateCode = 'CARLOS10';
  const referralUrl = `${window.location.origin}/?ref=${affiliateCode}`;

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Commissions
      const resComm = await fetch('/api/admin/commercial/commissions');
      if (resComm.ok) {
        const commData = await resComm.json();
        const allComms: CommissionLedgerEntry[] = commData.commissions || [];
        const userComms = allComms.filter((c) => c.beneficiaryId === currentUserId);
        setCommissions(userComms.length > 0 ? userComms : allComms);

        // Derive balance metrics
        const available = (userComms.length > 0 ? userComms : allComms)
          .filter((c) => c.status === 'AVAILABLE')
          .reduce((acc, c) => acc + c.commissionAmount, 0);

        const pending = (userComms.length > 0 ? userComms : allComms)
          .filter((c) => c.status === 'PENDING')
          .reduce((acc, c) => acc + c.commissionAmount, 0);

        const totalEarned = (userComms.length > 0 ? userComms : allComms)
          .filter((c) => c.status === 'AVAILABLE' || c.status === 'PAID')
          .reduce((acc, c) => acc + c.commissionAmount, 0);

        setStats((prev) => ({
          ...prev,
          availableBalance: Number(available.toFixed(2)),
          pendingBalance: Number(pending.toFixed(2)),
          totalEarned: Number(totalEarned.toFixed(2)),
        }));
      }

      // 2. Fetch User Tree
      const resTree = await fetch(`/api/admin/commercial/referrals/tree/${currentUserId}`);
      if (resTree.ok) {
        const tData = await resTree.json();
        setTreeData(tData);
        if (tData.tree) {
          setStats((prev) => ({
            ...prev,
            directReferralsCount: tData.tree.level1?.length || 0,
            networkTotalCount: tData.tree.totalNetworkUsers || 0,
            totalSalesVolume: tData.tree.totalNetworkVolume || 0,
          }));
        }
      }

      // 3. Fetch Bonus Ledger
      const resBonus = await fetch(`/api/admin/commercial/bonuses?userId=${currentUserId}`);
      if (resBonus.ok) {
        const bData = await resBonus.json();
        setBonusLedger(bData.ledger || []);
      }
    } catch (err) {
      console.error('Error fetching affiliate data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUserId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(affiliateCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRequestWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0 || withdrawAmount > stats.availableBalance) {
      alert('Valor de saque inválido ou superior ao saldo disponível.');
      return;
    }
    if (withdrawAmount < 20) {
      alert('Valor mínimo para saque é de R$ 20,00.');
      return;
    }

    setWithdrawLoading(true);
    setTimeout(() => {
      const newWithdraw = {
        id: `wd_${Date.now()}`,
        amount: Number(withdrawAmount),
        pixKey,
        pixKeyType: pixKeyType.toUpperCase(),
        status: 'COMPLETED' as const,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
      };

      setWithdrawHistory([newWithdraw, ...withdrawHistory]);
      setStats((prev) => ({
        ...prev,
        availableBalance: Number((prev.availableBalance - withdrawAmount).toFixed(2)),
        totalWithdrawn: Number((prev.totalWithdrawn + withdrawAmount).toFixed(2)),
      }));
      setFeedback(`Saque PIX de R$ ${withdrawAmount.toFixed(2)} transferido com sucesso!`);
      setTimeout(() => setFeedback(null), 4000);
      setWithdrawLoading(false);
      setActiveTab('statement');
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Affiliate Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-sm font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                Portal Oficial do Afiliado
              </span>
              <span className="text-slate-500 text-sm font-mono">•</span>
              <span className="text-slate-400 text-sm">Rede Multinível em 3 Níveis (10% / 5% / 2%)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Painel de Afiliado & Indicações
            </h1>
            <p className="text-slate-300 text-sm sm:text-sm max-w-2xl">
              Monitore suas comissões por pagamentos confirmados, acompanhe sua rede de indicados diretos e indiretos, compartilhe seu link exclusivo e solicite saques via PIX instantâneo.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-4">
              <div>
                <span className="text-sm text-slate-400 font-mono uppercase block">Saldo Disponível</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                  R$ {stats.availableBalance.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setActiveTab('withdraw')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-emerald-900/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                Sacar PIX
              </button>
            </div>
          </div>
        </div>

        {/* Quick Link Share Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-300">
              <span className="text-slate-500">Seu Código:</span>
              <span className="font-bold text-amber-400">{affiliateCode}</span>
              <button
                onClick={handleCopyCode}
                className="p-1 hover:text-white transition-colors cursor-pointer"
                title="Copiar Código"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-300 truncate max-w-md">
              <span className="text-slate-500">Link:</span>
              <span className="truncate text-slate-200">{referralUrl}</span>
              <button
                onClick={handleCopyLink}
                className="p-1 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Copiar Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const text = encodeURIComponent(`Olá! Recomendo o DefesAi para anular multas de trânsito injustas com inteligência pericial: ${referralUrl}`);
                window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
              }}
              className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              WhatsApp
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {feedback}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto space-x-1 scrollbar-none">
        {[
          { id: 'overview', label: 'Visão Geral', icon: TrendingUp },
          { id: 'links', label: 'Links & Material', icon: Share2 },
          { id: 'sales', label: 'Vendas & Pedidos', icon: DollarSign },
          { id: 'commissions', label: 'Comissões', icon: Award },
          { id: 'network', label: 'Rede Multinível (3 Níveis)', icon: Layers },
          { id: 'statement', label: 'Extrato (Ledger)', icon: Clock },
          { id: 'withdraw', label: 'Saques PIX', icon: Wallet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AffiliateTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-amber-600 text-amber-700 bg-amber-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-sm font-semibold font-mono uppercase">Saldo Disponível</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 font-mono">
                R$ {stats.availableBalance.toFixed(2)}
              </p>
              <p className="text-sm text-slate-500 mt-1">Pronto para saque via PIX</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-sm font-semibold font-mono uppercase">Saldo Pendente</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-700 font-mono">
                R$ {stats.pendingBalance.toFixed(2)}
              </p>
              <p className="text-sm text-slate-500 mt-1">Aguardando janela de compensação</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-sm font-semibold font-mono uppercase">Total Recebido</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">
                R$ {stats.totalEarned.toFixed(2)}
              </p>
              <p className="text-sm text-slate-500 mt-1">R$ {stats.totalWithdrawn.toFixed(2)} já sacados</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-sm font-semibold font-mono uppercase">Rede Total (3 Níveis)</span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-700 font-mono">
                {stats.networkTotalCount} condutores
              </p>
              <p className="text-sm text-slate-500 mt-1">{stats.directReferralsCount} indicados diretos (N1)</p>
            </div>
          </div>

          {/* Commission Tier Explanatory & Network Snapshot */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  Estrutura de Ganhos em 3 Níveis
                </h3>
                <span className="text-sm font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Total até 17% de comissão
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <span className="text-sm font-bold uppercase font-mono text-amber-700 block">Nível 1 (Direto)</span>
                  <p className="text-2xl font-black text-amber-900 font-mono mt-1">10%</p>
                  <p className="text-sm text-slate-600 mt-1">Indicações feitas diretamente pelo seu link</p>
                </div>

                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl">
                  <span className="text-sm font-bold uppercase font-mono text-blue-700 block">Nível 2 (Indireto)</span>
                  <p className="text-2xl font-black text-blue-900 font-mono mt-1">5%</p>
                  <p className="text-sm text-slate-600 mt-1">Compras feitas pelos indicados do seu N1</p>
                </div>

                <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl">
                  <span className="text-sm font-bold uppercase font-mono text-purple-700 block">Nível 3 (Ancestral)</span>
                  <p className="text-2xl font-black text-purple-900 font-mono mt-1">2%</p>
                  <p className="text-sm text-slate-600 mt-1">Compras feitas pelos indicados do seu N2</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 flex items-start gap-2 border border-slate-200">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Regra de Imutabilidade Financeira:</strong> As comissões são geradas exclusivamente no momento em que o pagamento via PIX ou Cartão é confirmado e compensado. O percentual da época da venda permanece congelado para sempre.
                </p>
              </div>
            </div>

            {/* Quick Share Widget */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-600" />
                QR Code & Divulgação Rápida
              </h3>
              <div className="text-center py-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(referralUrl)}`}
                  alt="QR Code Afiliado"
                  className="w-36 h-36 mx-auto p-2 bg-white border border-slate-200 rounded-xl shadow-2xs"
                />
                <p className="text-sm font-mono text-slate-500 mt-2">
                  Aponte a câmera para testar a atribuição de cookies
                </p>
              </div>
              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? 'Link Copiado!' : 'Copiar Link de Divulgação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LINKS & MATERIAL */}
      {activeTab === 'links' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Seus Links de Rastreamento e Códigos</h2>
            <p className="text-sm text-slate-500 mt-1">
              Todos os acessos e cadastros realizados através destes links são automaticamente vinculados ao seu ID de afiliado por até 90 dias (cookie tracking).
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Link Direto da Página Inicial</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="w-full text-sm font-mono bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copiar
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Link com Cupom de Boas-Vindas Embutido</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${referralUrl}&cupom=DEFESAI10`}
                  className="w-full text-sm font-mono bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${referralUrl}&cupom=DEFESAI10`);
                    setFeedback('Link com cupom copiado com sucesso!');
                    setTimeout(() => setFeedback(null), 2500);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar
                </button>
              </div>
              <p className="text-sm text-slate-500 font-mono">Aplica 10% de desconto imediato para o comprador e credita a comissão para você.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SALES & COMMISSIONS */}
      {(activeTab === 'sales' || activeTab === 'commissions') && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Histórico de Comissões e Vendas da Rede</h2>
              <p className="text-sm text-slate-500 mt-1">Registros imutáveis gerados a partir de pedidos confirmados</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono uppercase text-sm">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Comprador</th>
                  <th className="py-3 px-4">Nível</th>
                  <th className="py-3 px-4">Valor Base</th>
                  <th className="py-3 px-4">Taxa</th>
                  <th className="py-3 px-4">Sua Comissão</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {commissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(comm.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">
                      {comm.buyerUserName}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-sm font-bold ${
                        comm.level === 1
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : comm.level === 2
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        Nível {comm.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      R$ {comm.baseAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {comm.appliedPercent}%
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-700">
                      R$ {comm.commissionAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-sm font-bold ${
                        comm.status === 'AVAILABLE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : comm.status === 'PAID'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : comm.status === 'REVERSED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {comm.status === 'AVAILABLE' ? 'Disponível' : comm.status === 'PAID' ? 'Pago' : comm.status === 'REVERSED' ? 'Estornado' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MULTILEVEL NETWORK */}
      {activeTab === 'network' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Sua Rede em 3 Níveis</h2>
            <p className="text-sm text-slate-500 mt-1">
              Visualização determinística de todos os condutores indicados direta e indiretamente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Level 1 */}
            <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/30">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200 mb-3">
                <span className="font-bold text-sm text-amber-900 font-mono">Nível 1 (Diretos - 10%)</span>
                <span className="font-mono text-sm font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  {treeData?.tree.level1?.length || 0} membros
                </span>
              </div>
              <div className="space-y-2">
                {treeData?.tree.level1?.map((user) => (
                  <div key={user.userId} className="p-2.5 bg-white border border-slate-200 rounded-lg text-sm">
                    <p className="font-bold text-slate-900">{user.userName}</p>
                    <div className="flex justify-between text-sm text-slate-500 font-mono mt-1">
                      <span>{user.totalPurchases} compras</span>
                      <span className="text-emerald-700 font-bold">R$ {user.totalSpent.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Level 2 */}
            <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200 mb-3">
                <span className="font-bold text-sm text-blue-900 font-mono">Nível 2 (Indiretos - 5%)</span>
                <span className="font-mono text-sm font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  {treeData?.tree.level2?.length || 0} membros
                </span>
              </div>
              <div className="space-y-2">
                {treeData?.tree.level2?.map((user) => (
                  <div key={user.userId} className="p-2.5 bg-white border border-slate-200 rounded-lg text-sm">
                    <p className="font-bold text-slate-900">{user.userName}</p>
                    <div className="flex justify-between text-sm text-slate-500 font-mono mt-1">
                      <span>{user.totalPurchases} compras</span>
                      <span className="text-emerald-700 font-bold">R$ {user.totalSpent.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Level 3 */}
            <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/30">
              <div className="flex items-center justify-between pb-2 border-b border-purple-200 mb-3">
                <span className="font-bold text-sm text-purple-900 font-mono">Nível 3 (Ancestrais - 2%)</span>
                <span className="font-mono text-sm font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                  {treeData?.tree.level3?.length || 0} membros
                </span>
              </div>
              <div className="space-y-2">
                {treeData?.tree.level3?.map((user) => (
                  <div key={user.userId} className="p-2.5 bg-white border border-slate-200 rounded-lg text-sm">
                    <p className="font-bold text-slate-900">{user.userName}</p>
                    <div className="flex justify-between text-sm text-slate-500 font-mono mt-1">
                      <span>{user.totalPurchases} compras</span>
                      <span className="text-emerald-700 font-bold">R$ {user.totalSpent.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: STATEMENT (LEDGER) */}
      {activeTab === 'statement' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">Extrato Financeiro Completo (Livro-Razão)</h2>
            <p className="text-sm text-slate-500 mt-1">Histórico auditável com saldo em conta após cada evento</p>
          </div>

          <div className="divide-y divide-slate-100">
            {withdrawHistory.map((w) => (
              <div key={w.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Saque PIX Transferido</p>
                    <p className="text-sm text-slate-500 font-mono">
                      Chave {w.pixKeyType}: {w.pixKey} • {new Date(w.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <p className="text-sm font-black text-rose-600">- R$ {w.amount.toFixed(2)}</p>
                  <span className="text-sm text-emerald-700 font-bold">Liquidado</span>
                </div>
              </div>
            ))}

            {commissions.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Comissão de Venda (Nível {c.level})</p>
                    <p className="text-sm text-slate-500 font-mono">
                      Comprador: {c.buyerUserName} • Ref: {c.paymentId}
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <p className="text-sm font-black text-emerald-600">+ R$ {c.commissionAmount.toFixed(2)}</p>
                  <span className="text-sm text-slate-400 font-mono">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: WITHDRAW */}
      {activeTab === 'withdraw' && (
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
              <Wallet className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Solicitar Saque via PIX Instantâneo</h2>
            <p className="text-sm text-slate-500">
              Transferência direta para sua conta bancária sem taxas
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Saldo Disponível para Saque:</span>
            <span className="text-lg font-black text-emerald-700 font-mono">
              R$ {stats.availableBalance.toFixed(2)}
            </span>
          </div>

          <form onSubmit={handleRequestWithdraw} className="space-y-4 text-sm">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Tipo de Chave PIX</label>
              <div className="grid grid-cols-4 gap-2">
                {(['cpf', 'email', 'phone', 'random'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPixKeyType(type)}
                    className={`py-2 px-1 text-center font-mono font-bold rounded-lg border uppercase transition-colors cursor-pointer text-sm ${
                      pixKeyType === type
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {type === 'cpf' ? 'CPF' : type === 'email' ? 'E-mail' : type === 'phone' ? 'Celular' : 'Aleatória'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Chave PIX do Titular</label>
              <input
                type="text"
                required
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Informe sua chave PIX"
                className="w-full text-sm font-mono bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Valor do Saque (R$)</label>
              <input
                type="number"
                min="20"
                max={stats.availableBalance}
                step="0.01"
                required
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                className="w-full text-sm font-black font-mono bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-emerald-600 outline-none"
              />
              <p className="text-sm text-slate-500 font-mono mt-1">Mínimo: R$ 20,00 • Sem taxa de conveniência</p>
            </div>

            <button
              type="submit"
              disabled={withdrawLoading || stats.availableBalance < 20}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer mt-4"
            >
              {withdrawLoading ? (
                <Clock className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {withdrawLoading ? 'Processando Transferência...' : 'Confirmar e Transferir Agora via PIX'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
export default AffiliatePortalView;
