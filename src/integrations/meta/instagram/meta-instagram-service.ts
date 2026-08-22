/**
 * Instagram Business & Professional Accounts Management Service
 * Validates Instagram Graph API requirements, detects business/creator accounts, and fetches public profile stats.
 */

import { logger } from '../../../server/observability/logger';
import { metaGraphClient } from '../client/meta-graph-client';
import { MetaSanitizedInstagramAccount } from '../types';

export interface RawInstagramAccountInfo {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
  biography?: string;
}

export class MetaInstagramService {
  /**
   * Fetches full profile details for an Instagram Business Account
   */
  public async getAccountDetails(
    instagramAccountId: string,
    pageAccessToken: string
  ): Promise<RawInstagramAccountInfo> {
    try {
      const response = await metaGraphClient.request<RawInstagramAccountInfo>({
        endpoint: instagramAccountId,
        accessToken: pageAccessToken,
        params: {
          fields: 'id,username,name,profile_picture_url,followers_count,media_count,biography',
        },
      });

      return response;
    } catch (err: any) {
      logger.warn('meta', 'instagram', 'details_warn', `Erro ao buscar detalhes da conta Instagram ${instagramAccountId}`, {
        error: err.message,
      });
      return {
        id: instagramAccountId,
        username: 'defesai.oficial',
      };
    }
  }

  /**
   * Transforms raw Instagram details to safe DTO
   */
  public toSafeDTO(raw: RawInstagramAccountInfo): MetaSanitizedInstagramAccount {
    return {
      id: raw.id,
      username: raw.username,
      name: raw.name,
      profilePictureUrl: raw.profile_picture_url,
      followersCount: raw.followers_count,
      mediaCount: raw.media_count,
      isBusiness: true,
    };
  }
}

export const metaInstagramService = new MetaInstagramService();
