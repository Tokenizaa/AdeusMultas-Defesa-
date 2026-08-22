/**
 * @file src/server/integrations/meta.ts
 * Meta Integration Service Bridge
 * Proxies legacy calls to the Canonical Meta Integration Architecture under `src/integrations/meta`.
 */

import { metaAdapter } from '../../integrations/meta/adapters/meta-adapter';
import { metaAuthService } from '../../integrations/meta/auth/meta-auth-service';
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

export type { MetaPublishParams, MetaPublishResponse, MetaDomainMetrics, MetaInsightsQuery };

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
        access_token: 'PROTECTED_SERVER_TOKEN',
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

  public async publishContent(params: MetaPublishParams): Promise<MetaPublishResponse> {
    return metaAdapter.publishContent(params);
  }

  public async getInsights(query: MetaInsightsQuery): Promise<MetaDomainMetrics> {
    return metaAdapter.getInsights(query);
  }
}

export const metaIntegration = new MetaIntegrationBridge();
