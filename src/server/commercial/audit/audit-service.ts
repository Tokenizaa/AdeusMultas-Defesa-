/**
 * @file audit-service.ts
 * Commercial audit trail domain service.
 */

import { CommercialAuditLogEntry } from '../../../types/commercial';
import { CommercialRepository } from '../../db/commercial-repository';
import { logger } from '../../observability/logger';

export type AuditEntry = {
  action: string;
  changedBy: string;
  target: string;
  previousState?: unknown;
  newState?: unknown;
  reason?: string;
};

export class CommercialAuditService {
  constructor(private repository: CommercialRepository) {}

  record(entry: AuditEntry): CommercialAuditLogEntry {
    const log = {
      ...entry,
      id: `caudit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    } as CommercialAuditLogEntry;

    this.repository.persistAuditLog(log);

    logger.info('commercial', 'audit', entry.action, `Ação comercial auditada: ${entry.action} no alvo ${entry.target}`, {
      action: entry.action,
      changedBy: entry.changedBy,
      target: entry.target,
    });

    return log;
  }

  getAuditLogs(): CommercialAuditLogEntry[] {
    return this.repository.getCommercialAuditLogs();
  }
}