import React, { useState } from 'react';
import {
  Share2,
  ShieldCheck,
  Zap,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Facebook,
  Instagram,
  X,
  Play,
} from 'lucide-react';
import { MetaAccountState } from '../../../types';
import { getMetaAuthUrl, runMetaDiagnostics } from '../../../core/integrations/meta-client';

interface MetaConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  metaState: MetaAccountState | null;
  onConnectToken: (token: string, pageId?: string, instagramAccountId?: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const MetaConnectionModal: React.FC<MetaConnectionModalProps> = ({
  isOpen,
  onClose,
  metaState,
  onConnectToken,
  onDisconnect,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'oauth' | 'token' | 'diagnostics'>('oauth');
  const [tokenInput, setTokenInput] = useState('');
  const [pageIdInput, setPageIdInput] = useState('');
  const [igIdInput, setIgIdInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Diagnostics State
  const [diagnosticReport, setDiagnosticReport] = useState<any>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  if (!isOpen) return null;

  const handleOAuthLogin = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const { authUrl } = await getMetaAuthUrl();
      window.location.href = authUrl;
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao iniciar login com Meta');
      setIsSubmitting(false);
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onConnectToken(tokenInput.trim(), pageIdInput.trim() || undefined, igIdInput.trim() || undefined);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao validar token');
      setIsSubmitting(false);
    }
  };

  const handleRunDiagnostics = async () => {
    try {
      setIsRunningTests(true);
      const report = await runMetaDiagnostics();
      setDiagnosticReport(report);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao executar diagnóstico');
    } finally {
      setIsRunningTests(false);
    }
  };

  const isConnected = metaState?.isConnected;
  const activePage = metaState?.pages?.[0];
  const activeIg = activePage?.instagram_business_account;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-sm flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Integração Meta Graph API (Facebook & Instagram)</h2>
              <p className="text-sm text-slate-500">
                Arquitetura Canônica Segura • Graph API v20.0 • Publicação e Automação
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <div>
              <span className="font-bold text-slate-800">
                {isConnected ? 'Conta Meta Conectada e Operacional' : 'Integração Desconectada'}
              </span>
              {isConnected && (
                <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1 font-medium">
                    <Facebook className="w-3 h-3 text-blue-600" />
                    {activePage?.name || 'Página FB'}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Instagram className="w-3 h-3 text-pink-600" />
                    {activeIg?.username ? `@${activeIg.username}` : '@defesai.oficial'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRefresh()}
              title="Atualizar Status"
              className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {isConnected && (
              <button
                onClick={async () => {
                  await onDisconnect();
                }}
                className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold text-sm"
              >
                Desconectar
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-4 mb-4">
          <button
            onClick={() => setActiveTab('oauth')}
            className={`pb-2 font-bold text-sm flex items-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'oauth'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Login Oficial (OAuth 2.0)
          </button>
          <button
            onClick={() => setActiveTab('token')}
            className={`pb-2 font-bold text-sm flex items-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'token'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Token Manual / System User
          </button>
          <button
            onClick={() => {
              setActiveTab('diagnostics');
              if (!diagnosticReport) handleRunDiagnostics();
            }}
            className={`pb-2 font-bold text-sm flex items-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'diagnostics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Bateria de Testes Automatizada
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {activeTab === 'oauth' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Fluxo Recomendado para Produção
                </h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  O fluxo OAuth oficial solicita as permissões necessárias e realiza a troca automática de
                  código por token de longa duração (60 dias) de forma 100% segura no backend.
                </p>
                <div className="text-sm text-slate-500 space-y-1 pt-1 font-mono">
                  <div>• Escopos: pages_manage_posts, instagram_content_publish, instagram_manage_insights</div>
                  <div>• Versão da API: Graph API v20.0</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleOAuthLogin}
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                  <span>Conectar com Facebook & Instagram (OAuth)</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'token' && (
            <form onSubmit={handleTokenSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Access Token (Page ou System User)
                </label>
                <input
                  type="password"
                  required
                  placeholder="EAAB..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-slate-400 mt-1">
                  Obtido no Meta Business Manager &gt; Usuários do Sistema ou Graph API Explorer.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Page ID (Opcional)</label>
                  <input
                    type="text"
                    placeholder="109847291847192"
                    value={pageIdInput}
                    onChange={(e) => setPageIdInput(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Instagram Account ID (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="17841400928374829"
                    value={igIdInput}
                    onChange={(e) => setIgIdInput(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !tokenInput.trim()}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Validando...' : 'Salvar e Conectar'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Verificação Automática de Capacidades</h4>
                  <p className="text-sm text-slate-500">
                    Valida segurança DTO, OAuth, endpoints, publicação, webhooks e insights em tempo real.
                  </p>
                </div>
                <button
                  onClick={handleRunDiagnostics}
                  disabled={isRunningTests}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isRunningTests ? 'Executando...' : 'Reexecutar Testes'}</span>
                </button>
              </div>

              {diagnosticReport ? (
                <div className="space-y-2">
                  <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between font-mono">
                    <span className="font-bold text-sm">
                      {diagnosticReport.passedCount}/{diagnosticReport.totalTests} Testes Aprovados
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-sm font-bold ${
                        diagnosticReport.allPassed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {diagnosticReport.allPassed ? 'SISTEMA 100% PRONTO' : 'FALHAS DETECTADAS'}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {diagnosticReport.results?.map((t: any) => (
                      <div
                        key={t.id}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {t.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <div>
                            <span className="font-bold text-slate-800 font-mono mr-1.5">[{t.id}]</span>
                            <span className="text-slate-700">{t.name}</span>
                          </div>
                        </div>
                        <span className="text-slate-400 font-mono text-sm shrink-0 ml-2">
                          {t.durationMs}ms
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  <span>Carregando bateria de testes da integração Meta...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
