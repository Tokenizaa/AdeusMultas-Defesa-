/**
 * @file uuid-v5.ts
 * Geração de UUID v5 determinístico (RFC 4122 §4.3) via node:crypto.
 *
 * Por que existe: ids de domínio do DefesAi são sintéticos (`case_<ts>_<rand>`),
 * mas a PK de `public.cases.id` é coluna **uuid**. Enviar o id sintético causa
 * `22P02: invalid input syntax for type uuid` e o write-through nunca persiste.
 *
 * O mapeamento precisa ser DETERMINÍSTICO: mesmo id de domínio → sempre o mesmo
 * UUID, garantindo upsert idempotente entre restarts/instâncias (cold start da
 * Vercel gera novos ids sintéticos apenas para casos NOVOS; ids existentes são
 * restaurados via `cases.app_ref`, ver loadAllFromSupabase).
 *
 * O pacote `uuid` não está nas dependências do projeto; a implementação abaixo
 * usa SHA-1 conforme RFC 4122 §4.3 e é validada contra vetor público conhecido.
 */

import { createHash } from 'node:crypto';

/**
 * Namespace FIXO próprio do projeto DefesAi (UUID v4 aleatório gerado uma vez).
 *
 * ⚠️ NUNCA alterar este valor: mudá-lo geraria UUIDs diferentes para os mesmos
 * app_refs já persistidos, duplicando linhas (o índice único parcial
 * cases_app_ref_key está sobre app_ref, não sobre o UUID derivado).
 */
export const DEFESAI_UUID_NAMESPACE = '6f0a9d2e-8c47-4b3a-9f15-d7e0b2c4a681';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida formato UUID canônico (mesma regex usada pelos repositórios). */
export function isUuid(value?: string | null): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

function parseNamespaceBytes(namespace: string): Buffer {
  const hex = namespace.replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/i.test(hex)) {
    throw new Error(`Namespace UUID inválido: ${namespace}`);
  }
  return Buffer.from(hex, 'hex');
}

/**
 * UUID v5 (name-based, SHA-1) — determinístico por (namespace, name).
 *
 * Algoritmo RFC 4122 §4.3: sha1(namespace_bytes || name_bytes), truncado em
 * 16 bytes com bits de versão (5) e variante (RFC) ajustados.
 *
 * Vetor público de referência:
 *   v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8' (NAMESPACE_DNS), 'python.org')
 *   → '886313e1-3b8a-5372-9b90-0c9aee199e5d'
 */
export function uuidV5(name: string, namespace: string = DEFESAI_UUID_NAMESPACE): string {
  const hash = createHash('sha1');
  hash.update(parseNamespaceBytes(namespace));
  hash.update(Buffer.from(name, 'utf8'));
  const bytes = Buffer.from(hash.digest().subarray(0, 16));

  bytes[6] = (bytes[6] & 0x0f) | 0x50; // versão 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Mapeia um id de domínio para o UUID canônico usado no banco:
 *  - id ausente → null;
 *  - id já é UUID → devolvido intacto (retrocompatível);
 *  - id sintético (`case_*`) → UUID v5 determinístico do projeto.
 */
export function domainIdToUuid(id?: string | null): string | null {
  if (!id) return null;
  if (isUuid(id)) return id;
  return uuidV5(id);
}
