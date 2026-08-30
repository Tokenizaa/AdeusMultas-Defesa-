/**
 * @file notification-alert-service.ts
 * Serviço de Disparo de Alertas Críticos para o Monitoramento Nacional (P0/P1).
 */

import { ReviewQueueItem, RiskLevel } from '../types';

export interface AlertMessage {
  id: string;
  timestamp: string;
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  body: string;
  sourceUrl: string;
  requiresImmediateAction: boolean;
}

export class NotificationAlertService {
  private static alertsHistory: AlertMessage[] = [];

  /**
   * Dispara alertas para itens críticos enviados para a fila de revisão.
   */
  public static dispatchAlertsForReviewItems(items: ReviewQueueItem[]): AlertMessage[] {
    const newAlerts: AlertMessage[] = [];

    for (const item of items) {
      if (item.riskLevel === 'P0_LEGAL_CRITICAL' || item.riskLevel === 'P1_OPERATIONAL_HIGH') {
        const isP0 = item.riskLevel === 'P0_LEGAL_CRITICAL';
        const alert: AlertMessage = {
          id: `ALT_${item.id}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: isP0 ? 'CRITICAL' : 'WARNING',
          title: isP0
            ? `🚨 [P0 JURÍDICO] Alteração Normativa Crítica em ${item.organName || item.uf}`
            : `⚠️ [P1 OPERACIONAL] Mudança Operacional Relevante em ${item.organName || item.uf}`,
          body: `Tipo: ${item.changeType} | UF: ${item.uf} | Resumo: ${item.summary}`,
          sourceUrl: item.sourceUrl,
          requiresImmediateAction: isP0,
        };

        newAlerts.push(alert);
        this.alertsHistory.unshift(alert);
        console.warn(`[SNM-JO ALERT] ${alert.title} - ${alert.body}`);
      }
    }

    return newAlerts;
  }

  /**
   * Obtém o histórico de alertas emitidos.
   */
  public static getAlertsHistory(): AlertMessage[] {
    return this.alertsHistory;
  }

  /**
   * Limpa o histórico de alertas.
   */
  public static clear(): void {
    this.alertsHistory = [];
  }
}
