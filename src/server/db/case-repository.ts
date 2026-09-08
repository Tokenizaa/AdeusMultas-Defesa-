/**
 * @file case-repository.ts
 * CaseRepository — Dual-Engine Persistence Layer (DefesAi)
 *
 * Write-through obrigatório para public.cases. A memória é apenas cache quente;
 * a persistência real é sempre confirmada no Supabase antes do sucesso.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { CaseRow } from '../../types/index';
import { Database } from '../../types/supabase';
import { EventTopics, eventBus } from '../../core/events/topics';
import { logger } from '../observability/logger';
import { getSupabaseServerClient } from './supabase-server';
import { domainIdToUuid } from './uuid-v5';

function parseJson<T>(value: string | null | undefined, fallback: T): T { if (!value) return fallback; try { return JSON.parse(value) as T; } catch { return fallback; } }
function toDate(value?: string | null): string | null { if (!value) return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }
function toNumeric(value?: number | null): number | null { return typeof value === 'number' && !Number.isNaN(value) ? value : null; }
function isUuid(value?: string | null): boolean { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
function allowInMemoryPersistence(): boolean { return process.env.ALLOW_IN_MEMORY_CASE_PERSISTENCE === 'true'; }

function databaseRowToCaseRow(c: Database['public']['Tables']['cases']['Row']): CaseRow {
  return { id:c.app_ref ?? c.id, title:c.title, client_name:c.client_name, client_email:c.client_email ?? undefined, client_phone:c.client_phone ?? undefined, client_cpf:c.client_cpf ?? undefined, user_id:c.user_id ?? undefined, status:c.status, current_stage:c.current_stage, service_type:c.service_type, vehicle_plate:c.vehicle_plate, vehicle_brand_model:c.vehicle_brand_model, vehicle_renavam:c.vehicle_renavam ?? undefined, vehicle_chassis:c.vehicle_chassis ?? undefined, vehicle_year:c.vehicle_year ?? undefined, vehicle_color:c.vehicle_color ?? undefined, ait_number:c.ait_number, infraction_code:c.infraction_code ?? undefined, infraction_description:c.infraction_description, ctb_article:c.ctb_article, severity:c.severity, points:c.points, fine_amount:c.fine_amount, autuador_body:c.autuador_body, date_time:c.date_time ? new Date(c.date_time).toISOString() : '', location:c.location ?? undefined, speed_limit:c.speed_limit ?? undefined, measured_speed:c.measured_speed ?? undefined, considered_speed:c.considered_speed ?? undefined, radar_equipment_id:c.radar_equipment_id ?? undefined, inmetro_aferition_date:c.inmetro_aferition_date ?? undefined, notification_expedition_date:c.notification_expedition_date ?? undefined, defense_deadline:c.defense_deadline ?? undefined, formal_flaws_json:c.formal_flaws_json ? JSON.stringify(c.formal_flaws_json) : undefined, analysis_json:c.analysis_json ? JSON.stringify(c.analysis_json) : undefined, defense_draft_json:c.defense_draft_json ? JSON.stringify(c.defense_draft_json) : undefined, protocol_info_json:c.protocol_info_json ? JSON.stringify(c.protocol_info_json) : undefined, ocr_auxiliary_json:c.ocr_auxiliary_json ? JSON.stringify(c.ocr_auxiliary_json) : undefined, evidence_json:c.evidence_json ? JSON.stringify(c.evidence_json) : undefined, applicant_json:(c as any).applicant_json ? JSON.stringify((c as any).applicant_json) : undefined, timeline_json:c.timeline_json ? JSON.stringify(c.timeline_json) : undefined, is_anonymous:c.is_anonymous, claim_token:c.claim_token ?? undefined, is_paid:c.is_paid, paid_at:c.paid_at ?? undefined, created_at:c.created_at, updated_at:c.updated_at };
}

export class CaseRepository {
  private rows: Map<string, CaseRow> = new Map();
  private client: SupabaseClient<Database> | null = null;
  private getClient(): SupabaseClient<Database> | null { if (this.client) return this.client; this.client = getSupabaseServerClient(); return this.client; }
  get size(): number { return this.rows.size; }
  get(id: string): CaseRow | undefined { return this.rows.get(id); }

  async getPersisted(id: string): Promise<CaseRow | undefined> {
    const cached = this.rows.get(id); if (cached) return cached;
    const client = this.getClient();
    if (!client) { if (allowInMemoryPersistence()) return undefined; throw new Error('CaseRepository: Supabase client não configurado — leitura persistente obrigatória.'); }
    const { data: byRef, error: refError } = await client.from('cases').select('*').eq('app_ref', id).maybeSingle();
    if (refError) throw new Error(`Falha ao carregar caso ${id}: ${refError.message}`);
    let row = byRef ? databaseRowToCaseRow(byRef) : undefined;
    if (!row && isUuid(id)) { const { data, error } = await client.from('cases').select('*').eq('id', id).maybeSingle(); if (error) throw new Error(`Falha ao carregar caso ${id}: ${error.message}`); row = data ? databaseRowToCaseRow(data) : undefined; }
    if (row) this.rows.set(row.id, row);
    return row;
  }

  values(): IterableIterator<CaseRow> { return this.rows.values(); }
  async set(id: string, row: CaseRow): Promise<void> { const payload = this.toPayload(row); await this.persist(id, payload); this.rows.set(id, row); }

  private toPayload(row: CaseRow): Database['public']['Tables']['cases']['Insert'] {
    return { id:domainIdToUuid(row.id) ?? undefined, app_ref:isUuid(row.id) ? null : row.id, title:row.title, client_name:row.client_name, client_email:row.client_email ?? null, client_phone:row.client_phone ?? null, client_cpf:row.client_cpf ?? null, user_id:isUuid(row.user_id) ? row.user_id : null, status:row.status, current_stage:row.current_stage, service_type:row.service_type, vehicle_plate:row.vehicle_plate, vehicle_brand_model:row.vehicle_brand_model, vehicle_renavam:row.vehicle_renavam ?? null, vehicle_chassis:row.vehicle_chassis ?? null, vehicle_year:row.vehicle_year ?? null, vehicle_color:row.vehicle_color ?? null, ait_number:row.ait_number, infraction_code:row.infraction_code ?? null, infraction_description:row.infraction_description, ctb_article:row.ctb_article, severity:row.severity, points:row.points, fine_amount:row.fine_amount, autuador_body:row.autuador_body, date_time:toDate(row.date_time), location:row.location ?? null, speed_limit:toNumeric(row.speed_limit), measured_speed:toNumeric(row.measured_speed), considered_speed:toNumeric(row.considered_speed), radar_equipment_id:row.radar_equipment_id ?? null, inmetro_aferition_date:row.inmetro_aferition_date ?? null, notification_expedition_date:row.notification_expedition_date ?? null, defense_deadline:row.defense_deadline ?? null, formal_flaws_json:parseJson(row.formal_flaws_json, []), analysis_json:parseJson(row.analysis_json, null), defense_draft_json:parseJson(row.defense_draft_json, null), protocol_info_json:parseJson(row.protocol_info_json, null), ocr_auxiliary_json:parseJson((row as any).ocr_auxiliary_json, null), evidence_json:parseJson(row.evidence_json, null), applicant_json:parseJson((row as any).applicant_json, null), timeline_json:parseJson(row.timeline_json, []), is_anonymous:row.is_anonymous, claim_token:row.claim_token ?? null, is_paid:row.is_paid, paid_at:toDate(row.paid_at), created_at:toDate(row.created_at), updated_at:toDate(row.updated_at) } as any;
  }

  private async persist(id:string,payload:Database['public']['Tables']['cases']['Insert']):Promise<void>{ const client=this.getClient(); if(!client){ if(allowInMemoryPersistence()){logger.warn('supabase','case_repository','persist',`Supabase não configurado — caso ${id} persiste apenas em memória porque ALLOW_IN_MEMORY_CASE_PERSISTENCE=true`,{caseId:id,persistenceResult:'explicit_in_memory_fallback'}); return;} throw new Error(`CaseRepository: Supabase client não configurado — persistência real obrigatória para o caso ${id}. Para testes unitários/dev isolados, habilite explicitamente ALLOW_IN_MEMORY_CASE_PERSISTENCE=true.`); } const {error}=await client.from('cases').upsert(payload); if(error){logger.error('supabase','case_repository','persist',`Falha ao persistir caso ${id}: ${error.message}`,{caseId:id,status:'failed',errorCode:'SUPABASE_UPSERT'}); eventBus.publish(EventTopics.AUDIT_LOG_RECORDED,{type:'persistence_failure',caseId:id,errorCode:'SUPABASE_UPSERT',message:error.message},'case_repository'); throw new Error(`Falha ao persistir caso ${id}: ${error.message}`);} }

  async loadAllFromSupabase():Promise<CaseRow[]>{ const client=this.getClient(); if(!client){if(allowInMemoryPersistence())return [];throw new Error('CaseRepository: Supabase client não configurado — cold start não pode ser considerado persistente.');} const {data,error}=await client.from('cases').select('*').order('created_at',{ascending:false}); if(error)throw new Error(`Falha ao carregar casos persistidos: ${error.message}`); const rows=(data||[]).map(databaseRowToCaseRow); for(const row of rows)this.rows.set(row.id,row); return rows; }
}
export const caseRepository = new CaseRepository();
