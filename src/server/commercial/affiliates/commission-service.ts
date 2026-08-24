/**
 * @file commission-service.ts
 * Commission calculation and lifecycle domain service.
 */

import {
  CommissionLedgerEntry,
  CommissionStatus,
  ReferralRuleConfig,
} from '../../../types/commercial';
import { CommercialRepository } from '../../db/commercial-repository';

export type ProcessPaymentParams = {
  paymentId: string;
  caseId: string;
  buyerUserId: string;
  buyerUserName: string;
  grossAmount: number;
  discountAmount: number;
  effectivelyPaid: number;
};

export class CommissionService {
  constructor(
    private commissionLedger: CommissionLedgerEntry[],
    private referralParents: Map<string, string>,
    private referralConfig: ReferralRuleConfig,
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

  getCommissionsLedger(beneficiaryId?: string): CommissionLedgerEntry[] {
    if (beneficiaryId) {
      return this.commissionLedger.filter((c) => c.beneficiaryId === beneficiaryId);
    }
    return this.commissionLedger;
  }

  getCommissionsByPayment(paymentId: string): CommissionLedgerEntry[] {
    return this.commissionLedger.filter((c) => c.paymentId === paymentId);
  }

  markCommissionPaid(
    commissionId: string,
    author = 'Admin Financeiro',
  ): CommissionLedgerEntry {
    const comm = this.commissionLedger.find((c) => c.id === commissionId);
    if (!comm) {
      throw new Error(`Comissão não encontrada: ${commissionId}`);
    }

    if (comm.status === 'REVERSED' || comm.status === 'CANCELLED') {
      throw new Error(`Não é possível pagar comissão com status ${comm.status}`);
    }

    const prev = { ...comm };
    comm.status = 'PAID';
    comm.paidAt = new Date().toISOString();

    this.repository.updateCommissionsStatus(comm.paymentId, 'PAID', {
      paidAt: comm.paidAt,
      level: comm.level,
    });

    this.recordAudit({
      action: 'COMMISSION_PAYOUT',
      changedBy: author,
      target: comm.id,
      previousState: prev,
      newState: comm,
      reason: 'Pagamento de comissão liquidado',
    });

    return comm;
  }

  reverseCommissionsForPayment(
    paymentId: string,
    reason = 'Cancelamento de pagamento / Estorno PagBank',
    author = 'Admin Financeiro',
  ): void {
    const comms = this.commissionLedger.filter(
      (c) => c.paymentId === paymentId && c.status !== 'REVERSED',
    );

    for (const comm of comms) {
      const prev = { ...comm };
      comm.status = 'REVERSED';
      comm.reversedAt = new Date().toISOString();
      comm.reversalReason = reason;

      this.recordAudit({
        action: 'COMMISSION_REVERSAL',
        changedBy: author,
        target: comm.id,
        previousState: prev,
        newState: comm,
        reason,
      });
    }

    if (comms.length > 0) {
      const reversedAt = comms[0].reversedAt;
      this.repository.updateCommissionsStatus(paymentId, 'REVERSED', {
        reversedAt,
        reversalReason: reason,
      });
    }
  }

  processPaymentConfirmationEvent(params: ProcessPaymentParams): CommissionLedgerEntry[] {
    const { paymentId, buyerUserId, grossAmount, discountAmount, effectivelyPaid } = params;

    const existing = this.commissionLedger.filter((c) => c.paymentId === paymentId);
    if (existing.length > 0) {
      return existing;
    }

    if (!this.referralConfig.isReferralProgramActive) {
      return [];
    }

    let baseAmount = effectivelyPaid;
    if (this.referralConfig.calculationBase === 'gross_amount') {
      baseAmount = grossAmount;
    } else if (this.referralConfig.calculationBase === 'after_discount') {
      baseAmount = grossAmount - discountAmount;
    } else if (this.referralConfig.calculationBase === 'net_amount') {
      baseAmount = effectivelyPaid * 0.95;
    }

    const created: CommissionLedgerEntry[] = [];

    const createEntry = (
      level: 1 | 2 | 3,
      beneficiaryId: string,
      percent: number,
    ): CommissionLedgerEntry | null => {
      if (!beneficiaryId || percent <= 0) return null;

      const commissionAmount = Number(((baseAmount * percent) / 100).toFixed(2));
      const status: CommissionStatus =
        this.referralConfig.payoutDelayDays === 0 ? 'AVAILABLE' : 'PENDING';

      const entry: CommissionLedgerEntry = {
        id: `comm_${Date.now()}_l${level}_${beneficiaryId}`,
        beneficiaryId,
        beneficiaryName: `Indicador N${level} (${beneficiaryId})`,
        buyerUserId,
        buyerUserName: '',
        level,
        appliedPercent: percent,
        baseAmount,
        commissionAmount,
        paymentId,
        caseId: params.caseId,
        status,
        createdAt: new Date().toISOString(),
        availableAt: new Date(
          Date.now() + this.referralConfig.payoutDelayDays * 86400000,
        ).toISOString(),
      };

      this.commissionLedger.unshift(entry);
      this.repository.persistCommission(entry);
      created.push(entry);
      return entry;
    };

    const l1 = this.referralParents.get(buyerUserId);
    const l1Entry = createEntry(1, l1 ?? '', this.referralConfig.level1Percent);
    if (l1Entry) {
      const l2 = this.referralParents.get(l1);
      const l2Entry = createEntry(2, l2 ?? '', this.referralConfig.level2Percent);
      if (l2Entry) {
        const l3 = this.referralParents.get(l2);
        createEntry(3, l3 ?? '', this.referralConfig.level3Percent);
      }
    }

    return created;
  }
}