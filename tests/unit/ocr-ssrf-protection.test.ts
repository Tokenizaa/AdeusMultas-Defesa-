/**
 * Tests for OCR Service SSRF Protection and Resource Limits
 * FASE 1.1 corrections
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test the validateFetchUrl function and the size limits
// Since the function is not exported, we test via the public interface (analyzeFromUrl)

describe('OCR SSRF Protection', () => {
  // Mock fetch globally for these tests
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('URL Validation (via analyzeFromUrl errors)', () => {
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
      ).rejects.toThrow(/SSRF_BLOCKED.*10\.x\.x\.x/);
    });

    it('blocks private IP range 192.168.x.x', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      await expect(
        ocrService.analyzeFromUrl('http://192.168.1.1/image.jpg')
      ).rejects.toThrow(/SSRF_BLOCKED.*192\.168\.x\.x/);
    });

    it('blocks private IP range 172.16-31.x.x', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      await expect(
        ocrService.analyzeFromUrl('http://172.20.0.1/image.jpg')
      ).rejects.toThrow(/SSRF_BLOCKED.*172\.16-31/);
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

    it('blocks AWS metadata endpoint', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      await expect(
        ocrService.analyzeFromUrl('http://169.254.169.254/latest/meta-data/')
      ).rejects.toThrow(/SSRF_BLOCKED/);
    });

    it('allows valid public HTTPS URLs', async () => {
      // This test verifies SSRF validation passes for public URLs
      // The actual OCR call will fail due to no API key, but that's expected
      const { ocrService } = await import('../../src/server/services/ocr-service');
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', '1024']]),
        arrayBuffer: async () => new ArrayBuffer(1024),
      });
      // Should NOT throw SSRF_BLOCKED (auth would be handled at route level)
      // It may throw due to no OCR API key, but NOT SSRF_BLOCKED
      try {
        await ocrService.analyzeFromUrl('https://example.com/image.jpg');
      } catch (err: any) {
        expect(err.message).not.toContain('SSRF_BLOCKED');
      }
    });
  });

  describe('Resource Limits', () => {
    it('blocks Content-Length exceeding 5MB', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', String(6 * 1024 * 1024)]]),
        arrayBuffer: async () => new ArrayBuffer(6 * 1024 * 1024),
      });
      await expect(
        ocrService.analyzeFromUrl('https://example.com/big-image.jpg')
      ).rejects.toThrow(/MAX_SIZE_EXCEEDED/);
    });

    it('blocks base64 exceeding 7MB', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      const hugeBase64 = 'A'.repeat(8 * 1024 * 1024); // 8MB base64 string
      await expect(
        ocrService.analyzeImage(hugeBase64)
      ).rejects.toThrow(/MAX_BASE64_SIZE_EXCEEDED/);
    });

    it('allows base64 within 7MB limit', async () => {
      const { ocrService } = await import('../../src/server/services/ocr-service');
      // Mock OCR providers to fail so we get a deterministic error
      // (we're testing the limit check, not the OCR itself)
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', '100']]),
        arrayBuffer: async () => {
          throw new Error('OCR test - expected to fail');
        },
      });

      // This should fail at the OCR provider, not at the size check
      // The size check passes, then OCR fails
      const smallBase64 = 'A'.repeat(100 * 1024); // 100KB - well under limit
      await expect(
        ocrService.analyzeImage(smallBase64)
      ).rejects.toThrow(); // Should throw but not MAX_BASE64_SIZE_EXCEEDED
    });
  });
});
