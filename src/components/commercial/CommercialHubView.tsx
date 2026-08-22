import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Flame,
  Ticket,
  Gift,
  Share2,
  Coins,
  Award,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  Percent,
Activity,
} from 'lucide-react';
import { CommercialOverviewMetrics } from '../../types/commercial';
import { AdminCommercialPricesView } from './AdminCommercialPricesView';
import { AdminCommercialPromotionsView } from './AdminCommercialPromotionsView';
import { AdminCommercialCouponsView } from './AdminCommercialCouponsView';
import { AdminCommercialBonusesView } from './AdminCommercialBonusesView';
import { AdminCommercialReferralsView } from './AdminCommercialReferralsView';
import { AdminCommercialCommissionsView } from './AdminCommercialCommissionsView';
import { AdminCommercialSettingsView } from './AdminCommercialSettingsView';
import { AdminCommercialTestsView } from './AdminCommercialTestsView';

type TabKey =
  | 'overview'
  | 'prices'
  | 'promotions'
  | 'coupons'
  | 'bonuses'
  | 'referrals'
  | 'commissions'
  | 'settings'
  | 'tests';

export interface CommercialHubViewProps {
  initialTab?: TabKey;
}

export const CommercialHubView: React.FC<CommercialHubViewProps> = ({ initialTab = 'overview' }) => {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [metrics, setMetrics] = useState<CommercialOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/commercial/overview');
      const data = await res.json();
      setMetrics(data.metrics);
    } catch (err) {
      console.error('Failed to load commercial overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // Overview tab content (dashboard view)
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950/40 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-sm font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono">
                Módulo Comercial & Economia
              </span>
              <span className="text-slate-500 text-sm font-mono">•</span>
              <span className="text-slate-400 text-sm">Domínio Desacoplado do Motor Jurídico</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Gestão Comercial, Preços, Bônus & Indicações
            </h1>
            <p className="text-slate-400 text-sm sm:text-sm max-w-2xl">
              Administração de receita, campanhas promocionais, cupons de desconto, ledger de bônus e o programa multinível de indicação (3 níveis).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchOverview}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Dados
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GMV Volume */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Receita Bruta (GMV)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              R$ {(metrics?.totalRevenueGMV || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-emerald-400">
            <TrendingUp className="w-3 h-3" />
            <span>{metrics?.totalPaidOrders || 0} pedidos compensados</span>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Ticket Médio</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white font-mono">
              R$ {(metrics?.averageTicket || 0).toFixed(2)}
            </span>
          </div>
          <div className="mt-2 text-sm text-slate-400 font-mono">
            Conversão após diagnóstico gratuito
          </div>
        </div>

        {/* Comissões Geradas */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Comissões em 3 Níveis</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-violet-300 font-mono">
              R$ {(metrics?.totalCommissionsGenerated || 0).toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
            <span className="text-emerald-400">R$ {(metrics?.totalCommissionsPaid || 0).toFixed(2)} pagas</span>
            <span>•</span>
            <span className="text-amber-400">R$ {(metrics?.totalCommissionsPending || 0).toFixed(2)} a pagar</span>
          </div>
        </div>

        {/* Bônus Ativos */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Bônus em Circulação</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-300 font-mono">
              R$ {(metrics?.totalActiveBonuses || 0).toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
            <span>{metrics?.couponsRedeemedCount || 0} resgates de cupom</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Main Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-1.5 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          <button
            id="tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 font-mono ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Visão Geral</span>
          </button>

          <button
            id="tab-prices"
            onClick={() => setActiveTab('prices')}
            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 font-mono ${
              activeTab === 'prices'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Preços</span>
          </button>

          <button
            id="tab-promotions"
            onClick={() => setActiveTab('promotions')}
            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 font-mono ${
              activeTab === 'promotions'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Promoções</span>
          </button>

          <button
            id="tab-coupons"
            onClick={() => setActiveTab('coupons')}
            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 font-mono ${
              activeTab === 'coupons'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Cupons</span>
          </button>

          <button
            id="tab-bonuses"
            onClick={() => setActiveTab('bonuses')}
            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 font-mono ${
              activeTab === 'bonuses'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Bônus</span>
          </button>

          <button
            id="tab-referrals"
            onClick={() => setActiveTab('referrals')}
            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 font-mono ${
              activeTab === 'referrals'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Indicações</span>
          </button>

          <button
            id="tab-commissions"
            onClick={() => setActiveTab('commissions')}
            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 font-mono ${
              activeTab === 'commissions'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-violet-600 hover:text-violet-700 hover:bg-violet-50'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Comissões</span>
          </button>

          <button
            id="tab-settings"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 font-mono ${
              activeTab === 'settings'
                ? 'bg-slate-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Configurações</span>
          </button>

          <button
            id="tab-tests"
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 font-mono ${
              activeTab === 'tests'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Testes</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'prices' && <AdminCommercialPricesView />}
      {activeTab === 'promotions' && <AdminCommercialPromotionsView />}
      {activeTab === 'coupons' && <AdminCommercialCouponsView />}
      {activeTab === 'bonuses' && <AdminCommercialBonusesView />}
      {activeTab === 'referrals' && <AdminCommercialReferralsView />}
      {activeTab === 'commissions' && <AdminCommercialCommissionsView />}
      {activeTab === 'settings' && <AdminCommercialSettingsView />}
      {activeTab === 'tests' && <AdminCommercialTestsView />}
    </div>
  );
};
