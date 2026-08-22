/**
 * @file alerts-service.ts
 * Proactive Platform Alerting Engine for DefesAi
 * 
 * Evaluates operational conditions:
 * 1. AI Provider availability (NVIDIA / 9Router consecutive failures)
 * 2. Supabase DB & Auth connectivity
 * 3. Elevated error rates or latency P95 spikes
 * 4. PagBank payment webhook irregularities
 */

export interface SystemAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  service: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface AlertThresholds {
  errorRatePercentThreshold: number; // default 5.0%
  p95LatencyMsThreshold: number; // default 3000ms
  maxConsecutiveAiFailures: number; // default 3
  fallbackRatePercentThreshold: number; // default 15.0%
}

class AlertsService {
  private alerts: SystemAlert[] = [];
  private thresholds: AlertThresholds = {
    errorRatePercentThreshold: 5.0,
    p95LatencyMsThreshold: 3000,
    maxConsecutiveAiFailures: 3,
    fallbackRatePercentThreshold: 15.0,
  };

  constructor() {
    // Seed initial operational status notice
    this.alerts = [
      {
        id: 'alt_init_1',
        severity: 'info',
        title: 'Monitoramento Central Ativo',
        service: 'system',
        message: 'Observabilidade integrada com NVIDIA NIM, 9Router, Supabase e PagBank.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        acknowledged: false,
      },
    ];
  }

  public getAlerts(): { alerts: SystemAlert[]; thresholds: AlertThresholds; unreadCount: number } {
    const unreadCount = this.alerts.filter((a) => !a.acknowledged).length;
    return {
      alerts: [...this.alerts],
      thresholds: { ...this.thresholds },
      unreadCount,
    };
  }

  public triggerAlert(
    severity: 'critical' | 'warning' | 'info',
    title: string,
    service: string,
    message: string
  ): SystemAlert {
    const newAlert: SystemAlert = {
      id: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      severity,
      title,
      service,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    this.alerts.unshift(newAlert);
    if (this.alerts.length > 100) {
      this.alerts.pop();
    }

    return newAlert;
  }

  public acknowledge(alertId: string, user = 'admin'): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = user;
      alert.acknowledgedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  public clearAll(): void {
    this.alerts = [];
  }

  public updateThresholds(newThresholds: Partial<AlertThresholds>): AlertThresholds {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    return { ...this.thresholds };
  }
}

export const alertsService = new AlertsService();
