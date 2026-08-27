import React, { useState } from 'react';
import {
  ListChecks,
  Play,
  Users,
  MapPin,
  Clock,
  Send,
  AlertCircle,
  Plus,
  Loader2,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  TrendingUp,
  Award,
  X,
  Sliders,
  Filter,
} from 'lucide-react';
import type { Campaign, AutomationStatus, CampaignStep } from '../types/prospecting';

interface ProspectingCampaignsTabProps {
  campaigns: Campaign[];
  onStartCampaign: (id: string, limit?: number) => void;
  onCreateCampaign?: (campaignData: Partial<Campaign>) => Promise<boolean | void>;
  onToggleCampaignStatus?: (id: string, currentStatus: string) => Promise<void>;
  isLoading: boolean;
  status: AutomationStatus;
}

export const ProspectingCampaignsTab: React.FC<ProspectingCampaignsTabProps> = ({
  campaigns,
  onStartCampaign,
  onCreateCampaign,
  onToggleCampaignStatus,
  isLoading,
  status,
}) => {
  const [selectedBatchLimits, setSelectedBatchLimits] = useState<Record<string, number>>({});
  const [executingCampaignId, setExecutingCampaignId] = useState<string | null>(null);
  const [expandedStepsCampaignId, setExpandedStepsCampaignId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for New Campaign
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignType, setNewCampaignType] = useState('despachante');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');
  const [newCampaignInterval, setNewCampaignInterval] = useState(48);
  const [newCampaignCities, setNewCampaignCities] = useState('');
  const [newSteps, setNewSteps] = useState<CampaignStep[]>([
    { step: 1, delay_hours: 0, message: 'Olá {nome}, tudo bem? Sou da DefesAi. Ajudamos a automatizar recursos e análises de CNH.' },
    { step: 2, delay_hours: 48, message: 'Oi {nome}, conseguiu avaliar nossa proposta para despachantes em {cidade}?' },
    { step: 3, delay_hours: 96, message: '{nome}, última mensagem: caso queira testar nossa IA para defesa de multas, estamos à disposição!' },
  ]);

  const getLimitForCampaign = (id: string) => selectedBatchLimits[id] || 20;

  const handleSetLimit = (id: string, limit: number) => {
    setSelectedBatchLimits((prev) => ({ ...prev, [id]: limit }));
  };

  const handleExecute = async (id: string) => {
    setExecutingCampaignId(id);
    const limit = getLimitForCampaign(id);
    await onStartCampaign(id, limit);
    setExecutingCampaignId(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    setIsSubmitting(true);
    try {
      const citiesArray = newCampaignCities
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      if (onCreateCampaign) {
        await onCreateCampaign({
          name: newCampaignName.trim(),
          description: newCampaignDesc.trim() || undefined,
          lead_type: newCampaignType,
          target_cities: citiesArray,
          min_interval_hours: Number(newCampaignInterval) || 48,
          max_contacts: newSteps.length,
          steps: newSteps,
          status: 'active',
        });
      }
      setIsModalOpen(false);
      // Reset form
      setNewCampaignName('');
      setNewCampaignDesc('');
      setNewCampaignCities('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEngineRunning = status === 'RUNNING';

  return (
    <div className="space-y-5">
      {/* Engine Status Callout if not Running */}
      {!isEngineRunning && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-sm text-amber-300">
              O motor de automação está atualmente {status === 'PAUSED' ? 'PAUSADO' : 'PARADO'}
            </span>
            <p className="text-amber-200/80">
              Você pode cadastrar campanhas e abastecer filas normalmente. Os disparos só serão enviados pelo worker quando o motor estiver com o status <strong className="font-mono text-emerald-400">RUNNING</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Header Info & Create Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-orange-400" />
            <span>Campanhas Ativas & Cadências de Prospecção</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestão de réguas de abordagem multicanal com métricas operacionais isoladas
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-mono font-bold">
            {campaigns.length} cadastradas
          </span>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Campanha</span>
          </button>
        </div>
      </div>

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
            <ListChecks className="w-10 h-10 text-slate-600" />
            <span className="text-sm font-semibold text-slate-300">Nenhuma campanha cadastrada no banco.</span>
            <span className="text-xs text-slate-500">
              Clique em "Nova Campanha" para criar sua primeira cadência de prospecção B2B.
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {campaigns.map((campaign) => {
            const isExecuting = executingCampaignId === campaign.id && isLoading;
            const batchLimit = getLimitForCampaign(campaign.id);
            const isDespachante = campaign.lead_type === 'despachante';
            const isAdvogado = campaign.lead_type === 'advogado' || campaign.lead_type === 'advogado_transito';
            const isExpanded = expandedStepsCampaignId === campaign.id;
            const m = campaign.metrics;

            return (
              <div
                key={campaign.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all"
              >
                {/* Campaign Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span
                        className={`text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded-md border ${
                          isDespachante
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : isAdvogado
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {campaign.lead_type ? `Público: ${campaign.lead_type}` : 'Público Geral'}
                      </span>
                      <h3 className="text-base font-extrabold text-white mt-1.5">{campaign.name}</h3>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        campaign.status === 'paused'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {campaign.status === 'paused' ? 'PAUSADA' : 'ATIVA'}
                    </span>
                  </div>

                  {campaign.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {campaign.description}
                    </p>
                  )}
                </div>

                {/* Operational Metrics Panel (Dedicated) */}
                <div className="grid grid-cols-4 gap-2 bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Total Leads</span>
                    <span className="text-sm font-extrabold text-white font-mono mt-0.5 block">
                      {m ? m.total : campaign.total_leads || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Enviados</span>
                    <span className="text-sm font-extrabold text-blue-400 font-mono mt-0.5 block">
                      {m ? m.sent : 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Respostas</span>
                    <span className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5 block">
                      {m ? `${m.responded} (${m.responseRate}%)` : '0%'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Convertidos</span>
                    <span className="text-sm font-extrabold text-orange-400 font-mono mt-0.5 block">
                      {m ? `${m.converted} (${m.conversionRate}%)` : '0%'}
                    </span>
                  </div>
                </div>

                {/* Target Configuration info */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/40 rounded-xl p-2.5 border border-slate-800/60 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-mono uppercase">Cidades-Alvo</span>
                    <span className="font-bold text-slate-300 mt-0.5 block truncate">
                      {campaign.target_cities?.length ? `${campaign.target_cities.length} cidades` : 'Todas'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-mono uppercase">Intervalo</span>
                    <span className="font-bold text-slate-300 mt-0.5 block">
                      {campaign.min_interval_hours || 48}h entre msgs
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-mono uppercase">Cadência</span>
                    <span className="font-bold text-slate-300 mt-0.5 block">
                      {campaign.steps?.length || campaign.max_contacts || 3} etapas
                    </span>
                  </div>
                </div>

                {/* Cadence Steps Accordion */}
                {campaign.steps && campaign.steps.length > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setExpandedStepsCampaignId(isExpanded ? null : campaign.id)}
                      className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1 font-medium transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                        Ver Régua de Abordagem ({campaign.steps.length} mensagens)
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 pt-1 border-t border-slate-800">
                        {campaign.steps.map((step, idx) => (
                          <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-mono font-bold text-orange-400">
                                Etapa {step.step} {step.delay_hours === 0 ? '(Imediato)' : `(+${step.delay_hours}h)`}
                              </span>
                            </div>
                            <p className="text-slate-300 text-xs italic">
                              "{step.message}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Execution Controls */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Lote:</span>
                    <select
                      value={batchLimit}
                      onChange={(e) => handleSetLimit(campaign.id, Number(e.target.value))}
                      disabled={isExecuting}
                      className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-orange-400 focus:outline-none cursor-pointer"
                    >
                      <option value={10}>10 leads</option>
                      <option value={20}>20 leads</option>
                      <option value={50}>50 leads</option>
                      <option value={100}>100 leads</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleExecute(campaign.id)}
                    disabled={isExecuting || !isEngineRunning}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                      isEngineRunning
                        ? 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-orange-500/20'
                        : 'bg-slate-800 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                    title={!isEngineRunning ? 'Inicie o motor para executar' : `Enfileirar ${batchLimit} leads`}
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enfileirando...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Disparar para Fila</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Criar Nova Campanha */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-white">Criar Nova Campanha de Prospecção</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Nome da Campanha *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prospecção Despachantes SP Q3"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Tipo de Público *</label>
                  <select
                    value={newCampaignType}
                    onChange={(e) => setNewCampaignType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="despachante">Despachante de Trânsito</option>
                    <option value="advogado_transito">Advogado Direito de Trânsito</option>
                    <option value="autoescola">Autoescola / CFC</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Intervalo Mínimo (Horas)</label>
                  <input
                    type="number"
                    min={12}
                    max={168}
                    value={newCampaignInterval}
                    onChange={(e) => setNewCampaignInterval(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Cidades-Alvo (separadas por vírgula)</label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo, Campinas, Santos (deixe vazio para todas)"
                  value={newCampaignCities}
                  onChange={(e) => setNewCampaignCities(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Descrição / Objetivo</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Abordagem inicial para apresentação do módulo de recursos automáticos..."
                  value={newCampaignDesc}
                  onChange={(e) => setNewCampaignDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Steps configuration */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="font-semibold text-slate-200 block">
                  Templates de Mensagens (Variáveis: <code className="text-orange-400">{'{nome}'}</code>, <code className="text-orange-400">{'{cidade}'}</code>)
                </span>
                {newSteps.map((step, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-orange-400">
                        Mensagem {step.step} ({step.delay_hours === 0 ? 'Imediato' : `+${step.delay_hours}h delay`})
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={step.message}
                      onChange={(e) => {
                        const updated = [...newSteps];
                        updated[idx].message = e.target.value;
                        setNewSteps(updated);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newCampaignName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Campanha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

