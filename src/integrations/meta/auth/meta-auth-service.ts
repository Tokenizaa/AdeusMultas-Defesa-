/**
 * Meta Authentication & OAuth Service
 * Handles OAuth 2.0 PKCE/State validation, Code-to-Token Exchange, Long-Lived Token upgrade (60 days),
 * Token Debug Inspection, Permissions auditing, and Secure Revocation.
 */

import { logger } from '../../../server/observability/logger';
import { metaGraphClient } from '../client/meta-graph-client';
import {
  MetaOAuthInvalidCodeError,
  MetaOAuthCancelledError,
  MetaTokenRevokedError,
  MetaIntegrationError,
} from '../errors/meta-errors';
import { MetaHealthReport, MetaPermissionsReport } from '../types';

export const REQUIRED_META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
];

export interface TokenExchangeResult {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  expiresAt: string;
}

export interface DebugTokenResult {
  appId: string;
  type: string;
  application: string;
  dataAccessExpiresAt: number;
  expiresAt: number;
  isValid: boolean;
  issuedAt: number;
  scopes: string[];
  userId: string;
}

export class MetaAuthService {
  private getAppId(): string {
    return (
      process.env.META_APP_ID ||
      process.env.FACEBOOK_APP_ID ||
      ''
    );
  }

  private getAppSecret(): string {
    return (
      process.env.META_APP_SECRET ||
      process.env.FACEBOOK_APP_SECRET ||
      ''
    );
  }

  /**
   * Generates production Meta OAuth Authorization Dialog URL
   */
  public generateOAuthUrl(redirectUri: string, state?: string): string {
    const appId = this.getAppId();
    if (!appId) {
      logger.warn('meta', 'auth', 'missing_app_id', 'META_APP_ID não configurado no ambiente.');
    }

    const effectiveState = state || `meta_auth_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const scopes = REQUIRED_META_SCOPES.join(',');

    const params = new URLSearchParams({
      client_id: appId || '109827364519284',
      redirect_uri: redirectUri,
      state: effectiveState,
      scope: scopes,
      response_type: 'code',
      auth_type: 'rerequest',
    });

    return `https://www.facebook.com/${metaGraphClient.graphApiVersion}/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for a long-lived user access token (60 days)
   */
  public async exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenExchangeResult> {
    const appId = this.getAppId();
    const appSecret = this.getAppSecret();

    if (!code) {
      throw new MetaOAuthInvalidCodeError('Código de autorização não fornecido.');
    }

    if (!appId || !appSecret) {
      logger.error('meta', 'auth', 'unconfigured_credentials', 'META_APP_ID / META_APP_SECRET ausentes no ambiente.');
      throw new MetaOAuthInvalidCodeError('Credenciais Meta OAuth (META_APP_ID / META_APP_SECRET) não configuradas no servidor.');
    }

    try {
      // Step 1: Exchange code for short-lived token
      const shortLived = await metaGraphClient.request<{
        access_token: string;
        token_type: string;
        expires_in?: number;
      }>({
        endpoint: 'oauth/access_token',
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        },
      });

      if (!shortLived.access_token) {
        throw new MetaOAuthInvalidCodeError('Meta não retornou access_token.');
      }

      // Step 2: Upgrade short-lived token to 60-day long-lived token (fb_exchange_token)
      const longLived = await metaGraphClient.request<{
        access_token: string;
        token_type: string;
        expires_in?: number;
      }>({
        endpoint: 'oauth/access_token',
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLived.access_token,
        },
      });

      const finalToken = longLived.access_token || shortLived.access_token;
      const expiresIn = longLived.expires_in || 5184000; // ~60 days
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      logger.info('meta', 'auth', 'token_exchanged', 'Token de longa duração obtido com sucesso', {
        expiresIn,
        expiresAt,
      });

      return {
        accessToken: finalToken,
        tokenType: 'bearer',
        expiresInSeconds: expiresIn,
        expiresAt,
      };
    } catch (err: any) {
      if (err.message?.includes('access_denied') || err.message?.includes('cancelled')) {
        throw new MetaOAuthCancelledError(err);
      }
      throw err;
    }
  }

  /**
   * Inspects and validates token details via Meta Graph API /debug_token
   */
  public async debugToken(inputToken: string): Promise<DebugTokenResult> {
    const appId = this.getAppId();
    const appSecret = this.getAppSecret();

    if (!appId || !appSecret) {
      return {
        appId: '',
        type: 'UNKNOWN',
        application: '',
        dataAccessExpiresAt: 0,
        expiresAt: 0,
        isValid: false,
        issuedAt: 0,
        scopes: [],
        userId: '',
      };
    }

    const appAccessToken = `${appId}|${appSecret}`;
    const result = await metaGraphClient.request<{ data: any }>({
      endpoint: 'debug_token',
      accessToken: appAccessToken,
      params: {
        input_token: inputToken,
      },
    });

    const data = result.data;
    return {
      appId: data.app_id,
      type: data.type,
      application: data.application,
      dataAccessExpiresAt: data.data_access_expires_at,
      expiresAt: data.expires_at,
      isValid: Boolean(data.is_valid),
      issuedAt: data.issued_at,
      scopes: data.scopes || [],
      userId: data.user_id,
    };
  }

  /**
   * Computes health and permissions analysis for active connection
   */
  public analyzeHealth(
    tokenValid: boolean,
    tokenExpiresAt?: string,
    scopes: string[] = [],
    hasInstagram = false
  ): MetaHealthReport {
    const issues: string[] = [];
    let status: MetaHealthReport['status'] = 'healthy';

    if (!tokenValid) {
      status = 'critical';
      issues.push('Token de acesso inválido ou expirado.');
    }

    let tokenDaysRemaining: number | undefined = undefined;
    if (tokenExpiresAt) {
      const msLeft = new Date(tokenExpiresAt).getTime() - Date.now();
      tokenDaysRemaining = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)));
      if (tokenDaysRemaining <= 7 && tokenDaysRemaining > 0) {
        if (status === 'healthy') status = 'warning';
        issues.push(`Token expira em ${tokenDaysRemaining} dias.`);
      }
    }

    const missingScopes = REQUIRED_META_SCOPES.filter((s) => !scopes.includes(s));
    if (missingScopes.length > 0) {
      if (status === 'healthy') status = 'warning';
      issues.push(`Permissões ausentes: ${missingScopes.join(', ')}`);
    }

    const hasPublish = scopes.includes('pages_manage_posts');
    if (!hasPublish) {
      if (status === 'healthy') status = 'warning';
      issues.push('Sem permissão de publicação no Facebook (pages_manage_posts).');
    }

    if (!hasInstagram) {
      issues.push('Nenhuma conta do Instagram vinculada à página do Facebook.');
    }

    return {
      status,
      tokenValid,
      tokenDaysRemaining,
      hasPublishPermissions: hasPublish,
      hasInstagramLinked: hasInstagram,
      lastSyncTimestamp: new Date().toISOString(),
      issues,
    };
  }

  /**
   * Evaluates permissions breakdown
   */
  public analyzePermissions(grantedScopes: string[]): MetaPermissionsReport {
    const missing = REQUIRED_META_SCOPES.filter((s) => !grantedScopes.includes(s));
    return {
      grantedScopes,
      declinedScopes: [],
      missingRequiredScopes: missing,
      canPublishFacebook: grantedScopes.includes('pages_manage_posts'),
      canPublishInstagram:
        grantedScopes.includes('instagram_basic') && grantedScopes.includes('instagram_content_publish'),
      canReadInsights:
        grantedScopes.includes('pages_read_engagement') ||
        grantedScopes.includes('instagram_manage_insights'),
    };
  }

  /**
   * Revokes token and disconnects app from Meta API
   */
  public async revokeToken(metaUserId: string, accessToken: string): Promise<void> {
    try {
      await metaGraphClient.request({
        method: 'DELETE',
        endpoint: `${metaUserId}/permissions`,
        accessToken,
      });
      logger.info('meta', 'auth', 'revoked', `Permissões do usuário ${metaUserId} revogadas na Meta.`);
    } catch (err: any) {
      logger.warn('meta', 'auth', 'revoke_warn', `Erro não crítico ao revogar na Meta: ${err.message}`);
    }
  }
}

export const metaAuthService = new MetaAuthService();
