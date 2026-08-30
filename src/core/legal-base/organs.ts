/**
 * @file organs.ts
 * DefesaAI — Traffic Authorities and Judgment Bodies Database
 * Integrado com o Registro Canônico Nacional de Órgãos (27 UFs + Federal).
 */

import { OrganModel } from '../domain/knowledge-schema';
import { SubmissionInstructions } from '../../types';
import { CanonicalKnowledgeRegistry } from '../knowledge/registry';

export const ORGANS_DB: OrganModel[] = CanonicalKnowledgeRegistry.getAllOrgans();

/**
 * Resolves protocol information for a given autuador abbreviation or code.
 * Returns structured submission instructions including competent body, portal URL,
 * physical address, and calculated deadline.
 */
export function resolveProtocolInfo(autuadorAbbreviation: string, referenceDate?: string): SubmissionInstructions | null {
  if (!autuadorAbbreviation) return null;
  return CanonicalKnowledgeRegistry.resolveProtocolInfo(autuadorAbbreviation, referenceDate);
}

