import { useState, useEffect, useCallback } from 'react';
import { 
  MarketingAgentState, 
  EditorialContentItem, 
  MetaAccountState,
  BrandIdentityConfig
} from '../../../types';
import { 
  getMetaStatus, 
  publishToMeta, 
  connectMetaWithToken, 
  disconnectMeta 
} from '../../../core/integrations/meta-client';

// Types for our hook
export interface MarketingOverallMetrics {
  monthlyReach: number;
  newCasesGenerated: number;
  conversionRate: number;
  publishedPosts: number;
  scheduledPosts: number;
}
export interface PublisherQueueItem {
  id: string;
  attempts: number;
  nextRetryAt: number;
  destination: 'facebook' | 'instagram' | 'both';
}
export interface PublisherJobRecord {
  id: string;
  channel: string;
  contentId?: string;
  status: 'delivered' | 'retrying' | 'failed' | 'rejected';
  attempts: number;
  createdAt: string;
  resolvedAt?: string;
}

interface UseMarketingServiceReturn {
  // State
  agents: MarketingAgentState[];
  contents: EditorialContentItem[];
  metaState: MetaAccountState | null;
  brandIdentity: BrandIdentityConfig | null;
  cycleCount: number;
  lastCycleAt: string | null;
  metrics: MarketingOverallMetrics | null;
  publisherQueue: PublisherQueueItem[];
  publisherJobs: PublisherJobRecord[];
  
  // Loading states
  isLoadingAgents: boolean;
  isLoadingContents: boolean;
  isLoadingMeta: boolean;
  isRunningCycle: boolean;
  isGeneratingContent: boolean;
  isPublishing: boolean;
  
  // Actions
  refreshMarketingData: () => Promise<void>;
  createManualContent: (initialData?: Partial<EditorialContentItem>) => Promise<EditorialContentItem | null>;
  updateContentStatus: (id: string, status: 'rascunho' | 'aprovado_qualidade' | 'reprovado_qualidade' | 'agendado' | 'publicado') => Promise<void>;
  updateContentFields: (id: string, fields: Partial<EditorialContentItem>, versionNote?: { agent?: string; author?: string; changes?: string }) => Promise<void>;
  fetchContentVersions: (id: string) => Promise<{ id: string; version: number; agent: string; author: string; changes: string; createdAt: string }[]>;
  runCycleTick: () => Promise<void>;
  generateContent: (theme: string, channel: string, format: string) => Promise<void>;
  publishToMeta: (destination: 'facebook' | 'instagram' | 'both', contentId: string) => Promise<void>;
  connectMeta: (token: string, pageId?: string, instagramAccountId?: string) => Promise<void>;
  disconnectMeta: () => Promise<void>;
  
  // UI States
  isCreatingContent: boolean;
  setIsCreatingContent: (val: boolean) => void;
  newTheme: string;
  setNewTheme: (val: string) => void;
  newChannel: 'instagram' | 'tiktok' | 'blog';
  setNewChannel: (val: 'instagram' | 'tiktok' | 'blog') => void;
  selectedContent: EditorialContentItem | null;
  setSelectedContent: (item: EditorialContentItem | null) => void;
  
  // Meta Connection UI
  showMetaConnectModal: boolean;
  setShowMetaConnectModal: (val: boolean) => void;
  manualToken: string;
  setManualToken: (val: string) => void;
  
  // Publish Result
  publishResult: {
    success: boolean;
    facebookPostId?: string;
    instagramMediaId?: string;
  } | null;
}

/**
 * Custom hook for marketing service logic
 * Separates business logic from UI presentation
 */
export const useMarketingService = (): UseMarketingServiceReturn => {
  // State
  const [agents, setAgents] = useState<MarketingAgentState[]>([]);
  const [contents, setContents] = useState<EditorialContentItem[]>([]);
  const [metaState, setMetaState] = useState<MetaAccountState | null>(null);
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentityConfig | null>(null);
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [lastCycleAt, setLastCycleAt] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MarketingOverallMetrics | null>(null);
  const [publisherQueue, setPublisherQueue] = useState<PublisherQueueItem[]>([]);
  const [publisherJobs, setPublisherJobs] = useState<PublisherJobRecord[]>([]);
  
  // Loading states
  const [isLoadingAgents, setIsLoadingAgents] = useState<boolean>(true);
  const [isLoadingContents, setIsLoadingContents] = useState<boolean>(true);
  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(true);
  const [isRunningCycle, setIsRunningCycle] = useState<boolean>(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  
  // UI States
  const [isCreatingContent, setIsCreatingContent] = useState<boolean>(false);
  const [newTheme, setNewTheme] = useState<string>('Multa de Radar Portátil em Rodovia: Falta de Estudo Técnico');
  const [newChannel, setNewChannel] = useState<'instagram' | 'tiktok' | 'blog'>('instagram');
  const [selectedContent, setSelectedContent] = useState<EditorialContentItem | null>(null);
  
  // Meta Connection UI
  const [showMetaConnectModal, setShowMetaConnectModal] = useState<boolean>(false);
  const [manualToken, setManualToken] = useState<string>('');
  
  // Publish Result
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    facebookPostId?: string;
    instagramMediaId?: string;
  } | null>(null);

  // Fetch marketing data (agents and contents)
  const refreshStatus = useCallback(async () => {
    try {
      setIsLoadingAgents(true);
      setIsLoadingContents(true);
      
      const res = await fetch('/api/marketing/status');
      const data = await res.json();
      
      setAgents(data.agents || []);
      setContents(data.contents || []);
      setCycleCount(data.cycleCount || 0);
      setLastCycleAt(data.lastCycleAt || null);
      setMetrics(data.overallMetrics || null);
      setPublisherQueue(data.publisherQueue || []);
      setPublisherJobs(data.publisherJobs || []);
      setBrandIdentity(data.brandIdentity || null);
    } catch (err) {
      console.error('Error loading marketing data:', err);
    } finally {
      setIsLoadingAgents(false);
      setIsLoadingContents(false);
    }
  }, []);

  // Alias compatível: refreshMarketingData = refreshStatus
  const refreshMarketingData = refreshStatus;

  // Criação manual de conteúdo
  const createManualContent = useCallback(async (initialData?: Partial<EditorialContentItem>) => {
    try {
      const res = await fetch('/api/marketing/contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: initialData?.title || 'Novo Conteúdo de Marketing',
          copyText: initialData?.copyText || 'Escreva o texto do post e orientações jurídicas aqui...',
          channel: initialData?.channel || 'instagram',
          format: initialData?.format || 'carrossel',
          status: initialData?.status || 'rascunho',
          hashtags: initialData?.hashtags || ['#AdeusMulta', '#DireitoDeTransito', '#CTB'],
          scheduledDate: initialData?.scheduledDate || new Date(Date.now() + 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16),
          imageUrl: initialData?.imageUrl || null,
          mediaUrl: initialData?.mediaUrl || null,
          visualPrompt: initialData?.visualPrompt || null,
        }),
      });
      const data = await res.json();
      if (data.success && data.content) {
        setContents((prev) => [data.content, ...prev]);
        setSelectedContent(data.content);
        return data.content as EditorialContentItem;
      }
    } catch (err) {
      console.error('Error creating manual content:', err);
    }
    return null;
  }, []);

  // Edição de texto/título com registro de versão (editor + macros IA)
  const updateContentFields = useCallback(async (id: string, fields: Partial<EditorialContentItem>, versionNote?: { agent?: string; author?: string; changes?: string }) => {
    const res = await fetch(`/api/marketing/contents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fields, versionNote }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.content) {
        setContents((prev) => prev.map((c) => (c.id === id ? data.content : c)));
      }
    }
  }, []);

  const fetchContentVersions = useCallback(async (id: string) => {
    const res = await fetch(`/api/marketing/contents/${id}/versions`);
    if (res.ok) {
      const data = await res.json();
      if (data.success) return data.versions;
    }
    return [];
  }, []);

  // Mudança de status via drag & drop no kanban (intervenção manual explícita)
  const updateContentStatus = useCallback(async (id: string, status: 'rascunho' | 'aprovado_qualidade' | 'reprovado_qualidade' | 'agendado' | 'publicado') => {
    const res = await fetch(`/api/marketing/contents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        setContents((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
      }
    }
  }, []);

  // Fetch Meta connection status
  const fetchMetaConnection = useCallback(async () => {
    try {
      setIsLoadingMeta(true);
      const state = await getMetaStatus();
      setMetaState(state);
    } catch (err) {
      console.error('Error fetching Meta status:', err);
      setMetaState(null);
    } finally {
      setIsLoadingMeta(false);
    }
  }, []);

  // Run cycle tick
  const runCycleTick = useCallback(async () => {
    setIsRunningCycle(true);
    try {
      const res = await fetch('/api/marketing/cycle-tick', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setAgents([...data.agents]);
        // Optionally refresh contents if needed
        // await refreshMarketingData();
      }
    } catch (err) {
      console.error('Error running cycle tick:', err);
    } finally {
      setIsRunningCycle(false);
    }
  }, []);

  // Generate content
  const generateContent = useCallback(async (theme: string, channel: string, format: string) => {
    setIsGeneratingContent(true);
    try {
      const res = await fetch('/api/marketing/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          channel,
          format,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setContents([data.content, ...contents]);
        setSelectedContent(data.content);
      }
    } catch (err) {
      console.error('Error generating content:', err);
    } finally {
      setIsGeneratingContent(false);
    }
  }, [contents]);

  // Publish to Meta
  const publishToMeta = useCallback(async (destination: 'facebook' | 'instagram' | 'both', contentId: string) => {
    const content = contents.find(c => c.id === contentId);
    if (!content) return;
    
    setIsPublishing(true);
    setPublishResult(null);
    
    try {
      const result = await publishToMeta({
        destination,
        message: `${content.copyText}\n\n${content.hashtags.join(' ')}`,
        mediaUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1080&q=80',
        linkUrl: 'https://defesai.com.br',
      });
      
      setPublishResult(result);
      
      // Update content status if published successfully
      if (result.success) {
        setContents(prev => 
          prev.map(c => 
            c.id === contentId 
              ? { ...c, status: 'publicado' as const } 
              : c
          )
        );
      }
    } catch (err: any) {
      console.error('Error publishing to Meta:', err);
      setPublishResult({
        success: false,
        // Error details would be in the err object if we had them from the API
      });
    } finally {
      setIsPublishing(false);
    }
  }, [contents]);

  // Meta connection actions
  const connectMeta = useCallback(async (token: string, pageId?: string, instagramAccountId?: string) => {
    try {
      const result = await connectMetaWithToken(token, pageId, instagramAccountId);
      if (result.success) {
        setMetaState(result.connection);
        setShowMetaConnectModal(false);
      }
    } catch (err: any) {
      console.error('Error connecting to Meta:', err);
      // In a real app, we might want to show an error to the user
    }
  }, []);

  const disconnectMeta = useCallback(async () => {
    try {
      await disconnectMeta();
      await fetchMetaConnection(); // Refresh status
    } catch (err: any) {
      console.error('Error disconnecting from Meta:', err);
    }
  }, [fetchMetaConnection]);

  // Initialize data on mount
  useEffect(() => {
    refreshMarketingData();
    fetchMetaConnection();
    
    // Set up interval for automatic refreshing (every 30 seconds)
    const intervalId = setInterval(() => {
      refreshMarketingData();
      fetchMetaConnection();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [refreshMarketingData, fetchMetaConnection]);

  return {
    // State
    agents,
    contents,
    metaState,
    brandIdentity,
    cycleCount,
    lastCycleAt,
    metrics,
    publisherQueue,
    publisherJobs,
    
    // Loading states
    isLoadingAgents,
    isLoadingContents,
    isLoadingMeta,
    isRunningCycle,
    isGeneratingContent,
    isPublishing,
    
    // Actions
    refreshMarketingData,
    createManualContent,
    updateContentStatus,
    updateContentFields,
    fetchContentVersions,
    runCycleTick,
    generateContent,
    publishToMeta,
    connectMeta,
    disconnectMeta,
    
    // UI States
    isCreatingContent,
    setIsCreatingContent,
    newTheme,
    setNewTheme,
    newChannel,
    setNewChannel,
    selectedContent,
    setSelectedContent,
    
    // Meta Connection UI
    showMetaConnectModal,
    setShowMetaConnectModal,
    manualToken,
    setManualToken,
    
    // Publish Result
    publishResult,
  };
};