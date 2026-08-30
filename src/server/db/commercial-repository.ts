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
  CommissionCalculationBase,
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
import { getSupabaseServerClient } from '../db/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_CANONICAL_PRICINGS: ServicePricing[] = [
  {
    id: 'price_recurso_jari',
    serviceType: 'recurso_jari',
    serviceName: 'Recurso JARI',
    description: 'Recurso à Junta Administrativa de Recursos de Infrações (1ª Instância).',
    standardPrice: 119.90,
    promotionalPrice: 59.95,
    isActive: true,
    history: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Canonical Seed',
  },
  {
    id: 'price_recurso_cetran',
    serviceType: 'recurso_cetran',
    serviceName: 'Recurso CETRAN',
    description: 'Recurso ao Conselho Estadual de Trânsito (2ª Instância).',
    standardPrice: 149.90,
    promotionalPrice: 74.95,
    isActive: true,
    history: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Canonical Seed',
  },
  {
    id: 'price_suspensao',
    serviceType: 'suspensao',
    serviceName: 'Defesa de Suspensão de CNH',
    description: 'Defesa técnica completa contra processo de suspensão do direito de dirigir.',
    standardPrice: 149.90,
    promotionalPrice: 74.95,
    isActive: true,
    history: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Canonical Seed',
  },
  {
    id: 'price_cassacao',
    serviceType: 'cassacao',
    serviceName: 'Defesa de Cassação de CNH',
    description: 'Defesa especializada contra instauração de processo de cassação da CNH.',
    standardPrice: 199.90,
    promotionalPrice: 99.95,
    isActive: true,
    history: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Canonical Seed',
  },
  {
    id: 'price_suspensao_cnh',
    serviceType: 'suspensao_cnh',
    serviceName: 'Suspensão da CNH / Lei Seca',
    description: 'Defesa administrativa contra processo de suspensão do direito de dirigir.',
    standardPrice: 149.90,
    promotionalPrice: 74.95,
    isActive: true,
    history: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Canonical Seed',
  },
  {
    id: 'price_cassacao_cnh',
    serviceType: 'cassacao_cnh',
    serviceName: 'Cassação da CNH (PCDD)',
    description: 'Defesa contra processo de cassação da CNH por condução com documento suspenso.',
    standardPrice: 199.90,
    promotionalPrice: 99.95,
    isActive: true,
    history: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Canonical Seed',
  },
  {
    id: 'price_processo_suspensao',
    serviceType: 'processo_suspensao',
    serviceName: 'Defesa em Processo de Suspensão (PSDD)',
    description: 'Defesa técnica completa em processo administrativo de suspensão da CNH.',
    standardPrice: 149.90,
    promotionalPrice: 74.95,
    isActive: true,
    history: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Canonical Seed',
  },
  {
    id: 'price_processo_cassacao',
    serviceType: 'processo_cassacao',
    serviceName: 'Defesa em Processo de Cassação (PCDD)',
    description: 'Defesa especializada contra procedimento de cassação da habilitação.',
    standardPrice: 199.90,
    promotionalPrice: 99.95,
    isActive: true,
    history: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Canonical Seed',
  },
  {
    id: 'price_indicacao_condutor',
    serviceType: 'indicacao_condutor',
    serviceName: 'Indicação de Real Condutor',
    description: 'Requerimento formal e documentação para indicação do real condutor infrator.',
    standardPrice: 49.90,
    promotionalPrice: 24.95,
    isActive: true,
    history: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Canonical Seed',
  },
  {
    id: 'price_conversao_advertencia',
    serviceType: 'conversao_advertencia',
    serviceName: 'Conversão em Advertência por Escrito',
    description: 'Requerimento de conversão de multa em advertência por escrito (Art. 267 do CTB).',
    standardPrice: 69.90,
    promotionalPrice: 34.95,
    isActive: true,
    history: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Canonical Seed',
  },
];

const DEFAULT_CANONICAL_PROMOTIONS: PromotionCampaign[] = [
  {
    id: 'promo_launch_50',
    name: 'Promoção de Lançamento (50% OFF)',
    description: '50% de desconto em todos os serviços da plataforma DefesAi.',
    discountType: 'percentage',
    discountValue: 50,
    applicableServices: ['all'],
    startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 365 * 86400000).toISOString(),
    usageLimit: 999999,
    usageCount: 0,
    userUsageLimit: 99,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_CANONICAL_COUPONS: Coupon[] = [
  {
    id: 'cp_defesai10',
    code: 'DEFESAI10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 0,
    maxDiscountAmount: 50,
    applicableServices: ['all'],
    totalLimit: 10000,
    usedCount: 0,
    userLimit: 5,
    validFrom: new Date(Date.now() - 30 * 86400000).toISOString(),
    validUntil: new Date(Date.now() + 365 * 86400000).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
    usageHistory: [],
  },
  {
    id: 'cp_black30',
    code: 'BLACK30',
    discountType: 'percentage',
    discountValue: 30,
    minOrderValue: 0,
    maxDiscountAmount: 100,
    applicableServices: ['all'],
    totalLimit: 5000,
    usedCount: 0,
    userLimit: 2,
    validFrom: new Date(Date.now() - 30 * 86400000).toISOString(),
    validUntil: new Date(Date.now() + 365 * 86400000).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
    usageHistory: [],
  },
];

export class CommercialRepository {
  /**
   * Lazy getter: chama getSupabaseServerClient() a cada acesso para garantir
   * que o client seja criado SOMENTE após dotenv.config() injetar as env vars.
   * O singleton anterior capturava null no construtor (antes do dotenv) e
   * nunca reconnectava — causando o bug "Nenhuma tabela de preço cadastrada".
   */
  private get client(): SupabaseClient<Database> | null {
    return getSupabaseServerClient();
  }

  private _pricings: ServicePricing[] = [...DEFAULT_CANONICAL_PRICINGS];
  private _promotions: PromotionCampaign[] = [...DEFAULT_CANONICAL_PROMOTIONS];
  private _coupons: Coupon[] = [...DEFAULT_CANONICAL_COUPONS];
  private _bonusLedger: BonusLedgerEntry[] = [];
  private _commissionLedger: CommissionLedgerEntry[] = [];
  private _referralRelations: { referredId: string; referrerId: string; level: number }[] = [];
  private _referralConfig: ReferralRuleConfig | null = null;
  private _commercialAuditLogs: CommercialAuditLogEntry[] = [];
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

    // Update local cache
    const idx = this._pricings.findIndex(p => p.serviceType === pricing.serviceType);
    if (idx >= 0) this._pricings[idx] = pricing;
    else this._pricings.push(pricing);
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

    // Update local cache
    const idx = this._referralRelations.findIndex(r => r.referredId === referredId && r.referrerId === referrerId && r.level === level);
    if (idx >= 0) this._referralRelations[idx] = { referredId, referrerId, level };
    else this._referralRelations.push({ referredId, referrerId, level });
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
  // Getter methods for service consumption
  // ==========================================

  public getPricings(): ServicePricing[] {
    return [...this._pricings];
  }

  public getPromotions(): PromotionCampaign[] {
    return [...this._promotions];
  }

  public getCoupons(): Coupon[] {
    return [...this._coupons];
  }

  public getBonusLedger(): BonusLedgerEntry[] {
    return [...this._bonusLedger];
  }

  public getCommissionLedger(): CommissionLedgerEntry[] {
    return [...this._commissionLedger];
  }

  public getCommercialAuditLogs(): CommercialAuditLogEntry[] {
    return [...this._commercialAuditLogs];
  }

  public getReferralRelations(): { referredId: string; referrerId: string; level: number }[] {
    return [...this._referralRelations];
  }

  public getReferralConfig(): ReferralRuleConfig | null {
    return this._referralConfig ? { ...this._referralConfig } : null;
  }
  // ==========================================

  /**
   * Carrega do Supabase as entidades com chave natural estável
   * (pricings, promotions, coupons, referral config). Reservado para warm-up
   * futuro; hoje o boot segue 100% em memória para preservar o comportamento.
   */

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
    } else if (pricings && pricings.length > 0) {
      this._pricings = pricings.map((p: any) => ({
        id: p.id || `price_${p.service_type}`,
        serviceType: p.service_type,
        serviceName: p.service_name || p.service_type,
        description: p.description,
        standardPrice: p.standard_price > 1000 ? Number((p.standard_price / 100).toFixed(2)) : Number(Number(p.standard_price).toFixed(2)),
        promotionalPrice: p.promotional_price !== null && p.promotional_price !== undefined
          ? (p.promotional_price > 1000 ? Number((p.promotional_price / 100).toFixed(2)) : Number(Number(p.promotional_price).toFixed(2)))
          : null,
        isActive: p.is_active ?? true,
        validFrom: p.valid_from,
        validUntil: p.valid_until,
        history: p.history ?? [],
        updatedAt: p.updated_at,
        updatedBy: p.updated_by,
      }));
      logger.info('supabase', 'commercial_repository', 'loadAll', `Pricings carregados: ${this._pricings.length}`, {
        count: this._pricings.length,
      });
    }

    const { data: promotions, error: promotionsError } = await this.client
      .from('promotion_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (promotionsError) {
      this.warn('promotions', 'loadAll', promotionsError.message);
    } else if (promotions && promotions.length > 0) {
      this._promotions = promotions.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        discountType: p.discount_type,
        discountValue: p.discount_value,
        applicableServices: p.applicable_services,
        startDate: p.start_date,
        endDate: p.end_date,
        usageLimit: p.usage_limit,
        usageCount: p.usage_count,
        userUsageLimit: p.user_usage_limit,
        promoCode: p.promo_code,
        status: p.status,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
      logger.info('supabase', 'commercial_repository', 'loadAll', `Promotions carregadas: ${this._promotions.length}`, {
        count: this._promotions.length,
      });
    }

    const { data: coupons, error: couponsError } = await this.client
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (couponsError) {
      this.warn('coupons', 'loadAll', couponsError.message);
    } else if (coupons && coupons.length > 0) {
      this._coupons = coupons.map((c: any) => ({
        id: c.id,
        code: c.code,
        discountType: c.discount_type,
        discountValue: c.discount_value,
        minOrderValue: c.min_order_value,
        maxDiscountAmount: c.max_discount_amount,
        applicableServices: c.applicable_services,
        totalLimit: c.total_limit,
        usedCount: c.used_count,
        userLimit: c.user_limit,
        validFrom: c.valid_from,
        validUntil: c.valid_until,
        isActive: c.is_active,
        createdAt: c.created_at,
        usageHistory: c.usage_history ?? [],
      }));
      logger.info('supabase', 'commercial_repository', 'loadAll', `Coupons carregados: ${this._coupons.length}`, {
        count: this._coupons.length,
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
      this._referralConfig = {
        isReferralProgramActive: config.is_program_active,
        level1Percent: config.level1_percent,
        level2Percent: config.level2_percent,
        level3Percent: config.level3_percent,
        calculationBase: config.calculation_base as CommissionCalculationBase,
        payoutDelayDays: config.payout_delay_days,
        minWithdrawalAmount: config.min_withdrawal_amount,
        signupBonusAmount: config.signup_bonus_amount,
        referrerBonusAmount: config.referrer_bonus_amount,
        updatedAt: config.updated_at,
        updatedBy: config.updated_by,
      };
      logger.info('supabase', 'commercial_repository', 'loadAll', 'Referral config carregada do Supabase.', {
        updatedAt: config.updated_at,
      });
    }

    // Load bonus ledger (only for valid UUID users)
    const { data: bonusLedger, error: bonusError } = await this.client
      .from('bonus_ledger')
      .select('*')
      .order('created_at', { ascending: false });
    if (bonusError) {
      this.warn('bonus_ledger', 'loadAll', bonusError.message);
    } else if (bonusLedger) {
      this._bonusLedger = bonusLedger.map((b: any) => ({
        id: b.id,
        userId: b.user_id,
        userName: b.user_name,
        type: b.type,
        amount: b.amount,
        origin: b.origin,
        reason: b.reason,
        referenceId: b.reference_id,
        adminAuthor: b.admin_author,
        balanceAfter: b.balance_after,
        createdAt: b.created_at,
        expiresAt: b.expires_at,
      }));
      logger.info('supabase', 'commercial_repository', 'loadAll', `Bonus ledger carregado: ${this._bonusLedger.length}`, {
        count: this._bonusLedger.length,
      });
    }

    // Load commission ledger (only for valid UUID users)
    const { data: commissionLedger, error: commissionError } = await this.client
      .from('commission_ledger')
      .select('*')
      .order('created_at', { ascending: false });
    if (commissionError) {
      this.warn('commission_ledger', 'loadAll', commissionError.message);
    } else if (commissionLedger) {
      this._commissionLedger = commissionLedger.map((c: any) => ({
        id: c.id,
        beneficiaryId: c.beneficiary_id,
        beneficiaryName: c.beneficiary_name,
        buyerUserId: c.buyer_user_id,
        buyerUserName: c.buyer_user_name,
        level: c.level,
        appliedPercent: c.applied_percent,
        baseAmount: c.base_amount,
        commissionAmount: c.commission_amount,
        paymentId: c.payment_id,
        caseId: c.case_id,
        status: c.status,
        createdAt: c.created_at,
        availableAt: c.available_at,
        paidAt: c.paid_at,
        reversedAt: c.reversed_at,
        reversalReason: c.reversal_reason,
      }));
      logger.info('supabase', 'commercial_repository', 'loadAll', `Commission ledger carregado: ${this._commissionLedger.length}`, {
        count: this._commissionLedger.length,
      });
    }

    // Load referral relations
    const { data: referralRelations, error: referralError } = await this.client
      .from('referral_relations')
      .select('*')
      .order('created_at', { ascending: false });
    if (referralError) {
      this.warn('referral_relations', 'loadAll', referralError.message);
    } else if (referralRelations) {
      this._referralRelations = referralRelations.map((r: any) => ({
        referredId: r.referred_id,
        referrerId: r.referrer_id,
        level: r.level,
      }));
      logger.info('supabase', 'commercial_repository', 'loadAll', `Referral relations carregadas: ${this._referralRelations.length}`, {
        count: this._referralRelations.length,
      });
    }

    // Load commercial audit logs
    const { data: auditLogs, error: auditError } = await this.client
      .from('commercial_audit_log')
      .select('*')
      .order('timestamp', { ascending: false });
    if (auditError) {
      this.warn('commercial_audit_log', 'loadAll', auditError.message);
    } else if (auditLogs) {
      this._commercialAuditLogs = auditLogs.map((a: any) => ({
        id: a.id,
        action: a.action,
        changedBy: a.changed_by,
        target: a.target,
        previousState: a.previous_state,
        newState: a.new_state,
        reason: a.reason,
        timestamp: a.timestamp,
      }));
      logger.info('supabase', 'commercial_repository', 'loadAll', `Commercial audit logs carregados: ${this._commercialAuditLogs.length}`, {
        count: this._commercialAuditLogs.length,
      });
    }
  }

  // ============================================================
  // Commercial Orders (stub — tabela commercial_orders não existe
  // no schema atual; a fonte de verdade permanece o Map em
  // memória do OrderService/OrderRepository até termos ADR para
  // criar/persistir esta entidade no Supabase).
  // ============================================================

  private _orders: Map<string, any> = new Map();

  persistOrder(_order: any): void {
    // Sem tabela commercial_orders ainda — no-op.
    // Mantido para não quebrar OrderService/OrderRepository.
  }

  updateOrderStatus(_orderId: string, _status: string): void {
    // Sem tabela commercial_orders ainda — no-op.
  }

  getOrderById(orderId: string): any | undefined {
    return this._orders.get(orderId);
  }

  getOrdersByCase(caseId: string): any[] {
    return Array.from(this._orders.values()).filter((o: any) => o.caseId === caseId);
  }

  getOrdersByUser(userId: string): any[] {
    return Array.from(this._orders.values()).filter((o: any) => o.userId === userId);
  }
}
export const commercialRepository = new CommercialRepository();
