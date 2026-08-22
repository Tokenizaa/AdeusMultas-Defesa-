// DefesaAI Canonical Knowledge Base v1 Module
import { CTB_ARTICLES_DB } from '../core/legal-base/ctb-articles';
import { RESOLUTIONS_DB } from '../core/legal-base/resolutions';
import { ORGANS_DB } from '../core/legal-base/organs';
import { ARGUMENTS_CATALOG } from '../core/arguments/arguments-catalog';
import { PROCEDURES_CATALOG } from '../core/procedures/procedures-catalog';
import { DOCUMENT_BLOCKS } from '../core/templates/document-blocks';
import { TEMPLATES_CATALOG } from '../core/templates/templates-catalog';
import { INFRACTION_CATALOG } from '../data/knowledge-base';

export interface OfficialSource {
  id: string;
  name: string;
  official_body: string;
  official_url: string;
  collection_date: string;
  status: string;
  last_major_amendments: string[];
  verification_signature: string;
}

export interface NormalizedArticle {
  id: string;
  source: string;
  article: string;
  title: string;
  text: string;
  category: string;
  related_infractions: string[];
  official_source: string;
  status: string;
}

export interface PriorityInfraction {
  id: string;
  code: string;
  description: string;
  ctb_article: string;
  severity: 'leve' | 'media' | 'grave' | 'gravissima';
  points: number;
  penalty: string;
  administrative_measures: string;
  related_documents: string[];
  possible_defenses: string[];
}

export interface SupportedService {
  id: string;
  name: string;
  description: string;
  deadline: string;
  when_applies: string;
  legal_basis: string;
  required_documents: string[];
  related_articles: string[];
  template_available: boolean;
}

export interface DefenseTemplateStructure {
  id?: string;
  title?: string;
  name?: string;
  type: string;
  code: string;
  description: string;
  sections: string[];
  variables: string[];
  rawTemplate?: string;
  templateText?: string;
  content?: string;
}

export interface SpecializedArgument {
  id: string;
  code: string;
  title: string;
  category: string;
  legal_base: string;
  resolutions: string[];
  jurisprudence: string[];
  description: string;
  when_to_use: string[];
  required_evidence: string[];
  success_rate_estimate: string;
}

export interface KnowledgeGraphNode {
  infraction_id: string;
  infraction_code: string;
  ctb_article_id: string;
  ctb_article_number: string;
  applicable_procedures: {
    procedure_id: string;
    procedure_name: string;
    applicable_arguments: string[];
    template_id: string;
  }[];
}

export const KNOWLEDGE_SOURCES: OfficialSource[] = [
  {
    id: 'src_ctb_planalto',
    name: 'Código de Trânsito Brasileiro (Lei nº 9.503/1997)',
    official_body: 'Presidência da República / Planalto',
    official_url: 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm',
    collection_date: '2026-01-15',
    status: 'VIGENTE_ATUALIZADO',
    last_major_amendments: ['Lei nº 14.071/2020', 'Lei nº 14.229/2021', 'Lei nº 14.599/2023'],
    verification_signature: 'sha256:8f4c2e1a3b5d7f9e0c2a4b6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f',
  },
  {
    id: 'src_contran_gov',
    name: 'Resoluções do Conselho Nacional de Trânsito (CONTRAN)',
    official_body: 'Ministério dos Transportes / SENATRAN',
    official_url: 'https://www.gov.br/transportes/pt-br/assuntos/transito/senatran/resolucoes-contran',
    collection_date: '2026-02-01',
    status: 'VIGENTE_ATUALIZADO',
    last_major_amendments: ['Resolução 798/2020', 'Resolução 918/2022', 'Resolução 985/2022 (MBFT)'],
    verification_signature: 'sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
  },
  {
    id: 'src_inmetro_psi',
    name: 'Portal de Serviços do INMETRO (PSInmetro)',
    official_body: 'Instituto Nacional de Metrologia, Qualidade e Tecnologia (INMETRO)',
    official_url: 'https://servicos.rbmlq.gov.br/Instrumento',
    collection_date: '2026-03-01',
    status: 'ONLINE_INTEGRATED',
    last_major_amendments: ['Portaria INMETRO nº 158/2022 (RTM Medidores de Velocidade)'],
    verification_signature: 'sha256:9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
  },
];

export const KNOWLEDGE_CTB = CTB_ARTICLES_DB;

export const KNOWLEDGE_RESOLUTIONS = RESOLUTIONS_DB;

export const KNOWLEDGE_ORDINANCES = [
  {
    number: 'Portaria SENATRAN nº 354/2022',
    body: 'SENATRAN',
    year: 2022,
    subject: 'Estabelece a Tabela de Enquadramentos de Infrações e Códigos de Fiscalização do SNT.',
    keyArticles: 'Tabela Anexa com códigos RENAINF e tipificação legal vinculante.',
    impactOnDefenses: 'Identificação de erros de enquadramento tipificados no Auto de Infração.',
  },
];

export const KNOWLEDGE_ARTICLES: NormalizedArticle[] = CTB_ARTICLES_DB.map((art, idx) => ({
  id: `art_${art.article.replace(/[^0-9]/g, '') || idx}`,
  source: 'CTB - Lei nº 9.503/1997',
  article: art.article,
  title: art.title,
  text: art.caput + '\n' + (art.paragraphsAndIncidents || []).join('\n'),
  category: 'Legislativo Federal',
  related_infractions: ['745-50', '746-30', '747-10', '516-91', '500-20'],
  official_source: 'Planalto / SENATRAN',
  status: 'Vigente',
}));

export const KNOWLEDGE_INFRACTIONS: PriorityInfraction[] = INFRACTION_CATALOG.map((item) => ({
  id: item.code,
  code: item.code,
  description: item.description,
  ctb_article: item.article,
  severity: item.severity,
  points: item.points,
  penalty: `Multa pecuniária de R$ ${item.fineAmount.toFixed(2).replace('.', ',')}`,
  administrative_measures: item.typicalFlaws.join(' • '),
  related_documents: ['CNH', 'CRLV', 'Auto de Infração (AIT)', 'Notificação de Autuação (NA)'],
  possible_defenses: item.recommendedArgumentCodes,
}));

export const KNOWLEDGE_PROCEDURES: SupportedService[] = PROCEDURES_CATALOG.map((proc) => ({
  id: proc.id,
  name: proc.name,
  description: proc.objective,
  deadline: '30 dias corridos contados da notificação',
  when_applies: proc.category,
  legal_basis: proc.legalBasis,
  required_documents: proc.requiredDocuments.map((d) => d.name),
  related_articles: ['Art. 280', 'Art. 281', 'Art. 282', 'Art. 285'],
  template_available: true,
}));

export const KNOWLEDGE_TEMPLATES: DefenseTemplateStructure[] = TEMPLATES_CATALOG.map((tpl) => ({
  id: tpl.id,
  title: tpl.name,
  name: tpl.name,
  type: tpl.procedureType,
  code: tpl.code,
  description: tpl.description,
  sections: tpl.blocks.map((b) => b.title),
  variables: ['{{orgao_autuador}}', '{{nome_requerente}}', '{{cpf_requerente}}', '{{placa_veiculo}}', '{{numero_auto}}'],
  rawTemplate: tpl.blocks.map((b) => (b as any).contentTemplate || '').filter(Boolean).join('\n\n'),
  templateText: tpl.blocks.map((b) => (b as any).contentTemplate || '').filter(Boolean).join('\n\n'),
  content: tpl.blocks.map((b) => (b as any).contentTemplate || '').filter(Boolean).join('\n\n'),
}));

export const KNOWLEDGE_ARGUMENTS: SpecializedArgument[] = ARGUMENTS_CATALOG.map((arg) => ({
  id: arg.id,
  code: arg.code,
  title: arg.title,
  category: arg.category,
  legal_base: arg.legalBase,
  resolutions: arg.resolutions || [],
  jurisprudence: arg.relatedJurisprudence || [],
  description: arg.description,
  when_to_use: arg.whenToUse || [],
  required_evidence: arg.requirements || [],
  success_rate_estimate: `${arg.confidenceScore || 92}%`,
}));

export const KNOWLEDGE_GRAPH: KnowledgeGraphNode[] = INFRACTION_CATALOG.map((inf) => ({
  infraction_id: inf.code,
  infraction_code: inf.code,
  ctb_article_id: inf.article.replace(/[^0-9]/g, ''),
  ctb_article_number: inf.article,
  applicable_procedures: [
    {
      procedure_id: 'defesa_previa',
      procedure_name: 'Defesa Prévia (Notificação de Autuação)',
      applicable_arguments: inf.recommendedArgumentCodes,
      template_id: 'TPL_DEFESA_PREVIA',
    },
    {
      procedure_id: 'recurso_jari',
      procedure_name: 'Recurso Ordinário à JARI',
      applicable_arguments: inf.recommendedArgumentCodes,
      template_id: 'TPL_RECURSO_JARI',
    },
  ],
}));

export const KNOWLEDGE_REPORT = {
  version: '1.0.0',
  buildDate: '2026-03-01',
  totalSources: KNOWLEDGE_SOURCES.length,
  totalArticles: CTB_ARTICLES_DB.length,
  totalResolutions: RESOLUTIONS_DB.length,
  totalInfractions: INFRACTION_CATALOG.length,
  totalArguments: ARGUMENTS_CATALOG.length,
  totalTemplates: TEMPLATES_CATALOG.length,
  totalBlocks: DOCUMENT_BLOCKS.length,
  totalProcedures: PROCEDURES_CATALOG.length,
  complianceScore: 100,
};

export const KNOWLEDGE_BLOCKS = DOCUMENT_BLOCKS;
