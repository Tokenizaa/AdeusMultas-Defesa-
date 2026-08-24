import { logger } from '../../../server/observability/logger';
import { eventBus, EventTopics } from '../../../core/events/topics';
import { marketingService } from '../../services/marketing-service';
import { metaPublisher } from '../meta-publisher.worker';


/**
 * Agente de Publicação - Responsável por publicar conteúdo nas plataformas
 */
export class PublicacaoAgent {
  private id = 'publicacao';
  private lastRun: Date | null = null;
  private isRunning = false;

  async run(): Promise<void> {
    if (this.isRunning) {
      logger.warn('marketing', 'agents', 'run', 'Publicação agent already running');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      logger.info('marketing', 'agents', 'run', 'Publicação agent starting cycle');

      // P1: Implementar respeito ao horário agendado
      // Agendar publicação para o scheduledDate específico do conteúdo
      // Não publicar imediatamente ao enfileirar
      await this.processScheduledContent();

      this.lastRun = new Date();
      logger.info('marketing', 'agents', 'run', 'Publicação agent cycle completed', {
        durationMs: new Date().getTime() - startTime.getTime()
      });
    } catch (error) {
      logger.error('marketing', 'agents', 'run', 'Publicação agent cycle failed', { message: String(error) });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * P1: Implementar respeito ao horário agendado
   * Processa conteúdo cujo scheduledDate chegou ou passou
   * Não publica imediatamente ao enfileirar, respeita o horário agendado
   */
  private async processScheduledContent(): Promise<void> {
    try {
      logger.debug('marketing', 'agents', 'publicacao', 'Processing scheduled content');
      
      // Get content that is approved and ready for scheduling
      const contents = await marketingService.getEditorialContents();
      const approvedContent = contents.filter(c => c.status === 'aprovado_qualidade');
      
      const now = new Date();
      
      for (const content of approvedContent) {
        // Check if content has a scheduled date and if that time has come
        const scheduledDateStr = content.scheduled_date || content.scheduledDate;
        if (scheduledDateStr) {
          const scheduledDate = new Date(scheduledDateStr);
          
          // If scheduled time has arrived or passed, move to agendado and enqueue for publishing
          if (scheduledDate <= now) {
            logger.info('marketing', 'agents', 'publicacao', `Processing content ${content.id} scheduled for ${scheduledDateStr}`);
            
            // Move content to agendado status
            await marketingService.updateContent(content.id, { 
              status: 'agendado',
              updatedAt: new Date().toISOString()
            });
            
            // Enqueue for publishing (this will happen immediately in the meta publisher,
            // but in a more sophisticated system, we might wait until the exact time)
metaPublisher.enqueue({
               destination: 'both',
               message: `${content.copyText}\n\n${content.hashtags.join(' ')}`,
               linkUrl: 'https://www.defesai.shop',
             }, content.id);
            
            eventBus.publish(EventTopics.MARKETING_CONTENT_PUBLISHED, { contentId: content.id }, 'marketing_os');
            logger.info('marketing', 'agents', 'publish', `Conteúdo ${content.id} agendado e enfileirado na Meta`);
          }
          // Else, content is not ready yet - leave it in aprovado_qualidade until scheduled time
        }
        // If no scheduled date, we could either:
        // 1. Schedule it for the next available slot (would need calendar integration)
        // 2. Leave it as is (current behavior)
        // For now, we'll leave content without scheduled date in aprovado_qualidade
      }
      
      // Also check if there's already agendado content that needs to be published
      // This respects the scheduled date by only publishing when the time arrives
      const agendadoContent = contents.filter(c => c.status === 'agendado');
      for (const content of agendadoContent) {
        const scheduledDateStr = content.scheduled_date || content.scheduledDate;
        if (scheduledDateStr) {
          const scheduledDate = new Date(scheduledDateStr);
          // If scheduled time has arrived or passed, publish now
          if (scheduledDate <= now) {
            logger.info('marketing', 'agents', 'publicacao', `Publishing scheduled content ${content.id} (scheduled for ${scheduledDateStr})`);
            
            // Publish the content
const result = metaPublisher.enqueue({
               destination: 'both',
               message: `${content.copyText}\n\n${content.hashtags.join(' ')}`,
               linkUrl: 'https://www.defesai.shop',
             }, content.id);
            
            // Update status to published
            await marketingService.updateContent(content.id, { 
              status: 'publicado',
              publishedAt: new Date().toISOString(),
              meta_post_id: result.itemId, // Assuming we get an ID back
              updatedAt: new Date().toISOString()
            });
            
            eventBus.publish(EventTopics.MARKETING_CONTENT_PUBLISHED, { 
              contentId: content.id,
              metaPostId: result.itemId
            }, 'marketing_os');
            
            logger.info('marketing', 'agents', 'publish', `Conteúdo ${content.id} publicado`);
          }
        }
        // If no scheduled date, publish immediately (fallback behavior)
        else {
          logger.info('marketing', 'agents', 'publicacao', `Publishing content ${content.id} without scheduled date (immediate)`);
          
const result = metaPublisher.enqueue({
             destination: 'both',
             message: `${content.copyText}\n\n${content.hashtags.join(' ')}`,
             linkUrl: 'https://www.defesai.shop',
           }, content.id);
          
          await marketingService.updateContent(content.id, { 
            status: 'publicado',
            publishedAt: new Date().toISOString(),
            meta_post_id: result.itemId,
            updatedAt: new Date().toISOString()
          });
          
          eventBus.publish(EventTopics.MARKETING_CONTENT_PUBLISHED, { 
            contentId: content.id,
            metaPostId: result.itemId
          }, 'marketing_os');
          
          logger.info('marketing', 'agents', 'publish', `Conteúdo ${content.id} publicado`);
        }
      }
    } catch (error) {
      logger.error('marketing', 'agents', 'publicacao', 'Error processing scheduled content', { error });
      throw error;
    }
  }

  private async scheduleContentForPublishing(): Promise<void> {
    logger.debug('marketing', 'agents', 'publicacao', 'scheduleContentForPublishing called');
  }

  private async publishToPlatforms(): Promise<void> {
    logger.debug('marketing', 'agents', 'publicacao', 'publishToPlatforms called');
  }

  private async trackPublicationPerformance(): Promise<void> {
    logger.debug('marketing', 'agents', 'publicacao', 'trackPublicationPerformance called');
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
export const publicacaoAgent = new PublicacaoAgent();
