import React, { useState, useEffect } from 'react';
import {
  Gift,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
  History,
  ShieldCheck,
  X,
  Save,
  Sliders,
  DollarSign,
} from 'lucide-react';
import { BonusLedgerEntry } from '../../types/commercial';

export const AdminCommercialBonusesView: React.FC = () => {
  const [ledger, setLedger] = useState<BonusLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [formUserId, setFormUserId] = useState('');
  const [formUserName, setFormUserName] = useState('');
  const [formAmount, setFormAmount] = useState<number>(20);
  const [formOrigin, setFormOrigin] = useState<string>('manual_adjustment');
  const [formReason, setFormReason] = useState('');

  const fetchBonuses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/commercial/bonus-ledger');
      const data = await res.json();
      setLedger(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch bonuses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBonuses();
  }, []);

  const handleCreditBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReason.trim()) {
      alert('Justificativa obrigatória para auditoria de bônus.');
      return;
    }

    try {
      const res = await fetch('/api/admin/commercial/bonus/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: formUserId.trim() || `usr_${Date.now()}`,
          userName: formUserName.trim() || 'Condutor Beneficiado',
          amount: Number(formAmount),
          origin: formOrigin,
          reason: formReason,
          adminAuthor: 'Admin Comercial',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback(`Bônus de R$ ${formAmount} creditado com sucesso!`);
        setTimeout(() => setFeedback(null), 3000);
        setShowCreditModal(false);
        setFormReason('');
        setFormUserId('');
        setFormUserName('');
        fetchBonuses();
      } else {
        alert(data.error || 'Erro ao creditar bônus');
      }
    } catch (err: any) {
      alert(err.message || 'Erro');
    }
  };

  const filteredEntries = ledger.filter((entry) => {
    const matchSearch =
      entry.userId.toLowerCase().includes(searchUser.toLowerCase()) ||
      entry.userName.toLowerCase().includes(searchUser.toLowerCase()) ||
      entry.reason.toLowerCase().includes(searchUser.toLowerCase());
    const matchType = typeFilter === 'ALL' || entry.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-sm font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
              Sistema de Bônus & Créditos
            </span>
            <span className="text-slate-500 text-sm font-mono">•</span>
            <span className="text-slate-400 text-sm">Ledger Imutável de Movimentações</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1">
            Livro-Razão (Ledger) de Bônus aos Condutores
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
            onClick={() => setShowCreditModal(true)}
            className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Conceder Bônus Manual
          </button>
        </div>
      </div>

      {/* Philosophy Rule Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-sm text-slate-300">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Integridade Financeira Baseada em Ledger:</p>
          <p className="text-slate-400 leading-relaxed">
            Saldos de bônus nunca são alterados de forma arbitrária (<code className="text-orange-400">balance = X</code> é proibido). Toda movimentação é registrada com tipo (<span className="text-emerald-400">CREDIT</span>, <span className="text-rose-400">DEBIT</span>, <span className="text-amber-400">ADJUSTMENT</span>), motivo auditável, autor e saldo resultante indexado.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por usuário, CPF ou motivo..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-white text-sm focus:outline-hidden focus:border-orange-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-500 font-mono text-sm">Tipo:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-hidden"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="CREDIT">Apenas Créditos (+)</option>
            <option value="DEBIT">Apenas Débitos / Resgates (-)</option>
            <option value="ADJUSTMENT">Apenas Ajustes Manuais</option>
            <option value="EXPIRATION">Apenas Expirações</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">
              Histórico do Livro-Razão ({filteredEntries.length} entradas)
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-sm border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Data / Hora</th>
                <th className="px-4 py-3">Usuário Beneficiado</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Saldo Após</th>
                <th className="px-4 py-3">Motivo / Auditoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredEntries.map((entry) => {
                const isCredit = entry.type === 'CREDIT';
                const isDebit = entry.type === 'DEBIT';

                return (
                  <tr key={entry.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(entry.createdAt).toLocaleString('pt-BR')}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{entry.userName}</div>
                      <div className="text-sm text-slate-500">{entry.userId}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-sm font-bold flex items-center gap-1 w-max ${
                          isCredit
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isDebit
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {isCredit ? <ArrowUpRight className="w-3 h-3" /> : isDebit ? <ArrowDownLeft className="w-3 h-3" /> : <Sliders className="w-3 h-3" />}
                        {entry.type}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-400 uppercase text-sm">
                      {entry.origin}
                    </td>

                    <td className={`px-4 py-3 font-bold ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isCredit ? '+' : '-'} R$ {entry.amount.toFixed(2)}
                    </td>

                    <td className="px-4 py-3 font-bold text-white">
                      R$ {entry.balanceAfter.toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-slate-300 font-sans text-sm">
                      <div className="line-clamp-1">"{entry.reason}"</div>
                      {entry.adminAuthor && (
                        <div className="text-sm text-slate-500 font-mono">Autor: {entry.adminAuthor}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-sm font-mono uppercase text-emerald-400 font-bold">
                  Crédito no Ledger
                </span>
                <h3 className="text-base font-bold text-white">Conceder Bônus ao Condutor</h3>
              </div>
              <button
                onClick={() => setShowCreditModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreditBonus} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-400 font-medium mb-1">ID do Usuário / E-mail *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: usr_joao@gmail.com"
                  value={formUserId}
                  onChange={(e) => setFormUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Nome do Condutor</label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={formUserName}
                  onChange={(e) => setFormUserName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Origem do Bônus</label>
                  <select
                    value={formOrigin}
                    onChange={(e) => setFormOrigin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="manual_adjustment">Ajuste Manual</option>
                    <option value="signup">Cadastro Inicial</option>
                    <option value="referral">Premiação Indicação</option>
                    <option value="campaign">Campanha Comercial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Justificativa Obrigatória * (Auditoria)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Bonificação concedida por fidelidade após 3 recursos..."
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreditModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Efetivar no Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
