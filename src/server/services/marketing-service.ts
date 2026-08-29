import { logger } from '../observability/logger';
import { INITIAL_MARKETING_AGENTS, INITIAL_EDITORIAL_CONTENTS, BRAND_IDENTITY } from '../../data/marketing-agents-data';
import { eventBus, EventTopics } from '../../core/events/topics';
import { getSupabaseServerClient } from '../db/supabase-server';
import { Database } from '../../types/supabase';


/**
 * Service to manage marketing OS state - moved from global scope in server.ts
 */
export class MarketingService {
  private marketingAgents: any[];
  private editorialContents: any[];
  private cycleCount = 0;
  private contentVersions: Record<string, any[]> = {};
  private supabase: ReturnType<typeof getSupabaseServerClient> | null = null;

  constructor() {
    this.supabase = getSupabaseServerClient();
    // Load initial state from Supabase if available, otherwise use defaults
    this.initializeState();
  }

  /** Força recarregamento do state a partir do Supabase. */
  public async reload(): Promise<void> {
    await this.initializeState();
  }

  private async initializeState() {
    // If Supabase is not available, use default values from data files
    if (!this.supabase) {
      // In production, log warning — no Supabase means limited functionality
      if (process.env.NODE_ENV === 'production') {
        logger.error('marketing', 'service', 'initializeState', 'Supabase not configured in production — marketing data will be empty');
      }
      this.marketingAgents = [...INITIAL_MARKETING_AGENTS];
      this.editorialContents = [...INITIAL_EDITORIAL_CONTENTS];
      this.contentVersions = {};
      logger.info('marketing', 'service', 'initializeState', 'Supabase not available, using default data');
      return;
    }

    try {
      // Load marketing agents from Supabase (we'll need to create this table or use a different approach)
      // For now, we'll stick with in-memory for agents as they're mostly static configuration
      this.marketingAgents = [...INITIAL_MARKETING_AGENTS];
      
      // Load editorial contents from Supabase
      const { data: contents, error: contentsError } = await this.supabase
        .from('editorial_content')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (contentsError) {
        logger.warn('marketing', 'service', 'initializeState', 'Failed to load editorial contents from Supabase, using defaults', { error: contentsError });
        this.editorialContents = [...INITIAL_EDITORIAL_CONTENTS];
      } else {
        this.editorialContents = contents || [...INITIAL_EDITORIAL_CONTENTS];
      }
      
      // Load content versions (we'll need to implement this table or use a different approach)
      // For now, we'll keep in-memory for versions
      this.contentVersions = {};
      
      logger.info('marketing', 'service', 'initializeState', 'Loaded state from Supabase', { 
        agentsCount: this.marketingAgents.length,
        contentsCount: this.editorialContents.length
      });
    } catch (error) {
      logger.error('marketing', 'service', 'initializeState', 'Error initializing state from Supabase, falling back to defaults', { error });
      if (process.env.NODE_ENV === 'production') {
        logger.error('marketing', 'service', 'initializeState', 'Production fallback: using INITIAL_MARKETING_AGENTS due to Supabase error');
      }
      this.marketingAgents = [...INITIAL_MARKETING_AGENTS];
      this.editorialContents = [...INITIAL_EDITORIAL_CONTENTS];
      this.contentVersions = {};
    }
  }

  // Getters
  async getMarketingAgents() {
    // For now, agents are kept in memory as they're mostly static configuration
    // In a full implementation, these would also be stored in Supabase
    return [...this.marketingAgents]; // Return copy to prevent direct mutation
  }

  async getEditorialContents() {
    if (!this.supabase) {
      // Fallback to in-memory if Supabase is not available
      return [...this.editorialContents];
    }

    try {
      const { data, error } = await this.supabase
        .from('editorial_content')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.warn('marketing', 'service', 'getEditorialContents', 'Failed to load from Supabase, using in-memory cache', { error });
        return [...this.editorialContents];
      }
      
      // Update in-memory cache
      this.editorialContents = data || [];
      return [...this.editorialContents];
    } catch (error) {
      logger.error('marketing', 'service', 'getEditorialContents', 'Error loading editorial contents, using in-memory cache', { error });
      return [...this.editorialContents];
    }
  }

  getBrandIdentity() {
    return BRAND_IDENTITY;
  }

  getCycleCount() {
    return this.cycleCount;
  }

  async incrementCycleCount() {
    this.cycleCount += 1;
    
    // Persist cycle count to Supabase
    if (this.supabase) {
      try {
        await this.supabase
          .from('app_settings')
          .upsert({
            key: 'marketing_cycle_count',
            value: this.cycleCount,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });
      } catch (error) {
        logger.warn('marketing', 'service', 'incrementCycleCount', 'Failed to persist cycle count to Supabase', { error });
      }
    }
    
    eventBus.publish(EventTopics.MARKETING_CYCLE_TICK, {
      agentId: 'system', // This will be overridden in cycleTick
      task: 'cycle_increment',
    }, 'marketing_os');
    
    return {
      success: true,
      cycle: this.cycleCount
    };
  }

  // Marketing cycle tick
  async cycleTick() {
    // Update agent activity
    const randomAgentIdx = Math.floor(Math.random() * this.marketingAgents.length);
    this.marketingAgents[randomAgentIdx].tasksCompleted += 1;
    this.marketingAgents[randomAgentIdx].lastActivity = 'Agora mesmo';

    // Increment and persist cycle count
    await this.incrementCycleCount();

    eventBus.publish(EventTopics.MARKETING_CYCLE_TICK, {
      agentId: this.marketingAgents[randomAgentIdx].id,
      task: this.marketingAgents[randomAgentIdx].currentTask,
    }, 'marketing_os');

    return {
      success: true,
      updatedAgent: this.marketingAgents[randomAgentIdx],
      agents: await this.getMarketingAgents(),
    };
  }

  // Generate marketing content
  async generateContent(theme: string, channel: string, format: string) {
    const newContent: any = {
      id: `cnt-${Date.now()}`,
      title: theme || 'Multas de Trânsito: Novos Prazos e Resoluções CONTRAN 2026',
      channel: channel || 'instagram',
      format: format || 'carrossel',
      legalTheme: theme || 'Prazos de Notificação e Ampla Defesa no CTB',
      legal_theme: theme || 'Prazos de Notificação e Ampla Defesa no CTB',
      status: 'aprovado_qualidade' as const,
      scheduledDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16),
      scheduled_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16),
      estimatedReach: Math.floor(15000 + Math.random() * 25000),
      estimated_reach: Math.floor(15000 + Math.random() * 25000),
      copyText: `🚦 MOTORISTA: Entenda os seus direitos garantidos pelo CTB!
      
O prazo máximo para expedição da notificação é de 30 dias. Qualquer atraso invalida o auto de infração!`,
      copy_text: `🚦 MOTORISTA: Entenda os seus direitos garantidos pelo CTB!
      
O prazo máximo para expedição da notificação é de 30 dias. Qualquer atraso invalida o auto de infração!`,
      hashtags: ['#AdeusMulta', '#DireitoDeTransito', '#CTB', '#RecursoDeMulta'],
      visualPrompt: 'Visual elegante com paleta azul escuro e amarelo institucional.',
      visual_prompt: 'Visual elegante com paleta azul escuro e amarelo institucional.',
      authorAgent: '@marketing-criador',
      author_agent: '@marketing-criador',
      qualityReviewScore: 9.7,
      audience: 'B2C',
    };

    // Save to Supabase
    let savedContent = newContent;
    if (this.supabase) {
      try {
        const { data, error } = await (this.supabase as any)
          .from('editorial_content')
          .insert([newContent])
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        savedContent = { ...newContent, ...data };
        logger.info('marketing', 'service', 'generateContent', 'Content saved to Supabase', { contentId: savedContent.id });
      } catch (error) {
        logger.error('marketing', 'service', 'generateContent', 'Failed to save content to Supabase, using in-memory only', { error });
        // Fall back to in-memory only
      }
    }
    
    // Update in-memory cache
    this.editorialContents.unshift(savedContent);

    eventBus.publish(EventTopics.MARKETING_CONTENT_DRAFTED, { contentId: savedContent.id }, 'marketing_os');

    return { success: true, content: savedContent };
  }

  // Create manual content item
  async createManualContent(input: {
    title: string;
    channel: string;
    format: string;
    copyText: string;
    scheduledDate: string;
    hashtags?: string[];
    imageUrl?: string | null;
    mediaUrl?: string | null;
    visualPrompt?: string;
    status?: 'rascunho' | 'aprovado_qualidade' | 'reprovado_qualidade' | 'agendado' | 'publicado';
    legalTheme?: string;
  }) {
    const newContent: any = {
      id: `cnt-${Date.now()}`,
      title: input.title,
      channel: input.channel || 'instagram',
      format: input.format || 'carrossel',
      legalTheme: input.legalTheme || input.title,
      legal_theme: input.legalTheme || input.title,
      status: input.status || 'rascunho',
      scheduledDate: input.scheduledDate || new Date(Date.now() + 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16),
      scheduled_date: input.scheduledDate || new Date(Date.now() + 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16),
      estimatedReach: Math.floor(10000 + Math.random() * 20000),
      estimated_reach: Math.floor(10000 + Math.random() * 20000),
      copyText: input.copyText || '',
      copy_text: input.copyText || '',
      hashtags: input.hashtags || ['#AdeusMulta', '#CTB'],
      imageUrl: input.imageUrl || null,
      image_url: input.imageUrl || null,
      mediaUrl: input.mediaUrl || input.imageUrl || null,
      media_url: input.mediaUrl || input.imageUrl || null,
      visualPrompt: input.visualPrompt || '',
      visual_prompt: input.visualPrompt || '',
      authorAgent: '@marketing-criador',
      author_agent: '@marketing-criador',
      qualityReviewScore: 9.5,
      audience: 'B2C',
    };

    let savedContent = newContent;
    if (this.supabase) {
      try {
        const { data, error } = await (this.supabase as any)
          .from('editorial_content')
          .insert([newContent])
          .select()
          .single();
        if (!error && data) {
          savedContent = { ...newContent, ...data };
        }
      } catch (err) {
        logger.warn('marketing', 'service', 'createManualContent', 'Fallback to memory only');
      }
    }

    this.editorialContents.unshift(savedContent);
    eventBus.publish(EventTopics.MARKETING_CONTENT_DRAFTED, { contentId: savedContent.id }, 'marketing_os');
    return savedContent;
  }

  // Update marketing agent (for external updates)
  async updateMarketingAgent(agentId: string, updates: Partial<any>) {
    const agentIndex = this.marketingAgents.findIndex(agent => agent.id === agentId);
    if (agentIndex !== -1) {
      this.marketingAgents[agentIndex] = { ...this.marketingAgents[agentIndex], ...updates };
      
      // TODO: Persist to Supabase when marketing_agents table is available
      // For now, agents remain in memory as they're largely static configuration
      
      return this.marketingAgents[agentIndex];
    }
    return null;
  }

  // Insere conteúdo no topo (duplicação/variação)
  // Histórico de versões (agent: humano | copywriting | seo | compliance)
  async getContentVersions(contentId: string) {
    if (this.supabase) {
      try {
        const { data, error } = await (this.supabase as any)
          .from('content_versions')
          .select('*')
          .eq('content_id', contentId)
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch {
        // fall through to in-memory
      }
    }
    return [...(this.contentVersions[contentId] ?? [])];
  }

  addContentVersion(contentId: string, entry: { agent: string; author: string; changes: string }) {
    if (!this.contentVersions[contentId]) this.contentVersions[contentId] = [];
    const rec = {
      id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      version: this.contentVersions[contentId].length + 1,
      ...entry,
      createdAt: new Date().toISOString(),
    };
    this.contentVersions[contentId].unshift(rec);

    // Persist to Supabase content_versions table
    if (this.supabase) {
      (this.supabase as any)
        .from('content_versions')
        .insert({
          content_id: contentId,
          version: rec.version,
          agent: entry.agent,
          author: entry.author,
          changes: entry.changes,
          created_at: rec.createdAt,
        })
        .then(({ error }: any) => {
          if (error) logger.warn('marketing', 'service', 'addContentVersion', 'Failed to persist version', { error: error.message });
        })
        .catch(() => {});
    }

    return rec;
  }

  // Atualiza conteúdo por meta_post_id
  async updateContentByMetaPostId(metaPostId: string, updates: Partial<any>) {
    const item = this.editorialContents.find(
      (c) => c.meta_post_id === metaPostId || c.metaPostId === metaPostId
    );
    if (item) {
      return this.updateContent(item.id, updates);
    }
    if (this.supabase) {
      try {
        const { data, error } = await (this.supabase as any)
          .from('editorial_content')
          .update(updates)
          .eq('meta_post_id', metaPostId)
          .select()
          .single();
        if (!error && data) {
          return data;
        }
      } catch (err) {
        logger.debug('marketing', 'service', 'updateContentByMetaPostId', 'Error updating in Supabase', { err });
      }
    }
    return null;
  }

  // Atualiza conteúdo (usado pelos agentes por status: aprovado_qualidade -> agendado -> publicado)
  async updateContent(contentId: string, updates: Partial<any>) {
    // Update in Supabase first
    let updatedContent = null;
    if (this.supabase) {
      try {
        const { data, error } = await (this.supabase as any)
          .from('editorial_content')
          .update(updates)
          .eq('id', contentId)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        updatedContent = data;
        logger.info('marketing', 'service', 'updateContent', 'Content updated in Supabase', { contentId });
      } catch (error) {
        logger.error('marketing', 'service', 'updateContent', 'Failed to update content in Supabase', { error });
        // Fall through to in-memory update
      }
    }
    
    // Update in-memory cache as fallback or supplement
    const idx = this.editorialContents.findIndex(c => c.id === contentId);
    if (idx !== -1) {
      this.editorialContents[idx] = { ...this.editorialContents[idx], ...updates };
      
      // If we didn't get the updated content from Supabase, use the in-memory version
      if (!updatedContent) {
        updatedContent = this.editorialContents[idx];
      }
      
      return updatedContent;
    }
    
    // If we found it in Supabase but not in memory, return the Supabase version
    if (updatedContent) {
      return updatedContent;
    }
    
    return null;
  }
}

// Export singleton instance
export const marketingService = new MarketingService();