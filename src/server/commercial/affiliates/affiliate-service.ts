/**
 * @file affiliate-service.ts
 * Affiliate / referral domain service — registration and tree helpers.
 */

import {
  ReferralRuleConfig,
  ReferralUserTree,
} from '../../../types/commercial';
import { CommercialRepository } from '../../db/commercial-repository';

export class AffiliateService {
  constructor(
    private referralParents: Map<string, string>,
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

  getReferralConfig(): ReferralRuleConfig {
    const config = this.repository.getReferralConfig();
    return config ?? {
      level1Percent: 10,
      level2Percent: 5,
      level3Percent: 2,
      calculationBase: 'effectively_paid',
      payoutDelayDays: 0,
      minWithdrawalAmount: 50,
      signupBonusAmount: 20,
      referrerBonusAmount: 20,
      isReferralProgramActive: true,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    };
  }

  updateReferralConfig(
    updates: Partial<ReferralRuleConfig>,
    author = 'Admin Comercial',
  ): ReferralRuleConfig {
    const previous = this.getReferralConfig();
    const updated = {
      ...previous,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: author,
    };

    this.repository.persistReferralConfig(updated);

    this.recordAudit({
      action: 'REFERRAL_CONFIG_CHANGE',
      changedBy: author,
      target: 'referral_config',
      previousState: previous,
      newState: updated,
      reason: 'Atualização das taxas e regras do programa de indicação em 3 níveis',
    });

    return updated;
  }

  registerReferral(newUserId: string, referrerCodeOrId: string): void {
    if (newUserId === referrerCodeOrId) return;

    let referrerId = referrerCodeOrId;
    if (referrerCodeOrId.startsWith('REF_')) {
      referrerId = referrerCodeOrId.replace('REF_', 'usr_').toLowerCase();
    }

    this.referralParents.set(newUserId, referrerId);
    this.repository.persistReferralRelation(newUserId, referrerId);
  }

  getReferralTree(
    userId: string,
    commissionLedger: { beneficiaryId: string; buyerUserId: string; status: string; baseAmount: number; commissionAmount: number }[],
  ): ReferralUserTree {
    const l1Ids: string[] = [];
    for (const [child, parent] of this.referralParents.entries()) {
      if (parent === userId) l1Ids.push(child);
    }

    const l2Ids: string[] = [];
    for (const l1 of l1Ids) {
      for (const [child, parent] of this.referralParents.entries()) {
        if (parent === l1) l2Ids.push(child);
      }
    }

    const l3Ids: string[] = [];
    for (const l2 of l2Ids) {
      for (const [child, parent] of this.referralParents.entries()) {
        if (parent === l2) l3Ids.push(child);
      }
    }

    const mapUserNode = (id: string, level: 1 | 2 | 3) => {
      const comms = commissionLedger.filter(
        (c) => c.beneficiaryId === userId && c.buyerUserId === id,
      );
      const rev = comms.reduce((acc, c) => acc + c.baseAmount, 0);
      const earned = comms
        .filter((c) => c.status !== 'REVERSED' && c.status !== 'CANCELLED')
        .reduce((acc, c) => acc + c.commissionAmount, 0);

      return {
        id,
        name: id === 'usr_beatriz'
          ? 'Beatriz Santos'
          : id === 'usr_andre'
            ? 'André Oliveira'
            : id === 'usr_daniela'
              ? 'Daniela Ferreira'
              : `Condutor ${id}`,
        email: `${id}@www.defesai.shop`,
        joinedAt: new Date(
          Date.now() - (level === 1 ? 20 : level === 2 ? 12 : 4) * 86400000,
        ).toISOString(),
        purchasesCount: comms.length,
        revenueGenerated: Number(rev.toFixed(2)),
        commissionGeneratedForReferrer: Number(earned.toFixed(2)),
      };
    };

    const level1 = l1Ids.map((id) => mapUserNode(id, 1));
    const level2 = l2Ids.map((id) => mapUserNode(id, 2));
    const level3 = l3Ids.map((id) => mapUserNode(id, 3));

    const totalReferrals = level1.length + level2.length + level3.length;
    const allUserComms = commissionLedger.filter(
      (c) => c.beneficiaryId === userId,
    );
    const totalComms = allUserComms
      .filter((c) => c.status !== 'REVERSED')
      .reduce((acc, c) => acc + c.commissionAmount, 0);
    const availComms = allUserComms
      .filter((c) => c.status === 'AVAILABLE')
      .reduce((acc, c) => acc + c.commissionAmount, 0);

    return {
      referrerId: userId,
      referrerName:
        userId === 'usr_carlos'
          ? 'Carlos Eduardo Silveira'
          : `Indicador (${userId})`,
      referrerEmail: `${userId}@www.defesai.shop`,
      referralCode: `REF_${userId.toUpperCase()}`,
      referralLink: `https://app.www.defesai.shop/r/${userId.toUpperCase()}`,
      level1,
      level2,
      level3,
      totalReferralsCount: totalReferrals,
      totalSalesCount: allUserComms.length,
      totalRevenueGenerated: allUserComms.reduce((acc, c) => acc + c.baseAmount, 0),
      totalCommissionsEarned: Number(totalComms.toFixed(2)),
      availableCommissionBalance: Number(availComms.toFixed(2)),
      bonusBalance: 0,
    };
  }
}