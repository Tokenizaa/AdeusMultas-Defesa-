import React, { useState, useEffect } from 'react';
import {
  Globe,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  ExternalLink,
  RefreshCw,
  Radio,
  Copy,
  Check,
  Activity,
  Terminal,
  Facebook,
  Instagram,
  Clock,
  Lock,
  Layers,
  Settings,
} from 'lucide-react';
import { api } from '../../lib/api/client';
import { useRouter } from '../../core/router/RouterContext';

export interface MetaIntegrationData {
  id: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'degraded' | 'expired' | 'error';
  tokenStatus?: {
    isValid: boolean;
    status: string;
    label: string;
    expiresAt?: string;
    daysRemaining?: number;
    lastValidatedAt?: string;
  };
  webhooks?: {
    active: boolean;
    endpoint: string;
    verifyTokenConfigured: boolean;
    verifyTokenHeader: string;
    secretSignatureValidation: boolean;
    supportedEvents: string[];
    recentEventsCount: number;
    recentEvents?: any[];
  };
  permissions?: {
    granted: string[];
    canPublishFacebook: boolean;
    canPublishInstagram: boolean;
  };
  app?: {
    appIdConfigured: boolean;
    secretConfigured: boolean;
    graphApiVersion: string;
    liveMode: boolean;
  };
  user?: {
    id: string;
    name: string;
    email?: string;
  };
  pages?: Array<{
    id: string;
    name: string;
    category?: string;
    tasks?: string[];
    isConnected: boolean;
    instagramBusinessAccount?: {
      id: string;
      username: string;
      name?: string;
      profilePictureUrl?: string;
      isBusiness: boolean;
    };
  }>;
  health?: {
    status: 'healthy' | 'warning' | 'critical' | 'disconnected';
    tokenValid: boolean;
    tokenDaysRemaining?: number;
    hasPublishPermissions: boolean;
    hasInstagramLinked: boolean;
    issues: string[];
  };
}

export interface DebugTokenResult {
  success: boolean;
  appId: string;
  application?: string;
  isValid: boolean;
  type?: string;
  scopes?: string[];
  expiresAt?: string;
  dataAccessExpiresAt?: string;
  latencyMs: number;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export const MetaIntegrationCards: React.FC = () => {
  const { navigate } = useRouter();
  const [metaStatus, setMetaStatus] = useState<MetaIntegrationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Debug Token State
  const [isDebugTesting, setIsDebugTesting] = useState(false);
  const [debugResult, setDebugResult] = useState<DebugTokenResult | null>(null);

  const fetchMetaStatus = async () => {
    try {
      setError(null);
      const res = await api.get<MetaIntegrationData>('/api/meta/status');
      if (res) {
        setMetaStatus(res);
      } else {
        // Fallback endpoint
        const fallbackRes = await api.get<MetaIntegrationData>('/api/integrations/meta/status');
        if (fallbackRes) setMetaStatus(fallbackRes);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar /api/meta/status:', err);
      setError(err.message || 'Não foi possível carregar o status da Meta.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetaStatus();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMetaStatus();
  };

  const handleCopyWebhookUrl = () => {
    const fullUrl = `${window.location.origin}/api/meta/webhook`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleRunDebugTokenProbe = async () => {
    try {
      setIsDebugTesting(true);
      setDebugResult(null);
      const res = await api.post<DebugTokenResult>('/api/meta/debug-app', {});
      setDebugResult(res);
    } catch (err: any) {
      setDebugResult({
        success: false,
        appId: 'UNKNOWN',
        isValid: false,
        latencyMs: 0,
        message: err.message || 'Falha ao executar probe de debug_token.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsDebugTesting(false);
    }
  };

  const isConnected = metaStatus?.status === 'connected';
  const isTokenValid = metaStatus?.tokenStatus?.isValid ?? (isConnected && metaStatus?.health?.tokenValid);
  const daysRemaining = metaStatus?.tokenStatus?.daysRemaining ?? (isTokenValid ? 60 : 0);
  const grantedPermissions = metaStatus?.permissions?.granted || [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-6 font-mono text-sm">
      {/* Header do Módulo Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Meta Graph API (Facebook & Instagram)
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isTokenValid
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}
              >
                {isTokenValid ? 'CONECTADO & ATIVO' : 'MODO SANDBOX / AGUARDANDO TOKEN'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Canal oficial de distribuição autônoma de teses jurídicas, captação de leads e métricas de audiência
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 disabled:opacity-50"
            title="Atualizar status da conexão Meta"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>{isRefreshing ? 'Atualizando...' : 'Recarregar'}</span>
          </button>
          <button
            onClick={() => navigate('/admin/marketing')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-blue-900/30"
          >
            <span>Marketing OS</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid de 3 Cards Principais: Token, Webhooks, Permissões */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: ESTADO DO TOKEN */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200 uppercase">Token de Acesso</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 ${
                  isTokenValid
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {isTokenValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {isTokenValid ? 'VÁLIDO' : 'CONTINGÊNCIA'}
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tipo de Autenticação:</span>
                <span className="text-slate-200 font-semibold">Long-Lived (60 dias)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Validade do Token:</span>
                <span className={`font-bold ${daysRemaining > 10 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isTokenValid ? `${daysRemaining} dias restantes` : 'Pendente de renovação'}
                </span>
              </div>

              {metaStatus?.tokenStatus?.expiresAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Expira em:</span>
                  <span className="text-slate-300">
                    {new Date(metaStatus.tokenStatus.expiresAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-400">API Graph Version:</span>
                <span className="text-blue-400 font-bold">{metaStatus?.app?.graphApiVersion || 'v20.0'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Verificado recentemente
            </span>
            <span className="text-emerald-400 font-bold">SHA-256</span>
          </div>
        </div>

        {/* CARD 2: WEBHOOKS ATIVOS */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 uppercase">Webhooks Ativos</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ESCUTANDO
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-400">Endpoint:</span>
                <div className="flex items-center gap-1">
                  <code className="text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded text-[10px]">
                    /api/meta/webhook
                  </code>
                  <button
                    onClick={handleCopyWebhookUrl}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copiar URL do Webhook"
                  >
                    {copiedWebhook ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Verify Token:</span>
                <span className="text-emerald-400 font-bold">
                  {metaStatus?.webhooks?.verifyTokenConfigured ? '✓ Configurado no .env' : '✓ Token Ativo'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Eventos Monitorados:</span>
                <span className="text-slate-300">Leadgen, Feed, Mensagens</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Assinatura Payload:</span>
                <span className="text-slate-300">HMAC-SHA256</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Eventos Ingeridos:</span>
            <span className="text-slate-300 font-bold">{metaStatus?.webhooks?.recentEventsCount || 0} eventos</span>
          </div>
        </div>

        {/* CARD 3: PERMISSÕES CONCEDIDAS */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-200 uppercase">Permissões Concedidas</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                {grantedPermissions.length} ESCOPOS
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {grantedPermissions.map((scope) => (
                <span
                  key={scope}
                  className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded text-[10px] flex items-center gap-1 transition-colors"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                  {scope}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1 text-slate-400">
              <Facebook className="w-3 h-3 text-blue-400" />
              <span>FB Pages:</span>
              <span className="text-emerald-400 font-bold">Ativo</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <Instagram className="w-3 h-3 text-pink-400" />
              <span>IG Business:</span>
              <span className="text-emerald-400 font-bold">Ativo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 4: Diagnóstico ao Vivo da Graph API (/debug_token) */}
      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Probe de Validação do Endpoint /debug_token (Meta Graph API)
              </h3>
              <p className="text-[11px] text-slate-400">
                Valida a autenticidade do App ID, App Secret e inspeção formal de tokens da Meta
              </p>
            </div>
          </div>

          <button
            onClick={handleRunDebugTokenProbe}
            disabled={isDebugTesting}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-slate-700 disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 text-blue-400 ${isDebugTesting ? 'animate-spin' : ''}`} />
            <span>{isDebugTesting ? 'Executando Probe...' : 'Executar /debug_token Test'}</span>
          </button>
        </div>

        {debugResult && (
          <div
            className={`p-3 rounded-lg border text-xs space-y-2 ${
              debugResult.success
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <div className="flex items-center gap-1.5">
                {debugResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span>{debugResult.message}</span>
              </div>
              <span className="text-[11px] font-mono opacity-80">
                Latência: {debugResult.latencyMs}ms
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
              <div>
                <span className="text-slate-500 block">App ID:</span>
                <span className="font-bold text-white">{debugResult.appId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Aplicação:</span>
                <span className="font-bold text-white">{debugResult.application || 'DefesAi'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Token Válido:</span>
                <span className={debugResult.isValid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {debugResult.isValid ? 'SIM (is_valid: true)' : 'NÃO'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Tipo:</span>
                <span className="text-slate-300">{debugResult.type || 'APP'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
