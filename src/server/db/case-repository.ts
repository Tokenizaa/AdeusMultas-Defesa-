/**
 * @file case-repository.ts
 * CaseRepository — Dual-Engine Persistence Layer (DefesAi)
 *
 * Mantém a API do antigo Map<string, CaseRow> do server.ts (get/set/values/size)
 * para que a integração seja 100% aditiva, e adiciona write-through OBRIGATÓRIO
 * para a tabela public.cases no Supabase quando o servidor está configurado.
 *
 * Padrão (FASE 7 — Critical Persistence): memória grava APÓS persistência
 * no Postgres com sucesso. Falha de banco = operação falha (FAIL CLOSED).
 * Nunca retorna sucesso sem confirmação de persistência real.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { CaseRow } from '../../types/index';
import { Database } from '../../types/supabase';
import { EventTopics, eventBus } from '../../core/events/topics';
import { logger } from '../observability/logger';
import { getSupabaseServerClient } from './supabase-server';
import { domainIdToUuid } from './uuid-v5';

/** Converte string JSON da row em valor tipado para JSONB (null-safe). */
function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Converte ISO/date string em Date para coluna timestamptz (null-safe). */
function toDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toNumeric(value?: number | null): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

/**
 * Valida formato UUID v4-ish — mesmo padrão usado por payment-repository.
 * Evita persistir ids mock de dev (ex.: 'usr_admin_defesai') que violariam
 * o tipo uuid da coluna cases.user_id e derrubariam o upsert inteiro.
 */
function isUuid(value?: string | null): boolean {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export class CaseRepository {
  private rows: Map<string, CaseRow> = new Map();
  private client: SupabaseClient<Database> | null = getSupabaseServerClient();

  // ==========================================
  // API compatível com Map<string, CaseRow>
  // ==========================================

  get size(): number {
    return this.rows.size;
  }

  get(id: string): CaseRow | undefined {
    return this.rows.get(id);
  }

  values(): IterableIterator<CaseRow> {
    return this.rows.values();
  }

  /** Grava na memória APÓS persistência no Supabase com sucesso.
   * FASE 7: Falha de banco = operação falha (FAIL CLOSED).
   * Lança erro se persistência falhar — não grava em memória sem confirmação. */
  async set(id: string, row: CaseRow): Promise<void> {
    const payload = this.toPayload(row);
    await this.persist(id, payload);
    this.rows.set(id, row);
  }

  // ==========================================
  // Persistência Supabase (write-through OBRIGATÓRIO)
  // ==========================================

  private toPayload(row: CaseRow): Database['public']['Tables']['cases']['Insert'] {
    return {
      // PK uuid: id sintético do domínio (`case_*`) é mapeado para UUID v5
      // determinístico (mesmo id → mesmo UUID → upsert idempotente entre
      // restarts/instâncias). Ids já-UUID passam intactos.
      id: domainIdToUuid(row.id) ?? undefined,
      // Rastro do id de domínio original: permite hidratação e lookup pós-cold-start
      // pelo id sintético antigo (índice único parcial cases_app_ref_key).
      app_ref: isUuid(row.id) ? null : row.id,
      title: row.title,
      client_name: row.client_name,
      client_email: row.client_email ?? null,
      client_phone: row.client_phone ?? null,
      client_cpf: row.client_cpf ?? null,
      user_id: isUuid(row.user_id) ? row.user_id : null,
      status: row.status,
      current_stage: row.current_stage,
      service_type: row.service_type,
      vehicle_plate: row.vehicle_plate,
      vehicle_brand_model: row.vehicle_brand_model,
      vehicle_renavam: row.vehicle_renavam ?? null,
      vehicle_chassis: row.vehicle_chassis ?? null,
      vehicle_year: row.vehicle_year ?? null,
      vehicle_color: row.vehicle_color ?? null,
      ait_number: row.ait_number,
      infraction_code: row.infraction_code ?? null,
      infraction_description: row.infraction_description,
      ctb_article: row.ctb_article,
      severity: row.severity,
      points: row.points,
      fine_amount: row.fine_amount,
      autuador_body: row.autuador_body,
      date_time: toDate(row.date_time),
      location: row.location ?? null,
      speed_limit: toNumeric(row.speed_limit),
      measured_speed: toNumeric(row.measured_speed),
      considered_speed: toNumeric(row.considered_speed),
      radar_equipment_id: row.radar_equipment_id ?? null,
      inmetro_aferition_date: row.inmetro_aferition_date ?? null,
      notification_expedition_date: row.notification_expedition_date ?? null,
      defense_deadline: row.defense_deadline ?? null,
      formal_flaws_json: parseJson(row.formal_flaws_json, []),
      analysis_json: parseJson(row.analysis_json, null),
      defense_draft_json: parseJson(row.defense_draft_json, null),
      protocol_info_json: parseJson(row.protocol_info_json, null),
      ocr_auxiliary_json: parseJson((row as any).ocr_auxiliary_json, null),
      timeline_json: parseJson(row.timeline_json, []),
      is_anonymous: row.is_anonymous,
      claim_token: row.claim_token ?? null,
      is_paid: row.is_paid,
      paid_at: toDate(row.paid_at),
      created_at: toDate(row.created_at),
      updated_at: toDate(row.updated_at),
    };
  }

  /** Persiste no Supabase. Lança erro se falhar (FAIL CLOSED). */
  private async persist(id: string, payload: Database['public']['Tables']['cases']['Insert']): Promise<void> {
    if (!this.client) {
      throw new Error(`CaseRepository: Supabase client não configurado — não é possível persistir caso ${id}`);
    }
    const { error } = await this.client.from('cases').upsert(payload);
    if (error) {
      logger.error('supabase', 'case_repository', 'persist', `Falha ao persistir caso ${id}: ${error.message}`, {
        caseId: id,
        status: 'failed',
        errorCode: 'SUPABASE_UPSERT',
      });
      eventBus.publish(EventTopics.AUDIT_LOG_RECORDED, {
        type: 'persistence_failure',
        caseId: id,
        errorCode: 'SUPABASE_UPSERT',
        message: error.message,
      }, 'case_repository');
      throw new Error(`Falha ao persistir caso ${id}: ${error.message}`);
    }
  }

  /** Carrega do Supabase todos os casos persistidos (para warm-up opcional). */
  async loadAllFromSupabase(): Promise<CaseRow[]> {
    if (!this.client) return [];

    const { data, error } = await this.client
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.warn('supabase', 'case_repository', 'loadAll', `Falha ao carregar casos: ${error.message}`);
      return [];
    }

    const rows: CaseRow[] = (data || []).map((c) => ({
      // Chave em memória volta a ser o id ORIGINAL do domínio: app_ref guarda
      // o id sintético (`case_*`) que gerou a linha — restaura links antigos
      // (GET/PUT/claim por id) após cold-start. Linhas sem app_ref (legado ou
      // ids já-UUID) usam a própria PK.
      id: c.app_ref ?? c.id,
      title: c.title,
      client_name: c.client_name,
      client_email: c.client_email ?? undefined,
      client_phone: c.client_phone ?? undefined,
      client_cpf: c.client_cpf ?? undefined,
      user_id: c.user_id ?? undefined,
      status: c.status,
      current_stage: c.current_stage,
      service_type: c.service_type,
      vehicle_plate: c.vehicle_plate,
      vehicle_brand_model: c.vehicle_brand_model,
      vehicle_renavam: c.vehicle_renavam ?? undefined,
      vehicle_chassis: c.vehicle_chassis ?? undefined,
      vehicle_year: c.vehicle_year ?? undefined,
      vehicle_color: c.vehicle_color ?? undefined,
      ait_number: c.ait_number,
      infraction_code: c.infraction_code ?? undefined,
      infraction_description: c.infraction_description,
      ctb_article: c.ctb_article,
      severity: c.severity,
      points: c.points,
      fine_amount: c.fine_amount,
      autuador_body: c.autuador_body,
      date_time: c.date_time ? new Date(c.date_time).toISOString() : '',
      location: c.location ?? undefined,
      speed_limit: c.speed_limit ?? undefined,
      measured_speed: c.measured_speed ?? undefined,
      considered_speed: c.considered_speed ?? undefined,
      radar_equipment_id: c.radar_equipment_id ?? undefined,
      inmetro_aferition_date: c.inmetro_aferition_date ?? undefined,
      notification_expedition_date: c.notification_expedition_date ?? undefined,
      defense_deadline: c.defense_deadline ?? undefined,
      formal_flaws_json: c.formal_flaws_json ? JSON.stringify(c.formal_flaws_json) : undefined,
      analysis_json: c.analysis_json ? JSON.stringify(c.analysis_json) : undefined,
      defense_draft_json: c.defense_draft_json ? JSON.stringify(c.defense_draft_json) : undefined,
      protocol_info_json: c.protocol_info_json ? JSON.stringify(c.protocol_info_json) : undefined,
      timeline_json: c.timeline_json ? JSON.stringify(c.timeline_json) : undefined,
      is_anonymous: c.is_anonymous,
      claim_token: c.claim_token ?? undefined,
      is_paid: c.is_paid,
      paid_at: c.paid_at ? c.paid_at : undefined,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));

    for (const row of rows) {
      this.rows.set(row.id, row);
    }
    return rows;
  }
}

export const caseRepository = new CaseRepository();
