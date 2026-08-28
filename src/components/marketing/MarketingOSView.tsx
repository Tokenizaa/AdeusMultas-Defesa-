import React, { useState, useEffect } from 'react';
import {
  Bot, LayoutDashboard, Target, FileText, CalendarClock, Radio,
  Zap, BarChart3, Settings, Sparkles, MessageSquare, ChevronDown,
  Plus, Check, Layers, Share2, Filter, ArrowRight
} from 'lucide-react';
import { useMarketingService } from './hooks/use-marketing-service';
import { MarketingDashboard } from './components/MarketingDashboard';
import { InboxView } from './components/InboxView';
import { ContentEditor } from './components/ContentEditor';
import { ChannelsView } from './components/ChannelsView';
import { MetaConnectionModal } from './meta/MetaConnectionModal';
import { ResultsView } from './components/ResultsView';
import { MarketingSettings } from './components/MarketingSettings';
import { MediaStudioView } from './components/MediaStudioView';
import { ProspectingAutomationView } from './components/ProspectingAutomationView';
import { ContentView } from './components/ContentView';
import { PublicationDashboard } from './components/PublicationDashboard';
import { EditorialContentItem } from '../../types';
import { useRouter } from '../../core/router/RouterContext';

export type ViewKey =
  | 'dashboard'
  | 'inbox'
  | 'contents'
  | 'publication'
  | 'studio'
  | 'channels'
  | 'results'
  | 'settings'
  | 'prospecting';

interface NavSection {
  group: string;
  items: {
    key: ViewKey;
    label: string;
    description: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    group: 'Operação & Atendimento',
    items: [
      { key: 'dashboard', label: 'Dashboard Geral', description: 'Métricas, agentes e status dos ciclos', icon: LayoutDashboard },
      { key: 'inbox', label: 'Inbox Unificado', description: 'WhatsApp (Evolution) & Meta (Direct/Messenger)', icon: MessageSquare, badge: 'Canais' },
    ],
  },
  {
    group: 'Criação & Editorial',
    items: [
      { key: 'contents', label: 'Conteúdo', description: 'Kanban editorial e biblioteca de conteúdos', icon: FileText },
      { key: 'studio', label: 'Estúdio Criativo IA', description: 'Gemini 3 Pro Image & Animação Veo 3.1', icon: Sparkles, badge: 'IA' },
    ],
  },
  {
    group: 'Distribuição & Automação',
    items: [
      { key: 'publication', label: 'Publicação', description: 'Agenda, fila e automações', icon: Radio },
      { key: 'channels', label: 'Canais Conectados', description: 'Meta Graph API & WhatsApp Evolution', icon: Radio },
    ],
  },
  {
    group: 'Inteligência & Ajustes',
    items: [
      { key: 'results', label: 'Análise de Resultados', description: 'Performance de alcance e conversão', icon: BarChart3 },
      { key: 'settings', label: 'Configurações de Marca', description: 'Identidade, tom de voz e regras OAB', icon: Settings },
    ],
  },
  {
    group: 'Crescimento & Aquisição',
    items: [
      { key: 'prospecting', label: 'Prospecção B2B Autônoma', description: 'Motor automático de prospecção WhatsApp', icon: Target },
    ],
  },
];

export const MarketingOSView: React.FC = () => {
  const { queryParams, params, navigate } = useRouter();
  const [activeView, setActiveView] = useState<ViewKey>('dashboard');
  useEffect(() => {
    const view = (params.view || queryParams.view) as ViewKey || 'dashboard';
    const legacyMap: Record<string, ViewKey> = {
      planning: 'contents',
      schedule: 'publication',
      automations: 'publication',
    };
    const resolved = legacyMap[view] || view;
    setActiveView(resolved);
  }, [params.view, queryParams.view]);

  const {
    agents,
    contents,
    metaState,
    brandIdentity,
    createManualContent,
    updateContentFields,
    fetchContentVersions,
    cycleCount,
    lastCycleAt,
    metrics,
    publisherQueue,
    publisherJobs,
    isLoadingContents,
    isLoadingMeta,
    updateContentStatus,
    refreshMarketingData,
    showMetaConnectModal,
    setShowMetaConnectModal,
    publishToMeta,
    connectMeta,
    disconnectMeta,
  } = useMarketingService();

  const scheduledPosts = metrics?.scheduledPosts ?? 0;
  const [editingContent, setEditingContent] = useState<{ item: EditorialContentItem | null; open: boolean }>({ item: null, open: false });
  const metaConnected = metaState?.isConnected ?? false;

  const handleCreateNewContent = async () => {
    const newCard = await createManualContent({
      title: 'Nova Defesa de Multa - Pauta Editorial',
      copyText: 'Diretrizes de defesa de trânsito fundamentadas no Código de Trânsito Brasileiro (CTB)...\n\n1. Identificação de vício formal no auto\n2. Prazo legal de expedição da notificação\n3. Instruções para o condutor recorrer',
      channel: 'instagram',
      format: 'carrossel',
      status: 'rascunho',
      hashtags: ['#AdeusMulta', '#DireitoDeTransito', '#CTB', '#RecursoDeMulta'],
    });
    if (newCard) {
      setEditingContent({ item: newCard, open: true });
    }
  };

  const renderConnectModal = () => (
    <MetaConnectionModal
      isOpen={showMetaConnectModal}
      onClose={() => setShowMetaConnectModal(false)}
      metaState={metaState}
      onConnectToken={async (token, pageId, igId) => {
        await connectMeta(token, pageId, igId);
      }}
      onDisconnect={async () => {
        await disconnectMeta();
      }}
      onRefresh={async () => {
        await refreshMarketingData();
      }}
    />
  );

  return (
    <>
      <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 space-y-5">
        {/* Top Header com Título e Ações Rápidas */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#155BCB] to-blue-700 flex items-center justify-center text-white shadow-xs shrink-0">
              <Bot className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#155BCB] uppercase tracking-wider font-mono bg-blue-50 px-2 py-0.5 rounded">
                  Marketing OS
                </span>
                <span className="text-xs text-slate-400 font-mono">• 7 Agentes Ativos</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                Central de Marketing & Aquisição
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Action Button: + Novo Conteúdo */}
            <button
              onClick={handleCreateNewContent}
              className="px-3.5 py-2.5 bg-[#155BCB] hover:bg-[#1149a4] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all hover:scale-[1.01]"
              title="Criar novo card editorial e abrir editor"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Conteúdo</span>
            </button>
          </div>
        </div>

        {/* View Switcher Routing */}
        <main className="min-h-[500px]">
          {activeView === 'dashboard' && (
            <MarketingDashboard
              agents={agents}
              metrics={metrics}
              cycleCount={cycleCount}
              lastCycleAt={lastCycleAt}
              publisherQueue={publisherQueue}
              scheduledPosts={scheduledPosts}
              metaConnected={metaConnected}
              onVerifyChannel={() => setShowMetaConnectModal(true)}
              onOpenStudio={() => {
                navigate(`/admin/marketing?view=studio`);
              }}
            />
          )}

          {activeView === 'inbox' && <InboxView />}

          {activeView === 'contents' && (
            <ContentView
              contents={contents}
              loading={isLoadingContents}
              onMove={updateContentStatus}
              onSelectContent={(item) => setEditingContent({ item, open: true })}
              onCreateNew={handleCreateNewContent}
            />
          )}

          {activeView === 'studio' && (
            <MediaStudioView onContentCreated={() => refreshMarketingData()} />
          )}

          {activeView === 'publication' && (
            <PublicationDashboard
              contents={contents}
              publisherQueue={publisherQueue}
              publisherJobs={publisherJobs}
              cycleCount={cycleCount}
              lastCycleAt={lastCycleAt}
              metaState={metaState}
              metrics={metrics}
            />
          )}

          {activeView === 'channels' && (
            <ChannelsView
              metaState={metaState}
              loading={isLoadingMeta}
              onConnect={() => setShowMetaConnectModal(true)}
              onDisconnect={disconnectMeta}
            />
          )}

          {activeView === 'results' && (
            <ResultsView metrics={metrics} loading={isLoadingContents} />
          )}

          {activeView === 'settings' && (
            <MarketingSettings brand={brandIdentity} />
          )}

          {activeView === 'prospecting' && (
            <ProspectingAutomationView />
          )}
        </main>

      </div>

      {renderConnectModal()}

      {/* Editor Drawer / Modal Overlay */}
      {editingContent.open && (
        <ContentEditor
          content={editingContent.item}
          brand={brandIdentity}
          onClose={() => setEditingContent({ item: null, open: false })}
          onSave={updateContentFields}
          onStatus={updateContentStatus}
          onChannel={(id, ch) => updateContentFields(id, { channel: ch })}
          onFetchVersions={fetchContentVersions}
          contents={contents}
          onPublishToMeta={publishToMeta}
        />
      )}
    </>
  );
};