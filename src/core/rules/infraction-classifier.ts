/**
 * @file infraction-classifier.ts
 * Classifica a infração em uma FAMÍLIA JURÍDICA e determina quais argumentos
 * são LEGALMENTE elegíveis para ela.
 *
 * POR QUE ISTO EXISTE (causa-raiz RC-1 da auditoria FASE 12):
 * o único mapa infração→argumento do projeto é
 * `INFRACTION_CATALOG.recommendedArgumentCodes` (src/data/knowledge-base.ts:12),
 * e ele era consumido apenas pelo RagPipeline legado. O caminho canônico
 * (Cloudflare) não tinha nenhuma ligação entre a tipificação da infração e os
 * argumentos, de modo que uma regra disparada por um dado isolado produzia a
 * mesma tese em qualquer infração — por exemplo ARG-002 (placa R-19) em
 * alcool, semáforo, celular e estacionamento.
 *
 * Este módulo é a ÚNICA fonte de elegibilidade. Regras do Rule Engine, seleção
 * de argumentos e verificação de compatibilidade de procedimento consultam
 * `eligibleArgumentIds`. Argumento fora desse conjunto nunca entra em peça.
 *
 * Princípio: fail-closed. Família desconhecida ⇒ `eligibleArgumentIds: []` e
 * `confidence: 'UNKNOWN'` — a Analysis declara insuficiência em vez de inventar
 * teses. O Case continua sendo a fonte dos FATOS (código, gravidade, multa,
 * velocidade); o catálogo só diz quais teses são juridicamente cabíveis.
 */

import { INFRACTION_CATALOG } from '../../data/knowledge-base';

export type InfractionFamily =
  | 'excesso_velocidade'
  | 'alcoolemia'
  | 'semaforo'
  | 'celular'
  | 'estacionamento'
  | 'cinto'
  | 'documentos'
  | 'circulacao'
  | 'capacidade'
  | 'lotacao'
  | 'desconhecida';

export interface InfractionClassification {
  /** Código como veio no Case, sem normalização. */
  inputCode: string;
  /** Código normalizado (só dígitos), para comparação estável. */
  normalizedCode: string;
  /** Article do CTB extraído, quando houver. */
  article: string | null;
  /** Família jurídica. */
  family: InfractionFamily;
  /** Códigos do catálogo que representam a família. */
  catalogCodes: string[];
  /** Argumentos juridicamente elegíveis (união de recommendedArgumentCodes da família). */
  eligibleArgumentIds: string[];
  /** Como a família foi determinada — rastreabilidade. */
  basis: 'CATALOG_CODE' | 'CODE_FAMILY' | 'ARTICLE' | 'UNKNOWN';
  /** Grau de certeza. `UNKNOWN` ⇒ Analysis deve declarar insuficiência. */
  confidence: 'EXACT' | 'INFERRED' | 'UNKNOWN';
  /** Observações legíveis para a Analysis. */
  notes: string[];
}

/** Família de cada código do catálogo (24 entradas de src/data/knowledge-base.ts). */
const FAMILY_BY_CATALOG_CODE: Record<string, InfractionFamily> = {
  '745-50': 'excesso_velocidade',
  '745-70': 'excesso_velocidade',
  '746-30': 'excesso_velocidade',
  '747-10': 'excesso_velocidade',
  '516-91': 'alcoolemia',
  '516-92': 'alcoolemia',
  '605-01': 'semaforo',
  '605-02': 'semaforo',
  '736-62': 'celular',
  '735-80': 'celular',
  '545-21': 'estacionamento',
  '554-12': 'estacionamento',
  '518-51': 'cinto',
  '518-52': 'cinto',
  '501-00': 'documentos',
  '504-50': 'documentos',
  '659-92': 'documentos',
  '581-70': 'circulacao',
  '596-70': 'circulacao',
  '758-70': 'circulacao',
  '759-50': 'circulacao',
  '703-81': 'capacidade',
  '704-81': 'capacidade',
  '685-80': 'lotacao',
  '672-61': 'lotacao',
};

/**
 * Códigos fora do catálogo (tabelas em uso por órgãos estaduais, anteriores à
 * unificação CONTRAN) mapeados por
 * prefixo. O prefixo do código é mais específico que o artigo no CTB — 167-10
 * é estacionamento (Art. 167) enquanto 518-51 também cita Art. 167 no catálogo
 * para cinto; o código decide.
 */
const FAMILY_BY_CODE_PREFIX: Array<[string, InfractionFamily]> = [
  ['74', 'excesso_velocidade'],
  ['27', 'alcoolemia'],
  ['516', 'alcoolemia'],
  ['276', 'alcoolemia'],
  ['605', 'semaforo'],
  ['208', 'semaforo'],
  ['736', 'celular'],
  ['735', 'celular'],
  ['252', 'celular'],
  ['518', 'cinto'],
  ['162', 'cinto'],
  ['501', 'documentos'],
  ['504', 'documentos'],
  ['659', 'documentos'],
  ['232', 'documentos'],
  ['545', 'estacionamento'],
  ['554', 'estacionamento'],
  ['581', 'circulacao'],
  ['596', 'circulacao'],
  ['758', 'circulacao'],
  ['759', 'circulacao'],
  ['167', 'estacionamento'],
  ['181', 'estacionamento'],
  ['55', 'estacionamento'],
  ['67', 'lotacao'],
  ['672', 'lotacao'],
  ['703', 'capacidade'],
  ['704', 'capacidade'],
  ['685', 'lotacao'],
  ['244', 'capacidade'],
];

/** Último recurso: artigo do CTB. */
const FAMILY_BY_ARTICLE: Array<[string, InfractionFamily]> = [
  ['218', 'excesso_velocidade'],
  ['306', 'alcoolemia'],
  ['277', 'alcoolemia'],
  ['276', 'alcoolemia'],
  ['165', 'alcoolemia'],
  ['208', 'semaforo'],
  ['252', 'celular'],
  ['181', 'estacionamento'],
  ['167', 'estacionamento'],
  ['230', 'documentos'],
  ['232', 'documentos'],
  ['162', 'cinto'],
  ['231', 'lotacao'],
  ['244', 'capacidade'],
  ['184', 'circulacao'],
  ['193', 'circulacao'],
  ['203', 'circulacao'],
];

const normalizeCode = (code: unknown): string => String(code ?? '').replace(/\D/g, '');

const extractArticle = (article: unknown): string | null => {
  const m = String(article ?? '').match(/(\d+)\s*-?\s*A?/);
  if (!m) return null;
  const digits = m[1];
  return digits.length >= 3 ? digits : null;
};

const catalogEntry = (code: string) => INFRACTION_CATALOG.find((i) => normalizeCode(i.code) === code);

/** Códigos do catálogo que pertencem à família. */
const catalogCodesFor = (family: InfractionFamily): string[] =>
  family === 'desconhecida'
    ? []
    : INFRACTION_CATALOG.filter((i) => FAMILY_BY_CATALOG_CODE[i.code] === family).map((i) => i.code);

/** Argumentos elegíveis: união do `recommendedArgumentCodes` da família. */
const eligibleFor = (family: InfractionFamily): string[] => {
  if (family === 'desconhecida') return [];
  const ids = new Set<string>();
  for (const code of catalogCodesFor(family)) {
    const entry = catalogEntry(normalizeCode(code));
    for (const argId of entry?.recommendedArgumentCodes ?? []) ids.add(argId);
  }
  return Array.from(ids).sort();
};

/**
 * Classifica a infração. Não lê nem altera nenhum fato do Case: apenas
 * interpreta código/artigo para escolher a família jurídica.
 */
export function classifyInfraction(infraction: any): InfractionClassification {
  const inputCode = String(infraction?.infractionCode ?? '').trim();
  const normalizedCode = normalizeCode(inputCode);
  const article = extractArticle(infraction?.ctbArticle);
  const notes: string[] = [];

  const exact = normalizedCode ? catalogEntry(normalizedCode) : undefined;
  if (exact) {
    const family = FAMILY_BY_CATALOG_CODE[exact.code] ?? 'desconhecida';
    return {
      inputCode,
      normalizedCode,
      article,
      family,
      catalogCodes: catalogCodesFor(family),
      eligibleArgumentIds: eligibleFor(family),
      basis: 'CATALOG_CODE',
      confidence: 'EXACT',
      notes: [`Código ${exact.code} presente no catálogo canônico de infrações.`],
    };
  }
  if (normalizedCode) notes.push(`Código "${inputCode}" ausente do catálogo canônico.`);

  const prefix = FAMILY_BY_CODE_PREFIX.find(([p]) => normalizedCode.startsWith(p));
  if (prefix) {
    const family = prefix[1];
    return {
      inputCode,
      normalizedCode,
      article,
      family,
      catalogCodes: catalogCodesFor(family),
      eligibleArgumentIds: eligibleFor(family),
      basis: 'CODE_FAMILY',
      confidence: 'INFERRED',
      notes: [...notes, `Família "${family}" determinada pelo prefixo do código.`],
    };
  }

  const byArticle = article ? FAMILY_BY_ARTICLE.find(([a]) => article.startsWith(a)) : undefined;
  if (byArticle) {
    const family = byArticle[1];
    return {
      inputCode,
      normalizedCode,
      article,
      family,
      catalogCodes: catalogCodesFor(family),
      eligibleArgumentIds: eligibleFor(family),
      basis: 'ARTICLE',
      confidence: 'INFERRED',
      notes: [...notes, `Família "${family}" determinada pelo artigo do CTB (${article}).`],
    };
  }

  notes.push('Tipificação não classificável: nenhuma tese jurídica pode ser autorizada sem classificação.');
  return {
    inputCode,
    normalizedCode,
    article,
    family: 'desconhecida',
    catalogCodes: [],
    eligibleArgumentIds: [],
    basis: 'UNKNOWN',
    confidence: 'UNKNOWN',
    notes,
  };
}

/** Argumento é elegível para a família? Usado por regras, montagem e Quality Gate. */
export const isArgumentEligible = (classification: InfractionClassification, argumentId: string): boolean =>
  classification.eligibleArgumentIds.includes(argumentId);

/**
 * Procedimentos compatíveis com a família. A regra é: o conjunto de
 * procedimentos afetados pelas regras que realmente dispararam, mais o
 * procedimento canônico da família. Nunca um default universal.
 */
export const COMPATIBLE_PROCEDURES_BY_FAMILY: Record<InfractionFamily, string[]> = {
  excesso_velocidade: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  alcoolemia: ['defesa_previa', 'recurso_jari', 'recurso_cetran', 'suspensao_cnh'],
  semaforo: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  celular: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  estacionamento: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  cinto: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  documentos: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  circulacao: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  capacidade: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  lotacao: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  desconhecida: [],
};

/** Procedimento canônico por família — o rito que o fato indica, não um default. */
export const CANONICAL_PROCEDURE_BY_FAMILY: Record<InfractionFamily, string> = {
  excesso_velocidade: 'recurso_jari',
  alcoolemia: 'defesa_previa',
  semaforo: 'recurso_jari',
  celular: 'recurso_jari',
  estacionamento: 'recurso_jari',
  cinto: 'recurso_jari',
  documentos: 'recurso_jari',
  circulacao: 'recurso_jari',
  capacidade: 'recurso_jari',
  lotacao: 'recurso_jari',
  desconhecida: '',
};
