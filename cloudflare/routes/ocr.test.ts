import { describe, expect, it } from 'vitest';
import { ocrRoutes } from './ocr';

describe('Cloudflare OCR route', () => {
  const env = {
    AI: {
      run: async () => ({
        answer: JSON.stringify({
          rawText: 'AIT 1234567890\nABC1D23',
          fields: {
            aitNumber: '1234567890',
            plate: 'ABC1D23',
            infractionDate: null,
            autuadorBody: 'Órgão de Trânsito',
            description: null,
            ctbArticle: '218',
            vehicleBrandModel: null,
            driverName: null,
            driverCpf: null,
            driverCnh: null,
          },
        }),
      }),
    },
  } as any;

  it('rejects unsupported media types', async () => {
    const response = await ocrRoutes.request('/ocr/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: 'aGVsbG8=', mimeType: 'application/pdf' }),
    }, env);

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns normalized OCR fields from Workers AI', async () => {
    const response = await ocrRoutes.request('/ocr/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: 'aGVsbG8=', mimeType: 'image/jpeg' }),
    }, env);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.ok).toBe(true);
    expect(body.data.provider).toBe('cloudflare-workers-ai');
    expect(body.data.fields.aitNumber).toBe('1234567890');
    expect(body.data.fields.plate).toBe('ABC1D23');
  });
});
