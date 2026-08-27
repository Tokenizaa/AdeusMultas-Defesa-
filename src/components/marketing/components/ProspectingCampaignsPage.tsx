import React, { useState, useEffect, useCallback } from 'react';
import {
  ListChecks,
  Plus,
  Play,
  Pause,
  Edit,
  Send,
  Users,
  CheckCircle2,
  Clock,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuthFetch } from '../../../hooks/useAuthFetch';
import type { Campaign, AutomationStatus } from '../types/prospecting';
import { ProspectingLayout } from './ProspectingLayout';

export const ProspectingCampaignsPage: React.FC = () => {
  const authFetch = useAuthFetch();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [status, setStatus] = useState<AutomationStatus>('STOPPED');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // New Campaign Form State
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLeadType, setNewLeadType] = useState<'despachante' | 'advogado' | 'autoescola'>('despachante');
  const [newTargetCities, setNewTargetCities] = useState('');
  const [newMaxContacts, setNewMaxContacts] = useState(3);
  const [newMinIntervalHours, setNewMinIntervalHours] = useState(48);

  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const [resCamp, resStatus] = await Promise.allSettled([
        authFetch('/api/marketing/automation/campaigns'),
        authFetch('/api/marketing/automation/status'),
      ]);

      if (resCamp.status === 'fulfilled' && resCamp.value.ok) {
        const data = await resCamp.value.json();
        if (Array.isArray(data)) setCampaigns(data);
      }

      if (resStatus.status === 'fulfilled' && resStatus.value.ok) {
        const statusData = await resStatus.value.json();
        if (statusData?.status) setStatus(statusData.status);
      }
    } catch (err) {
      console.warn('Erro ao carregar campanhas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleStartCampaign = async (campaignId: string) => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/marketing/automation/campaigns/${campaignId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Campanha iniciada com sucesso! ${data.enqueued || 0} contatos agendados.`);
        await fetchCampaigns();
      } else {
        alert(data.error || 'Falha ao iniciar campanha.');
      }
    } catch (err) {
      alert('Erro de conexão ao disparar campanha.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    setActionLoading(true);
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const res = await authFetch(`/api/marketing/automation/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchCampaigns();
      }
    } catch (err) {
      console.warn('Falha ao alternar status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setActionLoading(true);
    try {
      const citiesArray = newTargetCities
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const res = await authFetch('/api/marketing/automation/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          lead_type: newLeadType,
          target_cities: citiesArray,
          max_contacts: newMaxContacts,
          min_interval_hours: newMinIntervalHours,
          status: 'active',
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewName('');
        setNewDescription('');
        setNewTargetCities('');
        await fetchCampaigns();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Falha ao criar campanha.');
      }
    } catch (err) {
      alert('Erro ao cadastrar campanha.');
    } finally {
      setActionLoading(false);
    }
  };

  // Aggregated KPIs
  const totalLeads = campaigns.reduce((sum, c) => sum + (c.metrics?.total || 0), 0);
  const totalSent = campaigns.reduce((sum, c) => sum + (c.metrics?.sent || 0), 0);
  const totalResponded = campaigns.reduce((sum, c) => sum + (c.metrics?.responded || 0), 0);
  const totalConverted = campaigns.reduce((sum, c) => sum + (c.metrics?.converted || 0), 0);

  return (
    <ProspectingLayout
      activeTab="campaigns"
      status={status}
      campaignCount={campaigns.length}
      onRefresh={fetchCampaigns}
      isRefreshing={isLoading}
    >
      <div className="space-y-6">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-mono font-medium text-slate-400">Total em Campanhas</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-white">{totalLeads}</span>
              <span className="text-xs text-slate-500 font-mono">contatos</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-mono font-medium text-blue-400">Disparos Realizados</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-blue-400">{totalSent}</span>
              <span className="text-xs text-slate-500 font-mono">enviados</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-mono font-medium text-amber-400">Respostas Recebidas</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-amber-400">{totalResponded}</span>
              <span className="text-xs text-amber-500/80 font-mono">
                {totalSent > 0 ? `${Math.round((totalResponded / totalSent) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-mono font-medium text-emerald-400">Conversões B2B</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-emerald-400">{totalConverted}</span>
              <span className="text-xs text-emerald-500/80 font-mono">
                {totalSent > 0 ? `${Math.round((totalConverted / totalSent) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Section Header & Create Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-orange-400" />
              <span>Campanhas Ativas & Cadências de Prospecção</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestão de réguas de disparo e segmentações independentes da tabela geral de contatos
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-orange-500/20 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Campanha</span>
          </button>
        </div>

        {/* Campaigns List */}
        {isLoading && campaigns.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-orange-400" />
            <span>Carregando campanhas do banco de dados...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
            <ListChecks className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-white">Nenhuma campanha cadastrada</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Crie uma campanha de prospecção para definir o segmento-alvo (Despachante, Advogado) e a cadência de mensagens.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((camp) => {
              const isExpanded = expandedCampaignId === camp.id;
              const isActive = camp.status === 'active';
              const metrics = camp.metrics || {
                total: 0,
                sent: 0,
                responded: 0,
                converted: 0,
                responseRate: 0,
                conversionRate: 0,
              };

              return (
                <div
                  key={camp.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all"
                >
                  {/* Card Header */}
                  <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase border ${
                            isActive
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {isActive ? 'Ativa' : 'Pausada'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold uppercase">
                          {camp.lead_type}
                        </span>
                        {camp.target_cities && camp.target_cities.length > 0 && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            Cidades: {camp.target_cities.join(', ')}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-white">{camp.name}</h3>
                      {camp.description && (
                        <p className="text-xs text-slate-400">{camp.description}</p>
                      )}
                    </div>

                    {/* Operational Metrics Pill */}
                    <div className="grid grid-cols-4 gap-2 bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 text-center">
                      <div>
                        <span className="block text-[10px] text-slate-500 font-mono">TOTAL</span>
                        <span className="text-sm font-black text-white">{metrics.total}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-mono">ENVIADOS</span>
                        <span className="text-sm font-black text-blue-400">{metrics.sent}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-mono">RESPOSTAS</span>
                        <span className="text-sm font-black text-amber-400">{metrics.responded}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-mono">CONVERSÃO</span>
                        <span className="text-sm font-black text-emerald-400">{metrics.conversionRate}%</span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleStatus(camp.id, camp.status)}
                        disabled={actionLoading}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                        title={isActive ? 'Pausar campanha' : 'Ativar campanha'}
                      >
                        {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        <span>{isActive ? 'Pausar' : 'Ativar'}</span>
                      </button>

                      <button
                        onClick={() => handleStartCampaign(camp.id)}
                        disabled={actionLoading || !isActive}
                        className="px-3.5 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20 cursor-pointer disabled:opacity-50"
                        title="Enfileirar próximo lote de leads"
                      >
                        <Send className="w-4 h-4" />
                        <span>Disparar Lote</span>
                      </button>

                      <button
                        onClick={() => setExpandedCampaignId(isExpanded ? null : camp.id)}
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
                        title="Ver passos da cadência"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Cadence Step View */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-950/60 p-5 space-y-4">
                      <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4 h-4 text-orange-400" />
                        <span>Passos da Régua de Comunicação ({camp.steps?.length || 0} Etapas)</span>
                      </h4>

                      <div className="space-y-3">
                        {(camp.steps || []).map((step, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-orange-400 font-mono">
                                Etapa {step.step || idx + 1}
                              </span>
                              <span className="text-slate-500 font-mono flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {step.delay_hours === 0 ? 'Disparo Imediato' : `+${step.delay_hours} horas`}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg font-mono border border-slate-800/80">
                              {step.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Nova Campanha */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-orange-400" />
                  <span>Nova Campanha de Prospecção</span>
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">Nome da Campanha</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Aquisição Despachantes Grande SP"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">Descrição / Objetivo</label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Ex: Apresentar módulo de defesa de pontuação CNH"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-400">Público-Alvo</label>
                    <select
                      value={newLeadType}
                      onChange={(e) => setNewLeadType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="despachante">Despachante de Trânsito</option>
                      <option value="advogado">Advogado de Trânsito</option>
                      <option value="autoescola">Autoescola (CFC)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-400">Cidades (separadas por vírgula)</label>
                    <input
                      type="text"
                      value={newTargetCities}
                      onChange={(e) => setNewTargetCities(e.target.value)}
                      placeholder="São Paulo, Campinas, Santos"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-400">Máx. Mensagens por Lead</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={newMaxContacts}
                      onChange={(e) => setNewMaxContacts(parseInt(e.target.value) || 3)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-400">Intervalo Mínimo (Horas)</label>
                    <input
                      type="number"
                      min={12}
                      max={168}
                      value={newMinIntervalHours}
                      onChange={(e) => setNewMinIntervalHours(parseInt(e.target.value) || 48)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20"
                  >
                    Salvar Campanha
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProspectingLayout>
  );
};
