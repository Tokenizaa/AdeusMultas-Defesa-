import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, LayoutDashboard, Target, FileText, CalendarClock, Radio,
  Zap, BarChart3, Settings, Sparkles, MessageSquare, ChevronDown,
  Plus, Check, Layers, Share2, Filter, ArrowRight
} from 'lucide-react';
import { useMarketingService } from './hooks/use-marketing-service';
import { MarketingDashboard } from './components/MarketingDashboard';
import { InboxView } from './components/InboxView';
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
import { EditorialContentItem } from '../../types';

export type ViewKey =
  | 'dashboard'
  | 'inbox'
  | 'planning'
  | 'contents'
  | 'studio'
  | 'schedule'
  | 'channels'
  | 'automations'
  | 'results'
  | 'settings';

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
      { key: 'planning', label: 'Kanban Editorial', description: 'Fluxo visual de produção e pautas', icon: Target },
      { key: 'contents', label: 'Biblioteca de Conteúdos', description: 'Acervo de copies, formatos e status', icon: FileText },
      { key: 'studio', label: 'Estúdio Criativo IA', description: 'Gemini 3 Pro Image & Animação Veo 3.1', icon: Sparkles, badge: 'IA' },
    ],
  },
  {
    group: 'Distribuição & Automação',
    items: [
      { key: 'schedule', label: 'Agendamento & Fila', description: 'Calendário e disparos programados', icon: CalendarClock },
      { key: 'automations', label: 'Automações de Postagem', description: 'Regras de publicação autônoma', icon: Zap },
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
];

export const MarketingOSView: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewKey>('dashboard');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Encontra item ativo
  const allNavItems = NAV_SECTIONS.flatMap(s => s.items);
  const currentNavItem = allNavItems.find(item => item.key === activeView) || allNavItems[0];
  const CurrentIcon = currentNavItem.icon;

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
        {/* Top Header com Dropdown de Navegação e Ações Rápidas */}
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
                Central de Marketing &amp; Aquisição
              </h1>
            </div>
          </div>

          {/* Navigation Dropdown & New Content Action */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                id="marketing-nav-dropdown-btn"
                onClick={() => setIsDropdownOpen(prev => !prev)}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-all shadow-2xs"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
              >
                <CurrentIcon className="w-4 h-4 text-[#155BCB]" />
                <span className="truncate max-w-[150px] sm:max-w-[200px]">{currentNavItem.label}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu Overlay */}
              {isDropdownOpen && (
                <div 
                  className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-40 animate-in fade-in slide-in-from-top-2 divide-y divide-slate-100"
                  role="menu"
                >
                  {NAV_SECTIONS.map((sec, secIdx) => (
                    <div key={secIdx} className="py-1.5 first:pt-0 last:pb-0">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        {sec.group}
                      </div>
                      <div className="space-y-0.5">
                        {sec.items.map((item) => {
                          const IconComponent = item.icon;
                          const isSelected = activeView === item.key;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => {
                                setActiveView(item.key);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 text-[#155BCB] font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                              }`}
                              role="menuitem"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#155BCB]' : 'text-slate-400'}`} />
                                <div className="min-w-0">
                                  <p className="text-xs truncate">{item.label}</p>
                                </div>
                              </div>
                              {item.badge && (
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                  isSelected ? 'bg-[#155BCB] text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                              {isSelected && !item.badge && (
                                <Check className="w-3.5 h-3.5 text-[#155BCB] shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Access Action Pills (Top 3 most frequent) */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'dashboard' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveView('inbox')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeView === 'inbox' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Inbox</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </button>
              <button
                onClick={() => setActiveView('planning')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'planning' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setActiveView('studio')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeView === 'studio' ? 'bg-white text-[#155BCB] shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Estúdio IA</span>
              </button>
            </div>

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
              onOpenStudio={() => setActiveView('studio')}
            />
          )}

          {activeView === 'inbox' && <InboxView />}

          {activeView === 'planning' && (
            <ContentKanban
              contents={contents}
              onMove={(id, status) => updateContentStatus(id, status)}
              onSelectContent={(item) => setEditingContent({ item, open: true })}
              onCreateNew={handleCreateNewContent}
            />
          )}

          {activeView === 'contents' && (
            <PublicationsView
              contents={contents}
              loading={isLoadingContents}
              onSelect={(item) => setEditingContent({ item, open: true })}
            />
          )}

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

          {activeView === 'results' && (
            <ResultsView metrics={metrics} loading={isLoadingContents} />
          )}

          {activeView === 'settings' && (
            <MarketingSettings brand={brandIdentity} />
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
