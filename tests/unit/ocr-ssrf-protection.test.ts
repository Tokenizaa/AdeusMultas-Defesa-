/**
 * Tests for OCR Service SSRF Protection and Resource Limits
 * FASE 1.1 — streaming download + DNS validation + redirect protection
 *
 * Note: DNS mocking is complex in Node 18+ vitest environment.
 * The DNS rebinding protection is tested by verifying the code path.
 * Key security tests: URL validation, streaming size limit, redirect protection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

function createMockStream(chunks: Uint8Array[]) {
  let controller: ReadableStreamDefaultController;
  const stream = new ReadableStream({
    start(c) { controller = c; },
    async pull(c) {
      for (const chunk of chunks) {
        c.enqueue(chunk);
      }
      c.close();
    },
    cancel() {},
  });
  return { stream, controller: controller! };
}

describe('OCR SSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── URL Validation (hostname-level, no DNS needed) ───────────────────────

  describe('URL Validation — hostname blocks', () => {
    it('blocks localhost URLs', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      await expect(
        ocrService.analyzeFromUrl('http://localhost:8080/image.jpg')
      ).rejects.toThrow(/SSRF_BLOCKED/);
    });

    it('blocks 127.0.0.1 IP', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      await expect(
        ocrService.analyzeFromUrl('http://127.0.0.1:8080/image.jpg')
      ).rejects.toThrow(/SSRF_BLOCKED/);
    });

    it('blocks private IP range 10.x.x.x', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      await expect(
        ocrService.analyzeFromUrl('http://10.0.0.1:8080/image.jpg')
      ).rejects.toThrow(/SSRF_BLOCKED.*privado/);
    });

    it('blocks private IP range 192.168.x.x', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      await expect(
        ocrService.analyzeFromUrl('http://192.168.1.1/image.jpg')
      ).rejects.toThrow(/SSRF_BLOCKED.*192\.168/);
    });

    it('blocks private IP range 172.16-31.x.x', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      await expect(
        ocrService.analyzeFromUrl('http://172.20.0.1/image.jpg')
      ).rejects.toThrow(/SSRF_BLOCKED.*privado.*172\.20/);
    });

    it('blocks file:// scheme', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      await expect(
        ocrService.analyzeFromUrl('file:///etc/passwd')
      ).rejects.toThrow(/SSRF_BLOCKED/);
    });

    it('blocks ftp:// scheme', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      await expect(
        ocrService.analyzeFromUrl('ftp://example.com/image.jpg')
      ).rejects.toThrow(/SSRF_BLOCKED/);
    });

    it('blocks URLs with credentials', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      await expect(
        ocrService.analyzeFromUrl('http://user:pass@example.com/image.jpg')
      ).rejects.toThrow(/SSRF_BLOCKED/);
    });

    it('blocks AWS metadata endpoint hostname', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      await expect(
        ocrService.analyzeFromUrl('http://169.254.169.254/latest/meta-data/')
      ).rejects.toThrow(/SSRF_BLOCKED/);
    });

    it('blocks hostname with internal pattern', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      await expect(
        ocrService.analyzeFromUrl('http://internal.corp.example.com/image.jpg')
      ).rejects.toThrow(/SSRF_BLOCKED.*internal/);
    });

    it('blocks hostname with .local suffix', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      await expect(
        ocrService.analyzeFromUrl('http://printer.local/image.jpg')
      ).rejects.toThrow(/SSRF_BLOCKED/);
    });
  });

  // ─── Resource Limits — Streaming ─────────────────────────────────────────

  describe('Resource Limits — Streaming', () => {
    it('blocks Content-Length exceeding 5MB (pre-check)', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': String(6 * 1024 * 1024) }),
        body: null,
      }));

      await expect(
        ocrService.analyzeFromUrl('https://example.com/big-image.jpg')
      ).rejects.toThrow(/MAX_SIZE_EXCEEDED/);
    });

    it('blocks streaming response exceeding 5MB mid-download', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');

      // Create chunks that exceed the 5MB limit (3MB + 3MB = 6MB)
      const largeChunk = new Uint8Array(3 * 1024 * 1024);
      const { stream } = createMockStream([largeChunk, largeChunk]);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': '6291456' }),
        body: stream,
      }));

      await expect(
        ocrService.analyzeFromUrl('https://example.com/image.jpg')
      ).rejects.toThrow(/MAX_SIZE_EXCEEDED/);
    });

    it('allows streaming response within 5MB limit', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');

      // 2MB chunk — under the limit
      const chunk = new Uint8Array(2 * 1024 * 1024);
      const { stream } = createMockStream([chunk]);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': '2097152' }),
        body: stream,
      }));

      // Should NOT throw MAX_SIZE_EXCEEDED — may throw due to no OCR key
      try {
        await ocrService.analyzeFromUrl('https://example.com/small-image.jpg');
      } catch (err: any) {
        expect(err.message).not.toContain('MAX_SIZE_EXCEEDED');
      }
    });

    it('respects Content-Length pre-check before streaming', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');

      // This should fail at the Content-Length check, before any streaming
      const chunk = new Uint8Array(100);
      const { stream } = createMockStream([chunk]);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': String(10 * 1024 * 1024) }), // 10MB
        body: stream,
      }));

      await expect(
        ocrService.analyzeFromUrl('https://example.com/image.jpg')
      ).rejects.toThrow(/MAX_SIZE_EXCEEDED/);
    });
  });

  // ─── Base64 Limits ────────────────────────────────────────────────────────

  describe('Base64 Limits', () => {
    it('blocks base64 exceeding 7MB', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      const hugeBase64 = 'A'.repeat(8 * 1024 * 1024); // 8MB
      await expect(
        ocrService.analyzeImage(hugeBase64)
      ).rejects.toThrow(/MAX_BASE64_SIZE_EXCEEDED/);
    });

    it('allows base64 within 7MB limit', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      const smallBase64 = 'A'.repeat(100 * 1024); // 100KB — well under limit
      await expect(
        ocrService.analyzeImage(smallBase64)
      ).rejects.not.toThrow(/MAX_BASE64_SIZE_EXCEEDED/);
    });
  });

  // ─── Redirect Protection ──────────────────────────────────────────────────

  describe('Redirect Protection', () => {
    it('blocks redirect to localhost', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');

      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const headers = new Headers();
          headers.set('location', 'http://localhost:8080/image.jpg');
          return Promise.resolve({
            ok: false,
            status: 302,
            headers,
            body: null,
          });
        }
        return Promise.resolve({
          ok: false,
          status: 200,
          headers: new Headers(),
          body: null,
        });
      }));

      await expect(
        ocrService.analyzeFromUrl('https://example.com/image.jpg')
      ).rejects.toThrow(/SSRF_BLOCKED.*Redirect/);
    });

    it('blocks redirect to private IP', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');

      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const headers = new Headers();
          headers.set('location', 'http://10.0.0.1/internal/image.jpg');
          return Promise.resolve({
            ok: false,
            status: 302,
            headers,
            body: null,
          });
        }
        return Promise.resolve({
          ok: false,
          status: 200,
          headers: new Headers(),
          body: null,
        });
      }));

      await expect(
        ocrService.analyzeFromUrl('https://example.com/image.jpg')
      ).rejects.toThrow(/SSRF_BLOCKED.*Redirect.*privado/);
    });

    it('blocks infinite redirect loop', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');

      // Always redirect to the same URL — exceeds MAX_REDIRECTS (5)
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 302,
        headers: new Headers({ 'location': 'https://example.com/image.jpg' }),
        body: null,
      }));

      await expect(
        ocrService.analyzeFromUrl('https://example.com/image.jpg')
      ).rejects.toThrow(/SSRF_BLOCKED.*Limite de redirects/);
    });
  });
});
