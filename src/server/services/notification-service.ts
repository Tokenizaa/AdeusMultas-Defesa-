/**
 * DefesAi Push Notification Service
 * Manages push subscriptions, status change alerts, and push dispatch.
 */

export interface PushSubscriptionDTO {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
  userId?: string;
  userEmail?: string;
  fcmToken?: string;
  createdAt: string;
  userAgent?: string;
}

export interface AppNotification {
  id: string;
  caseId?: string;
  userId?: string;
  userEmail?: string;
  title: string;
  body: string;
  url: string;
  status: string;
  read: boolean;
  createdAt: string;
  type: 'case_status' | 'prazo_alerta' | 'system' | 'marketing';
}

class NotificationService {
  private subscriptions: Map<string, PushSubscriptionDTO> = new Map();
  private notificationHistory: AppNotification[] = [];

  constructor() {
    // Seed initial welcome notification for demo user
    this.notificationHistory.push({
      id: 'notif_welcome_1',
      userId: 'usr_fariasnetto',
      userEmail: 'fariasnetto01@gmail.com',
      title: '🛡️ Sistema de Alertas Ativado',
      body: 'Você receberá notificações instantâneas sobre os prazos e julgamentos dos seus recursos.',
      url: '/cases',
      status: 'defesa_pronta',
      read: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      type: 'system',
    });
  }

  /**
   * Registers or updates a client push subscription
   */
  public registerSubscription(sub: PushSubscriptionDTO): { success: boolean; count: number } {
    if (!sub.endpoint) {
      throw new Error('Endpoint da subscription é obrigatório');
    }
    this.subscriptions.set(sub.endpoint, {
      ...sub,
      createdAt: new Date().toISOString(),
    });
    return { success: true, count: this.subscriptions.size };
  }

  /**
   * Unregisters a push subscription
   */
  public removeSubscription(endpoint: string): { success: boolean } {
    this.subscriptions.delete(endpoint);
    return { success: true };
  }

  /**
   * Retrieves all subscriptions (optionally filtered by user)
   */
  public getSubscriptions(userEmail?: string): PushSubscriptionDTO[] {
    const list = Array.from(this.subscriptions.values());
    if (userEmail) {
      return list.filter((s) => s.userEmail === userEmail || !s.userEmail);
    }
    return list;
  }

  /**
   * Gets in-app notification history
   */
  public getHistory(userEmail?: string): AppNotification[] {
    if (!userEmail) {
      return this.notificationHistory.slice(0, 50);
    }
    return this.notificationHistory
      .filter((n) => !n.userEmail || n.userEmail === userEmail)
      .slice(0, 50);
  }

  /**
   * Marks notifications as read
   */
  public markAllAsRead(userEmail?: string): void {
    this.notificationHistory.forEach((n) => {
      if (!userEmail || n.userEmail === userEmail) {
        n.read = true;
      }
    });
  }

  /**
   * Formats friendly Brazilian traffic law notification message based on status
   */
  public formatStatusMessage(status: string, autoInfracao?: string): { title: string; body: string } {
    const autoStr = autoInfracao ? ` (Auto nº ${autoInfracao})` : '';

    switch (status) {
      case 'em_analise_ia':
        return {
          title: '🔍 Perícia em Andamento',
          body: `A IA pericial está analisando as nulidades formais e prazos do seu auto de infração${autoStr}.`,
        };
      case 'triagem_concluida':
        return {
          title: '⚖️ Triagem Pericial Concluída',
          body: `Identificamos teses fundamentadas no CTB para anular sua multa${autoStr}. Revise a estratégia!`,
        };
      case 'defesa_pronta':
        return {
          title: '✅ Petição Pronta para Protocolo',
          body: `A minuta jurídica formatada em A4 com jurisprudência está pronta para download e assinatura${autoStr}.`,
        };
      case 'protocolado_orgao':
        return {
          title: '📬 Recurso Protocolado',
          body: `Sua defesa foi protocolada perante o órgão autuador${autoStr}. O efeito suspensivo está ativo.`,
        };
      case 'julgamento_procedente':
      case 'deferido':
        return {
          title: '🎉 Recurso Deferido!',
          body: `Vitória! O auto de infração${autoStr} foi anulado e os pontos na CNH foram desconsiderados.`,
        };
      case 'julgamento_improcedente':
      case 'indeferido':
        return {
          title: '⚠️ Decisão de 1ª Instância',
          body: `Resultado publicado${autoStr}. Prazo aberto para interpor Recurso em 2ª Instância à JARI.`,
        };
      case 'prazo_alerta':
        return {
          title: '⏰ Alerta de Prazo Iminente',
          body: `Restam menos de 5 dias para o vencimento da defesa do auto${autoStr}. Protocolize agora!`,
        };
      default:
        return {
          title: '📄 Atualização no Recurso',
          body: `O status do seu caso${autoStr} foi alterado para "${status}".`,
        };
    }
  }

  /**
   * Broadcasts case status notification to user and stores in notification history
   */
  public broadcastCaseStatusChange(params: {
    caseId: string;
    newStatus: string;
    oldStatus?: string;
    autoInfracao?: string;
    userId?: string;
    userEmail?: string;
  }): AppNotification {
    const { title, body } = this.formatStatusMessage(params.newStatus, params.autoInfracao);
    const targetUrl = `/cases/${params.caseId}`;

    const notification: AppNotification = {
      id: 'notif_' + Math.random().toString(36).substring(2, 9),
      caseId: params.caseId,
      userId: params.userId,
      userEmail: params.userEmail,
      title,
      body,
      url: targetUrl,
      status: params.newStatus,
      read: false,
      createdAt: new Date().toISOString(),
      type: 'case_status',
    };

    // Store in history
    this.notificationHistory.unshift(notification);
    if (this.notificationHistory.length > 200) {
      this.notificationHistory.pop();
    }

    console.log(`[Push Notification] Dispatched for Case ${params.caseId} (${params.newStatus}): "${title}"`);
    return notification;
  }
}

export const notificationService = new NotificationService();
