import React, { useState } from 'react';
import {
  Bot, LayoutDashboard, Target, FileText, CalendarClock, Radio,
  Zap, BarChart3, Settings, Sparkles,
} from 'lucide-react';
import { useMarketingService } from './hooks/use-marketing-service';
import { MarketingDashboard } from './components/MarketingDashboard';
import { ContentKanban } from './components/ContentKanban';
import { PublicationsView } from './components/PublicationsView';
import { ContentEditor } from './components/ContentEditor';
import { ScheduleView } from './components/ScheduleView';
import { ChannelsView } from './components/ChannelsView';
import { MetaConnectionModal } from './meta/MetaConnectionModal';
import { AutomationsView } from './components/AutomationsView';
import { ResultsView } from './components/ResultsView';
import { MarketingSettings } from './components/MarketingSettings';
import { MediaStudioView } from './components/MediaStudioView';

type ViewKey =
  | 'dashboard'
  | 'planning'
  | 'contents'
  | 'studio'
  | 'schedule'
  | 'channels'
  | 'automations'
  | 'results'
  | 'settings';

/**
 * Marketing OS — navegação por tabs (modelo v1: menu, sem sidebar lateral).
 * Conteúdos com biblioteca robusta (tabs/filtros/lista-cards/Menu IA real).
 */
export const MarketingOSView: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewKey>('dashboard');
  const {
    agents,
    contents,
    metaState,
    brandIdentity,
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
    manualToken,
    setManualToken,
    connectMeta,
    disconnectMeta,
  } = useMarketingService();

  const scheduledPosts = metrics?.scheduledPosts ?? 0;
  const [editingContent, setEditingContent] = useState<{ item: typeof contents[number] | null; open: boolean }>({ item: null, open: false });
  const metaConnected = metaState?.isConnected ?? false;

  const NAV: { key: ViewKey; label: string; icon: React.ElementType }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'planning', label: 'Planejamento', icon: Target },
    { key: 'contents', label: 'Conteúdos', icon: FileText },
    { key: 'studio', label: 'Estúdio IA (Imagens & Veo)', icon: Sparkles },
    { key: 'schedule', label: 'Agendamento', icon: CalendarClock },
    { key: 'automations', label: 'Automações', icon: Zap },
    { key: 'channels', label: 'Canais', icon: Radio },
    { key: 'results', label: 'Resultados', icon: BarChart3 },
    { key: 'settings', label: 'Configurações', icon: Settings },
  ];

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

  const renderContents = () => (
    <PublicationsView
      contents={contents}
      loading={isLoadingContents}
      onSelect={(item) => setEditingContent({ item, open: true })}
    />
  );

  return (
    <>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-5">
        <div>
          <span className="text-sm font-bold text-orange-500 uppercase tracking-wider font-mono flex items-center gap-1">
            <Bot className="w-3.5 h-3.5 text-orange-500" />
            Organismo Autônomo • 7 Agentes de Aquisição
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">Marketing OS</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ciclo autônomo, biblioteca de conteúdos e automações — modelo v1 (DefesAi).
          </p>
        </div>

        {/* Navegação */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-1.5 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 min-w-max">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                id={`marketing-tab-${key}`}
                onClick={() => setActiveView(key)}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 font-mono ${
                  activeView === key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
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
            onOpenStudio={() => setActiveView('studio')}
          />
        )}
        {activeView === 'planning' && (
          <ContentKanban contents={contents} onMove={(id, status) => updateContentStatus(id, status)} />
        )}
        {activeView === 'contents' && renderContents()}
        {activeView === 'studio' && (
          <MediaStudioView onContentCreated={() => refreshMarketingData()} />
        )}
        {activeView === 'schedule' && (
          <ScheduleView
            contents={contents}
            publisherQueue={publisherQueue}
            cycleCount={cycleCount}
            lastCycleAt={lastCycleAt}
          />
        )}
        {activeView === 'automations' && (
          <AutomationsView
            publisherQueue={publisherQueue}
            publisherJobs={publisherJobs}
            contents={contents}
            metrics={metrics}
            metaState={metaState}
            cycleCount={cycleCount}
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
        {activeView === 'results' && <ResultsView metrics={metrics} loading={isLoadingContents} />}
        {activeView === 'settings' && <MarketingSettings brand={brandIdentity} />}
      </div>

      {renderConnectModal()}

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
        />
      )}
    </>
  );
};