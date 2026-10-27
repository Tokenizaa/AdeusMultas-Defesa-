export interface IntegrationHealthRecord {
  id: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  latencyMs: number | null;
  isConfigured: boolean;
  message: string;
}

export interface AdminIntegrationsOverviewInput {
  healthServices: IntegrationHealthRecord[];
  meta: { isConnected: boolean; user?: { name?: string }; pages?: unknown[] };
  venopag: {
    displayName: string;
    status: 'configured' | 'not_configured';
    isActive: boolean;
    notConfiguredReason?: string;
  };
  whatsappConfigured: boolean;
  googleDriveConfigured: boolean;
}

export function buildAdminIntegrationsOverview(input: AdminIntegrationsOverviewInput) {
  const service = (id: string): IntegrationHealthRecord => input.healthServices.find((item) => item.id === id) || {
    id,
    status: 'UNKNOWN',
    latencyMs: null,
    isConfigured: false,
    message: 'Nenhum probe verificável disponível para esta integração.',
  };
  const database = service('supabase_db');
  const auth = service('supabase_auth');
  const storage = service('storage');
  const edgeFunctions = service('edge_functions');
  const ocr = service('ocr');
  const venopagHealth = service('venopag');
  const venopagConfigured = input.venopag.status === 'configured' && venopagHealth.isConfigured;

  return {
    meta: {
      name: 'Meta Graph API (Facebook & Instagram)',
      isConnected: input.meta.isConnected,
      connectedUser: input.meta.user?.name || null,
      pagesCount: input.meta.pages?.length || 0,
      status: input.meta.isConnected ? 'CONNECTED' : 'DISCONNECTED',
    },
    venopag: {
      name: input.venopag.displayName,
      isActive: input.venopag.isActive,
      configured: venopagConfigured,
      status: venopagConfigured ? 'CONFIGURED_NOT_PROBED' : 'NOT_CONFIGURED',
      notConfiguredReason: venopagConfigured ? null : (input.venopag.notConfiguredReason || venopagHealth.message),
      webhookPath: '/api/webhooks/venopag',
      externalConnectivityVerified: false,
      idempotencyLiveVerified: false,
    },
    supabase: {
      dbStatus: database.status,
      dbMessage: database.message,
      dbLatencyMs: database.latencyMs,
      authStatus: auth.status,
      authMessage: auth.message,
      storageStatus: storage.status,
      storageMessage: storage.message,
      edgeFunctionsStatus: edgeFunctions.status,
      edgeFunctionsMessage: edgeFunctions.message,
      edgeFunctionsCount: null,
      rlsStatus: 'NOT_VERIFIED_BY_HEALTH_PROBE',
    },
    ocr: {
      status: ocr.status,
      message: ocr.message,
      latencyMs: ocr.latencyMs,
      parserAccuracy: null,
    },
    whatsapp: {
      status: 'NOT_VERIFIED',
      configured: input.whatsappConfigured,
      message: input.whatsappConfigured
        ? 'Credenciais presentes; conectividade não verificada por probe real.'
        : 'Credenciais não configuradas ou não detectadas neste runtime.',
    },
    googleDrive: {
      status: 'NOT_VERIFIED',
      configured: input.googleDriveConfigured,
      message: input.googleDriveConfigured
        ? 'Client ID detectado; sessão OAuth/conectividade não verificada pelo backend.'
        : 'Client ID não detectado neste runtime.',
      scopes: null,
      defaultFolder: null,
    },
  };
}
