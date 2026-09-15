import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const caseRow = {
  id: '00000000-0000-0000-0000-000000000001',
  user_id: '00000000-0000-0000-0000-000000000002',
  is_paid: true,
  service_type: 'defesa_previa',
  defense_draft_json: JSON.stringify({ fullDraftText: 'DEFESA\nFatos e fundamentos do caso.' }),
};

const supabase = {
  from: vi.fn((table: string) => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => {
        if (table === 'cases') return { data: caseRow, error: null };
        if (table === 'payment_orders') return { data: { id: 'payment-1' }, error: null };
        if (table === 'documents') return { data: null, error: null };
        return { data: null, error: null };
      }),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      single: vi.fn(async () => ({ data: { id: 'document-1' }, error: null })),
    };
    return chain;
  }),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(async (_path: string, file: Uint8Array) => {
        expect(file).toBeInstanceOf(Uint8Array);
        expect(new TextDecoder().decode(file)).toContain('%PDF-1.4');
        return { data: { path: _path }, error: null };
      }),
      createSignedUrl: vi.fn(async (path: string) => ({ data: { signedUrl: `https://signed.test/${path}` }, error: null })),
    })),
  },
};

vi.mock('../supabase', () => ({ createSupabaseAdminClient: vi.fn(() => supabase) }));
vi.mock('../middleware', () => ({
  authenticateToken: async (c: any, next: any) => {
    c.set('user', { id: caseRow.user_id, role: 'citizen', email: 'test@example.com' });
    await next();
  },
}));

import { documentsRoutes } from './documents';

describe('Cloudflare documents', () => {
  it('generates a PDF, persists metadata, and returns a signed URL', async () => {
    const app = new Hono<any>();
    app.route('/api', documentsRoutes);
    const response = await app.request(`/api/documents/${caseRow.id}/generate`, { method: 'POST' }, { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test' } as any);
    expect(response.status).toBe(201);
    const body = await response.json() as any;
    expect(body.ok).toBe(true);
    expect(body.document.mimeType).toBe('application/pdf');
    expect(body.document.storagePath).toMatch(new RegExp(`^${caseRow.id}/[a-f0-9]{64}\\.pdf$`));
    expect(body.document.downloadUrl).toContain('https://signed.test/');
  });
});
