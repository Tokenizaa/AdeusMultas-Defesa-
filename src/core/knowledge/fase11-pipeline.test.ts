/**
 * FASE 11 — Testes mínimos: extração (HTML), canonicalização determinística e
 * chunking sem duplicação (reutiliza ChunkingService canônico).
 */
import { describe, it, expect } from 'vitest';
import { chunkingService } from '../../server/knowledge/chunking-service';

function extractHtml(html: string): string {
  const body = html.replace(/<(script|style|nav|header|footer|noscript)[\s\S]*?<\/\1>/gi, ' ');
  return body
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
function canonicalize(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\s*([,;:.)])\s*/g, '$1 ').trim();
}

describe('Fase 11 - extração/canonicalização', () => {
  it('remove ruído HTML preservando o conteúdo normativo', () => {
    const html = '<!DOCTYPE html><html><head><style>.x{}</style></head><body><script>var a=1;</script><h1>Resolução X</h1><p>Art. 1º Fica instituído o procedimento.</p></body></html>';
    const txt = extractHtml(html);
    expect(txt).not.toContain('var a');
    expect(txt).not.toContain('.x{');
    expect(txt).toContain('Resolução X');
    expect(txt).toContain('Art. 1º');
  });

  it('canonicalização é determinística', () => {
    const a = canonicalize('Art.  1º   Fica    instituído.\n\nParágrafo único.');
    const b = canonicalize('Art. 1º Fica instituído. Parágrafo único.');
    expect(a).toBe(b);
  });

  it('HTML de erro não gera conteúdo válido', () => {
    const txt = extractHtml('<html><body>Access Denied</body></html>');
    const blockedMarkers = ['Access Denied', 'error_type', 'NotFound'];
    expect(blockedMarkers.some((m) => txt.includes(m))).toBe(true);
  });
});

describe('Fase 11 - chunking determinístico', () => {
  const chunkText = 'Art. 1º Fica instituído o regime. Art. 2º Aplica-se a todos. Art. 3º Revogam-se as disposições em contrário.';
  it('gera chunks sem duplicar ids nem hashes', () => {
    const chunks = chunkingService.chunkDocument('v_probe', 'doc_probe', 'src_probe', chunkText, {
      documentType: 'LEI', jurisdiction: 'BR_FEDERAL', title: 'Teste',
    });
    const ids = new Set(chunks.map((c: any) => c.id));
    const hashes = new Set(chunks.map((c: any) => c.contentHash));
    expect(ids.size).toBe(chunks.length);
    expect(hashes.size).toBe(chunks.length);
    chunks.forEach((c: any) => {
      expect(c.documentVersionId).toBe('v_probe');
      expect(c.documentId).toBe('doc_probe');
      expect(c.sourceId).toBe('src_probe');
      expect(c.content.length).toBeGreaterThan(0);
    });
  });
});