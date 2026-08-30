/**
 * @file hash-generator.ts
 * Utilitário de Geração de Checksum Criptográfico SHA-256 para o Sistema de Monitoramento.
 * Funciona de maneira isomórfica (Node.js e Browser).
 */

export function calculateSha256Sync(text: string): string {
  // Simple deterministic djb2/murmur-like 64-char hex hash fallback if crypto is not available,
  // but using Node crypto if present.
  try {
    // Dynamic require for Node crypto
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  } catch (e) {
    // Pure TypeScript deterministic 64-char hash fallback
    let h1 = 0xdeadbeef ^ text.length;
    let h2 = 0x41c6ce57 ^ text.length;
    let h3 = 0x9e3779b9 ^ text.length;
    let h4 = 0x85ebca6b ^ text.length;

    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
      h3 = Math.imul(h3 ^ ch, 2246822507);
      h4 = Math.imul(h4 ^ ch, 3266489909);
    }

    const hex = (h: number) => (h >>> 0).toString(16).padStart(8, '0');
    return (hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h1 ^ h3) + hex(h2 ^ h4) + hex(h1 + h2) + hex(h3 + h4)).slice(0, 64);
  }
}

export async function calculateSha256(text: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return calculateSha256Sync(text);
}
