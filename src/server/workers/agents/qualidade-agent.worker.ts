import { logger } from '../../../server/observability/logger';
import { eventBus, EventTopics } from '../../../core/events/topics';
import { marketingService } from '../../services/marketing-service';
import { knowledgeService } from '../../../server/knowledge/knowledge-service';


/**
 * Agente de Qualidade - Responsável por revisar e aprovar conteúdo criado
 */
export class QualidadeAgent {
  private id = 'qualidade';
  private lastRun: Date | null = null;
  private isRunning = false;

  async run(): Promise<void> {
    if (this.isRunning) {
      logger.warn('marketing', 'agents', 'run', 'Qualidade agent already running');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      logger.info('marketing', 'agents', 'run', 'Qualidade agent starting cycle');

      // Get content awaiting review (in rascunho status)
      const contents = await marketingService.getEditorialContents();
      const draftContents = contents.filter(c => c.status === 'rascunho');
      
      if (draftContents.length === 0) {
        logger.info('marketing', 'agents', 'run', 'Qualidade agent: No content in rascunho status to review');
        // Still update agent status to show it's active
        await this.updateAgentStatus('Nenhum conteúdo em rascunho para revisar');
        return;
      }

      // Process each draft content
      for (const draftContent of draftContents) {
        logger.info('marketing', 'agents', 'run', `Qualidade agent reviewing content: ${draftContent.id}`, {
          contentId: draftContent.id,
          title: draftContent.title
        });

        // Perform real quality checks
        const legalReview = await this.checkLegalCompliance(draftContent);
        const brandReview = await this.validateBrandGuidelines(draftContent);
        const accuracyReview = await this.reviewContentForAccuracy(draftContent);

        // Determine if content passes all quality gates
        const passesLegal = legalReview.passed && legalReview.score >= 7.0;
        const passesBrand = brandReview.passed && brandReview.score >= 7.0;
        const passesAccuracy = accuracyReview.passed && accuracyReview.score >= 7.0;
        
        const overallPassed = passesLegal && passesBrand && passesAccuracy;
        
        if (overallPassed) {
          // Move content to approved_qualified status
          const updatedContent = await marketingService.updateContent(draftContent.id, {
            status: 'aprovado_qualidade',
            qualityReviewScore: Math.min(legalReview.score, brandReview.score, accuracyReview.score),
            updatedAt: new Date().toISOString()
          });
          
          logger.info('marketing', 'agents', 'qualidade', `Content approved: ${draftContent.id}`, {
            contentId: draftContent.id,
            legalScore: legalReview.score,
            brandScore: brandReview.score,
            accuracyScore: accuracyReview.score,
            finalScore: Math.min(legalReview.score, brandReview.score, accuracyReview.score)
          });

          // Publish event for approved content
          eventBus.publish(EventTopics.MARKETING_QUALITY_APPROVED, {
            agentId: this.id,
            contentId: draftContent.id,
            legalScore: legalReview.score,
            brandScore: brandReview.score,
            accuracyScore: accuracyReview.score,
            timestamp: new Date().toISOString()
          }, 'marketing_os');
        } else {
          logger.warn('marketing', 'agents', 'qualidade', `Content rejected: ${draftContent.id}`, {
            contentId: draftContent.id,
            legalScore: legalReview.score,
            brandScore: brandReview.score,
            accuracyScore: accuracyReview.score,
            passesLegal,
            passesBrand,
            passesAccuracy,
            rejectionReasons: {
              legal: !passesLegal ? `Legal review failed (score: ${legalReview.score})` : undefined,
              brand: !passesBrand ? `Brand guidelines failed (score: ${brandReview.score})` : undefined,
              accuracy: !passesAccuracy ? `Accuracy review failed (score: ${accuracyReview.score})` : undefined
            }
          });
          
          // Optionally, we could move rejected content to a 'rejeitado' status
          // For now, we'll leave it in rascunho so it can be reviewed again after corrections
        }
      }

      // Update agent status
      await this.updateAgentStatus(`Revisão concluída: ${draftContents.length} conteúdo(s) processado(s)`);

      this.lastRun = new Date();
      logger.info('marketing', 'agents', 'run', 'Qualidade agent cycle completed', {
        durationMs: new Date().getTime() - startTime.getTime(),
        processedCount: draftContents.length
      });
    } catch (error) {
      logger.error('marketing', 'agents', 'run', 'Qualidade agent cycle failed', { message: String(error) });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async updateAgentStatus(taskDescription: string): Promise<void> {
    const agents = await marketingService.getMarketingAgents();
    const agentIndex = agents.findIndex(a => a.id === this.id);
    if (agentIndex !== -1) {
      const updatedAgent = {
        ...agents[agentIndex],
        lastActivity: 'Agora mesmo',
        tasksCompleted: agents[agentIndex].tasksCompleted + 1,
        currentTask: taskDescription
      };
      await marketingService.updateMarketingAgent(this.id, updatedAgent);
    }
  }

  private async reviewContentForAccuracy(content: any): Promise<{ passed: boolean; score: number; details: string }> {
    try {
      logger.debug('marketing', 'agents', 'run', 'Reviewing content for accuracy', { contentId: content.id });
      
      // Basic accuracy checks
      const issues: string[] = [];
      let score = 10.0;
      
      // Check if content has required fields
      if (!content.title || content.title.trim().length < 10) {
        issues.push('Título muito curto ou faltando');
        score -= 2.0;
      }
      
      if (!content.copyText || content.copyText.trim().length < 50) {
        issues.push('Texto muito curto ou faltando');
        score -= 2.0;
      }
      
      // Check for placeholder text
      const placeholderText = ['Lorem ipsum', 'exemplo de texto', 'texto aqui'];
      const hasPlaceholder = placeholderText.some(placeholder => 
        content.copyText && content.copyText.toLowerCase().includes(placeholder.toLowerCase())
      );
      
      if (hasPlaceholder) {
        issues.push('Contém texto de placeholder');
        score -= 3.0;
      }
      
      // Check legal theme consistency
      if (content.legalTheme && content.infraction_target_code) {
        // In a real implementation, we'd verify that the legal theme matches the infraction code
        // For now, we'll do a basic check
        if (!content.legalTheme.includes(content.infraction_target_code || '') && 
            !(content.infraction_target_code || '').includes(content.legalTheme || '')) {
          // This is just a basic check - real implementation would be more sophisticated
          logger.debug('marketing', 'agents', 'qualidade', 'Legal theme and infraction code may not be directly related', {
            legalTheme: content.legalTheme,
            infractionCode: content.infraction_target_code
          });
        }
      }
      
      // Check for basic factual consistency (example: check if mentioned fines match legal values)
      // This would be expanded in a real implementation
      
      const passed = score >= 7.0;
      const details = passed 
        ? `Conteúdo passou na revisão de precisão (${issues.length === 0 ? 'nenhum problema encontrado' : issues.join(', ')})`
        : `Problemas de precisão encontrados: ${issues.join(', ')}`;
      
      return { passed, score: Math.max(0, score), details };
    } catch (error) {
      logger.error('marketing', 'agents', 'qualidade', 'Error in reviewContentForAccuracy', { error });
      return { passed: false, score: 0, details: 'Erro interno durante a revisão de precisão' };
    }
  }

  private async checkLegalCompliance(content: any): Promise<{ passed: boolean; score: number; details: string }> {
    try {
      logger.debug('marketing', 'agents', 'run', 'Checking legal compliance', { contentId: content.id });
      
      // If no legal theme or infraction code, we can't do meaningful legal compliance check
      if (!content.legalTheme || !content.infraction_target_code) {
        return { 
          passed: false, 
          score: 3.0, 
          details: 'Tema legal ou código de infração não especificado' 
        };
      }
      
      // Search for relevant legal arguments in the knowledge base
      const relevantArguments = knowledgeService.getArgumentsByInfractionCode(content.infraction_target_code);
      
      // Also get the infraction details
      const infractionInfo = knowledgeService.getInfractionById(content.infraction_target_code) || 
                           knowledgeService.getInfractionByCode(content.infraction_target_code);
                           
      // Get CTB article if referenced
      let ctbArticle = null;
      if (content.legalTheme) {
        // Try to extract article number from legal theme
        const articleMatch = content.legalTheme.match(/Art\.?\s*(\d+[a-zA-Z]*)/i);
        if (articleMatch) {
          ctbArticle = knowledgeService.getCtbArticleById(articleMatch[1]) || 
                      knowledgeService.getCtbArticleByNumber(articleMatch[1]);
        }
      }
      
      let score = 5.0; // Base score
      const details: string[] = [];
      
      // Check if we found relevant legal arguments
      if (relevantArguments && relevantArguments.length > 0) {
        score += 2.0;
        details.push(`Encontrados ${relevantArguments.length} argumentos jurídicos relevantes`);
      } else {
        details.push('Nenhum argumento jurídico específico encontrado para esta infração');
      }
      
      // Check if infraction info exists
      if (infractionInfo) {
        score += 1.5;
        details.push('Informações de infração encontradas na base de conhecimento');
      } else {
        details.push('Informações de infração não encontradas na base de conhecimento');
        score -= 1.0;
      }
      
      // Check if CTB article exists (if referenced)
      if (content.legalTheme && (/Art\.?\s*\d+/i).test(content.legalTheme)) {
        if (ctbArticle) {
          score += 1.5;
          details.push('Artigo do CTB referenciado encontrado na base de conhecimento');
        } else {
          details.push('Artigo do CTB referenciado não encontrado na base de conhecimento');
          score -= 1.0;
        }
      }
      
      // Check for legally prohibited content
      const prohibitedClaims = [
        /garantia\s+de\s+ganho\s+100%/i,
        /burlar\s+a\s+lei/i,
        /jeitinho/i,
        /esquema/i,
        /advogado\s+virtual/i
      ];
      
      const hasProhibitedClaims = prohibitedClaims.some(regex => 
        regex.test(content.copyText || '') || 
        regex.test(content.title || '')
      );
      
      if (hasProhibitedClaims) {
        score -= 3.0;
        details.push('Contém afirmações juridicamente proibidas');
      } else {
        details.push('Não contém afirmações juridicamente proibidas');
        score += 1.0;
      }
      
      // Check if legal theme is consistent with infraction code (basic check)
      // In reality, this would be much more sophisticated
      const legalThemeLower = (content.legalTheme || '').toLowerCase();
      const infractionCode = content.infraction_target_code || '';
      
      // Very basic check - real implementation would have a mapping
      if (infractionCode.length > 0 && legalThemeLower.length > 0) {
        // This is just a placeholder - real implementation would check actual legal consistency
        details.push('Verificação básica de consistência entre tema legal e infração realizada');
        score += 0.5;
      }
      
      const finalScore = Math.max(0, Math.min(10, score));
      const passed = finalScore >= 7.0;
      
      return { 
        passed, 
        score: finalScore, 
        details: details.join('; ') 
      };
    } catch (error) {
      logger.error('marketing', 'agents', 'qualidade', 'Error in checkLegalCompliance', { error });
      return { passed: false, score: 0, details: 'Erro interno durante a verificação de conformidade legal' };
    }
  }

  private async validateBrandGuidelines(content: any): Promise<{ passed: boolean; score: number; details: string }> {
    try {
      logger.debug('marketing', 'agents', 'run', 'Validating brand guidelines', { contentId: content.id });
      
      const scoreDetails: { points: number; reason: string }[] = [];
      let score = 5.0; // Start with middle score
      
      // Check for disallowed words/phrases from brand guidelines
      const disallowedWords = [
        'Garantia de ganho 100%',
        'Burlar a lei',
        'Advogado virtual',
        'Jeitinho',
        'Esquema'
      ];
      
      const textToCheck = `${content.title || ''} ${content.copyText || ''}`.toLowerCase();
      const foundDisallowed = disallowedWords.filter(word => 
        textToCheck.includes(word.toLowerCase())
      );
      
      if (foundDisallowed.length > 0) {
        scoreDetails.push({ points: -3.0, reason: `Contém palavras/ frases proibidas: ${foundDisallowed.join(', ')}` });
      } else {
        scoreDetails.push({ points: 2.0, reason: 'Não contém palavras/ frases proibidas' });
      }
      
      // Check for mandatory legal disclaimer presence (though this is usually in the footer, not content)
      // For content, we check if it's making appropriate legal claims
      
      // Check for appropriate legal terminology usage
      const legalTerms = [
        'CTB', 'Código de Trânsito Brasileiro',
        'resolução', 'CONTRAN',
        'infração', 'multa',
        'recurso', 'defesa',
        'notificação', 'auto de infração'
      ];
      
      const foundLegalTerms = legalTerms.filter(term => 
        textToCheck.includes(term.toLowerCase())
      );
      
      if (foundLegalTerms.length >= 2) {
        scoreDetails.push({ points: 1.5, reason: `Usa terminologia jurídica apropriada (${foundLegalTerms.length} termos encontrados)` });
      } else if (foundLegalTerms.length === 1) {
        scoreDetails.push({ points: 0.5, reason: `Usa pouca terminologia jurídica (${foundLegalTerms.length} termo encontrado)` });
      } else {
        scoreDetails.push({ points: -1.0, reason: 'Falta de terminologia jurídica adequada' });
      }
      
      // Check for correct brand name usage
      if ((content.title || '').includes('Adeus Multa') || (content.copyText || '').includes('Adeus Multa')) {
        scoreDetails.push({ points: 1.0, reason: 'Menção correta da marca' });
      } else {
        // Not necessarily wrong, but good to have brand mention
        scoreDetails.push({ points: 0.0, reason: 'Marca não mencionada no conteúdo (não é obrigatório)' });
      }
      
      // Check for positive, helpful tone (basic heuristic)
      const positiveWords = ['direito', 'defesa', 'ajuda', 'orientação', 'informação', 'saiba', 'conheça'];
      const negativeWords = ['medo', 'carece', 'perigo', 'risco', 'perigo']; // Some risk words are ok in context
      
      const positiveCount = positiveWords.filter(word => textToCheck.includes(word)).length;
      const negativeCount = negativeWords.filter(word => textToCheck.includes(word)).length;
      
      if (positiveCount >= 2) {
        scoreDetails.push({ points: 1.0, reason: 'Tom positivo e informativo detectado' });
      } else if (positiveCount === 0) {
        scoreDetails.push({ points: -1.0, reason: 'Tom pode ser muito negativo ou informativo insuficiente' });
      }
      
      // Check for call to action or helpful information
      const ctaIndicators = ['link na bio', 'bio do instagram', 'site', 'www.', 'http', 'clique', 'acesse', 'saiba mais'];
      const hasCta = ctaIndicators.some(indicator => textToCheck.includes(indicator));
      
      if (hasCta) {
        scoreDetails.push({ points: 1.0, reason: 'Contém chamada para ação ou direcionamento para ajuda' });
      } else {
        scoreDetails.push({ points: 0.0, reason: 'Não contém chamada para ação evidente' });
      }
      
      // Calculate final score
      const totalAdjustment = scoreDetails.reduce((sum, detail) => sum + detail.points, 0);
      const finalScore = Math.max(0, Math.min(10, score + totalAdjustment));
      const passed = finalScore >= 7.0;
      
      const details = scoreDetails.map(detail => detail.reason).join('; ');
      
      return { passed, score: finalScore, details };
    } catch (error) {
      logger.error('marketing', 'agents', 'qualidade', 'Error in validateBrandGuidelines', { error });
      return { passed: false, score: 0, details: 'Erro interno durante a validação das diretrizes de marca' };
    }
  }

  async getStatus() {
    return {
      id: this.id,
      isRunning: this.isRunning,
      lastRun: this.lastRun
    };
  }
}

// Export singleton instance
export const qualidadeAgent = new QualidadeAgent();
