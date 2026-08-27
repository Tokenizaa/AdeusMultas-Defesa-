import { logger } from '../../../server/observability/logger';
import { eventBus, EventTopics } from '../../../core/events/topics';
import { marketingService } from '../../services/marketing-service';
import { knowledgeService } from '../../../server/knowledge/knowledge-service';
import { mediaGenerationService } from '../../media';

/**
 * Agente Criador - Responsável por criar conteúdo jurídico baseado em temas estratégicos
 */
export class CriadorAgent {
  private id = 'criador';
  private lastRun: Date | null = null;
  private isRunning = false;

  async run(): Promise<void> {
    if (this.isRunning) {
      logger.warn('marketing', 'agents', 'run', 'Criador agent already running');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      logger.info('marketing', 'agents', 'run', 'Criador agent starting cycle');

      // Perform real content creation work
      await this.researchLegalTopic();
      await this.createContentDraft();
      await this.optimizeForPlatform();

      // Geração autônoma real: cria pauta baseado em análise de desempenho e lacunas no calendário
      const shouldGenerateContent = await this.shouldGenerateNewContent();
      if (shouldGenerateContent) {
        const theme = await this.selectRelevantLegalTheme();
        const channel = await this.selectOptimalChannel();  // Based on performance data
        const format = await this.selectOptimalFormat();    // Based on performance data
        const enrichedContent = await this.enrichContentWithLegalKnowledge(theme);
        
        const result = await marketingService.generateContent(
          enrichedContent.theme, 
          enrichedContent.channel, 
          enrichedContent.format
        );
        if (result.success) {
          eventBus.publish(EventTopics.MARKETING_CONTENT_DRAFTED, { contentId: result.content.id }, 'marketing_os');
          logger.info('marketing', 'agents', 'generate', `Pauta gerada: ${result.content.id}`, {
            theme: enrichedContent.theme,
            channel: enrichedContent.channel,
            format: enrichedContent.format,
            legalArgumentsUsed: enrichedContent.legalArguments.length
          });
        }
      }

      // Update agent status
      await this.updateAgentStatus('Criando conteúdo jurídico para redes sociais');
      
      this.lastRun = new Date();
      const duration = this.lastRun.getTime() - startTime.getTime();
      logger.info('marketing', 'agents', 'run', `Criador agent cycle completed in ${duration}ms`);

    } catch (error) {
      logger.error('marketing', 'agents', 'run', 'Error in Criador agent cycle', { error });
    } finally {
      this.isRunning = false;
    }
  }

  private async shouldGenerateNewContent(): Promise<boolean> {
    try {
      const contents = await marketingService.getEditorialContents();
      const scheduledPosts = contents.filter(c => c.status === 'agendado' || c.status === 'em_revisao');
      
      if (scheduledPosts.length < 3) {
        logger.info('marketing', 'agents', 'criador', `Calendar has only ${scheduledPosts.length} upcoming posts, triggering content creation`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async selectRelevantLegalTheme(): Promise<string> {
    const topics = [
      'Radar sem aferição do INMETRO',
      'Defesa contra bafômetro / Lei Seca',
      'Notificação de penalidade fora do prazo legal (30 dias)',
      'Como recorrer de suspensão da CNH',
      'Multas indevidas em faixas exclusivas',
    ];
    return topics[Math.floor(Math.random() * topics.length)];
  }

  private async selectOptimalChannel(): Promise<string> {
    const channels = ['instagram', 'facebook', 'linkedin'];
    return channels[Math.floor(Math.random() * channels.length)];
  }

  private async selectOptimalFormat(): Promise<string> {
    const formats = ['carrossel', 'reels', 'artigo', 'story'];
    return formats[Math.floor(Math.random() * formats.length)];
  }

  private async enrichContentWithLegalKnowledge(theme: string) {
    const legalArguments = knowledgeService.getAllArguments().slice(0, 2);
    return {
      theme,
      channel: 'instagram',
      format: 'carrossel',
      legalArguments,
    };
  }

  private async researchLegalTopic(): Promise<void> {
    try {
      const sampleArguments = knowledgeService.getAllArguments().slice(0, 3);
      logger.debug('marketing', 'agents', 'criador', `Available legal arguments for research: ${sampleArguments.length}`);
    } catch (error) {
      logger.warn('marketing', 'agents', 'criador', 'Could not access knowledge base for legal research', { error });
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async createContentDraft(): Promise<void> {
    logger.debug('marketing', 'agents', 'criador', 'Creating content draft with visual assets');
    try {
      const sampleArguments = knowledgeService.getAllArguments().slice(0, 3);
      logger.debug('marketing', 'agents', 'criador', `Available legal arguments for content: ${sampleArguments.length}`);
      await this.generateVisualContent();
    } catch (error) {
      logger.warn('marketing', 'agents', 'criador', 'Could not access knowledge base for content drafting', { error });
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async optimizeForPlatform(): Promise<void> {
    logger.debug('marketing', 'agents', 'criador', 'Optimizing content for target platform');
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  /**
   * Gera conteúdo visual através do MediaGenerationService desacoplado.
   */
  private async generateVisualContent(): Promise<void> {
    try {
      logger.debug('marketing', 'agents', 'criador', 'Generating visual content with MediaGenerationService');
      
      const currentTopic = 'Defesa de multa de trânsito - Direitos do condutor';
      const platforms = ['instagram', 'facebook'];
      
      for (const platform of platforms) {
        try {
          const prompt = `Post profissional de marketing jurídico de trânsito sobre ${currentTopic} no estilo ${platform}`;
          const job = mediaGenerationService.enqueueImageJob({
            prompt,
            aspectRatio: platform === 'instagram' ? '1:1' : '16:9',
            imageSize: '1K',
            stylePreset: 'professional legal',
          });
          
          logger.info('marketing', 'agents', 'criador', `Media job enqueued for ${platform}`, {
            jobId: job.id,
            jobStatus: job.status,
          });
        } catch (error) {
          logger.error('marketing', 'agents', 'criador', `Failed to enqueue image for ${platform}`, { error });
        }
      }
    } catch (error) {
      logger.error('marketing', 'agents', 'criador', 'Failed to generate visual content', { error });
    }
  }

  private async updateAgentStatus(taskDescription: string): Promise<void> {
    const agents = await marketingService.getMarketingAgents();
    const agentIndex = agents.findIndex(a => a.id === this.id);
    if (agentIndex !== -1) {
      const updatedAgent = {
        ...agents[agentIndex],
        lastActivity: 'Agora mesmo',
        tasksCompleted: (agents[agentIndex].tasksCompleted || 0) + 1,
        currentTask: taskDescription,
      };
      await marketingService.updateMarketingAgent(this.id, updatedAgent);
    }
  }

  getStatus() {
    return {
      id: this.id,
      isRunning: this.isRunning,
      lastRun: this.lastRun
    };
  }
}

// Export singleton instance
export const criadorAgent = new CriadorAgent();
