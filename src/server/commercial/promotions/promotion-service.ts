/**
 * @file promotion-service.ts
 * Promotional campaigns domain service.
 */

import {
  PromotionCampaign,
} from '../../../types/commercial';
import { CommercialRepository } from '../../db/commercial-repository';

export type CreatePromotionInput = Omit<
  PromotionCampaign,
  'id' | 'usageCount' | 'createdAt'
>;

export class PromotionService {
  constructor(
    private promotions: Map<string, PromotionCampaign>,
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

  getPromotions(): PromotionCampaign[] {
    return Array.from(this.promotions.values());
  }

  getPromotionById(id: string): PromotionCampaign | undefined {
    return this.promotions.get(id);
  }

  getActivePromotions(): PromotionCampaign[] {
    const now = new Date();
    return Array.from(this.promotions.values()).filter((p) => {
      if (p.status !== 'active') return false;
      if (new Date(p.startDate) > now) return false;
      if (new Date(p.endDate) < now) return false;
      return true;
    });
  }

  createPromotion(
    data: CreatePromotionInput,
    author = 'Admin Comercial',
  ): PromotionCampaign {
    const id = `promo_${Date.now()}`;
    const newPromo: PromotionCampaign = {
      ...data,
      id,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };

    this.promotions.set(id, newPromo);
    this.repository.persistPromotion(newPromo);

    this.recordAudit({
      action: 'PROMO_CHANGE',
      changedBy: author,
      target: id,
      previousState: null,
      newState: newPromo,
      reason: `Criação da promoção: ${newPromo.name}`,
    });

    return newPromo;
  }

  updatePromotion(
    id: string,
    updates: Partial<PromotionCampaign>,
    author = 'Admin Comercial',
  ): PromotionCampaign {
    const promo = this.promotions.get(id);
    if (!promo) {
      throw new Error(`Promoção não encontrada: ${id}`);
    }

    const previousState = { ...promo };
    const updated = {
      ...promo,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.promotions.set(id, updated);
    this.repository.persistPromotion(updated);

    this.recordAudit({
      action: 'PROMO_CHANGE',
      changedBy: author,
      target: id,
      previousState,
      newState: updated,
      reason: `Atualização da promoção: ${updated.name}`,
    });

    return updated;
  }
}