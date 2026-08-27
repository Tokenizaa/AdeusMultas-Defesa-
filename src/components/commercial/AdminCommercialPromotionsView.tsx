import React, { useState, useEffect } from 'react';
import {
  Flame,
  Plus,
  Calendar,
  Percent,
  DollarSign,
  Tag,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Users,
  Edit3,
  X,
  Save,
  Filter,
  TrendingUp,
} from 'lucide-react';
import { PromotionCampaign } from '../../types/commercial';
import { useAuthFetch } from '../../hooks/useAuthFetch';

export const AdminCommercialPromotionsView: React.FC = () => {
  const authFetch = useAuthFetch();
  const [promotions, setPromotions] = useState<PromotionCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<PromotionCampaign | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Create/Edit Form State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(15);
  const [formMinOrderAmount, setFormMinOrderAmount] = useState<number>(0);
  const [formMaxDiscount, setFormMaxDiscount] = useState<string>('');
  const [formIsFirstPurchase, setFormIsFirstPurchase] = useState<boolean>(false);
  const [formTargetService, setFormTargetService] = useState<string>('all');
  const [formStartDate, setFormStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState<string>('2026-12-31');
  const [formMaxUsageLimit, setFormMaxUsageLimit] = useState<string>('1000');

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      // FIX 1: sessão injetada (fetch cru resultava em 401 silenciado).
      const res = await authFetch('/api/admin/commercial/promotions');
      const data = await res.json();
      setPromotions(data);
    } catch (err) {
      console.error('Failed to fetch promotions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formName,
        description: formDescription,
        discountType: formDiscountType,
        discountValue: Number(formDiscountValue),
        minOrderAmount: Number(formMinOrderAmount),
        maxDiscountAmount: formMaxDiscount ? Number(formMaxDiscount) : null,
        targetServices: formTargetService === 'all' ? ['all'] : [formTargetService],
        isFirstPurchaseOnly: formIsFirstPurchase,
        startDate: formStartDate,
        endDate: formEndDate,
        maxUsageLimit: formMaxUsageLimit ? Number(formMaxUsageLimit) : null,
        status: 'active',
      };

      // FIX 1: sessão injetada.
      const res = await authFetch('/api/admin/commercial/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback(`Campanha '${formName}' criada com sucesso!`);
        setTimeout(() => setFeedback(null), 3000);
        setShowCreateModal(false);
        fetchPromotions();
      } else {
        alert(data.error || 'Erro ao criar promoção');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    }
  };

  const handleToggleStatus = async (promo: PromotionCampaign) => {
    const nextStatus = promo.status === 'active' ? 'paused' : 'active';
    try {
      // FIX 1: sessão injetada.
      const res = await authFetch(`/api/admin/commercial/promotions/${promo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchPromotions();
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-sm font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono">
              Campanhas Promocionais
            </span>
            <span className="text-slate-500 text-sm font-mono">•</span>
            <span className="text-slate-400 text-sm">Gestão de Descontos & Ofertas Sazonais</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1">
            Campanhas & Descontos Comerciais
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {feedback && (
            <div className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {feedback}
            </div>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Campanha
          </button>
        </div>
      </div>

      {/* Promotions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotions.map((promo) => {
          const isActive = promo.status === 'active';
          const isPaused = promo.status === 'paused';

          return (
            <div
              key={promo.id}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm relative group hover:border-slate-700 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-mono font-bold uppercase text-orange-400">
                      {promo.discountType === 'percentage' ? `${promo.discountValue}% OFF` : `R$ ${promo.discountValue.toFixed(2)} OFF`}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {promo.name}
                    </h3>
                  </div>

                  <span
                    className={`text-sm font-bold px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : isPaused
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {isActive ? 'Ativa' : isPaused ? 'Pausada' : 'Encerrada'}
                  </span>
                </div>

                <p className="text-sm text-slate-400 line-clamp-2">
                  {promo.description}
                </p>

                {/* Badges / Constraints */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {promo.isFirstPurchaseOnly && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-sm font-mono border border-blue-500/20">
                      1ª Compra Apenas
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-sm font-mono border border-slate-700">
                    Alvo: {(promo.targetServices ?? []).join(', ')}
                  </span>
                  {promo.minOrderAmount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-sm font-mono border border-slate-700">
                      Mín: R$ {promo.minOrderAmount.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Progress / Usage Stats */}
                <div className="pt-3 border-t border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-sm font-mono">
                    <span className="text-slate-400">Usos / Limite:</span>
                    <span className="text-white font-bold">
                      {promo.usageCount} {promo.maxUsageLimit ? `/ ${promo.maxUsageLimit}` : '(Ilimitado)'}
                    </span>
                  </div>
                  {promo.maxUsageLimit && (
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-orange-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (promo.usageCount / promo.maxUsageLimit) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Validity */}
                <div className="flex items-center justify-between text-sm text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-600" />
                    Validade:
                  </span>
                  <span>
                    {new Date(promo.startDate).toLocaleDateString('pt-BR')} até {new Date(promo.endDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleStatus(promo)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {isActive ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                  {isActive ? 'Pausar' : 'Ativar'}
                </button>

                <button
                  onClick={() => setSelectedPromo(promo)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 cursor-pointer"
                >
                  Ver Detalhes
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-sm font-mono uppercase text-orange-400 font-bold">
                  Nova Campanha
                </span>
                <h3 className="text-base font-bold text-white">
                  Criar Campanha Promocional
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Nome da Campanha *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Campanha de Conscientização CNH"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Descrição Pública / Regras
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: 15% de desconto para todos os recursos no mês de Maio..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Tipo de Desconto
                  </label>
                  <select
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-hidden focus:border-orange-500"
                  >
                    <option value="percentage">Percentual (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Valor do Desconto *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Data Início
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Data Término
                  </label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Limite Máx. de Usos (Cap)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 500 (Vazio = Ilimitado)"
                    value={formMaxUsageLimit}
                    onChange={(e) => setFormMaxUsageLimit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Serviço Aplicável
                  </label>
                  <select
                    value={formTargetService}
                    onChange={(e) => setFormTargetService(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-hidden focus:border-orange-500"
                  >
                    <option value="all">Todos os Serviços</option>
                    <option value="recurso_jari">Recurso JARI</option>
                    <option value="recurso_cetran">Recurso CETRAN</option>
                    <option value="suspensao_cnh">Suspensão de CNH</option>
                    <option value="cassacao_cnh">Cassação de CNH</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-300 font-medium">Exclusivo para 1ª Compra</span>
                <button
                  type="button"
                  onClick={() => setFormIsFirstPurchase(!formIsFirstPurchase)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    formIsFirstPurchase ? 'bg-orange-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                      formIsFirstPurchase ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Criar Campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
