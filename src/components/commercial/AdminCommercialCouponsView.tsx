import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  DollarSign,
  Search,
  Key,
  ShieldCheck,
  AlertTriangle,
  Play,
  Save,
  X,
} from 'lucide-react';
import { Coupon, CouponValidationResult } from '../../types/commercial';

export const AdminCommercialCouponsView: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Test Simulator State
  const [testCode, setTestCode] = useState('DEFESAI10');
  const [testAmount, setTestAmount] = useState(89.9);
  const [testService, setTestService] = useState('recurso_multa');
  const [testResult, setTestResult] = useState<CouponValidationResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(10);
  const [formMinOrderAmount, setFormMinOrderAmount] = useState<number>(0);
  const [formMaxDiscount, setFormMaxDiscount] = useState<string>('');
  const [formMaxUses, setFormMaxUses] = useState<string>('500');
  const [formMaxUsesPerUser, setFormMaxUsesPerUser] = useState<number>(1);
  const [formTargetService, setFormTargetService] = useState<string>('all');
  const [formExpiresAt, setFormExpiresAt] = useState<string>('2026-12-31');

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/commercial/coupons');
      const data = await res.json();
      setCoupons(data);
    } catch (err) {
      console.error('Failed to fetch coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleTestCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestLoading(true);
    try {
      const res = await fetch(`/api/commercial/coupons/${testCode}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderAmount: Number(testAmount),
          serviceType: testService,
          userId: 'test_admin_user',
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        valid: false,
        message: err.message || 'Erro na validação',
        discountAmount: 0,
        finalPrice: testAmount,
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: formCode.toUpperCase().trim(),
        discountType: formDiscountType,
        discountValue: Number(formDiscountValue),
        minOrderAmount: Number(formMinOrderAmount),
        maxDiscountAmount: formMaxDiscount ? Number(formMaxDiscount) : null,
        maxUsesTotal: formMaxUses ? Number(formMaxUses) : null,
        maxUsesPerUser: Number(formMaxUsesPerUser),
        targetServices: formTargetService === 'all' ? ['all'] : [formTargetService],
        isActive: true,
        expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
      };

      const res = await fetch('/api/admin/commercial/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback(`Cupom ${payload.code} criado com sucesso!`);
        setTimeout(() => setFeedback(null), 3000);
        setShowCreateModal(false);
        setFormCode('');
        fetchCoupons();
      } else {
        alert(data.error || 'Erro ao criar cupom');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/admin/commercial/coupons/${coupon.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      if (res.ok) fetchCoupons();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-sm font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
              Gestão de Cupons
            </span>
            <span className="text-slate-500 text-sm font-mono">•</span>
            <span className="text-slate-400 text-sm">Códigos Promocionais & Regras de Aplicação</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1">
            Cupons de Desconto & Resgates
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
            Novo Cupom
          </button>
        </div>
      </div>

      {/* Simulator Tool */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Simulador / Validador de Cupom em Tempo Real
          </h2>
        </div>

        <form onSubmit={handleTestCoupon} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <label className="block text-slate-400 font-mono mb-1">Código do Cupom</label>
            <input
              type="text"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value.toUpperCase())}
              placeholder="Ex: DEFESAI10"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono uppercase focus:outline-hidden focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-mono mb-1">Valor do Pedido (R$)</label>
            <input
              type="number"
              step="0.01"
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-hidden focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-mono mb-1">Serviço Destino</label>
            <select
              value={testService}
              onChange={(e) => setTestService(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-hidden focus:border-orange-500"
            >
              <option value="recurso_multa">Recurso de Multa</option>
              <option value="suspensao_cnh">Suspensão de CNH</option>
              <option value="cassacao_cnh">Cassação de CNH</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={testLoading}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-orange-400" />
              {testLoading ? 'Validando...' : 'Testar Cupom'}
            </button>
          </div>
        </form>

        {testResult && (
          <div
            className={`mt-3 p-3 rounded-lg border text-sm flex items-center justify-between font-mono ${
              testResult.valid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {testResult.valid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
              <span>{testResult.message}</span>
            </div>

            {testResult.valid && (
              <div className="flex items-center gap-4">
                <span>Desconto: <strong>- R$ {testResult.discountAmount.toFixed(2)}</strong></span>
                <span>Final: <strong>R$ {testResult.finalPrice.toFixed(2)}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Coupons Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-bold text-white">Cupons Cadastrados ({coupons.length})</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-sm border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Desconto</th>
                <th className="px-4 py-3">Usos / Limite</th>
                <th className="px-4 py-3">Por Usuário</th>
                <th className="px-4 py-3">Serviços</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {coupons.map((c) => (
                <tr key={c.code} className="hover:bg-slate-850/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {c.code}
                      </span>
                      <button
                        onClick={() => copyToClipboard(c.code)}
                        className="text-slate-500 hover:text-white p-1 rounded transition-colors cursor-pointer"
                        title="Copiar código"
                      >
                        {copiedCode === c.code ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-bold text-emerald-400">
                    {c.discountType === 'percentage' ? `${c.discountValue}%` : `R$ ${c.discountValue.toFixed(2)}`}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {c.usedCount} {c.maxUsesTotal ? `/ ${c.maxUsesTotal}` : '(Livre)'}
                  </td>

                  <td className="px-4 py-3 text-slate-400">
                    {c.maxUsesPerUser}x por CPF
                  </td>

                  <td className="px-4 py-3 text-slate-400">
                    {c.targetServices.join(', ')}
                  </td>

                  <td className="px-4 py-3 text-slate-400">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('pt-BR') : 'Indeterminado'}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-sm font-bold ${
                        c.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {c.isActive ? 'Ativo' : 'Desativado'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleCoupon(c)}
                      className={`px-2.5 py-1 rounded text-sm font-bold transition-colors cursor-pointer ${
                        c.isActive
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                      }`}
                    >
                      {c.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-sm font-mono uppercase text-orange-400 font-bold">
                  Novo Cupom
                </span>
                <h3 className="text-base font-bold text-white">Criar Código de Desconto</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Código do Cupom * (Letras e Números)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PROMO2026"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono uppercase text-sm focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Tipo</label>
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
                  <label className="block text-slate-400 font-medium mb-1">Desconto *</label>
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
                  <label className="block text-slate-400 font-medium mb-1">Total de Usos Máx.</label>
                  <input
                    type="number"
                    placeholder="Ex: 500 (Vazio = Livre)"
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Usos por Usuário</label>
                  <input
                    type="number"
                    min="1"
                    value={formMaxUsesPerUser}
                    onChange={(e) => setFormMaxUsesPerUser(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Data de Expiração</label>
                <input
                  type="date"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-hidden focus:border-orange-500"
                />
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
                  Criar Cupom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
