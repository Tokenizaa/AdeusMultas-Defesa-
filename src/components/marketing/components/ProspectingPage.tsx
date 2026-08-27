import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from '../../../core/router/RouterContext';
import { useAuthFetch } from '../../../hooks/useAuthFetch';
import type {
  AutomationStatus,
  AutomationStatusResponse,
  HealthResponse,
  StatsResponse,
  Campaign,
  Lead,
  QueueJob,
} from '../types/prospecting';
import {
  ProspectingNav,
  ProspectingTabKey,
  ProspectingOverviewTab,
  ProspectingLeadsTab,
  ProspectingCampaignsTab,
  ProspectingAutomationTab,
  ProspectingQueueTab,
  ProspectingCollectionTab,
} from '../prospecting';

export const ProspectingPage: React.FC = () => {
  const router = useRouter();
  const authFetch = useAuthFetch();

  // Active tab derived from router params or URL path
  const activeTab: ProspectingTabKey = (() => {
    const rawView = router.params.prospectingView;
    if (
      rawView === 'leads' ||
      rawView === 'campaigns' ||
      rawView === 'automation' ||
      rawView === 'queue' ||
      rawView === 'collection'
    ) {
      return rawView;
    }
    const path = router.currentPath;
    if (path.includes('/prospecting/leads')) return 'leads';
    if (path.includes('/prospecting/campaigns')) return 'campaigns';
    if (path.includes('/prospecting/automation')) return 'automation';
    if (path.includes('/prospecting/queue')) return 'queue';
    if (path.includes('/prospecting/collection')) return 'collection';
    return 'overview';
  })();

  // Core Module State
  const [status, setStatus] = useState<AutomationStatus>('STOPPED');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [scrapeLoading, setScrapeLoading] = useState<boolean>(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);

  // Fetch all endpoints in parallel
  const fetchAll = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await Promise.allSettled([
        fetchStatus(),
        fetchHealth(),
        fetchStats(),
        fetchCampaigns(),
        fetchLeads(),
        fetchQueue(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [authFetch]);

  const fetchStatus = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/status');
      if (!res.ok) return;
      const data: AutomationStatusResponse = await res.json();
      if (data && data.status) {
        setStatus(data.status);
      }
    } catch (err) {
      console.warn('Erro ao obter status da automação:', err);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/health');
      if (!res.ok) return;
      const data: HealthResponse = await res.json();
      setHealth(data);
    } catch (err) {
      console.warn('Erro ao obter health da automação:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/stats');
      if (!res.ok) return;
      const data: StatsResponse = await res.json();
      setStats(data);
    } catch (err) {
      console.warn('Erro ao obter estatísticas da automação:', err);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/campaigns');
      if (!res.ok) return;
      const data: Campaign[] = await res.json();
      if (Array.isArray(data)) {
        setCampaigns(data);
      }
    } catch (err) {
      console.warn('Erro ao obter campanhas:', err);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/leads');
      if (!res.ok) return;
      const data: Lead[] = await res.json();
      if (Array.isArray(data)) {
        setLeads(data);
      }
    } catch (err) {
      console.warn('Erro ao obter leads:', err);
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await authFetch('/api/marketing/automation/queue');
      if (!res.ok) return;
      const data: QueueJob[] = await res.json();
      if (Array.isArray(data)) {
        setQueue(data);
      }
    } catch (err) {
      console.warn('Erro ao obter fila:', err);
    }
  };

  // Initial Load + Auto-polling every 8 seconds
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 8000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Engine Actions: Start, Pause, Stop
  const handleStartEngine = async () => {
    setActionLoading(true);
    try {
      const res = await authFetch('/api/marketing/automation/start', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatus('RUNNING');
        await fetchAll();
      } else {
        alert(data.error || 'Falha ao iniciar motor de automação.');
      }
    } catch (err) {
      alert('Erro de conexão ao iniciar automação.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseEngine = async () => {
    setActionLoading(true);
    try {
      const res = await authFetch('/api/marketing/automation/pause', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatus('PAUSED');
        await fetchAll();
      } else {
        alert(data.error || 'Falha ao pausar motor.');
      }
    } catch (err) {
      alert('Erro de conexão ao pausar automação.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopEngine = async () => {
    setActionLoading(true);
    try {
      const res = await authFetch('/api/marketing/automation/stop', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatus('STOPPED');
        await fetchAll();
      } else {
        alert(data.error || 'Falha ao parar motor.');
      }
    } catch (err) {
      alert('Erro de conexão ao parar automação.');
    } finally {
      setActionLoading(false);
    }
  };

  // Campaign Dispatch
  const handleStartCampaign = async (campaignId: string, limit: number = 20) => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/marketing/automation/campaigns/${campaignId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Campanha "${data.campaign || 'Campanha'}" adicionada à fila: ${data.enqueued || 0} jobs agendados.`);
        await fetchAll();
      } else {
        alert(data.error || 'Falha ao enfileirar campanha.');
      }
    } catch (err) {
      alert('Erro ao processar disparo da campanha.');
    } finally {
      setActionLoading(false);
    }
  };

  // Lead Scraping Trigger
  const handleScrape = async (queries: string[], cities: string[], limit: number) => {
    setScrapeLoading(true);
    setScrapeResult(null);
    try {
      const res = await authFetch('/api/marketing/automation/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries,
          cities,
          limitPerQuery: limit,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScrapeResult(data);
        await fetchAll();
      } else {
        alert(data.error || 'Falha ao executar raspagem.');
      }
    } catch (err) {
      alert('Erro ao conectar ao serviço de scraping.');
    } finally {
      setScrapeLoading(false);
    }
  };

  // Create Campaign Handler
  const handleCreateCampaign = async (campaignData: Partial<Campaign>) => {
    setActionLoading(true);
    try {
      const res = await authFetch('/api/marketing/automation/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchAll();
        return true;
      } else {
        alert(data.error || 'Falha ao criar campanha.');
        return false;
      }
    } catch (err) {
      alert('Erro de conexão ao criar campanha.');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Campaign Status Handler
  const handleToggleCampaignStatus = async (id: string, currentStatus: string) => {
    setActionLoading(true);
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const res = await authFetch(`/api/marketing/automation/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchAll();
      }
    } catch (err) {
      console.warn('Falha ao alternar status da campanha:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Render Sub-Page based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'leads':
        return <ProspectingLeadsTab leads={leads} isLoading={isRefreshing} />;
      case 'campaigns':
        return (
          <ProspectingCampaignsTab
            campaigns={campaigns}
            onStartCampaign={handleStartCampaign}
            onCreateCampaign={handleCreateCampaign}
            onToggleCampaignStatus={handleToggleCampaignStatus}
            isLoading={actionLoading}
            status={status}
          />
        );
      case 'automation':
        return (
          <ProspectingAutomationTab
            status={status}
            health={health}
            onStart={handleStartEngine}
            onPause={handlePauseEngine}
            onStop={handleStopEngine}
            onRefresh={fetchAll}
            isRefreshing={isRefreshing}
            isLoading={actionLoading}
          />
        );
      case 'queue':
        return <ProspectingQueueTab queue={queue} isLoading={isRefreshing} />;
      case 'collection':
        return (
          <ProspectingCollectionTab
            onScrape={handleScrape}
            isLoading={scrapeLoading}
            scrapeResult={scrapeResult}
          />
        );
      case 'overview':
      default:
        return (
          <ProspectingOverviewTab
            stats={stats}
            health={health}
            campaigns={campaigns}
            queue={queue}
            status={status}
            onStartEngine={handleStartEngine}
            onPauseEngine={handlePauseEngine}
            isLoadingAction={actionLoading}
          />
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Meta Business Suite Module Header & Navigation Bar */}
      <ProspectingNav
        activeTab={activeTab}
        status={status}
        leadCount={leads.length}
        queueCount={queue.length}
        campaignCount={campaigns.length}
        onRefresh={fetchAll}
        isRefreshing={isRefreshing}
      />

      {/* Subpage View Container */}
      <main className="min-h-[500px]">
        {renderTabContent()}
      </main>
    </div>
  );
};
