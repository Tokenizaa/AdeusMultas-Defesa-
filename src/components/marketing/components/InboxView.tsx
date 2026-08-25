import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Bot,
  User,
  CheckCheck,
  Check,
  Shield,
  Car,
  AlertCircle,
  PlayCircle,
  Sparkles,
  Phone,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Tag,
  Paperclip,
} from 'lucide-react';
import {
  MarketingConversation,
  MarketingMessage,
  SupportedChannel,
  InboxStats,
  AIMode,
} from '../../../types/messaging';

export const InboxView: React.FC = () => {
  const [conversations, setConversations] = useState<MarketingConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MarketingMessage[]>([]);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modais e diagnósticos
  const [showSelfTestModal, setShowSelfTestModal] = useState(false);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simChannel, setSimChannel] = useState<SupportedChannel>('whatsapp_evolution');
  const [simName, setSimName] = useState('Mariana Costa');
  const [simPhone, setSimPhone] = useState('5511977665544');
  const [simPlate, setSimPlate] = useState('DEF-5G67');
  const [simText, setSimText] = useState('Olá! Fui multada por avançar sinal vermelho na Av. Paulista. Tem como recorrer?');
  const [isSimulating, setIsSimulating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carrega conversas e estatísticas
  const fetchConversations = async () => {
    try {
      const url = new URL('/api/marketing/inbox/conversations', window.location.origin);
      if (channelFilter !== 'all') url.searchParams.append('channel', channelFilter);
      if (searchQuery) url.searchParams.append('search', searchQuery);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        if (!activeConversationId && data.conversations?.length > 0) {
          setActiveConversationId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar conversas:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/marketing/inbox/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  };

  const fetchMessages = async (convId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/marketing/inbox/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchConversations(), fetchStats()]);
      setIsLoading(false);
    };
    init();

    // Polling suave para atualização em tempo real
    const interval = setInterval(() => {
      fetchConversations();
      fetchStats();
      if (activeConversationId) {
        fetchMessages(activeConversationId);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [channelFilter, searchQuery]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  // Envio de mensagem
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim() || !activeConversationId || isSending) return;

    const currentText = textInput;
    setTextInput('');
    setIsSending(true);

    try {
      const res = await fetch(`/api/marketing/inbox/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentText,
          senderName: 'Atendente DefesAi',
        }),
      });

      if (res.ok) {
        await fetchMessages(activeConversationId);
        await fetchConversations();
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Alterar Modo IA
  const handleToggleAIMode = async (newMode: AIMode) => {
    if (!activeConversationId) return;
    try {
      const res = await fetch(`/api/marketing/inbox/conversations/${activeConversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiMode: newMode }),
      });
      if (res.ok) {
        await fetchConversations();
      }
    } catch (err) {
      console.error('Erro ao alterar modo IA:', err);
    }
  };

  // Executar Self-Test
  const handleRunSelfTest = async () => {
    setIsRunningTest(true);
    try {
      const res = await fetch('/api/marketing/inbox/self-test', { method: 'POST' });
      const data = await res.json();
      setTestResults(data);
    } catch (err) {
      console.error('Erro no auto-teste:', err);
    } finally {
      setIsRunningTest(false);
    }
  };

  // Simular Mensagem Inbound
  const handleSimulateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      const res = await fetch('/api/marketing/inbox/simulate-inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: simChannel,
          senderName: simName,
          phoneOrId: simPhone,
          vehiclePlate: simPlate,
          text: simText,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowSimulateModal(false);
        await fetchConversations();
        await fetchStats();
        if (data.conversation?.id) {
          setActiveConversationId(data.conversation.id);
        }
      }
    } catch (err) {
      console.error('Erro ao simular mensagem:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const getChannelBadge = (ch: SupportedChannel) => {
    switch (ch) {
      case 'whatsapp_evolution':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            WhatsApp (Evolution)
          </span>
        );
      case 'meta_messenger':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Messenger
          </span>
        );
      case 'instagram_direct':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
            Instagram Direct
          </span>
        );
      case 'whatsapp_meta':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            WhatsApp Cloud
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Métricas de Mensageria */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Inbox Unificado Omnichannel</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Atendimento centralizado de WhatsApp (Evolution API), Facebook Messenger e Instagram Direct com IA de qualificação.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-self-test-messaging"
              onClick={() => {
                setShowSelfTestModal(true);
                handleRunSelfTest();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              Diagnóstico / Auto-Teste
            </button>

            <button
              id="btn-simulate-inbound"
              onClick={() => setShowSimulateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              Simular Mensagem Inbound
            </button>
          </div>
        </div>

        {/* Barra de estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Total de Conversas</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">{stats.totalConversations}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <span className="text-emerald-700 block">WhatsApp (Evolution)</span>
              <span className="text-sm font-bold text-emerald-900 mt-0.5 block">
                {stats.byChannel.whatsapp_evolution}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-pink-50/60 border border-pink-100">
              <span className="text-pink-700 block">Instagram Direct</span>
              <span className="text-sm font-bold text-pink-900 mt-0.5 block">
                {stats.byChannel.instagram_direct}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
              <span className="text-blue-700 block">Messenger</span>
              <span className="text-sm font-bold text-blue-900 mt-0.5 block">
                {stats.byChannel.meta_messenger}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-100">
              <span className="text-purple-700 block">Leads Qualificados</span>
              <span className="text-sm font-bold text-purple-900 mt-0.5 block">{stats.leadsGenerated}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
              <span className="text-amber-700 block">Respostas por IA</span>
              <span className="text-sm font-bold text-amber-900 mt-0.5 block">{stats.aiHandledPercentage}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Grid Principal do Inbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[640px]">
        {/* Coluna 1: Lista de Conversas (4 colunas no desktop) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
          {/* Barra de Filtros e Busca */}
          <div className="p-3 border-b border-slate-100 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, placa ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'whatsapp_evolution', label: 'WhatsApp' },
                { key: 'instagram_direct', label: 'Instagram' },
                { key: 'meta_messenger', label: 'Messenger' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setChannelFilter(filter.key)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    channelFilter === filter.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de cards de conversas */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Carregando conversas...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <p>Nenhuma conversa encontrada neste canal.</p>
                <button
                  onClick={() => setShowSimulateModal(true)}
                  className="text-indigo-600 hover:underline font-semibold"
                >
                  Simular uma mensagem de entrada
                </button>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    id={`conv-card-${conv.id}`}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                      isActive ? 'bg-slate-50/90 border-l-3 border-indigo-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={conv.contact.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${conv.contactId}`}
                      alt={conv.contact.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{conv.contact.name}</h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center gap-1.5">
                        {getChannelBadge(conv.channel)}
                        {conv.contact.vehiclePlate && (
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1 py-0.2 rounded border border-slate-200">
                            {conv.contact.vehiclePlate}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 truncate mt-1">{conv.lastMessageText}</p>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna 2: Chat & Histórico de Mensagens (5 colunas no desktop) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
          {activeConv ? (
            <>
              {/* Header do Chat */}
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <img
                    src={activeConv.contact.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeConv.contactId}`}
                    alt={activeConv.contact.name}
                    className="w-8 h-8 rounded-full border border-slate-200"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      {activeConv.contact.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {getChannelBadge(activeConv.channel)}
                      {activeConv.contact.phone && (
                        <span className="text-[10px] text-slate-500 font-mono">+{activeConv.contact.phone}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Seletor de Modo IA */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    onClick={() => handleToggleAIMode('auto')}
                    title="IA Automática (Responde mensagens de motoristas instantaneamente)"
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                      activeConv.aiMode === 'auto'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Bot className="w-3 h-3" />
                    Auto IA
                  </button>
                  <button
                    onClick={() => handleToggleAIMode('off')}
                    title="Atendimento Humano Manual"
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                      activeConv.aiMode === 'off'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-3 h-3" />
                    Manual
                  </button>
                </div>
              </div>

              {/* Área de mensagens */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
                {isLoadingMessages ? (
                  <div className="text-center text-xs text-slate-400 py-10">Carregando histórico...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-10">Nenhuma mensagem registrada nesta conversa.</div>
                ) : (
                  messages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
                    const isAI = msg.senderId.includes('ai') || msg.senderName.includes('IA');

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1 mb-0.5 text-[10px] text-slate-400 px-1">
                          {isAI && <Bot className="w-3 h-3 text-purple-600" />}
                          <span>{msg.senderName}</span>
                          <span>•</span>
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] rounded-xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                            isOutbound
                              ? isAI
                                ? 'bg-purple-600 text-white rounded-br-xs'
                                : 'bg-slate-900 text-white rounded-br-xs'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                          }`}
                        >
                          <p>{msg.text}</p>
                          {msg.mediaUrl && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-white/20">
                              <img src={msg.mediaUrl} alt="Mídia enviada" className="max-h-40 object-cover" />
                            </div>
                          )}
                        </div>

                        {isOutbound && (
                          <div className="mt-0.5 flex items-center gap-0.5 text-[10px] text-slate-400 px-1">
                            {msg.status === 'delivered' || msg.status === 'read' ? (
                              <CheckCheck className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-400" />
                            )}
                            <span className="capitalize">{msg.status}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Barra de Envio */}
              <form onSubmit={handleSendMessage} className="p-2.5 border-t border-slate-100 bg-white flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Responder via ${activeConv.channel.replace('_', ' ')}...`}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white"
                />

                <button
                  type="submit"
                  disabled={!textInput.trim() || isSending}
                  className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300" />
              <p className="text-xs">Selecione uma conversa para visualizar as mensagens e interagir.</p>
            </div>
          )}
        </div>

        {/* Coluna 3: Painel do Lead / CRM Jurídico (3 colunas no desktop) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col overflow-y-auto">
          {activeConv ? (
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  CRM & Qualificação de Multa
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">Perfil do Motorista</h3>
              </div>

              {/* Informações do Contato */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Nome Completo</span>
                  <span className="font-semibold text-slate-900">{activeConv.contact.name}</span>
                </div>
                {activeConv.contact.phone && (
                  <div>
                    <span className="text-slate-400 text-[10px] block">Telefone / WhatsApp</span>
                    <span className="font-mono text-slate-800">+{activeConv.contact.phone}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 text-[10px] block">Canal de Origem</span>
                  <div className="mt-0.5">{getChannelBadge(activeConv.channel)}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">ID do Usuário no Canal</span>
                  <span className="font-mono text-[10px] text-slate-600 truncate block">{activeConv.contact.externalId}</span>
                </div>
              </div>

              {/* Dados da Multa / Lead */}
              {activeConv.lead ? (
                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-700 font-bold text-[11px]">Infração Identificada</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      Score: {activeConv.lead.score}%
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block">Enquadramento CTB</span>
                    <p className="font-semibold text-slate-900 mt-0.5 leading-snug">
                      {activeConv.lead.infractionType || 'Art. 218 CTB'}
                    </p>
                  </div>

                  {activeConv.lead.vehiclePlate && (
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-white border border-indigo-200">
                        <Car className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Placa</span>
                        <span className="font-mono font-bold text-slate-900">{activeConv.lead.vehiclePlate}</span>
                      </div>
                    </div>
                  )}

                  {activeConv.lead.estimatedFineAmount && (
                    <div>
                      <span className="text-slate-500 text-[10px] block">Valor Estimado da Multa</span>
                      <span className="font-bold text-emerald-700">
                        R$ {activeConv.lead.estimatedFineAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {activeConv.lead.notes && (
                    <div className="pt-2 border-t border-indigo-100/80">
                      <span className="text-slate-500 text-[10px] block">Anotações do Caso</span>
                      <p className="text-[11px] text-slate-600 mt-0.5 italic">{activeConv.lead.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  Nenhum lead formalizado ainda para este contato.
                </div>
              )}

              {/* Ação Rápida */}
              <div className="pt-2">
                <button
                  onClick={() => alert(`Iniciando geração de recurso para ${activeConv.contact.name}...`)}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Gerar Defesa de Recurso
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-xs text-slate-400 my-auto">
              Selecione uma conversa para visualizar os detalhes do CRM.
            </div>
          )}
        </div>
      </div>

      {/* Modal de Auto-Teste / Diagnóstico de Mensageria */}
      {showSelfTestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Diagnóstico da Camada de Mensageria</h3>
              </div>
              <button
                onClick={() => setShowSelfTestModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-600">
                Verificação automatizada de ingestão de webhooks, normalização de DTOs, criação de contatos/conversas e roteamento outbound:
              </p>

              {isRunningTest ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                  <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin mx-auto" />
                  <p>Executando suite de testes de integração...</p>
                </div>
              ) : testResults ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {testResults.results?.map((res: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                        res.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                      }`}
                    >
                      {res.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold text-slate-900">{res.test}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">{res.details}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={handleRunSelfTest}
                disabled={isRunningTest}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
              >
                Rodar Teste Novamente
              </button>
              <button
                onClick={() => setShowSelfTestModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Simulação de Mensagem Inbound */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Simular Tráfego de Mensagem Inbound</h3>
              </div>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulateInbound} className="p-4 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Canal de Envio</label>
                <select
                  value={simChannel}
                  onChange={(e) => setSimChannel(e.target.value as SupportedChannel)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="whatsapp_evolution">WhatsApp (Evolution API)</option>
                  <option value="instagram_direct">Instagram Direct</option>
                  <option value="meta_messenger">Facebook Messenger</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Nome do Motorista</label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Placa (Opcional)</label>
                  <input
                    type="text"
                    value={simPlate}
                    onChange={(e) => setSimPlate(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Telefone / ID do Contato</label>
                <input
                  type="text"
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Texto da Mensagem</label>
                <textarea
                  rows={3}
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSimulating}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  {isSimulating ? 'Processando...' : 'Injetar Mensagem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
