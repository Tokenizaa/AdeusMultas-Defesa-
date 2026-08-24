/**
 * @file admin-query-service.ts
 * AdminQueryService — camada de leitura centralizada do painel administrativo.
 *
 * Responsável por todas as queries agregadas do Admin. Fonte primária:
 * casoRepository.rows (em memória, carregado no boot via loadAllFromSupabase).
 *
 * Quando o Supabase estiver disponível, o boot já terá carregado todos os casos
 * para o repositório em memória. Este serviço não acessa o banco diretamente
 * — apenas lê do repositório já hidratado.
 */

import { caseRepository } from '../db/case-repository';
import { commercialRepository } from '../db/commercial-repository';
import { CanonicalMapper } from '../../core/mappers/canonical-mapper';
import { CaseDomain, DefenseDraft } from '../../types';
import { PRICING } from '../../config/pricing';
import { metricsService } from '../observability/metrics-service';
import { healthService } from '../observability/health-service';
import { aiProviderManager } from '../observability/ai-provider-manager';

export type DashboardMetrics = {
  totalCases: number;
  analyzedCases: number;
  defenseReadyCases: number;
  paidCases: number;
  totalRevenue: number;
  conversionRate: number;
  analysisToDocRate: number;
  aiErrorRatePercent: number;
  totalAiCalls: number;
  pendingJobs: number;
  systemUptimePercent: number;
  thesesCount: number;
  totalUsers: number;
};

export type PaymentOrder = {
  id: string;
  caseId: string;
  caseTitle: string;
  customerName: string;
  customerEmail: string;
  customerCpf: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'WAITING' | 'DECLINED' | 'CANCELED';
  method: string;
  createdAt: string;
  paidAt: string | null;
  externalId: string;
  infractionCode: string;
  organ: string;
};

export type PaginatedPayments = {
  payments: PaymentOrder[];
  totalCount: number;
  totalVolume: number;
  paidCount: number;
  pendingCount: number;
  pagination: { limit: number; offset: number; hasMore: boolean };
};

export type AdminDocument = {
  id: string;
  caseId: string;
  title: string;
  clientName: string;
  clientCpf: string;
  aitNumber: string;
  infractionCode: string;
  infractionDescription: string;
  organ: string;
  procedureType: string;
  procedureLabel: string;
  status: 'LIBERADO_PAGO' | 'GERADO_PREVIEW' | 'PENDENTE_DADOS';
  thesesCount: number;
  engine: string;
  generatedAt: string;
  draftText: string;
  vehiclePlate: string;
};

export class AdminQueryService {
  // ==========================================
  // Métricas principais do Dashboard
  // ==========================================

  getDashboardMetrics(): DashboardMetrics {
    const domains: CaseDomain[] = [];
    for (const row of caseRepository.values()) {
      domains.push(CanonicalMapper.rowToDomain(row));
    }

    const totalCases = domains.length;
    const analyzedCases = domains.filter(
      (c) => Boolean(c.analysis) || (c.status as string) !== 'novo'
    ).length;
    const defenseReadyCases = domains.filter(
      (c) =>
        (c.status as string) === 'defense_ready' ||
        (c.status as string) === 'defesa_pronta' ||
        Boolean(c.defenseDraft)
    ).length;
    const paidCasesList = domains.filter(
      (c) =>
        Boolean(c.isPaid) ||
        (c.payment?.status as string) === 'paid' ||
        (c.payment?.status as string) === 'approved'
    );
    const paidCases = paidCasesList.length;

    const totalRevenue = paidCasesList.reduce((sum, c) => {
      const amount = c.payment?.amount;
      return typeof amount === 'number' && !isNaN(amount) && amount > 0 ? sum + amount : sum;
    }, 0);

    const conversionRate = totalCases > 0 ? Number(((paidCases / totalCases) * 100).toFixed(1)) : 0.0;
    const analysisToDocRate =
      analyzedCases > 0 ? Number(((defenseReadyCases / analyzedCases) * 100).toFixed(1)) : 0.0;

    const metricsOverview = metricsService.getOverview();

    // Usuários: emails únicos dos casos (fonte disponível atual).
    // Quando houver user_profiles sincronizado, substituir por COUNT(user_profiles).
    const uniqueEmails = new Set(
      domains.filter((c) => c.clientEmail || c.userEmail).map((c) => c.clientEmail || c.userEmail)
    );
    const totalUsers = uniqueEmails.size;

    // Teses únicas vindas de analysis + defenseDraft
    const thesesSet = new Set<string>();
    domains.forEach((c) => {
      if (c.analysis?.recommendedArguments) {
        c.analysis.recommendedArguments.forEach((arg) => thesesSet.add(arg.id));
      }
      if (c.defenseDraft) {
        const dd = c.defenseDraft as DefenseDraft;
        if (dd.selectedArgumentIds) {
          dd.selectedArgumentIds.forEach((id: string | number) => thesesSet.add(String(id)));
        }
      }
    });
    const thesesCount = thesesSet.size;

    return {
      totalCases,
      analyzedCases,
      defenseReadyCases,
      paidCases,
      totalRevenue,
      conversionRate,
      analysisToDocRate,
      aiErrorRatePercent: metricsOverview.errorRatePercent,
      totalAiCalls: metricsOverview.totalAiRequests,
      pendingJobs: 0,
      systemUptimePercent: 0,
      thesesCount,
      totalUsers,
    };
  }

  // ==========================================
  // Casos recentes (para dashboard)
  // ==========================================

  getRecentCases(limit: number = 6): CaseDomain[] {
    const domains: CaseDomain[] = [];
    for (const row of caseRepository.values()) {
      domains.push(CanonicalMapper.rowToDomain(row));
    }
    domains.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return domains.slice(0, limit);
  }

  // ==========================================
  // Status de saúde dos serviços
  // ==========================================

  async getSystemHealth() {
    const healthReport = await healthService.getHealth(false);
    const metrics = metricsService.getOverview();

    return {
      services: healthReport.services,
      ai: {
        primaryProvider: 'nvidia',
        fallbackProvider: '9router',
        nvidiaHealthy:
          healthReport.services.find((s: any) => s.id === 'nvidia')?.status === 'HEALTHY' || false,
        nineRouterHealthy:
          healthReport.services.find((s: any) => s.id === '9router')?.status === 'HEALTHY' || false,
        fallbackRatePercent: metrics.fallbackRatePercent,
        p95LatencyMs: metrics.p95LatencyMs,
      },
      integrations: {
        supabase: healthReport.services.find((s: any) => s.id === 'supabase_db')?.status || 'UNKNOWN',
        pagbank: healthReport.services.find((s: any) => s.id === 'pagbank')?.status || 'UNKNOWN',
        meta: healthReport.services.find((s: any) => s.id === 'meta')?.status || 'UNKNOWN',
        ocr: healthReport.services.find((s: any) => s.id === 'ocr')?.status || 'UNKNOWN',
        whatsapp: healthReport.services.find((s: any) => s.id === 'whatsapp')?.status || 'UNKNOWN',
      },
    };
  }

  // ==========================================
  // Pagamentos com paginação
  // ==========================================

  getPayments(params: { limit?: number; offset?: number; status?: string }): PaginatedPayments {
    const limit = Math.min(Math.max(params.limit ?? 50, 10), 200);
    const offset = Math.max(params.offset ?? 0, 0);

    const domains: CaseDomain[] = [];
    for (const row of caseRepository.values()) {
      domains.push(CanonicalMapper.rowToDomain(row));
    }

    const allPayments = domains.map((c, index) => {
      const isPaid =
        Boolean(c.isPaid) ||
        (c.payment?.status as string) === 'paid' ||
        (c.payment?.status as string) === 'approved';
      return {
        id: c.payment?.transactionId || `ord_pagbank_${c.id}`,
        caseId: c.id,
        caseTitle: c.title || `Recurso Auto ${c.infraction?.aitNumber || c.id}`,
        customerName: c.clientName || 'Condutor DefesAi',
        customerEmail: c.clientEmail || 'contato@www.defesai.shop',
        customerCpf: c.clientCpf || '***.***.***-**',
        amount: c.payment?.amount || PRICING.DEFAULT_PRICE,
        status: (isPaid ? 'PAID' : c.payment?.status === 'pending' ? 'PENDING' : 'WAITING') as
          | 'PAID'
          | 'PENDING'
          | 'WAITING'
          | 'DECLINED'
          | 'CANCELED',
        method: c.payment?.paymentMethod || 'PIX',
        createdAt: c.createdAt || new Date(Date.now() - (index + 1) * 3600000).toISOString(),
        paidAt: isPaid ? (c.paidAt || c.updatedAt || new Date().toISOString()) : null,
        externalId: `PAGBANK_TX_${c.id.substring(0, 10).toUpperCase()}`,
        infractionCode: c.infraction?.infractionCode || '745-50',
        organ: c.infraction?.autuadorBody || 'DETRAN',
      };
    });

    const totalCount = allPayments.length;
    const totalVolume = allPayments.reduce((acc, p) => (p.status === 'PAID' ? acc + p.amount : acc), 0);
    const paidCount = allPayments.filter((p) => p.status === 'PAID').length;
    const pendingCount = allPayments.filter((p) => p.status === 'PENDING' || p.status === 'WAITING').length;

    let paginatedPayments = allPayments.slice(offset, offset + limit);
    if (params.status && params.status !== 'all') {
      paginatedPayments = paginatedPayments.filter((p) => p.status === params.status);
    }

    return {
      payments: paginatedPayments,
      totalCount,
      totalVolume,
      paidCount,
      pendingCount,
      pagination: { limit, offset, hasMore: offset + limit < totalCount },
    };
  }

  // ==========================================
  // Documentos gerados
  // ==========================================

  getDocuments(caseId?: string): { documents: AdminDocument[]; totalCount: number; readyCount: number; previewCount: number } {
    let domains: CaseDomain[] = [];
    for (const row of caseRepository.values()) {
      domains.push(CanonicalMapper.rowToDomain(row));
    }
    if (caseId) {
      domains = domains.filter((c) => c.id === caseId);
    }

    const documentsList = domains.map((c) => {
      const hasDraft = Boolean(c.defenseDraft);
      return {
        id: `doc_${c.id}`,
        caseId: c.id,
        title: c.title || `Petição Auto ${c.infraction?.aitNumber || c.id}`,
        clientName: c.clientName || 'Condutor DefesAi',
        clientCpf: c.clientCpf || '000.000.000-00',
        aitNumber: c.infraction?.aitNumber || '1B892014',
        infractionCode: c.infraction?.infractionCode || '745-50',
        infractionDescription: c.infraction?.description || 'Excesso de velocidade',
        organ: c.infraction?.autuadorBody || 'DETRAN-SP',
        procedureType: c.serviceType || 'defesa_previa',
        procedureLabel: c.serviceType === 'conversao_advertencia'
          ? 'Conversão em Advertência (Art. 267 CTB)'
          : c.serviceType === 'recurso_jari'
            ? 'Recurso JARI (1ª Instância)'
            : 'Defesa Prévia (Autuação)',
        status: (hasDraft ? (c.isPaid ? 'LIBERADO_PAGO' : 'GERADO_PREVIEW') : 'PENDENTE_DADOS') as
          | 'LIBERADO_PAGO'
          | 'GERADO_PREVIEW'
          | 'PENDENTE_DADOS',
        thesesCount: c.analysis?.recommendedArguments?.length || (c.defenseDraft?.selectedArgumentIds?.length || 2),
        engine: 'Determinístico CTB + IA Reasoning',
        generatedAt: c.updatedAt || c.createdAt,
        draftText: c.defenseDraft?.fullDraftText || c.defenseDraft?.factsNarrative || '',
        vehiclePlate: c.vehicle?.plate || 'SEM PLACA',
      };
    });

    return {
      documents: documentsList,
      totalCount: documentsList.length,
      readyCount: documentsList.filter((d) => d.status === 'LIBERADO_PAGO').length,
      previewCount: documentsList.filter((d) => d.status === 'GERADO_PREVIEW').length,
    };
  }

  // ==========================================
  // Usuários (placeholder — requer user_profaces sincronizado)
  // ==========================================

  async getUsers(_params?: { search?: string; role?: string }): Promise<any[]> {
    // TODO: Substituir por query a user_profiles quando houver sincronização com auth.users
    // Por enquanto, retornar emails únicos dos casos como proxy de usuários.
    const domains: CaseDomain[] = [];
    for (const row of caseRepository.values()) {
      domains.push(CanonicalMapper.rowToDomain(row));
    }

    const usersMap = new Map<string, any>();
    domains.forEach((c) => {
      const email = c.clientEmail || c.userEmail;
      if (!email) return;
      if (usersMap.has(email)) return;
      usersMap.set(email, {
        id: c.userId || email,
        name: c.clientName || c.userEmail?.split('@')[0] || 'Usuário',
        email,
        role: c.userId === 'usr_admin_defesai' ? 'admin' : 'citizen',
        createdAt: c.createdAt,
      });
    });

    return Array.from(usersMap.values());
  }
}

export const adminQueryService = new AdminQueryService();