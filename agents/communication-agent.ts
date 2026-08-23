import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext, UserInfo } from "@/lib/types/agent-interfaces";

/**
 * Agente: communication-agent
 * Gerencia todos os canais de comunicação com o usuário.
 * Opera integração com WhatsApp via Evolution API para envio e recebimento de mensagens,
 * gerencia templates de mensagens transacionais (notificações de atualização de caso, confirmações, lembretes),
 * mantém a inbox de conversas e coordena o envio de notificações push e e-mail quando necessário.
 * Atua como porta de entrada para interações com o usuário final.
 */
export class CommunicationAgent extends BaseAgent {
  protected name = "communication-agent";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    // 1. Process any inbound messages (webhook handling)
    await this.processInboundMessages(context);
    
    // 2. Send outbound notifications based on case status
    await this.sendOutboundNotifications(context);
    
    // 3. Manage message templates and personalization
    await this.manageMessageTemplates(context);
    
    // 4. Coordinate multi-channel notifications (WhatsApp, email, push)
    await this.coordinateMultiChannelNotifications(context);
    
    // 5. Log communications for audit trail
    await this.logCommunications(context);
    
    // 6. Manage user communication preferences
    await this.manageUserPreferences(context);
    
    // 7. Record usage for telemetry
    this.recordUsage([
      "inbound-processing",
      "outbound-notifications",
      "template-management",
      "multi-channel-coordination",
      "communication-logging",
      "preference-management"
    ]);
    
    // 8. Mark this step as completed
    context.metadata.stepsCompleted.push("communication-agent");
    
    return context;
  }
  
  /**
   * Process inbound messages (simulating webhook handling)
   */
  private async processInboundMessages(context: CaseContext): Promise<void> {
    // In a real implementation, this would handle incoming webhooks from Evolution API
    // and process user responses, commands, etc.
    
    // For now, we'll simulate checking for user responses
    if (!context.metadata) {
      context.metadata = {
        documentId: "",
        version: "",
        hash: "",
        stepsCompleted: [],
        validatedFields: [],
        fieldErrors: {}
      };
    }
    
    // Simulate processing any user responses
    const userResponse = this.simulateUserResponse(context);
    if (userResponse) {
      // Store user response in metadata for use by other agents
      if (!context.metadata.userCommunications) {
        context.metadata.userCommunications = [];
      }
      
      context.metadata.userCommunications.push({
        timestamp: new Date().toISOString(),
        type: "inbound",
        channel: "whatsapp",
        content: userResponse,
        processed: true
      });
    }
  }
  
  /**
   * Simulate user response for demonstration purposes
   */
  private simulateUserResponse(context: CaseContext): string | null {
    // In a real implementation, this would come from actual webhook data
    // For now, return null to simulate no user response
    return null;
  }
  
  /**
   * Send outbound notifications based on case status and milestones
   */
  private async sendOutboundNotifications(context: CaseContext): Promise<void> {
    // Determine what notifications to send based on completed steps
    const stepsCompleted = context.metadata?.stepsCompleted || [];
    const notificationsToSend = [];
    
    // Welcome/initial contact
    if (!stepsCompleted.includes("communication-agent")) {
      notificationsToSend.push({
        type: "welcome",
        template: "welcome_message",
        priority: "high"
      });
    }
    
    // Analysis completed
    if (stepsCompleted.includes("ai-analysis-agent") && 
        !stepsCompleted.includes("notified_analysis_complete")) {
      notificationsToSend.push({
        type: "analysis_complete",
        template: "analysis_complete_notification",
        priority: "medium"
      });
      // Mark as notified to avoid duplicate notifications
      if (!context.metadata.notificationFlags) {
        context.metadata.notificationFlags = {};
      }
      context.metadata.notificationFlags.notified_analysis_complete = true;
    }
    
    // Document ready
    if (stepsCompleted.includes("document-agent") && 
        !stepsCompleted.includes("notified_document_ready")) {
      notificationsToSend.push({
        type: "document_ready",
        template: "document_ready_notification",
        priority: "medium"
      });
      // Mark as notified to avoid duplicate notifications
      if (!context.metadata.notificationFlags) {
        context.metadata.notificationFlags = {};
      }
      context.metadata.notificationFlags.notified_document_ready = true;
    }
    
    // Send each notification
    for (const notification of notificationsToSend) {
      await this.sendNotification(notification, context);
    }
  }
  
  /**
   * Send a specific notification using the appropriate channel
   */
  private async sendNotification(notification: any, context: CaseContext): Promise<void> {
    // In a real implementation, this would use the evolution-api skill
    // to send WhatsApp messages, or coordinate with email/push services
    
    // Get user contact information
    const user = context.user;
    if (!user) {
      return;
    }
    
    // Determine phone number for WhatsApp
    const phoneNumber = this.extractPhoneNumber(user);
    if (!phoneNumber) {
      // Fallback to email or other channels if no phone
      await this.sendFallbackNotification(notification, context);
      return;
    }
    
    // Get message template
    const messageTemplate = this.getMessageTemplate(notification.template);
    if (!messageTemplate) {
      return;
    }
    
    // Personalize message with case data
    const personalizedMessage = this.personalizeMessage(messageTemplate, context);
    
    // In a real implementation, this would call the Evolution API
    // For now, we'll simulate sending and record in metadata
    if (!context.metadata.sentCommunications) {
      context.metadata.sentCommunications = [];
    }
    
    context.metadata.sentCommunications.push({
      timestamp: new Date().toISOString(),
      type: notification.type,
      channel: "whatsapp",
      destination: phoneNumber,
      content: personalizedMessage,
      status: "sent",
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }
  
  /**
   * Extract phone number from user info
   */
  private extractPhoneNumber(user: UserInfo): string | null {
    // In a real implementation, phone number would be in user profile
    // For now, we'll return a placeholder or null
    return null; // Simulate no phone number available for demo
  }
  
  /**
   * Send fallback notification when WhatsApp is not available
   */
  private async sendFallbackNotification(notification: any, context: CaseContext): Promise<void> {
    // In a real implementation, this would send email or push notification
    // For now, we'll just log it
    
    if (!context.metadata.fallbackCommunications) {
      context.metadata.fallbackCommunications = [];
    }
    
    context.metadata.fallbackCommunications.push({
      timestamp: new Date().toISOString(),
      type: notification.type,
      channel: "email_fallback",
      status: "logged",
      note: "WhatsApp not available, notification logged for email follow-up"
    });
  }
  
  /**
   * Get message template by type
   */
  private getMessageTemplate(templateId: string): string | null {
    const templates: Record<string, string> = {
      "welcome_message": "Olá {{nome}}! Bem-vindo(a) ao sistema DefesaAi. Recebemos sua notificação de infração e iniciamos o processo de análise. Em breve retornaremos com atualizações sobre seu caso.",
      
      "analysis_complete_notification": "Olá {{nome}}! Nossa análise da infração {{numero_auto}} foi concluída. Identificamos {{arg_count}} pontos de defesa que serão utilizados na elaboração da sua defesa prévia. Em breve você receberá o documento para revisão.",
      
      "document_ready_notification": "Olá {{nome}}! Seu documento de defesa está pronto para revisão. Acesse o portal DefesaAi para visualizar, fazer alterações se necessário e autorizar a submissão ao órgão de trânsito.",
      
      "reminder_notification": "Olá {{nome}}! Lembrete: seu caso {{numero_auto}} está aguardando sua ação. Por favor, revise o documento de defesa e confirme para que possamos prosseguir com a submissão.",
      
      "status_update_notification": "Olá {{nome}}! Atualização sobre seu caso {{numero_auto}}: {{status_update}}."
    };
    
    return templates[templateId] || null;
  }
  
  /**
   * Personalize message template with case data
   */
  private personalizeMessage(template: string, context: CaseContext): string {
    if (!context.infraction || !context.user) {
      return template;
    }
    
    const infraction = context.infraction;
    const user = context.user;
    
    // Prepare replacement values
    const replacements: Record<string, string> = {
      "{{nome}}": user.nome || "",
      "{{numero_auto}}": infraction.numeroAuto || "",
      "{{placa}}": infraction.placa || "",
      "{{arg_count}}": context.metadata?.defenseArguments?.length || 0,
      "{{status_update}}": "Análise concluída e documento gerado"
    };
    
    // Apply replacements
    let personalized = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
      personalized = personalized.split(placeholder).join(value);
    }
    
    return personalized;
  }
  
  /**
   * Manage message templates (creation, updating, caching)
   */
  private async manageMessageTemplates(context: CaseContext): Promise<void> {
    // In a real implementation, this would manage a template repository
    // For now, we'll just ensure templates are available in metadata
    
    if (!context.metadata) {
      context.metadata = {
        documentId: "",
        version: "",
        hash: "",
        stepsCompleted: [],
        validatedFields: [],
        fieldErrors: {}
      };
    }
    
    // Store available templates in metadata for reference
    context.metadata.availableTemplates = [
      "welcome_message",
      "analysis_complete_notification",
      "document_ready_notification",
      "reminder_notification",
      "status_update_notification"
    ];
  }
  
  /**
   * Coordinate multi-channel notifications (WhatsApp, email, push)
   */
  private async coordinateMultiChannelNotifications(context: CaseContext): Promise<void> {
    // In a real implementation, this would coordinate with email services
    // and push notification services based on user preferences and delivery status
    
    // For now, we'll just track that coordination occurred
    if (!context.metadata) {
      context.metadata = {
        documentId: "",
        version: "",
        hash: "",
        stepsCompleted: [],
        validatedFields: [],
        fieldErrors: {}
      };
    }
    
    context.metadata.coordinationPerformed = {
      timestamp: new Date().toISOString(),
      channelsConsidered: ["whatsapp", "email", "push"],
      coordinationType: "smart_routing_based_on_preferences_and_deliverability"
    };
  }
  
  /**
   * Log communications for audit trail and compliance
   */
  private async logCommunications(context: CaseContext): Promise<void> {
    // In a real implementation, this would ensure all communications
    // are properly logged for audit and compliance purposes
    
    // For now, we'll just ensure communication metadata is structured properly
    if (!context.metadata) {
      context.metadata = {
        documentId: "",
        version: "",
        hash: "",
        stepsCompleted: [],
        validatedFields: [],
        fieldErrors: {}
      };
    }
    
    // Ensure all communication arrays exist
    if (!context.metadata.sentCommunications) {
      context.metadata.sentCommunications = [];
    }
    
    if (!context.metadata.userCommunications) {
      context.metadata.userCommunications = [];
    }
    
    if (!context.metadata.fallbackCommunications) {
      context.metadata.fallbackCommunications = [];
    }
  }
  
  /**
   * Manage user communication preferences (channel, frequency, etc.)
   */
  private async manageUserPreferences(context: CaseContext): Promise<void> {
    // In a real implementation, this would read/update user preferences
    // from a profile or settings database
    
    // For now, we'll just establish default preferences in metadata
    if (!context.metadata) {
      context.metadata = {
        documentId: "",
        version: "",
        hash: "",
        stepsCompleted: [],
        validatedFields: [],
        fieldErrors: {}
      };
    }
    
    // Set default communication preferences if not already set
    if (!context.metadata.communicationPreferences) {
      context.metadata.communicationPreferences = {
        preferredChannel: "whatsapp",
        frequency: "immediate_for_updates",
        language: "pt-BR",
        optInStatus: true,
        lastUpdated: new Date().toISOString()
      };
    }
  }
}