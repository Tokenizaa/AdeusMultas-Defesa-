/**
 * Meta Insights & Analytics Service
 * Collects real post/media metrics and normalizes them into Domain Metrics.
 */

import { logger } from '../../../server/observability/logger';
import { metaGraphClient } from '../client/meta-graph-client';
import { MetaDomainMetrics, MetaInsightsQuery } from '../types';

export class MetaInsightsService {
  /**
   * Fetches insights for a Facebook Post
   */
  public async getFacebookPostInsights(
    postId: string,
    accessToken: string
  ): Promise<MetaDomainMetrics> {
    try {
      const response = await metaGraphClient.request<{
        data: Array<{ name: string; values: Array<{ value: any }> }>;
      }>({
        endpoint: `${postId}/insights`,
        accessToken,
        params: {
          metric: 'post_impressions,post_engaged_users,post_reactions_by_type_total',
        },
      });

      const metricsMap: Record<string, number> = {};
      (response.data || []).forEach((item) => {
        const val = item.values?.[0]?.value;
        if (typeof val === 'number') {
          metricsMap[item.name] = val;
        } else if (typeof val === 'object' && val !== null) {
          // Total reactions
          const sum: number = Object.values(val as Record<string, any>).reduce(
            (acc: number, cur: any) => acc + (Number(cur) || 0),
            0
          );
          metricsMap[item.name] = sum;
        }
      });

      return {
        targetId: postId,
        impressions: metricsMap.post_impressions || 0,
        reach: metricsMap.post_impressions || 0,
        engagement: metricsMap.post_engaged_users || 0,
        likes: metricsMap.post_reactions_by_type_total || 0,
        comments: 0,
        shares: 0,
        saved: 0,
        clicks: 0,
        collectedAt: new Date().toISOString(),
        rawMetrics: metricsMap,
      };
    } catch (err: any) {
      logger.warn('meta', 'insights', 'fb_insights_warn', `Aviso ao ler métricas do post FB ${postId}: ${err.message}`);
      return {
        targetId: postId,
        impressions: 0,
        reach: 0,
        engagement: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saved: 0,
        clicks: 0,
        collectedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Fetches insights for an Instagram Media item
   */
  public async getInstagramMediaInsights(
    mediaId: string,
    accessToken: string
  ): Promise<MetaDomainMetrics> {
    try {
      const response = await metaGraphClient.request<{
        data: Array<{ name: string; values: Array<{ value: number }> }>;
      }>({
        endpoint: `${mediaId}/insights`,
        accessToken,
        params: {
          metric: 'impressions,reach,engagement,saved',
        },
      });

      const metricsMap: Record<string, number> = {};
      (response.data || []).forEach((item) => {
        metricsMap[item.name] = item.values?.[0]?.value || 0;
      });

      return {
        targetId: mediaId,
        impressions: metricsMap.impressions || 0,
        reach: metricsMap.reach || 0,
        engagement: metricsMap.engagement || 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saved: metricsMap.saved || 0,
        clicks: 0,
        collectedAt: new Date().toISOString(),
        rawMetrics: metricsMap,
      };
    } catch (err: any) {
      logger.warn('meta', 'insights', 'ig_insights_warn', `Aviso ao ler métricas do Instagram ${mediaId}: ${err.message}`);
      return {
        targetId: mediaId,
        impressions: 0,
        reach: 0,
        engagement: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saved: 0,
        clicks: 0,
        collectedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Dispatcher for any target
   */
  public async query(query: MetaInsightsQuery, accessToken: string): Promise<MetaDomainMetrics> {
    if (query.targetType === 'instagram_media' || query.targetType === 'instagram_account') {
      return this.getInstagramMediaInsights(query.targetId, accessToken);
    }
    return this.getFacebookPostInsights(query.targetId, accessToken);
  }
}

export const metaInsightsService = new MetaInsightsService();
