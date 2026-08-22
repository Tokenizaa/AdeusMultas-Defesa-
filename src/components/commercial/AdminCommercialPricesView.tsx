import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Edit3,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Calendar,
  Save,
  X,
  Plus,
  ArrowRight,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { ServicePricing, PriceHistoryEntry } from '../../types/commercial';

export const AdminCommercialPricesView: React.FC = () => {
  const [pricings, setPricings] = useState<ServicePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPricing, setEditingPricing] = useState<ServicePricing | null>(null);
  const [historyPricing, setHistoryPricing] = useState<ServicePricing | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [formStandardPrice, setFormStandardPrice] = useState<number>(0);
  const [formPromoPrice, setFormPromoPrice] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formReason, setFormReason] = useState<string>('');

  const fetchPricings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/commercial/prices');
      const data = await res.json();
      setPricings(data);
    } catch (err) {
      console.error('Failed to fetch pricings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricings();
  }, []);

  const openEditModal = (p: ServicePricing) => {
    setEditingPricing(p);
    setFormStandardPrice(p.standardPrice);
    setFormPromoPrice(p.promotionalPrice !== null ? String(p.promotionalPrice) : '');
    setFormIsActive(p.isActive);
    setFormReason('');
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPricing) return;

    if (!formReason.trim()) {
      alert('Por favor, informe a justificativa da alteração de preço para auditoria.');
      return;
    }

    setSaveLoading(true);
    try {
      const res = await fetch(`/api/admin/commercial/prices/${editingPricing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standardPrice: Number(formStandardPrice),
          promotionalPrice: formPromoPrice ? Number(formPromoPrice) : null,
          isActive: formIsActive,
          reason: formReason,
          changedBy: 'Admin Diretor Comercial',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback(`Preço do serviço '${editingPricing.serviceName}' atualizado com sucesso!`);
        setTimeout(() => setFeedback(null), 3000);
        setEditingPricing(null);
        fetchPricings();
      } else {
        alert(data.error || 'Erro ao salvar alteração');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-sm font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono">
              Gestão de Preços
            </span>
            <span className="text-slate-500 text-sm font-mono">•</span>
            <span className="text-slate-400 text-sm">Tabela Oficial de Serviços</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1">
            Preços por Categoria de Serviço & Minuta Jurídica
          </h1>
        </div>

        {feedback && (
          <div className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {feedback}
          </div>
        )}
      </div>

      {/* Critical Business Rule Warning */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-sm text-slate-300">
        <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Regra Estrutural de Cobrança:</p>
          <p className="text-slate-400 leading-relaxed">
            O preço <strong className="text-orange-400 font-bold">NÃO</strong> aparece nem é cobrado durante a etapa gratuita de análise de infração (Diagnóstico Preliminar). A análise preliminar e detecção de vícios é sempre 100% gratuita. Os valores abaixo entram no fluxo apenas no momento da contratação da minuta/peça jurídica.
          </p>
        </div>
      </div>

      {/* Pricing Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pricings.map((p) => {
          const effectivePrice = p.promotionalPrice ?? p.standardPrice;
          const hasDiscount = p.promotionalPrice !== null && p.promotionalPrice < p.standardPrice;

          return (
            <div
              key={p.id}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-mono font-bold uppercase text-slate-500">
                      {p.serviceType}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {p.serviceName}
                    </h3>
                  </div>

                  <span
                    className={`text-sm font-bold px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${
                      p.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {p.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <p className="text-sm text-slate-400 line-clamp-2">
                  {p.description}
                </p>

                {/* Price Display */}
                <div className="pt-3 border-t border-slate-800 flex items-baseline justify-between">
                  <div>
                    <span className="text-sm text-slate-500 uppercase font-mono block">Valor Cobrado</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white font-mono">
                        R$ {effectivePrice.toFixed(2)}
                      </span>
                      {hasDiscount && (
                        <span className="text-sm text-slate-500 line-through font-mono">
                          R$ {p.standardPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {hasDiscount && (
                    <span className="text-sm font-bold px-2 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono">
                      Promoção Ativa
                    </span>
                  )}
                </div>

                {/* Last Update */}
                <div className="text-sm text-slate-500 flex items-center justify-between font-mono pt-1">
                  <span>Atualizado por:</span>
                  <span className="text-slate-400">{p.updatedBy}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setHistoryPricing(p)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  Histórico ({p.history.length})
                </button>

                <button
                  onClick={() => openEditModal(p)}
                  className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-sm font-bold flex items-center gap-1.5 border border-orange-500/30 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Alterar Preço
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Price Modal */}
      {editingPricing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-sm font-mono uppercase text-orange-400 font-bold">
                  Editar Tabela de Preço
                </span>
                <h3 className="text-base font-bold text-white">
                  {editingPricing.serviceName}
                </h3>
              </div>
              <button
                onClick={() => setEditingPricing(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Preço Padrão (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={formStandardPrice}
                  onChange={(e) => setFormStandardPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Preço Promocional (R$) <span className="text-slate-500">(Opcional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Deixar em branco para desativar promoção"
                  value={formPromoPrice}
                  onChange={(e) => setFormPromoPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-orange-500"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Quando preenchido, o preço promocional será o valor efetivamente cobrado.
                </p>
              </div>

              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-300 font-medium">Serviço Ativo para Venda</span>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    formIsActive ? 'bg-orange-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                      formIsActive ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Justificativa da Alteração * <span className="text-orange-400">(Obrigatório para Auditoria)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Ex: Ajuste para campanha trimestral de conversão..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPricing(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-500/20"
                >
                  <Save className="w-4 h-4" />
                  {saveLoading ? 'Salvando...' : 'Salvar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Drawer Modal */}
      {historyPricing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-sm font-mono uppercase text-orange-400 font-bold">
                  Auditoria de Preços
                </span>
                <h3 className="text-base font-bold text-white">
                  Histórico: {historyPricing.serviceName}
                </h3>
              </div>
              <button
                onClick={() => setHistoryPricing(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {(!historyPricing.history || historyPricing.history.length === 0) ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Nenhuma alteração registrada ainda para este serviço.
                </div>
              ) : (
                (historyPricing.history || []).map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1.5 text-sm font-mono"
                  >
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>{new Date(h.changedAt).toLocaleString('pt-BR')}</span>
                      <span className="text-orange-400 font-bold">{h.changedBy}</span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-300">
                      <div>
                        <span className="text-slate-500 text-sm block">Padrão Anterior:</span>
                        <span>R$ {h.previousStandardPrice.toFixed(2)}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <div>
                        <span className="text-slate-500 text-sm block">Novo Padrão:</span>
                        <span className="text-emerald-400 font-bold">R$ {h.newStandardPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    {h.newPromoPrice !== null && (
                      <div className="text-sm text-amber-400">
                        Promoção: R$ {h.newPromoPrice.toFixed(2)}
                      </div>
                    )}

                    <div className="text-sm text-slate-400 font-sans italic pt-1 border-t border-slate-900">
                      "{h.reason}"
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setHistoryPricing(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
