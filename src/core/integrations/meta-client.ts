import { MetaAccountState, MetaPublishRequest, MetaPublishResult } from '../../types';
import { authFetch } from '../../lib/authFetch';

/**
 * Tries to fetch Meta status from the available endpoints.
 * Priority: /api/meta/status (primary) -> /api/marketing/meta/status (fallback)
 */
export async function getMetaStatus(): Promise<MetaAccountState> {
  // Try primary endpoint first
  try {
    const res = await authFetch('/api/meta/status');
    if (res.ok) {
      return res.json();
    }
  } catch {
    // Primary failed, try fallback
  }

  // Try fallback endpoint
  try {
    const res = await authFetch('/api/marketing/meta/status');
    if (res.ok) {
      return res.json();
    }
  } catch {
    // Fallback also failed
  }

  // Return minimal default state if both endpoints fail
  return {
    isConnected: false,
    user: undefined,
    pages: [],
    selectedPageId: undefined,
    selectedInstagramId: undefined,
    connectedAt: undefined,
  };
}

export async function getMetaAuthUrl(redirectUri?: string): Promise<{ authUrl: string }> {
  const url = redirectUri
    ? `/api/integrations/meta/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`
    : '/api/integrations/meta/auth-url';
  const res = await authFetch(url);
  if (!res.ok) {
    throw new Error('Falha ao obter URL de login Meta');
  }
  return res.json();
}

export async function connectMetaWithToken(
  accessToken: string,
  pageId?: string,
  instagramAccountId?: string
): Promise<{ success: boolean; connection: MetaAccountState }> {
  const res = await authFetch('/api/integrations/meta/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, pageId, instagramAccountId }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Falha ao conectar token Meta');
  }
  return res.json();
}

export async function selectMetaTargets(
  pageId?: string,
  instagramAccountId?: string
): Promise<{ success: boolean; connection: MetaAccountState }> {
  const res = await authFetch('/api/integrations/meta/select-targets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageId, instagramAccountId }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Falha ao selecionar alvos da Meta');
  }
  return res.json();
}

export async function disconnectMeta(): Promise<{ success: boolean }> {
  const res = await authFetch('/api/integrations/meta/disconnect', { method: 'POST' });
  if (!res.ok) {
    throw new Error('Falha ao desconectar conta Meta');
  }
  return res.json();
}

export async function publishToMeta(params: MetaPublishRequest): Promise<MetaPublishResult> {
  const res = await authFetch('/api/integrations/meta/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Falha na publicação Meta');
  }
  return res.json();
}

export async function runMetaDiagnostics(): Promise<any> {
  const res = await authFetch('/api/integrations/meta/tests');
  if (!res.ok) {
    throw new Error('Falha ao executar bateria de testes da Meta');
  }
  return res.json();
}

export async function getMetaWebhooksHistory(): Promise<any> {
  const res = await authFetch('/api/integrations/meta/webhooks/history');
  if (!res.ok) {
    throw new Error('Falha ao obter histórico de webhooks da Meta');
  }
  return res.json();
}