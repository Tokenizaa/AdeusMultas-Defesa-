import { describe, expect, it } from 'vitest';
import { buildAdminIntegrationsOverview } from './admin-integrations-overview';

describe('buildAdminIntegrationsOverview', () => {
  it('uses measured health statuses and never invents payment/OCR/WhatsApp health', () => {
    const result = buildAdminIntegrationsOverview({
      healthServices: [
        { id: 'supabase_db', status: 'HEALTHY', latencyMs: 32, isConfigured: true, message: 'Probe OK' },
        { id: 'supabase_auth', status: 'DEGRADED', latencyMs: null, isConfigured: true, message: 'Auth probe degraded' },
        { id: 'storage', status: 'UNKNOWN', latencyMs: null, isConfigured: true, message: 'No probe' },
        { id: 'edge_functions', status: 'DOWN', latencyMs: 5000, isConfigured: true, message: 'Probe failed' },
        { id: 'ocr', status: 'HEALTHY', latencyMs: 80, isConfigured: true, message: 'OCR probe OK' },
      ],
      meta: { isConnected: true, user: { name: 'Admin Meta' }, pages: [{ id: 'page-1' }] },
      venopag: { displayName: 'VenoPag PIX', status: 'configured', isActive: true },
      whatsappConfigured: true,
      googleDriveConfigured: false,
    });

    expect(result.venopag).toMatchObject({
      status: 'CONFIGURED_NOT_PROBED',
      externalConnectivityVerified: false,
      idempotencyLiveVerified: false,
      webhookPath: '/api/webhooks/venopag',
    });
    expect(result.supabase).toMatchObject({
      dbStatus: 'HEALTHY',
      dbLatencyMs: 32,
      authStatus: 'DEGRADED',
      edgeFunctionsStatus: 'DOWN',
      edgeFunctionsCount: null,
      rlsStatus: 'NOT_VERIFIED_BY_HEALTH_PROBE',
    });
    expect(result.ocr).toMatchObject({ status: 'HEALTHY', latencyMs: 80, parserAccuracy: null });
    expect(result.whatsapp).toMatchObject({ status: 'NOT_VERIFIED', configured: true });
    expect(result.googleDrive).toMatchObject({ status: 'NOT_VERIFIED', configured: false });
    expect(result).not.toHaveProperty('pagbank');
  });

  it('does not label missing VenoPag credentials as healthy', () => {
    const result = buildAdminIntegrationsOverview({
      healthServices: [],
      meta: { isConnected: false },
      venopag: {
        displayName: 'VenoPag PIX',
        status: 'not_configured',
        isActive: true,
        notConfiguredReason: 'Credenciais ausentes',
      },
      whatsappConfigured: false,
      googleDriveConfigured: false,
    });

    expect(result.venopag.status).toBe('NOT_CONFIGURED');
    expect(result.supabase.dbStatus).toBe('UNKNOWN');
    expect(result.ocr.parserAccuracy).toBeNull();
  });
});
