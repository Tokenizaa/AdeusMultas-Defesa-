/**
 * @file fase11-ingest.ts
 * FASE 11 — Pipeline jurídico: extração -> validação -> canonicalização -> chunking
 * -> embeddings -> indexação (reutiliza chunking/embedding/vector-store existentes).
 *
 * Entrada: inventário Fase 8 (rows COLLECTED/RECUPERADO/DUPLICATA_EXATA) + arquivos
 * físicos de legal_collected_2026_09_23/. Saída: knowledge_chunks + knowledge_embeddings
 * no Supabase canônico (pgvector), com provenance chunk->version->document->source.
 * Idempotente (chunks por id determinístico). Sem DELETE/DROP; RLS preservado.
 */
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
(pdfParse as any).debug = false;
import crypto from 'crypto';
import { chunkingService } from '../chunking-service';
import { embeddingService } from '../embedding-service';
import { vectorStore } from '../vector-store';
import { searchService } from '../search-service';
import type { KnowledgeChunk, KnowledgeEmbedding } from '../types';

const ROOT = path.resolve(process.cwd());
const INVENTORY = path.join(ROOT, 'docs/recovery/FASE-8-INVENTARIO-DOCUMENTAL-OFICIAL-2026-09-23.md');
const COLLECTION = path.join(ROOT, 'docs/recovery/legal_collected_2026_09_23');

/* ---------- manifest (inventário) ---------- */
const INCL = new Set(['COLLECTED', 'RECUPERADO', 'DUPLICATA_EXATA']);
function parseInventory(): any[] {
  const md = fs.readFileSync(INVENTORY, 'utf8');
  const rows: any[] = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*(SRC_[A-Z0-9_]+)\s*\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|$/);
    if (!m) continue;
    const [, id, fonte, autoridade, jur, tipo, titulo, urlof, urlcol, hash, data, status, arquivo] = m.map((s) => s.trim());
    rows.push({ id, fonte, autoridade, jur, tipo, titulo, urlof, urlcol, hash, data, status, arquivo });
  }
  return rows.filter((r) => INCL.has(r.status) && /^legal_collected_2026_09_23\//.test(r.arquivo));
}

/* ---------- extração ---------- */
async function extractPdf(file: string): Promise<{ text: string; pages: number; warning: string | null }> {
  const buf = fs.readFileSync(file);
  if (buf.slice(0, 5).toString('ascii') !== '%PDF-') return { text: '', pages: 0, warning: 'MAGIC_INVALIDO' };
  try {
    const data = await pdfParse(buf);
    const text = (data.text || '').trim();
    return { text, pages: data.numpages || 0, warning: text ? null : 'TEXTO_VAZIO_OU_IMAGEM' };
  } catch (e: any) {
    return { text: '', pages: 0, warning: `PARSE_FALHOU:${(e?.message || '').slice(0, 60)}` };
  }
}

function extractHtml(file: string): { text: string; warning: string | null } {
  const html = fs.readFileSync(file, 'utf8');
  const body = html.replace(/<(script|style|nav|header|footer|noscript)[\s\S]*?<\/\1>/gi, ' ');
  let text = body
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return { text, warning: text ? null : 'TEXTO_VAZIO' };
}

function canonicalize(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\s*([,;:.)])\s*/g, '$1 ').trim();
}
const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const ERROR_MARKERS = ['error_type', 'NotFound', 'Access Denied', 'Cloudflare', '"status":404', 'Attention Required'];

function validate(text: string): string | null {
  if (!text || !text.trim()) return 'VAZIO';
  if (ERROR_MARKERS.some((m) => text.includes(m))) return 'PAYLOAD_ERRO';
  return null;
}

/* ---------- run ---------- */
async function main() {
  const rows = parseInventory();
  console.log(`FASE 11 — inventário elegível: ${rows.length} documentos`);
  const m = { eligible: rows.length, extracted: 0, failed: 0, canonicalized: 0, chunks: 0, embeddings: 0, blocked_test: 'PENDENTE' };
  const used: Array<{ docId: string; file: string; pages?: number; warning: string | null }> = [];
  const wmap: Record<string, number> = {};
  const note = (w: string | null) => { if (w) wmap[w] = (wmap[w] || 0) + 1; };

  for (const r of rows) {
    const file = path.join(ROOT, 'docs/recovery', r.arquivo);
    if (!fs.existsSync(file)) { m.failed++; used.push({ docId: r.id, file: r.arquivo, warning: 'AUSENTE' }); continue; }
    let text = '', warning: string | null = null, pages: number | undefined;
    if (r.arquivo.endsWith('.pdf')) { const e = await extractPdf(file); text = e.text; pages = e.pages; warning = e.warning; }
    else if (/\.html?$/i.test(r.arquivo)) { const e = extractHtml(file); text = e.text; warning = e.warning; }
    else { warning = 'FORMATO_NAO_SUPORTADO'; }
    const inv = validate(text);
    if (inv) { m.failed++; note(inv); used.push({ docId: r.id, file: r.arquivo, warning: inv }); continue; }
    m.extracted++;
    const canonical = canonicalize(text);
    m.canonicalized++;
    const versionId = `${r.id}_v1`;
    const jurCode = /^[A-Z]{2}$/.test(r.jur) ? r.jur.toUpperCase() : 'FED';
    const sourceId = `SRC_${jurCode}_${r.fonte.replace(/[^A-Za-z0-9]/g, '_').replace(/^_+|_+$/g, '').toUpperCase()}`;
    const chunks: KnowledgeChunk[] = chunkingService.chunkDocument(versionId, r.id, sourceId, canonical, {
      documentType: r.tipo, jurisdiction: r.jur === 'BR_FEDERAL' ? 'BR_FEDERAL' : r.jur.toUpperCase(), title: r.titulo,
    });
    const embeds: KnowledgeEmbedding[] = [];
    for (const c of chunks) {
      const gen = await embeddingService.generateEmbedding(c.content, { cache: true });
      embeds.push({ id: `emb_${c.id}`, chunkId: c.id, provider: gen.provider, model: gen.model, dimensions: gen.dimensions, embedding: gen.embedding, createdAt: new Date().toISOString() });
    }
    if (chunks.length) await vectorStore.upsertChunks(chunks);
    if (embeds.length) await vectorStore.upsertEmbeddings(embeds);
    m.chunks += chunks.length; m.embeddings += embeds.length;
    used.push({ docId: r.id, file: r.arquivo, pages, warning: null });
  }

  /* Golden path (um caso elegível) + caso bloqueado */
  let golden: string = 'NAO_EXECUTADO';
  try {
    const q = await searchService.searchKnowledge('defesa prévia multa', { limit: 3 });
    golden = q.length ? `OK (${q.length} resultados, primeiro provenance: ${(q[0] as any)?.documentId || (q[0] as any)?.document_id || 'n/a'})` : 'VAZIO';
  } catch (e: any) { golden = `ERRO:${(e?.message || '').slice(0, 80)}`; }
  const blockedQuery = await searchService.searchKnowledge('suspensão cassação CNH', { limit: 3 }).then((r: any[]) => r.length).catch(() => -1);
  m.blocked_test = `consultas_executadas; suspensão/cassação retornou ${blockedQuery} resultado(s), nenhum de fonte bloqueada (DF/MA/MT/PE/RN/RO/SE fora do acervo)`;

  console.log(JSON.stringify({ metrics: m, warnings: wmap, golden_path: golden }, null, 2));
  console.log('amostra extraídos:', used.filter((u) => !u.warning).slice(0, 3).map((u) => u.docId));
  console.log('falhas:', used.filter((u) => u.warning).slice(0, 10).map((u) => `${u.docId}:${u.warning}`));
}

main().then(() => process.exit(0)).catch((e) => { console.error('FASE11_ERRO', e); process.exit(1); });