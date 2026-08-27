import { logger } from '../../../server/observability/logger';
import { eventBus, EventTopics } from '../../../core/events/topics';
import { marketingService } from '../../services/marketing-service';
import { metaInsightsService } from '../../../integrations/meta/insights/meta-insights-service';


/**
 * Agente de Inteligência - Responsável por coletar e analisar métricas de desempenho
 */
export class InteligenciaAgent {
  private id = 'inteligencia';
  private lastRun: Date | null = null;
  private isRunning = false;

  async run(): Promise<void> {
    if (this.isRunning) {
      logger.warn('marketing', 'agents', 'run', 'Inteligência agent already running');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      logger.info('marketing', 'agents', 'run', 'Inteligência agent starting cycle');

      // Perform real intelligence work: collect and analyze real metrics
      const metricsData = await this.collectRealPerformanceMetrics();
      const engagementAnalysis = await this.analyzeRealAudienceEngagement(metricsData);
      const insightsReport = await this.generateRealInsightsReport(metricsData, engagementAnalysis);

      // Update agent status
      const agents = await marketingService.getMarketingAgents();
      const agentIndex = agents.findIndex(a => a.id === this.id);
      if (agentIndex !== -1) {
        const updatedAgent = {
          ...agents[agentIndex],
          lastActivity: 'Agora mesmo',
          tasksCompleted: agents[agentIndex].tasksCompleted + 1,
          currentTask: `Analisado ${metricsData.length} peças de conteúdo para insights de performance`
        };
        await marketingService.updateMarketingAgent(this.id, updatedAgent);
      }

      // Publish event for real metrics collected and analyzed
      eventBus.publish(EventTopics.MARKETING_METRICS_COLLECTED, {
        agentId: this.id,
        timestamp: new Date().toISOString(),
        metrics: {
          totalPiecesAnalyzed: metricsData.length,
          averageEngagementRate: engagementAnalysis.averageEngagementRate,
          topPerformingContent: engagementAnalysis.topPerformingContent,
          insightsGenerated: insightsReport.keyInsights.length
        }
      }, 'marketing_os');

      this.lastRun = new Date();
      logger.info('marketing', 'agents', 'run', 'Inteligência agent cycle completed', {
        durationMs: new Date().getTime() - startTime.getTime(),
        piecesAnalyzed: metricsData.length
      });
    } catch (error) {
      logger.error('marketing', 'agents', 'run', 'Inteligência agent cycle failed', { message: String(error) });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Collect real performance metrics from published content via Meta API
   * Instead of simulation, fetch actual engagement data
   */
  private async collectRealPerformanceMetrics(): Promise<any[]> {
    try {
      logger.debug('marketing', 'agents', 'inteligencia', 'Collecting real performance metrics from Meta API');
      
      // Get published content that has Meta post IDs
      const contents = await marketingService.getEditorialContents();
      const publishedContentWithMetaId = contents.filter(
        c => c.status === 'publicado' && c.meta_post_id
      );
      
      logger.info('marketing', 'agents', 'inteligencia', `Found ${publishedContentWithMetaId.length} published content with Meta IDs`);
      
      const token = process.env.META_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;

      // For each piece of content, fetch real metrics from Meta API
      const metricsPromises = publishedContentWithMetaId.map(async (content) => {
        try {
          let metrics = {
            impressions: 0,
            reach: 0,
            engagement: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            saved: 0,
            videoViews: 0,
          };

          if (token && content.meta_post_id) {
            const insights = await metaInsightsService.getFacebookPostInsights(content.meta_post_id, token);
            metrics = {
              impressions: insights.impressions || 0,
              reach: insights.reach || 0,
              engagement: insights.engagement || 0,
              likes: insights.likes || 0,
              comments: insights.comments || 0,
              shares: insights.shares || 0,
              saved: insights.saved || 0,
              videoViews: 0,
            };
          }

          return {
            contentId: content.id,
            metaPostId: content.meta_post_id,
            contentType: content.format,
            channel: content.channel,
            isSimulated: false,
            metrics,
            timestamp: new Date().toISOString()
          };
        } catch (error: any) {
          logger.warn('marketing', 'agents', 'inteligencia', `Failed to fetch metrics for content ${content.id}`, { 
            error: error?.message 
          });
          return null;
        }
      });
      
      const metricsResults = await Promise.all(metricsPromises);
      return metricsResults.filter(result => result !== null);
    } catch (error) {
      logger.error('marketing', 'agents', 'inteligencia', 'Error collecting real performance metrics', { error });
      return [];
    }
  }

  /**
   * Analyze real audience engagement patterns
   * Instead of simulation, analyze actual engagement data
   */
  private async analyzeRealAudienceEngagement(metricsData: any[]): Promise<any> {
    try {
      logger.debug('marketing', 'agents', 'inteligencia', `Analyzing real audience engagement for ${metricsData.length} content pieces`);
      
      if (metricsData.length === 0) {
        return {
          averageEngagementRate: 0,
          totalReach: 0,
          totalEngagement: 0,
          topPerformingContent: null,
          engagementByChannel: {},
          engagementByFormat: {},
          trends: []
        };
      }
      
      // Calculate engagement rate for each piece: (engagements / reach) * 100
      const engagementRates = metricsData.map(data => {
        const reach = data.metrics.reach || 0;
        const engagement = data.metrics.engagement || 0;
        const engagementRate = reach > 0 ? (engagement / reach) * 100 : 0;
        return {
          ...data,
          engagementRate: engagementRate
        };
      });
      
      // Calculate averages
      const totalReach = engagementRates.reduce((sum, data) => sum + (data.metrics.reach || 0), 0);
      const totalEngagement = engagementRates.reduce((sum, data) => sum + (data.metrics.engagement || 0), 0);
      const averageEngagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;
      
      // Find top performing content
      const topPerforming = engagementRates.reduce((top, current) => 
        (current.engagementRate || 0) > (top.engagementRate || 0) ? current : top
      );
      
      // Group by channel and format
      const engagementByChannel = {};
      const engagementByFormat = {};
      
      engagementRates.forEach(data => {
        const channel = data.channel || 'unknown';
        const format = data.contentType || 'unknown';
        const rate = data.engagementRate || 0;
        
        if (!engagementByChannel[channel]) {
          engagementByChannel[channel] = { total: 0, count: 0, average: 0 };
        }
        engagementByChannel[channel].total += rate;
        engagementByChannel[channel].count += 1;
        
        if (!engagementByFormat[format]) {
          engagementByFormat[format] = { total: 0, count: 0, average: 0 };
        }
        engagementByFormat[format].total += rate;
        engagementByFormat[format].count += 1;
      });
      
      // Calculate averages for groups
      Object.keys(engagementByChannel).forEach(channel => {
        engagementByChannel[channel].average = 
          engagementByChannel[channel].count > 0 ? 
          engagementByChannel[channel].total / engagementByChannel[channel].count : 0;
      });
      
      Object.keys(engagementByFormat).forEach(format => {
        engagementByFormat[format].average = 
          engagementByFormat[format].count > 0 ? 
          engagementByFormat[format].total / engagementByFormat[format].count : 0;
      });
      
      // Identify trends (simplified - in reality would look at historical data)
      const trends = engagementRates.length >= 3 ? [
        {
          metric: 'engagement_rate',
          direction: engagementRates[engagementRates.length - 1].engagementRate > engagementRates[0].engagementRate ? 'increasing' : 'decreasing',
          change: Math.abs(engagementRates[engagementRates.length - 1].engagementRate - engagementRates[0].engagementRate)
        }
      ] : [];
      
      return {
        averageEngagementRate: averageEngagementRate,
        totalReach: totalReach,
        totalEngagement: totalEngagement,
        topPerformingContent: topPerforming ? {
          contentId: topPerforming.contentId,
          engagementRate: topPerforming.engagementRate,
          reach: topPerforming.metrics.reach,
          engagement: topPerforming.metrics.engagement,
          channel: topPerforming.channel,
          format: topPerforming.contentType
        } : null,
        engagementByChannel: engagementByChannel,
        engagementByFormat: engagementByFormat,
        trends: trends
      };
    } catch (error) {
      logger.error('marketing', 'agents', 'inteligencia', 'Error analyzing real audience engagement', { error });
      return {
        averageEngagementRate: 0,
        totalReach: 0,
        totalEngagement: 0,
        topPerformingContent: null,
        engagementByChannel: {},
        engagementByFormat: {},
        trends: []
      };
    }
  }

  /**
   * Generate real insights report based on actual data analysis
   * Instead of simulation, create actionable insights from real metrics
   */
  private async generateRealInsightsReport(metricsData: any[], engagementAnalysis: any): Promise<any> {
    try {
      logger.debug('marketing', 'agents', 'inteligencia', 'Generating real insights report from analyzed data');
      
      const keyInsights = [];
      const recommendations = [];
      
      // Generate insights based on real data analysis
      if (metricsData.length > 0) {
        // Insight 1: Overall performance
        if (engagementAnalysis.averageEngagementRate >= 5) {
          keyInsights.push(`Taxa de engajamento média excelente: ${engagementAnalysis.averageEngagementRate.toFixed(1)}% (acima da meta de 5%)`);
        } else if (engagementAnalysis.averageEngagementRate >= 3) {
          keyInsights.push(`Taxa de engajamento média boa: ${engagementAnalysis.averageEngagementRate.toFixed(1)}% (entre 3-5%)`);
        } else {
          keyInsights.push(`Taxa de engajamento média precisa de atenção: ${engagementAnalysis.averageEngagementRate.toFixed(1)}% (abaixo de 3%)`);
        }
        
        // Insight 2: Best performing channel
        if (engagementAnalysis.engagementByChannel && Object.keys(engagementAnalysis.engagementByChannel).length > 0) {
          const bestChannel = Object.keys(engagementAnalysis.engagementByChannel).reduce((best, channel) => 
            engagementAnalysis.engagementByChannel[best].average > engagementAnalysis.engagementByChannel[channel].average ? best : channel
          );
          keyInsights.push(`Canal com melhor desempenho: ${bestChannel} (${engagementAnalysis.engagementByChannel[bestChannel].average.toFixed(1)}% taxa média de engajamento)`);
          
          // Recommendation: Invest more in best performing channel
          recommendations.push(`Aloque mais recursos para o canal ${bestChannel}, que apresenta a melhor performance de engajamento`);
        }
        
        // Insight 3: Best performing format
        if (engagementAnalysis.engagementByFormat && Object.keys(engagementAnalysis.engagementByFormat).length > 0) {
          const bestFormat = Object.keys(engagementAnalysis.engagementByFormat).reduce((best, format) => 
            engagementAnalysis.engagementByFormat[best].average > engagementAnalysis.engagementByFormat[format].average ? best : format
          );
          keyInsights.push(`Formato com melhor desempenho: ${bestFormat} (${engagementAnalysis.engagementByFormat[bestFormat].average.toFixed(1)}% taxa média de engajamento)`);
          
          // Recommendation: Create more content in best performing format
          recommendations.push(`Priorize a criação de conteúdo no formato ${bestFormat}, que gera maior engajamento com o público`);
        }
        
        // Insight 4: Content volume vs engagement
        if (metricsData.length < 5) {
          keyInsights.push(`Volume de conteúdo baixo para análise estatística significativa (${metricsData.length} peças)`);
          recommendations.push(`Aumente a frequência de publicação para ter dados mais robustos para análise de performance`);
        } else {
          keyInsights.push(`Volume de conteúdo adequado para análise de tendências (${metricsData.length} peças)`);
        }
        
        // Insight 5: Engagement quality
        if (engagementAnalysis.averageEngagementRate > 0) {
          const engagementQuality = engagementAnalysis.averageEngagementRate > 10 ? 'Excelente' : 
                                 engagementAnalysis.averageEngagementRate > 7 ? 'Boa' : 
                                 engagementAnalysis.averageEngagementRate > 4 ? 'Regular' : 'Precisa de Melhoria';
          keyInsights.push(`Qualidade do engajamento: ${engagementQuality}`);
        }
      } else {
        keyInsights.push(`Nenhum conteúdo publicado com ID do Meta encontrado para análise de métricas reais`);
        recommendations.push(`Verifique se o conteúdo publicado está sendo associado corretamente aos IDs do Meta Publisher`);
      }
      
      // Add a timestamped insight
      keyInsights.push(`Análise realizada em ${new Date().toLocaleString('pt-BR')} com base em dados reais de performance`);
      
      return {
        keyInsights: keyInsights,
        recommendations: recommendations,
        generatedAt: new Date().toISOString(),
        dataQuality: metricsData.length > 0 ? 'real' : 'no_data_available'
      };
    } catch (error) {
      logger.error('marketing', 'agents', 'inteligencia', 'Error generating real insights report', { error });
      return {
        keyInsights: [`Erro ao gerar relatório de insights: ${error.message}`],
        recommendations: [],
        generatedAt: new Date().toISOString(),
        dataQuality: 'error'
      };
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
export const inteligenciaAgent = new InteligenciaAgent();
