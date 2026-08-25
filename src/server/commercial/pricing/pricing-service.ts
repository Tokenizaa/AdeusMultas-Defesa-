/**
 * @file pricing-service.ts
 * Pricing domain service — CRUD de tabelas de preço e histórico.
 */

import {
  ServicePricing,
  PriceHistoryEntry,
} from '../../../types/commercial';
import { CommercialRepository } from '../../db/commercial-repository';

export type CreatePricingInput = {
  serviceType: string;
  standardPrice: number;
  promotionalPrice?: number | null;
  serviceName?: string;
  description?: string;
  isActive?: boolean;
  validFrom?: string;
  validUntil?: string;
};

export type UpdatePricingInput = {
  standardPrice: number;
  promotionalPrice: number | null;
  isActive?: boolean;
  validFrom?: string;
  validUntil?: string;
  reason: string;
  changedBy: string;
};

export class PricingService {
  constructor(
    private pricings: Map<string, ServicePricing>,
    private repository: CommercialRepository,
    private recordAudit: (entry: {
      action: string;
      changedBy: string;
      target: string;
      previousState: unknown;
      newState: unknown;
      reason?: string;
    }) => void,
  ) {}

  getPricings(): ServicePricing[] {
    return Array.from(this.pricings.values());
  }

  getPricingById(id: string): ServicePricing | undefined {
    return this.pricings.get(id);
  }

  getPricingForService(serviceType: string): ServicePricing | undefined {
    return Array.from(this.pricings.values()).find(
      (p) => p.serviceType === serviceType || p.id === `price_${serviceType}`,
    );
  }

  createPricing(data: CreatePricingInput): ServicePricing {
    const baseId = `price_${data.serviceType}`;
    let id = baseId;
    let counter = 1;

    while (this.pricings.has(id)) {
      id = `${baseId}_${counter}`;
      counter++;
    }

    const now = new Date().toISOString();
    const newPricing: ServicePricing = {
      id,
      serviceType: data.serviceType as ServicePricing['serviceType'],
      serviceName: data.serviceName ?? data.serviceType,
      description: data.description,
      standardPrice: data.standardPrice,
      promotionalPrice: data.promotionalPrice ?? null,
      isActive: data.isActive ?? true,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      history: [],
      updatedAt: now,
      updatedBy: 'Admin Comercial',
    };

    const historyEntry: PriceHistoryEntry = {
      id: `ph_${Date.now()}`,
      previousStandardPrice: 0,
      newStandardPrice: data.standardPrice,
      previousPromoPrice: null,
      newPromoPrice: data.promotionalPrice ?? null,
      reason: 'Criação de nova tabela de preço',
      changedBy: 'Admin Comercial',
      changedAt: now,
    };

    newPricing.history = [historyEntry];
    this.pricings.set(id, newPricing);
    this.repository.persistPricing(newPricing);

    this.recordAudit({
      action: 'PRICE_CHANGE',
      changedBy: 'Admin Comercial',
      target: id,
      previousState: null,
      newState: newPricing,
      reason: `Criação de preço para ${data.serviceType}`,
    });

    return newPricing;
  }

  updatePricing(id: string, updates: UpdatePricingInput): ServicePricing {
    const existing = this.pricings.get(id);
    if (!existing) {
      throw new Error(`Tabela de preço não encontrada: ${id}`);
    }

    const previousState = {
      standardPrice: existing.standardPrice,
      promotionalPrice: existing.promotionalPrice,
      isActive: existing.isActive,
    };

    const historyEntry: PriceHistoryEntry = {
      id: `ph_${Date.now()}`,
      previousStandardPrice: existing.standardPrice,
      newStandardPrice: updates.standardPrice,
      previousPromoPrice: existing.promotionalPrice,
      newPromoPrice: updates.promotionalPrice,
      reason: updates.reason || 'Atualização de precificação comercial',
      changedBy: updates.changedBy || 'Admin Comercial',
      changedAt: new Date().toISOString(),
    };

    existing.standardPrice = updates.standardPrice;
    existing.promotionalPrice = updates.promotionalPrice;
    if (typeof updates.isActive === 'boolean') {
      existing.isActive = updates.isActive;
    }
    if (updates.validFrom) existing.validFrom = updates.validFrom;
    if (updates.validUntil) existing.validUntil = updates.validUntil;
    existing.updatedAt = new Date().toISOString();
    existing.updatedBy = updates.changedBy || 'Admin Comercial';
    existing.history.unshift(historyEntry);

    this.pricings.set(id, existing);
    this.repository.persistPricing(existing);

    this.recordAudit({
      action: 'PRICE_CHANGE',
      changedBy: updates.changedBy,
      target: id,
      previousState,
      newState: {
        standardPrice: existing.standardPrice,
        promotionalPrice: existing.promotionalPrice,
        isActive: existing.isActive,
      },
      reason: updates.reason,
    });

    return existing;
  }
}