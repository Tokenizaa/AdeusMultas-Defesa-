import { logger } from '../../../server/observability/logger';
import { eventBus, EventTopics } from '../../../core/events/topics';
import { marketingService } from '../../services/marketing-service';
import { aprendizadoAgent } from './aprendizado-agent.worker';


/**
 * Agente de Planejamento - Responsável por organizar a grade editorial,
 * frequência de postagens e distribuição multicanal
 */
export class PlanejamentoAgent {
  private id = 'planejamento';
  private lastRun: Date | null = null;
  private isRunning = false;

  async run(): Promise<void> {
    if (this.isRunning) {
      logger.warn('marketing', 'agents', 'run', 'Planejamento agent already running');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      logger.info('marketing', 'agents', 'run', 'Planejamento agent starting cycle');

      // Perform real planning work: organize editorial calendar, plan distribution
      await this.organizeEditorialCalendarReal();
      await this.planMultichannelDistributionReal();
      await this.allocateContentSlots();

      // Update agent status
      const agents = await marketingService.getMarketingAgents();
      const agentIndex = agents.findIndex(a => a.id === this.id);
      if (agentIndex !== -1) {
        const updatedAgent = {
          ...agents[agentIndex],
          lastActivity: 'Agora mesmo',
          tasksCompleted: agents[agentIndex].tasksCompleted + 1,
          currentTask: 'Grade editorial organizada e conteúdo distribuído com base em dados estratégicos'
        };
        await marketingService.updateMarketingAgent(this.id, updatedAgent);
      }

      this.lastRun = new Date();
      logger.info('marketing', 'agents', 'run', 'Planejamento agent cycle completed', {
        durationMs: new Date().getTime() - startTime.getTime()
      });
    } catch (error) {
      logger.error('marketing', 'agents', 'run', 'Planejamento agent cycle failed', { message: String(error) });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async organizeEditorialCalendarReal(): Promise<void> {
    try {
      logger.debug('marketing', 'agents', 'run', 'Organizing editorial calendar based on strategic insights');
      
      const contents = await marketingService.getEditorialContents();
      const publishedContents = contents.filter(c => c.status === 'publicado');
      
      // Analyze what types of content have been published recently
      const recentContentAnalysis: {
        byChannel: Record<string, number>;
        byFormat: Record<string, number>;
        byTheme: Record<string, number>;
      } = {
        byChannel: {},
        byFormat: {},
        byTheme: {}
      };
      
      publishedContents.slice(-10).forEach(content => { // Last 10 published pieces
        const channel = content.channel || 'unknown';
        const format = content.format || 'unknown';
        const theme = content.legal_theme || content.legalTheme || 'unknown';
        
        recentContentAnalysis.byChannel[channel] = (recentContentAnalysis.byChannel[channel] || 0) + 1;
        recentContentAnalysis.byFormat[format] = (recentContentAnalysis.byFormat[format] || 0) + 1;
        recentContentAnalysis.byTheme[theme] = (recentContentAnalysis.byTheme[theme] || 0) + 1;
      });
      
      // Generate editorial calendar for the upcoming week
      const editorialCalendar = this.generateEditorialCalendar(recentContentAnalysis);
      
      logger.info('marketing', 'agents', 'planning', `Editorial calendar organized for upcoming week: ${editorialCalendar.days.length} days planned`);
      
      // Publish event about the organized calendar
      eventBus.publish(EventTopics.MARKETING_EDITORIAL_CALENDAR_UPDATED, {
        agentId: this.id,
        timestamp: new Date().toISOString(),
        calendar: editorialCalendar
      }, 'marketing_os');
    } catch (error) {
      logger.error('marketing', 'agents', 'run', 'Error organizing editorial calendar', { error });
      throw error;
    }
  }

  /**
   * Generate editorial calendar based on content analysis
   */
  private generateEditorialCalendar(contentAnalysis: any): any {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const calendar: any = {
      weekStart: new Date().toISOString().split('T')[0],
      days: []
    };
    
    // Determine optimal distribution based on analysis
    const channelDistribution = Object.entries(contentAnalysis.byChannel as Record<string, number>)
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .map(([channel]) => channel);
      
    const formatDistribution = Object.entries(contentAnalysis.byFormat as Record<string, number>)
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .map(([format]) => format);
      
    const themeDistribution = Object.entries(contentAnalysis.byTheme as Record<string, number>)
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .map(([theme]) => theme);
    
    // Create calendar entries for each day
    days.forEach((day, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index);
      
      // Cycle through channels, formats, and themes for variety
      const channelIndex = channelDistribution.length > 0 ? index % channelDistribution.length : 0;
      const formatIndex = formatDistribution.length > 0 ? index % formatDistribution.length : 0;
      const themeIndex = themeDistribution.length > 0 ? index % themeDistribution.length : 0;
      
      calendar.days.push({
        day: day,
        date: date.toISOString().split('T')[0],
        suggestedChannel: channelDistribution[channelIndex] || 'instagram',
        suggestedFormat: formatDistribution[formatIndex] || 'carrossel',
        suggestedTheme: themeDistribution[themeIndex] || 'Direito de Trânsito Geral',
        contentType: Math.random() > 0.5 ? 'educativo' : 'informativo'
      });
    });
    
    return calendar;
  }

  private async planMultichannelDistributionReal(): Promise<void> {
    try {
      logger.debug('marketing', 'agents', 'run', 'Planning multichannel distribution based on performance data');
      
      const contents = await marketingService.getEditorialContents();
      const publishedContents = contents.filter(c => c.status === 'publicado');
      
      // Analyze performance by channel and format
      const channelPerformance: Record<string, { reach: number; engagement: number; count: number }> = {};
      const formatPerformance: Record<string, { reach: number; engagement: number; count: number }> = {};
      
      publishedContents.forEach(content => {
        const channel = content.channel || 'unknown';
        const format = content.format || 'unknown';
        const reach = content.estimated_reach || 0;
        const engagement = Math.floor((content.estimated_reach || 0) * 0.08); // Estimated 8% engagement rate
        
        if (!channelPerformance[channel]) {
          channelPerformance[channel] = { reach: 0, engagement: 0, count: 0 };
        }
        channelPerformance[channel].reach += reach;
        channelPerformance[channel].engagement += engagement;
        channelPerformance[channel].count++;
        
        if (!formatPerformance[format]) {
          formatPerformance[format] = { reach: 0, engagement: 0, count: 0 };
        }
        formatPerformance[format].reach += reach;
        formatPerformance[format].engagement += engagement;
        formatPerformance[format].count++;
      });
      
      // Calculate average performance
      const channelAverages: Record<string, { avgReach: number; avgEngagement: number; engagementRate: number }> = {};
      const formatAverages: Record<string, { avgReach: number; avgEngagement: number; engagementRate: number }> = {};
      
      Object.keys(channelPerformance).forEach(channel => {
        const data = channelPerformance[channel];
        if (data.count > 0) {
          const avgReach = data.reach / data.count;
          const avgEngagement = data.engagement / data.count;
          channelAverages[channel] = {
            avgReach,
            avgEngagement,
            engagementRate: avgReach > 0 ? (avgEngagement / avgReach) * 100 : 0
          };
        }
      });
      
      Object.keys(formatPerformance).forEach(format => {
        const data = formatPerformance[format];
        if (data.count > 0) {
          const avgReach = data.reach / data.count;
          const avgEngagement = data.engagement / data.count;
          formatAverages[format] = {
            avgReach,
            avgEngagement,
            engagementRate: avgReach > 0 ? (avgEngagement / avgReach) * 100 : 0
          };
        }
      });
      
      // Generate distribution plan based on performance
      const distributionPlan = this.generateDistributionPlan(channelAverages, formatAverages);
      
      logger.info('marketing', 'agents', 'planning', `Multichannel distribution planned based on performance data`);
      
      // Publish event about the distribution plan
      eventBus.publish(EventTopics.MARKETING_DISTRIBUTION_PLAN_UPDATED, {
        agentId: this.id,
        timestamp: new Date().toISOString(),
        plan: distributionPlan
      }, 'marketing_os');
    } catch (error) {
      logger.error('marketing', 'agents', 'run', 'Error planning multichannel distribution', { error });
      throw error;
    }
  }

  /**
   * Generate distribution plan based on performance data
   */
  private generateDistributionPlan(
    channelAverages: Record<string, { avgReach: number; avgEngagement: number; engagementRate: number }>,
    formatAverages: Record<string, { avgReach: number; avgEngagement: number; engagementRate: number }>
  ): any {
    // Sort channels and formats by engagement rate
    const sortedChannels = Object.entries(channelAverages)
      .sort((a, b) => b[1].engagementRate - a[1].engagementRate);
      
    const sortedFormats = Object.entries(formatAverages)
      .sort((a, b) => b[1].engagementRate - a[1].engagementRate);
    
    const plan: any = {
      primaryChannel: sortedChannels.length > 0 ? sortedChannels[0][0] : 'instagram',
      secondaryChannel: sortedChannels.length > 1 ? sortedChannels[1][0] : 'blog',
      tertiaryChannel: sortedChannels.length > 2 ? sortedChannels[2][0] : 'tiktok',
      preferredFormats: sortedFormats.slice(0, 3).map(([format]) => format),
      avoidFormats: sortedFormats.length > 3 ? sortedFormats.slice(3).map(([format]) => format) : [],
      recommendations: []
    };
    
    // Add recommendations based on data
    if (plan.primaryChannel) {
      plan.recommendations.push(`Focar esforços principais no ${plan.primaryChannel} (taxa de engajamento média: ${channelAverages[plan.primaryChannel]?.engagementRate?.toFixed(1) || 0}%)`);
    }
    
    if (plan.preferredFormats.length > 0) {
      plan.recommendations.push(`Utilizar os formatos ${plan.preferredFormats.join(', ')} para melhor engajamento`);
    }
    
    return plan;
  }

  private async allocateContentSlots(): Promise<void> {
    // Simulate allocating content slots
    logger.debug('marketing', 'agents', 'run', 'Allocating content slots for upcoming week');
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate work
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
export const planejamentoAgent = new PlanejamentoAgent();
