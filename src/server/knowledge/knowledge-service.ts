/**
 * @file knowledge-service.ts
 * DefesaAI - Knowledge Service Layer (Fase 5)
 * Centralized service for managing all canonical knowledge entities:
 * CTB, Infractions, Arguments, Templates, Blocks, Procedures, Graph
 */

import { 
  KnowledgeCategoryType, 
  CtbArticleModel, 
  ArgumentModel,
  ProcedureModel,
  DocumentTemplateModel,
  TemplateBlock
} from '../../core/domain/knowledge-schema';

import {
  KNOWLEDGE_SOURCES,
  KNOWLEDGE_CTB,
  KNOWLEDGE_RESOLUTIONS,
  KNOWLEDGE_ORDINANCES,
  KNOWLEDGE_ARTICLES,
  KNOWLEDGE_INFRACTIONS,
  KNOWLEDGE_PROCEDURES,
  KNOWLEDGE_TEMPLATES,
  KNOWLEDGE_ARGUMENTS,
  KNOWLEDGE_GRAPH,
  KNOWLEDGE_REPORT,
  KNOWLEDGE_BLOCKS
} from '../../knowledge/index';

import { InfractionCatalogItem } from '../../data/knowledge-base';
import { embeddingService } from './embedding-service';
import { vectorStore } from './vector-store';
import { rerankerService } from './reranker-service';
import { SearchKnowledgeOptions } from './types';
import { logger } from '../observability/logger';

export interface KnowledgeGraphRelationship {
  id: string;
  infractionId: string;
  infractionCode: string;
  ctbArticleId: string;
  procedureId: string;
  argumentIds: string[];
  templateId: string;
}

/**
 * Knowledge Service - Main orchestrator for all knowledge operations
 */
export class KnowledgeService {
  private static instance: KnowledgeService;

  private ctbItems: any[];
  private infractionItems: any[];
  private argumentItems: any[];
  private templateItems: any[];
  private blockItems: any[];
  private procedureItems: any[];
  private graphItems: KnowledgeGraphRelationship[];

  private constructor() {
    this.ctbItems = Array.isArray(KNOWLEDGE_CTB) ? KNOWLEDGE_CTB : [];
    this.infractionItems = Array.isArray(KNOWLEDGE_INFRACTIONS) ? KNOWLEDGE_INFRACTIONS : [];
    this.argumentItems = Array.isArray(KNOWLEDGE_ARGUMENTS) ? KNOWLEDGE_ARGUMENTS : [];
    this.templateItems = Array.isArray(KNOWLEDGE_TEMPLATES) ? KNOWLEDGE_TEMPLATES : [];
    this.blockItems = Array.isArray(KNOWLEDGE_BLOCKS) ? KNOWLEDGE_BLOCKS : [];
    this.procedureItems = Array.isArray(KNOWLEDGE_PROCEDURES) ? KNOWLEDGE_PROCEDURES : [];
    
    // Transform knowledge graph nodes to flat relationships
    const graphData = Array.isArray(KNOWLEDGE_GRAPH) ? KNOWLEDGE_GRAPH : [];
    const flattenedGraph: KnowledgeGraphRelationship[] = [];
    for (const node of graphData) {
      if (node.applicable_procedures && Array.isArray(node.applicable_procedures)) {
        for (const proc of node.applicable_procedures) {
          flattenedGraph.push({
            id: `${node.infraction_code}_${node.ctb_article_number}_${proc.procedure_id}`,
            infractionId: node.infraction_id,
            infractionCode: node.infraction_code,
            ctbArticleId: node.ctb_article_id,
            procedureId: proc.procedure_id,
            argumentIds: proc.applicable_arguments || [],
            templateId: proc.template_id || '',
          });
        }
      } else {
        flattenedGraph.push({
          id: `${node.infraction_code || 'inf'}_${node.ctb_article_id || 'ctb'}`,
          infractionId: node.infraction_id || '',
          infractionCode: node.infraction_code || '',
          ctbArticleId: node.ctb_article_id || '',
          procedureId: (node as any).procedure_id || '',
          argumentIds: (node as any).applicable_arguments || [],
          templateId: (node as any).template_id || '',
        });
      }
    }
    this.graphItems = flattenedGraph;
  }

  public static getInstance(): KnowledgeService {
    if (!KnowledgeService.instance) {
      KnowledgeService.instance = new KnowledgeService();
    }
    return KnowledgeService.instance;
  }

  // ==========================================
  // CTB Methods
  // ==========================================
  public getAllCtbArticles(): any[] {
    return [...this.ctbItems];
  }

  public getCtbArticleById(id: string): any | undefined {
    return this.ctbItems.find(
      (item) => item.id === id || item.articleNumber === id || item.article === id
    );
  }

  public getCtbArticleByNumber(num: string): any | undefined {
    return this.getCtbArticleById(num);
  }

  public getAllResolutions(): any[] {
    return Array.isArray(KNOWLEDGE_RESOLUTIONS) ? KNOWLEDGE_RESOLUTIONS : [];
  }

  public async searchCtbArticles(query: string, options?: SearchKnowledgeOptions): Promise<any[]> {
    if (!query || !query.trim()) return this.getAllCtbArticles();
    const q = query.toLowerCase();
    return this.ctbItems.filter((item) => {
      const text = `${item.articleNumber || item.article || ''} ${item.title || ''} ${item.caput || item.text || item.description || ''}`.toLowerCase();
      return text.includes(q);
    });
  }

  // ==========================================
  // Infractions Methods
  // ==========================================
  public getAllInfractions(): any[] {
    return [...this.infractionItems];
  }

  public getInfractionById(id: string): any | undefined {
    return this.infractionItems.find(
      (item) => item.id === id || item.code === id
    );
  }

  public getInfractionByCode(code: string): any | undefined {
    return this.getInfractionById(code);
  }

  public async searchInfractions(query: string, options?: SearchKnowledgeOptions): Promise<any[]> {
    if (!query || !query.trim()) return this.getAllInfractions();
    const q = query.toLowerCase();
    return this.infractionItems.filter((item) => {
      const text = `${item.code || ''} ${item.description || item.title || ''} ${item.ctbArticle || item.ctb_article || ''}`.toLowerCase();
      return text.includes(q);
    });
  }

  // ==========================================
  // Arguments Methods
  // ==========================================
  public getAllArguments(): any[] {
    return [...this.argumentItems];
  }

  public getArgumentById(id: string): any | undefined {
    return this.argumentItems.find(
      (item) => item.id === id || item.code === id
    );
  }

  public getArgumentsByInfractionCode(code: string): any[] {
    const rels = this.graphItems.filter(
      (g) => g.infractionCode === code || g.infractionId === code
    );
    const argIds = new Set(rels.flatMap((r) => r.argumentIds));
    return this.argumentItems.filter((a) => argIds.has(a.id) || argIds.has(a.code));
  }

  public async searchArguments(query: string, options?: SearchKnowledgeOptions): Promise<any[]> {
    if (!query || !query.trim()) return this.getAllArguments();
    const q = query.toLowerCase();
    return this.argumentItems.filter((item) => {
      const text = `${item.code || item.id || ''} ${item.title || item.name || ''} ${item.description || item.content || ''} ${item.legalBasis || item.legal_base || ''}`.toLowerCase();
      return text.includes(q);
    });
  }

  // ==========================================
  // Templates Methods
  // ==========================================
  public getAllTemplates(): any[] {
    return [...this.templateItems];
  }

  public getTemplateById(id: string): any | undefined {
    return this.templateItems.find(
      (item) => item.id === id || item.code === id
    );
  }

  public async searchTemplates(query: string, options?: SearchKnowledgeOptions): Promise<any[]> {
    if (!query || !query.trim()) return this.getAllTemplates();
    const q = query.toLowerCase();
    return this.templateItems.filter((item) => {
      const text = `${item.code || item.id || ''} ${item.title || item.name || ''} ${item.description || ''} ${item.procedureType || item.type || ''}`.toLowerCase();
      return text.includes(q);
    });
  }

  // ==========================================
  // Blocks Methods
  // ==========================================
  public getAllBlocks(): any[] {
    return [...this.blockItems];
  }

  public getBlockById(id: string): any | undefined {
    return this.blockItems.find(
      (item) => item.id === id || item.blockId === id
    );
  }

  public async searchBlocks(query: string, options?: SearchKnowledgeOptions): Promise<any[]> {
    if (!query || !query.trim()) return this.getAllBlocks();
    const q = query.toLowerCase();
    return this.blockItems.filter((item) => {
      const text = `${item.id || item.blockId || ''} ${item.title || item.name || ''} ${item.description || ''} ${item.contentTemplate || item.text || ''}`.toLowerCase();
      return text.includes(q);
    });
  }

  // ==========================================
  // Procedures Methods
  // ==========================================
  public getAllProcedures(): any[] {
    return [...this.procedureItems];
  }

  public getProcedureById(id: string): any | undefined {
    return this.procedureItems.find(
      (item) => item.id === id || item.code === id
    );
  }

  public async searchProcedures(query: string, options?: SearchKnowledgeOptions): Promise<any[]> {
    if (!query || !query.trim()) return this.getAllProcedures();
    const q = query.toLowerCase();
    return this.procedureItems.filter((item) => {
      const text = `${item.id || item.code || ''} ${item.name || item.title || ''} ${item.description || ''}`.toLowerCase();
      return text.includes(q);
    });
  }

  // ==========================================
  // Graph Relationships Methods
  // ==========================================
  public getAllGraphRelationships(): KnowledgeGraphRelationship[] {
    return [...this.graphItems];
  }

  public getGraphRelationshipById(id: string): KnowledgeGraphRelationship | undefined {
    return this.graphItems.find((item) => item.id === id);
  }

  public getGraphRelationshipsByInfractionId(infractionId: string): KnowledgeGraphRelationship[] {
    return this.graphItems.filter(
      (item) => item.infractionId === infractionId || item.infractionCode === infractionId
    );
  }

  public getGraphRelationshipsByCtbArticleId(ctbArticleId: string): KnowledgeGraphRelationship[] {
    return this.graphItems.filter((item) => item.ctbArticleId === ctbArticleId);
  }

  public async searchGraphRelationships(
    query: string,
    options?: SearchKnowledgeOptions
  ): Promise<KnowledgeGraphRelationship[]> {
    if (!query || !query.trim()) return this.getAllGraphRelationships();
    const q = query.toLowerCase();
    return this.graphItems.filter((item) => {
      const text = `${item.id} ${item.infractionCode} ${item.ctbArticleId} ${item.procedureId} ${item.templateId} ${item.argumentIds.join(' ')}`.toLowerCase();
      return text.includes(q);
    });
  }
}

export const knowledgeService = KnowledgeService.getInstance();
