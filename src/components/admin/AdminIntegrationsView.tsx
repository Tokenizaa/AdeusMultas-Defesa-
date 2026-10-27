import React, { useState, useEffect } from 'react';
import {
  Boxes,
  RefreshCw,
  ExternalLink,
  Zap,
  CreditCard,
  Database,
  Camera,
  Key,
  HardDrive,
} from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { api } from '../../lib/api/client';
import { GoogleDriveModal } from '../common/GoogleDriveModal';
import { MetaIntegrationCards } from './MetaIntegrationCards';

export const AdminIntegrationsView: React.FC = () => {
  const { navigate } = useRouter();
  const [data, setData] = useState<any>(null);
  const [, setIsLoading] = useState(true);
  const [testStatus, setTestStatus] = useState<Record<string, { testing: boolean; result?: string }>>({});
  const [showDriveModal, setShowDriveModal] = useState(false);

  const statusLabel = (status?: string) => ({
    HEALTHY: 'Saudável (probe real)',
    DEGRADED: 'Degradado',
    DOWN: 'Indisponível',
    UNKNOWN: 'Não verificado',
    CONNECTED: 'Conectado',
    DISCONNECTED: 'Desconectado',
    CONFIGURED_NOT_PROBED: 'Configurado; conectividade não testada',
    NOT_CONFIGURED: 'Não configurado',
    NOT_VERIFIED: 'Não verificado',
  }[status || ''] || 'Não verificado');

  const statusTone = (status?: string) => {
    if (status === 'HEALTHY' || status === 'CONNECTED') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (status === 'DOWN' || status === 'DISCONNECTED') return 'bg-red-500/20 text-red-300 border-red-500/30';
    return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  };

  const fetchIntegrations = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<any>('/api/admin/integrations/overview');
      if (!res) throw new Error('Falha ao carregar integrações');
      setData(res);
    } catch (err: any) {
      console.error('Error fetching integrations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleTestIntegration = async (service: string) => {
    try {
      setTestStatus((prev) => ({ ...prev, [service]: { testing: true } }));
      if (service === 'venopag') {
        const result = await api.get<any>('/api/payments/gateway/status');
        const gateway = result?.gateways?.find((item: any) => item.id === 'venopag');
        const configured = gateway?.status === 'configured';
        setTestStatus((prev) => ({
          ...prev,
          [service]: {
            testing: false,
            result: configured
              ? 'Credenciais configuradas; conectividade externa não foi testada.'
              : `Não configurado: ${gateway?.notConfiguredReason || 'credenciais VenoPag ausentes'}`,
          },
        }));
        return;
      }

      const res = await api.post<{ success: boolean; latencyMs?: number; error?: string }>('/api/health/test', { service });
      setTestStatus((prev) => ({
        ...prev,
        [service]: {
          testing: false,
          result: res.success
            ? `Probe concluído (${res.latencyMs ?? '—'}ms)`
            : `Erro: ${res.error || 'Falha no probe'}`,
        },
      }));
    } catch (err: any) {
      setTestStatus((prev) => ({
        ...prev,
        [service]: { testing: false, result: `Erro: ${err.message}` },
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-orange-400" />
            <h1 className="text-lg font-bold text-white font-mono">
              Hub Central de Integrações da Plataforma
            </h1>
          </div>
          <p className="text-sm text-slate-400 font-mono mt-0.5">
            Gerenciamento de canais externos, gateways de pagamento, banco de dados e APIs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/settings')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <Key className="w-3.5 h-3.5 text-orange-400" />
            <span>Editar Chaves / Secrets</span>
          </button>
          <button
            onClick={fetchIntegrations}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Recarregar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Meta Graph API Integration Cards (Token, Webhooks, Permissões, Debug Probe) */}
      <MetaIntegrationCards />

      {/* Grid of Other Core Platform Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-sm">
        {/* 1. VenoPag PIX */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-sm font-bold text-white uppercase">VenoPag PIX</h2>
                <p className="text-sm text-slate-500">Gateway ativo; conectividade externa não testada</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-sm font-bold border ${statusTone(data?.venopag?.status)}`}>
              {statusLabel(data?.venopag?.status)}
            </span>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Webhook:</span>
              <span className="text-slate-400 text-sm truncate max-w-[220px]">{data?.venopag?.webhookPath || '/api/webhooks/venopag'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Credenciais:</span>
              <span className="text-right">{data?.venopag?.configured ? 'Presentes' : 'Não verificadas/ausentes'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Conectividade externa:</span>
              <span>Não testada</span>
            </div>
            <div className="text-xs text-slate-500">{data?.venopag?.notConfiguredReason || 'Estado de configuração; não representa confirmação de transação.'}</div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => handleTestIntegration('venopag')}
              disabled={testStatus.venopag?.testing}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>{testStatus.venopag?.testing ? 'Verificando...' : 'Verificar configuração'}</span>
            </button>
            <button
              onClick={() => navigate('/admin/payments')}
              className="text-orange-400 hover:underline text-sm flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Pagamentos</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          {testStatus.venopag?.result && (
            <p className={`text-sm bg-slate-950 p-2 rounded-lg border border-slate-800 ${testStatus.venopag.result.startsWith('Erro:') || testStatus.venopag.result.startsWith('Não configurado') ? 'text-red-300' : 'text-slate-300'}`}>
              {testStatus.venopag.result}
            </p>
          )}
        </div>

        {/* 2. Supabase BaaS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-sm font-bold text-white uppercase">Supabase (PostgreSQL & Auth)</h2>
                <p className="text-sm text-slate-500">Estado derivado dos probes de saúde disponíveis</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-sm font-bold border ${statusTone(data?.supabase?.dbStatus)}`}>
              {statusLabel(data?.supabase?.dbStatus)}
            </span>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Postgres:</span>
              <span className="text-right">{data?.supabase?.dbMessage || 'Não verificado'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Latência DB:</span>
              <span>{data?.supabase?.dbLatencyMs != null ? `${data.supabase.dbLatencyMs}ms` : 'Não medida'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">GoTrue Auth:</span>
              <span className={statusTone(data?.supabase?.authStatus).split(' ').slice(1, 2).join(' ')}>{statusLabel(data?.supabase?.authStatus)} · {data?.supabase?.authMessage || 'Sem detalhes'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Storage:</span>
              <span>{statusLabel(data?.supabase?.storageStatus)} · {data?.supabase?.storageMessage || 'Sem detalhes'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Edge Functions:</span>
              <span>{data?.supabase?.edgeFunctionsCount ?? 'Contagem não medida'} · {statusLabel(data?.supabase?.edgeFunctionsStatus)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => handleTestIntegration('supabase_db')}
              disabled={testStatus.supabase_db?.testing}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>{testStatus.supabase_db?.testing ? 'Testando...' : 'Testar Postgres DB'}</span>
            </button>
            <span className="text-sm text-amber-300">RLS: não verificado pelo probe</span>
          </div>
          {testStatus.supabase_db?.result && (
            <p className={`text-sm bg-slate-950 p-2 rounded-lg border border-slate-800 ${testStatus.supabase_db.result.startsWith('Erro:') ? 'text-red-300' : 'text-slate-300'}`}>
              {testStatus.supabase_db.result}
            </p>
          )}
        </div>

        {/* 3. OCR Vision & WhatsApp */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Camera className="w-5 h-5 text-orange-400" />
              <div>
                <h2 className="text-sm font-bold text-white uppercase">OCR Vision & Percepção Documental</h2>
                <p className="text-sm text-slate-500">Extração estruturada de AIT, NIP e Autos</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-sm font-bold border ${statusTone(data?.ocr?.status)}`}>
              {statusLabel(data?.ocr?.status)}
            </span>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Modelos suportados:</span>
              <span className="text-right">AIT, NIP, Notificação de Penalidade, CNH</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Latência do probe OCR:</span>
              <span>{data?.ocr?.latencyMs != null ? `${data.ocr.latencyMs}ms` : 'Não medida'}</span>
            </div>
            <div className="text-xs text-slate-500">{data?.ocr?.message || 'Precisão e saúde operacional não medidas.'}</div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">WhatsApp Evolution API:</span>
              <span className={statusTone(data?.whatsapp?.status).split(' ').slice(1, 2).join(' ')}>{statusLabel(data?.whatsapp?.status)}</span>
            </div>
            <div className="text-xs text-slate-500">{data?.whatsapp?.message || 'Conectividade não verificada.'}</div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => handleTestIntegration('ocr')}
              disabled={testStatus.ocr?.testing}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-orange-400" />
              <span>{testStatus.ocr?.testing ? 'Testando...' : 'Testar probe OCR'}</span>
            </button>
            <span className="text-sm text-amber-300">Precisão: não medida</span>
          </div>
          {testStatus.ocr?.result && (
            <p className={`text-sm bg-slate-950 p-2 rounded-lg border border-slate-800 ${testStatus.ocr.result.startsWith('Erro:') ? 'text-red-300' : 'text-slate-300'}`}>
              {testStatus.ocr.result}
            </p>
          )}
        </div>

        {/* 4. Google Drive Workspace */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-sm font-bold text-white uppercase">Google Drive (Google Workspace API)</h2>
                <p className="text-sm text-slate-500">Armazenamento e exportação documental</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-sm font-bold border ${statusTone(data?.googleDrive?.status)}`}>
              {statusLabel(data?.googleDrive?.status)}
            </span>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Client ID:</span>
              <span>{data?.googleDrive?.configured ? 'Detectado; OAuth não verificado' : 'Não detectado'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Escopos:</span>
              <span>{data?.googleDrive?.scopes ?? 'Não verificados'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Pasta padrão:</span>
              <span>{data?.googleDrive?.defaultFolder ?? 'Não verificada'}</span>
            </div>
            <div className="text-xs text-slate-500">{data?.googleDrive?.message || 'Estado OAuth não verificado pelo backend.'}</div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setShowDriveModal(true)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Abrir gerenciador</span>
            </button>
            <span className="text-sm text-amber-300">OAuth não verificado</span>
          </div>
        </div>
      </div>

      <GoogleDriveModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
      />
    </div>
  );
};

