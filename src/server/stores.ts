/**
 * @file stores.ts
 * In-memory stores for development and testing.
 * Separated from app.ts to break circular dependency with routes.
 */

import { caseRepository } from './db/case-repository';
import type { AuditLogEntry } from '../types';

/**
 * In-memory case store (Map-based)
 * In production, this is backed by Supabase via caseRepository
 */
export const databaseRows = caseRepository;

/**
 * In-memory audit log store
 */
export const auditLogs: AuditLogEntry[] = [];