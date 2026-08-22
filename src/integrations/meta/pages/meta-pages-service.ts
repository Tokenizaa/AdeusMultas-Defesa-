/**
 * Facebook Pages Management Service
 * Discovers authorized pages, extracts page access tokens, checks publishing roles and tasks.
 */

import { logger } from '../../../server/observability/logger';
import { metaGraphClient } from '../client/meta-graph-client';
import { MetaSanitizedPage } from '../types';

export interface RawMetaPageItem {
  id: string;
  name: string;
  category?: string;
  access_token: string;
  tasks?: string[];
  instagram_business_account?: {
    id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
  };
}

export class MetaPagesService {
  /**
   * Fetches all Facebook Pages authorized by the user token
   */
  public async fetchPages(userAccessToken: string): Promise<RawMetaPageItem[]> {
    try {
      const response = await metaGraphClient.request<{ data: RawMetaPageItem[] }>({
        endpoint: 'me/accounts',
        accessToken: userAccessToken,
        params: {
          fields: 'id,name,category,access_token,tasks,instagram_business_account{id,username,name,profile_picture_url}',
          limit: 50,
        },
      });

      const pages = response.data || [];
      logger.info('meta', 'pages', 'discovered', `${pages.length} páginas do Facebook descobertas`);
      return pages;
    } catch (err: any) {
      logger.error('meta', 'pages', 'fetch_failed', `Erro ao buscar páginas do Facebook: ${err.message}`);
      throw err;
    }
  }

  /**
   * Transforms raw pages to safe DTOs for the UI (excluding page access tokens)
   */
  public toSafeDTO(rawPages: RawMetaPageItem[], selectedPageId?: string): MetaSanitizedPage[] {
    return rawPages.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      tasks: p.tasks || ['MANAGE', 'CREATE_CONTENT'],
      isConnected: p.id === selectedPageId,
      instagramBusinessAccount: p.instagram_business_account
        ? {
            id: p.instagram_business_account.id,
            username: p.instagram_business_account.username,
            name: p.instagram_business_account.name,
            profilePictureUrl: p.instagram_business_account.profile_picture_url,
            isBusiness: true,
          }
        : undefined,
    }));
  }

  /**
   * Validates if a page has publishing permissions
   */
  public canPublish(page: RawMetaPageItem): boolean {
    if (!page.tasks || page.tasks.length === 0) return true;
    return (
      page.tasks.includes('CREATE_CONTENT') ||
      page.tasks.includes('MANAGE') ||
      page.tasks.includes('PUBLISH') ||
      page.tasks.includes('MODERATE')
    );
  }
}

export const metaPagesService = new MetaPagesService();
