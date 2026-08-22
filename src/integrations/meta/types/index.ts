/**
 * Canonical Meta Integration Types (Types & Safe DTOs)
 * Strict separation between backend credentials and safe frontend DTOs.
 */

export type MetaConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'degraded'
  | 'expired'
  | 'revoked'
  | 'error'
  | 'permission_denied';

export interface MetaSanitizedUser {
  id: string;
  name: string;
  email?: string;
  pictureUrl?: string;
}

export interface MetaSanitizedInstagramAccount {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  isBusiness: boolean;
  followersCount?: number;
  mediaCount?: number;
}

export interface MetaSanitizedPage {
  id: string;
  name: string;
  category?: string;
  tasks?: string[];
  instagramBusinessAccount?: MetaSanitizedInstagramAccount;
  isConnected: boolean;
}

/**
 * Safe DTO returned to Frontend / UI (NEVER contains access tokens or app secrets)
 */
export interface MetaConnectionSafeDTO {
  id: string;
  status: MetaConnectionStatus;
  user?: MetaSanitizedUser;
  pages: MetaSanitizedPage[];
  selectedPageId?: string;
  selectedInstagramId?: string;
  connectedAt?: string;
  lastValidatedAt?: string;
  tokenExpiresAt?: string;
  scopes: string[];
  isLiveMode: boolean;
  health: MetaHealthReport;
  error?: string;
}

export interface MetaHealthReport {
  status: 'healthy' | 'warning' | 'critical' | 'disconnected';
  tokenValid: boolean;
  tokenDaysRemaining?: number;
  hasPublishPermissions: boolean;
  hasInstagramLinked: boolean;
  lastSyncTimestamp?: string;
  issues: string[];
}

export interface MetaPermissionsReport {
  grantedScopes: string[];
  declinedScopes: string[];
  missingRequiredScopes: string[];
  canPublishFacebook: boolean;
  canPublishInstagram: boolean;
  canReadInsights: boolean;
}

export interface MetaPublishParams {
  destination: 'facebook' | 'instagram' | 'both';
  pageId?: string;
  instagramAccountId?: string;
  message: string;
  mediaUrl?: string;
  linkUrl?: string;
  scheduledPublishTime?: string; // ISO-8601
  campaignId?: string;
  contentId?: string;
}

export interface MetaPublishResponse {
  success: boolean;
  facebookPostId?: string;
  instagramMediaId?: string;
  publishedAt: string;
  destination: 'facebook' | 'instagram' | 'both';
  status: 'published' | 'scheduled' | 'processing' | 'failed';
  error?: string;
}

export interface MetaInsightsQuery {
  targetId: string;
  targetType: 'page' | 'post' | 'instagram_account' | 'instagram_media';
  metrics?: string[];
  since?: string;
  until?: string;
}

export interface MetaDomainMetrics {
  targetId: string;
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  clicks: number;
  collectedAt: string;
  rawMetrics?: Record<string, number>;
}

export interface MetaWebhookEventRecord {
  id: string;
  object: string;
  entryCount: number;
  receivedAt: string;
  processed: boolean;
  error?: string;
  entries: Array<{
    id: string;
    time: number;
    changes?: Array<{
      field: string;
      value: any;
    }>;
  }>;
}

export interface MetaConnectionEntity {
  id: string;
  userId: string;
  metaUserId: string;
  metaUserName: string;
  metaUserEmail?: string;
  userAccessToken: string; // Long-lived user token (encrypted or server-only)
  tokenExpiresAt: string;
  scopes: string[];
  pages: Array<{
    id: string;
    name: string;
    category?: string;
    accessToken: string; // Page Access Token (server-only)
    tasks?: string[];
    instagramAccount?: {
      id: string;
      username: string;
      name?: string;
      profilePictureUrl?: string;
    };
  }>;
  selectedPageId?: string;
  selectedInstagramId?: string;
  status: MetaConnectionStatus;
  createdAt: string;
  updatedAt: string;
  lastValidatedAt: string;
}
