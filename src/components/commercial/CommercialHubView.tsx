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
import { useRouter } from '../../core/router/RouterContext';

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

const VALID_TABS: TabKey[] = [
  'overview',
  'prices',
  'promotions',
  'coupons',
  'bonuses',
  'referrals',
  'commissions',
  'settings',
  'tests',
];

const getTabFromPath = (path: string, queryParams: Record<string, string>): TabKey => {
  const section = queryParams.section;
  if (section && VALID_TABS.includes(section as TabKey)) {
    return section as TabKey;
  }
  const segments = path.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (VALID_TABS.includes(last as TabKey)) {
    return last as TabKey;
  }
  return 'overview';
};

export const CommercialHubView: React.FC = () => {
  const { queryParams, navigate, currentPath } = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>(() => getTabFromPath(currentPath, queryParams));
  useEffect(() => {
    setActiveTab(getTabFromPath(currentPath, queryParams));
  }, [currentPath, queryParams.section]);

  const [metrics, setMetrics] = useState<CommercialOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);

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

  const renderOverviewTab = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {!loading && metrics ? (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-sm font-medium text-slate-400">Receita Total</span>
                <div className="text-2xl font-bold text-white font-mono">
                  R$ {metrics?.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00'}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-sm font-medium text-slate-400">Novos Clientes</span>
                <div className="text-2xl font-bold text-white font-mono">+{metrics?.newClients ?? 0}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-sm font-medium text-slate-400">Taxa de Conversão</span>
                <div className="text-2xl font-bold text-white font-mono">{metrics?.conversionRate?.toFixed(1)}%</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-sm font-medium text-slate-400">Ticket Médio</span>
                <div className="text-2xl font-bold text-white font-mono">
                  R$ {metrics?.averageTicket?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00'}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between h-16">
                  <span className="text-sm font-medium text-slate-400">Receita Total</span>
                  <span className="text-xs font-medium text-slate-500 animate-pulse">Carregando...</span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between h-16">
                  <span className="text-sm font-medium text-slate-400">Novos Clientes</span>
                  <span className="text-xs font-medium text-slate-500 animate-pulse">Carregando...</span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between h-16">
                  <span className="text-sm font-medium text-slate-400">Taxa de Conversão</span>
                  <span className="text-xs font-medium text-slate-500 animate-pulse">Carregando...</span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between h-16">
                  <span className="text-sm font-medium text-slate-400">Ticket Médio</span>
                  <span className="text-xs font-medium text-slate-500 animate-pulse">Carregando...</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Atividade Recent</h3>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-slate-500">Nenhuma atividade recente</div>
          </div>
        </div>
      </div>
  );
   };
  return (
    <>
      <div className="space-y-6">
        {/* Main Navigation Tabs - REMOVED, now handled via sidebar */}
        {/* The tabs are now in the sidebar, so we don't need to render them here */}

        <div className="space-y-6">
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
      </div>
    </>
  );
};