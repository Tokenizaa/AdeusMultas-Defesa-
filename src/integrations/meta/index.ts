/**
 * Canonical Meta Integration Package Entry Point
 * All external modules consume Meta capabilities strictly through this single source of truth.
 */

export * from './types';
export * from './errors/meta-errors';
export * from './client/meta-graph-client';
export * from './auth/meta-auth-service';
export * from './pages/meta-pages-service';
export * from './instagram/meta-instagram-service';
export * from './publishing/meta-publishing-service';
export * from './insights/meta-insights-service';
export * from './webhooks/meta-webhook-service';
export * from './adapters/meta-adapter';
