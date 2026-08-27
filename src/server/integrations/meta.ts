/**
 * @file src/server/integrations/meta.ts
 * Meta Integration Service Bridge
 * Proxies legacy calls to the Canonical Meta Integration Architecture under `src/integrations/meta`.
 */

import { metaAdapter } from '../../integrations/meta/adapters/meta-adapter';
import { metaAuthService } from '../../integrations/meta/auth/meta-auth-service';
import { logger } from '../observability/logger';
import {
  MetaConnectionSafeDTO,
  MetaPublishParams,
  MetaPublishResponse,
  MetaDomainMetrics,
  MetaInsightsQuery,
} from '../../integrations/meta/types';

export interface MetaPage {
  id: string;
  name: string;
  category?: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
  };
}

export interface MetaConnectionState {
  isConnected: boolean;
  user?: {
    id: string;
    name: string;
    email?: string;
  };
  pages: MetaPage[];
  selectedPageId?: string;
  selectedInstagramId?: string;
  tokenExpiresAt?: string;
  connectedAt?: string;
}

export interface MetaDebugAppResult {
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

export type { MetaPublishParams, MetaPublishResponse, MetaDomainMetrics, MetaInsightsQuery };

/**
 * Utilitário de validação e teste com o endpoint /debug_token da Graph API
 * Utiliza META_APP_ID e META_APP_SECRET para inspecionar tokens e verificar a saúde da App na Meta.
 */
export async function validateMetaAppConnection(customToken?: string): Promise<MetaDebugAppResult> {
  const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '';
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '';
  const version = process.env.META_GRAPH_API_VERSION || 'v20.0';
  const start = Date.now();

  if (!appId || !appSecret) {
    const msg = 'META_APP_ID ou META_APP_SECRET não configurados nas variáveis de ambiente.';
    logger.warn('meta', 'debug_token', 'missing_credentials', msg);
    return {
      success: false,
      appId: appId || 'NOT_CONFIGURED',
      application: 'DefesAi Legal Tech (Modo Sandbox)',
      isValid: false,
      latencyMs: 0,
      message: msg,
      details: {
        isConfigured: false,
        graphApiVersion: version,
      },
      timestamp: new Date().toISOString(),
    };
  }

  const appAccessToken = `${appId}|${appSecret}`;
  // Se não foi fornecido token de entrada, inspeciona o próprio token da app ou o token do sistema
  const inputToken =
    customToken ||
    process.env.META_ACCESS_TOKEN ||
    process.env.PAGE_ACCESS_TOKEN ||
    appAccessToken;

  try {
    const url = new URL(`https://graph.facebook.com/${version}/debug_token`);
    url.searchParams.append('input_token', inputToken);
    url.searchParams.append('access_token', appAccessToken);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      let errorJson: any = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {}

      const errorMsg =
        errorJson?.error?.message || `Meta Graph API retornou HTTP ${response.status}: ${errorText.substring(0, 150)}`;

      logger.error('meta', 'debug_token', 'graph_api_error', errorMsg, {
        httpStatus: response.status,
        appId,
        latencyMs,
      });

      return {
        success: false,
        appId,
        application: 'DefesAi Legal Tech',
        isValid: false,
        latencyMs,
        message: `Falha na verificação com debug_token: ${errorMsg}`,
        details: {
          httpStatus: response.status,
          error: errorJson?.error || errorText,
          graphApiVersion: version,
        },
        timestamp: new Date().toISOString(),
      };
    }

    const json = await response.json();
    const data = json?.data || {};

    const isValid = Boolean(data.is_valid);
    const expiresAt = data.expires_at ? new Date(data.expires_at * 1000).toISOString() : undefined;
    const dataAccessExpiresAt = data.data_access_expires_at
      ? new Date(data.data_access_expires_at * 1000).toISOString()
      : undefined;

    logger.info('meta', 'debug_token', 'validation_success', 'Endpoint /debug_token validado com sucesso', {
      appId: data.app_id || appId,
      application: data.application,
      type: data.type,
      isValid,
      latencyMs,
    });

    return {
      success: true,
      appId: data.app_id || appId,
      application: data.application || 'DefesAi Legal Tech',
      isValid,
      type: data.type || 'APP',
      scopes: data.scopes || [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'instagram_basic',
        'instagram_content_publish',
        'instagram_manage_insights',
      ],
      expiresAt,
      dataAccessExpiresAt,
      latencyMs,
      message: isValid
        ? `App ${data.application || 'DefesAi'} validada com sucesso (${latencyMs}ms)!`
        : 'App respondendo, porém o token inspecionado está inválido ou expirado.',
      details: {
        userId: data.user_id,
        issuedAt: data.issued_at ? new Date(data.issued_at * 1000).toISOString() : undefined,
        graphApiVersion: version,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const isAbort = err.name === 'AbortError';
    const message = isAbort
      ? `Timeout de rede (8s) ao conectar no endpoint debug_token da Meta Graph API.`
      : `Erro ao conectar com Graph API /debug_token: ${err.message}`;

    logger.error('meta', 'debug_token', 'connection_exception', message, {
      latencyMs,
      error: err.message,
    });

    return {
      success: false,
      appId,
      application: 'DefesAi Legal Tech',
      isValid: false,
      latencyMs,
      message,
      details: {
        error: err.message,
        graphApiVersion: version,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

class MetaIntegrationBridge {
  public getConnectionState(): MetaConnectionState {
    const status = metaAdapter.getSafeStatus();
    return {
      isConnected: status.status === 'connected',
      user: status.user,
      pages: status.pages.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        access_token: null,
        instagram_business_account: p.instagramBusinessAccount
          ? {
              id: p.instagramBusinessAccount.id,
              username: p.instagramBusinessAccount.username,
              name: p.instagramBusinessAccount.name,
              profile_picture_url: p.instagramBusinessAccount.profilePictureUrl,
            }
          : undefined,
      })),
      selectedPageId: status.selectedPageId,
      selectedInstagramId: status.selectedInstagramId,
      tokenExpiresAt: status.tokenExpiresAt,
      connectedAt: status.connectedAt,
    };
  }

  public getOAuthLoginUrl(redirectUri: string, state?: string): string {
    return metaAuthService.generateOAuthUrl(redirectUri, state);
  }

  public async handleOAuthCallback(code: string, redirectUri: string): Promise<MetaConnectionState> {
    await metaAdapter.handleOAuthCallback(code, redirectUri);
    return this.getConnectionState();
  }

  public async connectWithToken(
    accessToken: string,
    pageId?: string,
    igAccountId?: string
  ): Promise<MetaConnectionState> {
    await metaAdapter.connectWithToken(accessToken, pageId, igAccountId);
    return this.getConnectionState();
  }

  public disconnect(): void {
    metaAdapter.disconnect().catch(() => {});
  }

  public getStatus(): MetaConnectionState {
    return this.getConnectionState();
  }

  public async validateAppConnection(customToken?: string): Promise<MetaDebugAppResult> {
    return validateMetaAppConnection(customToken);
  }

  public async publishContent(params: MetaPublishParams): Promise<MetaPublishResponse> {
    return metaAdapter.publishContent(params);
  }

  public async getInsights(query: MetaInsightsQuery): Promise<MetaDomainMetrics> {
    return metaAdapter.getInsights(query);
  }
}

export const metaIntegration = new MetaIntegrationBridge();
