/**
 * @file commercial-repository.ts
 * CommercialRepository — Dual-Engine Persistence Layer (DefesAi)
 *
 * Espelha as estruturas em memória do CommercialService (pricings, promotions,
 * coupons, bonus ledger, commission ledger, referral relations, referral config
 * e commercial audit logs) na camada Supabase com write-through best-effort.
 *
 * Padrão (idêntico ao case-repository.ts): a memória continua sendo a fonte de
 * leitura síncrona do serviço; cada escrita é persistida de forma assíncrona
 * (fire-and-forget) quando o Supabase está configurado. Nunca lança erros do
 * banco para o fluxo HTTP — try/catch com log em warn preserva o comportamento
 * existente mesmo com Supabase fora do ar.
 *
 * Regras de mapeamento:
 *  - `service_pricings`: upsert por `service_type` (UNIQUE natural do domínio).
 *  - `promotion_campaigns`: upsert por `promo_code` quando presente; insert
 *    simples quando a promoção não possui código (UNIQUE aceita múltiplos NULL).
 *  - `coupons`: upsert por `code` (chave natural do domínio).
 *  - `referral_config`: singleton `id = 1`.
 *  - `commercial_audit_log`: insert (append-only, sem conflito natural).
 *  - `bonus_ledger`, `commission_ledger`, `referral_relations`: insert/update
 *    SOMENTE quando os IDs de usuário são UUIDs válidos — as tabelas possuem
 *    FK para `auth.users(id)` e os dados demo (`usr_*`) vivem apenas em memória.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  ServicePricing,
  PromotionCampaign,
  Coupon,
  BonusLedgerEntry,
  CommissionLedgerEntry,
  ReferralRuleConfig,
  CommercialAuditLogEntry,
} from '../../types/commercial';
import { Database, Json } from '../../types/supabase';
import { logger } from '../observability/logger';
import { getSupabaseServerClient } from './supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CommercialRepository {
  private client: SupabaseClient<Database> | null = getSupabaseServerClient();

  // ==========================================
  // Helpers
  // ==========================================

  private isUuid(value: string): boolean {
    return UUID_RE.test(value);
  }

  private toJson(value: unknown): Json {
    return JSON.parse(JSON.stringify(value ?? null)) as Json;
  }

  private warn(domain: string, operation: string, message: string, extra?: Record<string, unknown>) {
    logger.warn('supabase', 'commercial_repository', operation, `[${domain}] ${message}`, extra);
  }

  /**
   * Executa uma query Supabase em fire-and-forget, convertendo o PromiseLike
   * retornado pelos builders em Promise real e engolindo qualquer erro.
   */
  private fire(
    domain: string,
    query: PromiseLike<{ error: { message: string } | null }>,
    meta?: Record<string, unknown>
  ): void {
    if (!this.client) return;
    Promise.resolve(query)
      .then(({ error }) => {
        if (error) this.warn(domain, 'persist', error.message, meta);
      })
      .catch((err: any) => this.warn(domain, 'persist', err?.message || err, meta));
  }

  // ==========================================
  // 1. Service Pricings → service_pricings
  // ==========================================

  /** Upsert por `service_type` (chave natural). Fire-and-forget. */
  persistPricing(pricing: ServicePricing): void {
    if (!this.client) return;
    const payload: Database['public']['Tables']['service_pricings']['Insert'] = {
      service_type: pricing.serviceType,
      service_name: pricing.serviceName,
      description: pricing.description,
      standard_price: pricing.standardPrice,
      promotional_price: pricing.promotionalPrice ?? null,
      is_active: pricing.isActive,
      valid_from: pricing.validFrom ?? null,
      valid_until: pricing.validUntil ?? null,
      history: this.toJson(pricing.history),
      updated_at: pricing.updatedAt,
      updated_by: pricing.updatedBy,
    };
    this.fire(
      'pricings',
      this.client.from('service_pricings').upsert(payload, { onConflict: 'service_type' }),
      { serviceType: pricing.serviceType }
    );
  }

  // ==========================================
  // 2. Promotion Campaigns → promotion_campaigns
  // ==========================================

  /** Upsert por `promo_code` quando presente; insert simples caso contrário. */
  persistPromotion(promo: PromotionCampaign): void {
    if (!this.client) return;
    const payload: Database['public']['Tables']['promotion_campaigns']['Insert'] = {
      name: promo.name,
      description: promo.description,
      discount_type: promo.discountType,
      discount_value: promo.discountValue,
      applicable_services: promo.applicableServices,
      start_date: promo.startDate,
      end_date: promo.endDate,
      usage_limit: promo.usageLimit,
      usage_count: promo.usageCount,
      user_usage_limit: promo.userUsageLimit,
      promo_code: promo.promoCode ?? null,
      status: promo.status,
      created_at: promo.createdAt,
      updated_at: promo.updatedAt,
    };
    const options = promo.promoCode ? { onConflict: 'promo_code' as const } : undefined;
    this.fire('promotions', this.client.from('promotion_campaigns').upsert(payload, options), {
      promoId: promo.id,
    });
  }

  // ==========================================
  // 3. Coupons → coupons
  // ==========================================

  /** Upsert por `code` (chave natural do domínio). */
  persistCoupon(coupon: Coupon): void {
    if (!this.client) return;
    const payload: Database['public']['Tables']['coupons']['Insert'] = {
      code: coupon.code,
      discount_type: coupon.discountType,
      discount_value: coupon.discountValue,
      min_order_value: coupon.minOrderValue ?? null,
      max_discount_amount: coupon.maxDiscountAmount ?? null,
      applicable_services: coupon.applicableServices,
      total_limit: coupon.totalLimit,
      used_count: coupon.usedCount,
      user_limit: coupon.userLimit,
      valid_from: coupon.validFrom,
      valid_until: coupon.validUntil,
      is_active: coupon.isActive,
      created_at: coupon.createdAt,
      usage_history: this.toJson(coupon.usageHistory),
    };
    this.fire('coupons', this.client.from('coupons').upsert(payload, { onConflict: 'code' }), {
      code: coupon.code,
    });
  }

  // ==========================================
  // 4. Bonus Ledger → bonus_ledger
  // ==========================================

  /** Insert append-only. Requer `userId` UUID válido (FK auth.users). */
  persistBonus(entry: BonusLedgerEntry): void {
    if (!this.client) return;
    if (!this.isUuid(entry.userId)) {
      // Dados demo (usr_*) permanecem em memória; sem write-through.
      return;
    }
    const payload: Database['public']['Tables']['bonus_ledger']['Insert'] = {
      user_id: entry.userId,
      type: entry.type,
      amount: entry.amount,
      origin: entry.origin,
      reason: entry.reason,
      reference_id: entry.referenceId ?? null,
      admin_author: entry.adminAuthor ?? null,
      balance_after: entry.balanceAfter,
      created_at: entry.createdAt,
      expires_at: entry.expiresAt ?? null,
    };
    this.fire('bonus_ledger', this.client.from('bonus_ledger').insert(payload), {
      entryId: entry.id,
    });
  }

  // ==========================================
  // 5. Commission Ledger → commission_ledger
  // ==========================================

  /** Insert append-only. Requer beneficiaryId/buyerUserId UUIDs válidos. */
  persistCommission(comm: CommissionLedgerEntry): void {
    if (!this.client) return;
    if (!this.isUuid(comm.beneficiaryId) || !this.isUuid(comm.buyerUserId)) {
      return;
    }
    const payload: Database['public']['Tables']['commission_ledger']['Insert'] = {
      beneficiary_id: comm.beneficiaryId,
      buyer_user_id: comm.buyerUserId,
      level: comm.level,
      applied_percent: comm.appliedPercent,
      base_amount: comm.baseAmount,
      commission_amount: comm.commissionAmount,
      payment_id: comm.paymentId ?? null,
      case_id: comm.caseId ?? null,
      status: comm.status,
      created_at: comm.createdAt,
      available_at: comm.availableAt ?? null,
      paid_at: comm.paidAt ?? null,
      reversed_at: comm.reversedAt ?? null,
      reversal_reason: comm.reversalReason ?? null,
    };
    this.fire('commission_ledger', this.client.from('commission_ledger').insert(payload), {
      commId: comm.id,
    });
  }

  /** Atualiza status de comissões de um pagamento (reversão em lote) ou de um nível específico. */
  updateCommissionsStatus(
    paymentId: string,
    status: CommissionLedgerEntry['status'],
    fields: { reversedAt?: string; reversalReason?: string; paidAt?: string; level?: 1 | 2 | 3 } = {}
  ): void {
    if (!this.client) return;
    const payload: Database['public']['Tables']['commission_ledger']['Update'] = {
      status,
      reversed_at: fields.reversedAt ?? null,
      reversal_reason: fields.reversalReason ?? null,
      paid_at: fields.paidAt ?? null,
    };
    let query = this.client.from('commission_ledger').update(payload).eq('payment_id', paymentId);
    if (fields.level) {
      query = query.eq('level', fields.level);
    }
    this.fire('commission_ledger', query, { paymentId, status, level: fields.level });
  }

  // ==========================================
  // 6. Referral Relations → referral_relations
  // ==========================================

  /** Insere relação filho→pai. Requer ambos os IDs como UUID válidos. */
  persistReferralRelation(referredId: string, referrerId: string, level = 1): void {
    if (!this.client) return;
    if (!this.isUuid(referredId) || !this.isUuid(referrerId) || referredId === referrerId) {
      return;
    }
    const payload: Database['public']['Tables']['referral_relations']['Insert'] = {
      referrer_id: referrerId,
      referred_id: referredId,
      level,
      status: 'active',
    };
    this.fire(
      'referral_relations',
      this.client.from('referral_relations').upsert(payload, { onConflict: 'referrer_id,referred_id,level' }),
      { referredId, referrerId }
    );
  }

  // ==========================================
  // 7. Referral Config → referral_config (singleton id=1)
  // ==========================================

  /** Upsert do singleton de configuração do programa de indicações. */
  persistReferralConfig(config: ReferralRuleConfig): void {
    if (!this.client) return;
    const payload: Database['public']['Tables']['referral_config']['Insert'] = {
      id: 1,
      is_program_active: config.isReferralProgramActive,
      level1_percent: config.level1Percent,
      level2_percent: config.level2Percent,
      level3_percent: config.level3Percent,
      calculation_base: config.calculationBase,
      payout_delay_days: config.payoutDelayDays,
      min_withdrawal_amount: config.minWithdrawalAmount,
      signup_bonus_amount: config.signupBonusAmount,
      referrer_bonus_amount: config.referrerBonusAmount,
      updated_at: config.updatedAt,
      updated_by: config.updatedBy,
    };
    this.fire('referral_config', this.client.from('referral_config').upsert(payload, { onConflict: 'id' }));
  }

  // ==========================================
  // 8. Commercial Audit Log → commercial_audit_log
  // ==========================================

  /** Insert append-only da trilha de auditoria comercial. */
  persistAuditLog(log: CommercialAuditLogEntry): void {
    if (!this.client) return;
    const payload: Database['public']['Tables']['commercial_audit_log']['Insert'] = {
      action: log.action,
      changed_by: log.changedBy,
      target: log.target,
      previous_state: this.toJson(log.previousState),
      new_state: this.toJson(log.newState),
      reason: log.reason ?? null,
      timestamp: log.timestamp,
    };
    this.fire('commercial_audit_log', this.client.from('commercial_audit_log').insert(payload), {
      logId: log.id,
    });
  }

  // ==========================================
  // Warm-up (opcional, não utilizado no boot)
  // ==========================================

  /**
   * Carrega do Supabase as entidades com chave natural estável
   * (pricings, promotions, coupons, referral config). Reservado para warm-up
   * futuro; hoje o boot segue 100% em memória para preservar o comportamento.
   */
  async loadAllFromSupabase(): Promise<void> {
    if (!this.client) return;

    const { data: pricings, error: pricingsError } = await this.client
      .from('service_pricings')
      .select('*')
      .order('service_type');
    if (pricingsError) {
      this.warn('pricings', 'loadAll', pricingsError.message);
    } else if (pricings) {
      logger.info('supabase', 'commercial_repository', 'loadAll', `Pricings carregados: ${pricings.length}`, {
        count: pricings.length,
      });
    }

    const { data: promotions, error: promotionsError } = await this.client
      .from('promotion_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (promotionsError) {
      this.warn('promotions', 'loadAll', promotionsError.message);
    } else if (promotions) {
      logger.info('supabase', 'commercial_repository', 'loadAll', `Promotions carregadas: ${promotions.length}`, {
        count: promotions.length,
      });
    }

    const { data: coupons, error: couponsError } = await this.client
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (couponsError) {
      this.warn('coupons', 'loadAll', couponsError.message);
    } else if (coupons) {
      logger.info('supabase', 'commercial_repository', 'loadAll', `Coupons carregados: ${coupons.length}`, {
        count: coupons.length,
      });
    }

    const { data: config, error: configError } = await this.client
      .from('referral_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (configError) {
      this.warn('referral_config', 'loadAll', configError.message);
    } else if (config) {
      logger.info('supabase', 'commercial_repository', 'loadAll', 'Referral config carregada do Supabase.', {
        updatedAt: config.updated_at,
      });
    }
  }
}

export const commercialRepository = new CommercialRepository();
