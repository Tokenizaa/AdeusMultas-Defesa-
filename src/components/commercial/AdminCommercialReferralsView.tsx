import React, { useState, useEffect } from 'react';
import {
  Share2,
  Users,
  Percent,
  Sliders,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Search,
  Network,
  Save,
  Award,
  Layers,
} from 'lucide-react';
import { ReferralConfig, ReferralTreeResponse } from '../../types/commercial';

export const AdminCommercialReferralsView: React.FC = () => {
  const [config, setConfig] = useState<ReferralConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('usr_carlos');
  const [userTree, setUserTree] = useState<ReferralTreeResponse | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Form State for Config
  const [formLevel1, setFormLevel1] = useState<number>(10);
  const [formLevel2, setFormLevel2] = useState<number>(5);
  const [formLevel3, setFormLevel3] = useState<number>(2);
  const [formBase, setFormBase] = useState<any>('effectively_paid');
  const [formMinPayout, setFormMinPayout] = useState<number>(50);
  const [formDelayDays, setFormDelayDays] = useState<number>(7);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/commercial/referrals');
      const data = await res.json();
      setConfig(data.config);
      if (data.config) {
        setFormLevel1(data.config.level1Percent);
        setFormLevel2(data.config.level2Percent);
        setFormLevel3(data.config.level3Percent);
        setFormBase(data.config.calculationBase);
        setFormMinPayout(data.config.minPayoutAmount);
        setFormDelayDays(data.config.payoutDelayDays);
      }
    } catch (err) {
      console.error('Failed to load referral config:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTree = async (userId: string) => {
    setTreeLoading(true);
    try {
      const res = await fetch(`/api/admin/commercial/referrals/tree/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserTree(data);
      }
    } catch (err) {
      console.error('Error fetching tree:', err);
    } finally {
      setTreeLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchUserTree('usr_carlos');
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await fetch('/api/admin/commercial/referrals/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level1Percent: Number(formLevel1),
          level2Percent: Number(formLevel2),
          level3Percent: Number(formLevel3),
          calculationBase: formBase,
          minPayoutAmount: Number(formMinPayout),
          payoutDelayDays: Number(formDelayDays),
          changedBy: 'Admin Diretor Comercial',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback('Regras e percentuais de indicação salvos com sucesso!');
        setTimeout(() => setFeedback(null), 3000);
        fetchConfig();
      } else {
        alert(data.error || 'Erro ao salvar configuração');
      }
    } catch (err: any) {
      alert(err.message || 'Erro');
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
            <span className="px-2 py-0.5 rounded text-sm font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
              Programa de Indicação em 3 Níveis
            </span>
            <span className="text-slate-500 text-sm font-mono">•</span>
            <span className="text-slate-400 text-sm">Estrutura Determinística Multinível</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1">
            Gestão da Árvore de Indicações & Comissões
          </h1>
        </div>

        {feedback && (
          <div className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {feedback}
          </div>
        )}
      </div>

      {/* 3-Level Architecture Visual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Nível 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold font-mono">
                N1
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase">Indicação Direta</h3>
                <span className="text-sm text-slate-500 font-mono">1º Nível (Filho)</span>
              </div>
            </div>
            <span className="text-2xl font-black text-blue-400 font-mono">
              {config?.level1Percent || 10}%
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Comissão paga ao usuário que compartilhou o link direto com o comprador.
          </p>
        </div>

        {/* Nível 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold font-mono">
                N2
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase">Indicação Indireta</h3>
                <span className="text-sm text-slate-500 font-mono">2º Nível (Neto)</span>
              </div>
            </div>
            <span className="text-2xl font-black text-indigo-400 font-mono">
              {config?.level2Percent || 5}%
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Comissão para quem indicou o indicador direto da compra efetuada.
          </p>
        </div>

        {/* Nível 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center font-bold font-mono">
                N3
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase">Indicação Ancestral</h3>
                <span className="text-sm text-slate-500 font-mono">3º Nível (Bisneto)</span>
              </div>
            </div>
            <span className="text-2xl font-black text-violet-400 font-mono">
              {config?.level3Percent || 2}%
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Comissão para o indicador originário no topo da cadeia de 3 gerações.
          </p>
        </div>
      </div>

      {/* Configuration Form & Rules */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-bold text-white">Configuração Global de Taxas & Políticas</h2>
        </div>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Comissão Nível 1 (%) *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="50"
              required
              value={formLevel1}
              onChange={(e) => setFormLevel1(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Comissão Nível 2 (%) *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="30"
              required
              value={formLevel2}
              onChange={(e) => setFormLevel2(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Comissão Nível 3 (%) *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="20"
              required
              value={formLevel3}
              onChange={(e) => setFormLevel3(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Base de Cálculo da Comissão
            </label>
            <select
              value={formBase}
              onChange={(e) => setFormBase(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-hidden focus:border-orange-500"
            >
              <option value="effectively_paid">Valor Efetivamente Pago (Pós-Desconto)</option>
              <option value="gross_amount">Valor Bruto do Serviço</option>
              <option value="after_discount">Valor com Desconto de Cupom</option>
              <option value="net_amount">Valor Líquido de Taxas de Gateway</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Saque Mínimo de Comissão (R$)
            </label>
            <input
              type="number"
              min="10"
              value={formMinPayout}
              onChange={(e) => setFormMinPayout(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Prazo de Maturação / Liberação (Dias)
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={formDelayDays}
              onChange={(e) => setFormDelayDays(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-orange-500"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-2 border-t border-slate-800">
            <button
              type="submit"
              disabled={saveLoading}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-orange-500/20 cursor-pointer text-sm"
            >
              <Save className="w-4 h-4" />
              {saveLoading ? 'Salvando...' : 'Salvar Novas Taxas'}
            </button>
          </div>
        </form>
      </div>

      {/* Tree Explorer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Explorador de Árvore Multinível por Indicador</h2>
          </div>

          <div className="flex items-center gap-2">
            {['usr_carlos', 'usr_beatriz', 'usr_andre'].map((uid) => (
              <button
                key={uid}
                onClick={() => {
                  setSelectedUserId(uid);
                  fetchUserTree(uid);
                }}
                className={`px-2.5 py-1 rounded text-sm font-mono font-bold transition-colors cursor-pointer ${
                  selectedUserId === uid
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {uid === 'usr_carlos' ? 'Carlos (Top)' : uid === 'usr_beatriz' ? 'Beatriz (N1)' : 'André (N2)'}
              </button>
            ))}
          </div>
        </div>

        {treeLoading ? (
          <div className="text-center py-8 text-slate-500 text-sm">Carregando árvore genealógica...</div>
        ) : userTree ? (
          <div className="space-y-4">
            {/* Top Referrer Summary */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold font-mono">
                  {userTree.userName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{userTree.userName}</h3>
                  <span className="text-sm text-slate-500 font-mono">{userTree.referrerId}</span>
                </div>
              </div>

              <div className="flex items-center gap-6 font-mono text-sm">
                <div>
                  <span className="text-slate-500 text-sm block uppercase">Total Indicados</span>
                  <span className="text-white font-bold">{userTree.totalReferralsCount} condutores</span>
                </div>
                <div>
                  <span className="text-slate-500 text-sm block uppercase">Volume Gerado</span>
                  <span className="text-emerald-400 font-bold">R$ {userTree.totalRevenueGenerated.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-sm block uppercase">Comissões Acumuladas</span>
                  <span className="text-blue-400 font-bold">R$ {userTree.totalCommissionsEarned.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Tree Branch Visualizer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Level 1 Direct */}
              <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between text-sm font-bold text-blue-400 pb-2 border-b border-slate-800">
                  <span>Nível 1 • Diretos ({(userTree.level1 || []).length})</span>
                  <span className="font-mono">{config?.level1Percent}%</span>
                </div>
                {(userTree.level1 || []).length === 0 ? (
                  <p className="text-sm text-slate-600 py-3 text-center">Nenhum indicado direto</p>
                ) : (
                  (userTree.level1 || []).map((child) => (
                    <div key={child.childUserId} className="p-2 bg-slate-900/80 rounded border border-slate-800 text-sm">
                      <div className="font-bold text-white">{child.childUserName}</div>
                      <div className="text-sm text-slate-500 font-mono">
                        Desde {new Date(child.joinedAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Level 2 Indirect */}
              <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between text-sm font-bold text-indigo-400 pb-2 border-b border-slate-800">
                  <span>Nível 2 • Indiretos ({(userTree.level2 || []).length})</span>
                  <span className="font-mono">{config?.level2Percent}%</span>
                </div>
                {(userTree.level2 || []).length === 0 ? (
                  <p className="text-sm text-slate-600 py-3 text-center">Nenhum indicado no 2º nível</p>
                ) : (
                  (userTree.level2 || []).map((child) => (
                    <div key={child.childUserId} className="p-2 bg-slate-900/80 rounded border border-slate-800 text-sm">
                      <div className="font-bold text-white">{child.childUserName}</div>
                      <div className="text-sm text-slate-500 font-mono">
                        Indicado por {child.parentUserId}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Level 3 Ancestral */}
              <div className="bg-slate-950 p-4 rounded-xl border border-violet-500/30 space-y-2">
                <div className="flex items-center justify-between text-sm font-bold text-violet-400 pb-2 border-b border-slate-800">
                  <span>Nível 3 • Ancestrais ({(userTree.level3 || []).length})</span>
                  <span className="font-mono">{config?.level3Percent}%</span>
                </div>
                {(userTree.level3 || []).length === 0 ? (
                  <p className="text-sm text-slate-600 py-3 text-center">Nenhum indicado no 3º nível</p>
                ) : (
                  (userTree.level3 || []).map((child) => (
                    <div key={child.childUserId} className="p-2 bg-slate-900/80 rounded border border-slate-800 text-sm">
                      <div className="font-bold text-white">{child.childUserName}</div>
                      <div className="text-sm text-slate-500 font-mono">
                        Indicado por {child.parentUserId}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
