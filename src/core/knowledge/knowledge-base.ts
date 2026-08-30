import { INFRACTION_CATALOG } from '../../data/knowledge-base';
import { CTB_ARTICLES_DB } from '../legal-base/ctb-articles';
import { RESOLUTIONS_DB } from '../legal-base/resolutions';
import { ORGANS_DB } from '../legal-base/organs';
import { ARGUMENTS_CATALOG } from '../arguments/arguments-catalog';
import { PROCEDURES_CATALOG } from '../procedures/procedures-catalog';
import { DOCUMENT_BLOCKS } from '../templates/document-blocks';
import { TEMPLATES_CATALOG } from '../templates/templates-catalog';

export const KNOWLEDGE_INFRACTIONS = INFRACTION_CATALOG.map((item) => ({
  id: item.code,
  codigo: item.code,
  nome: item.description,
  artigo: item.article,
  gravidade: item.severity.toUpperCase(),
  pontos: item.points,
  valor: item.fineAmount,
  tesesRecomendadas: item.recommendedArgumentCodes,
  viciosTipicos: item.typicalFlaws,
}));

export const KNOWLEDGE_TESES = ARGUMENTS_CATALOG.map((arg) => ({
  id: arg.id,
  titulo: arg.title,
  categoria: arg.category,
  baseLegal: arg.legalBase,
  resolucoes: arg.resolutions,
  descricao: arg.description,
  quandoUsar: arg.whenToUse,
  quandoNaoUsar: arg.whenNotToUse,
  scoreConfianca: arg.confidenceScore,
  requisitos: arg.requirements,
  documentosExigidos: arg.requiredDocuments,
  jurisprudencia: arg.relatedJurisprudence,
}));

export const KNOWLEDGE_ORGAOS = ORGANS_DB.map((org) => ({
  id: org.id,
  nome: org.name,
  sigla: org.abbreviation,
  esfera: org.sphere,
  uf: org.state || 'Nacional',
  portalUrl: org.onlinePortalUrl,
  enderecoFisico: org.physicalAddress,
  emailContato: org.email,
  prazoPadraoDias: org.standardDeadlineDays,
  estruturaJari: org.jariStructure,
}));

export const KNOWLEDGE_CATEGORIES = [
  { id: 'velocidade', nome: 'Radares & Velocidade (Art. 218 CTB)', count: 8 },
  { id: 'lei_seca', nome: 'Lei Seca & Alcoolemia (Art. 165/165-A CTB)', count: 4 },
  { id: 'semaforo', nome: 'Semáforos & Cruzamentos (Art. 208 CTB)', count: 3 },
  { id: 'celular', nome: 'Celular & Equipamentos (Art. 252 CTB)', count: 4 },
  { id: 'estacionamento', nome: 'Estacionamento & Parada (Art. 181 CTB)', count: 6 },
  { id: 'suspensao', nome: 'Processo de Suspensão & Cassação CNH', count: 5 },
  { id: 'documental', nome: 'Vícios Formais & Notificação (Art. 280/281 CTB)', count: 12 },
  { id: 'advertencia', nome: 'Conversão em Advertência (Art. 267 CTB)', count: 2 },
];

export const KNOWLEDGE_SERVICES = [
  {
    id: 'recurso_jari',
    nome: 'Recurso Ordinário à JARI (1ª Instância)',
    descricao: 'Recurso colegiado contra Notificação de Penalidade com efeito suspensivo.',
    prazoDias: 30,
    instancia: 'Junta Administrativa de Recursos de Infrações',
  },
  {
    id: 'recurso_cetran',
    nome: 'Recurso ao CETRAN / CONTRANDIFE (2ª Instância)',
    descricao: 'Recurso final em instância superior para esgotar via administrativa.',
    prazoDias: 30,
    instancia: 'Conselho Estadual de Trânsito',
  },
  {
    id: 'conversao_advertencia',
    nome: 'Requerimento de Advertência por Escrito (Art. 267 CTB)',
    descricao: 'Aplicação vinculada da Lei 14.071/2020 para zerar pontos e taxa de multa leve/média.',
    prazoDias: 30,
    instancia: 'Autoridade de Trânsito',
  },
];

export const KNOWLEDGE_PROCEDURES = PROCEDURES_CATALOG;

export const KNOWLEDGE_DEFENSE_BLOCKS_52 = DOCUMENT_BLOCKS.map((blk) => ({
  id: blk.id,
  codigo: blk.code,
  categoria: blk.category,
  titulo: blk.title,
  conteudoTemplate: blk.contentTemplate,
  variaveisSuportadas: blk.supportedVariables,
  procedimentosRecomendados: blk.recommendedProcedures,
}));

export * from './national-registry';
export * from './sources-registry';
export * from './temporal-engine';
export * from './types';

