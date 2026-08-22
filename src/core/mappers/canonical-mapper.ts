/**
 * @file canonical-mapper.ts
 * Canonical Mapper enforcing strict Row (database/snake_case) ↔ Domain (frontend/camelCase) separation.
 */

import { CaseDomain, CaseRow, ProcedureType, InfractionSeverity, CaseStatus, JourneyStage } from '../../types';

export type CaseDatabaseRow = CaseRow;

export class CanonicalMapper {
  public static toDomain = CanonicalMapper.rowToDomain;
  public static toRow = CanonicalMapper.domainToRow;

  /**
   * Convert database Row (snake_case) to Frontend Domain (camelCase)
   */
  public static rowToDomain(row: CaseRow): CaseDomain {
    let formalFlaws: string[] = [];
    if (row.formal_flaws_json) {
      try {
        formalFlaws = JSON.parse(row.formal_flaws_json);
      } catch (e) {
        formalFlaws = [];
      }
    }

    let analysis = undefined;
    if (row.analysis_json) {
      try {
        analysis = JSON.parse(row.analysis_json);
      } catch (e) {
        analysis = undefined;
      }
    }

    let defenseDraft = undefined;
    if (row.defense_draft_json) {
      try {
        defenseDraft = JSON.parse(row.defense_draft_json);
      } catch (e) {
        defenseDraft = undefined;
      }
    }

    let protocolInfo = undefined;
    if (row.protocol_info_json) {
      try {
        protocolInfo = JSON.parse(row.protocol_info_json);
      } catch (e) {
        protocolInfo = undefined;
      }
    }

    let timeline = [];
    if (row.timeline_json) {
      try {
        timeline = JSON.parse(row.timeline_json);
      } catch (e) {
        timeline = [];
      }
    }

    return {
      id: row.id,
      title: row.title || `Recurso Auto ${row.ait_number}`,
      clientName: row.client_name,
      clientEmail: row.client_email,
      clientPhone: row.client_phone,
      clientCpf: row.client_cpf,
      status: (row.status as CaseStatus) || 'novo',
      currentStage: (row.current_stage as JourneyStage) || 1,
      serviceType: (row.service_type as ProcedureType) || 'defesa_previa',
      vehicle: {
        plate: row.vehicle_plate || 'SEM PLACA',
        brandModel: row.vehicle_brand_model || 'Veículo não informado',
        renavam: row.vehicle_renavam,
        chassis: row.vehicle_chassis,
        year: row.vehicle_year,
        color: row.vehicle_color,
      },
      infraction: {
        aitNumber: row.ait_number,
        infractionCode: row.infraction_code,
        description: row.infraction_description,
        ctbArticle: row.ctb_article,
        severity: (row.severity as InfractionSeverity) || 'grave',
        points: Number(row.points) || 0,
        fineAmount: Number(row.fine_amount) || 0,
        autuadorBody: row.autuador_body,
        dateTime: row.date_time,
        location: row.location,
        speedLimit: row.speed_limit,
        measuredSpeed: row.measured_speed,
        consideredSpeed: row.considered_speed,
        radarEquipmentId: row.radar_equipment_id,
        inmetroAferitionDate: row.inmetro_aferition_date,
        notificationExpeditionDate: row.notification_expedition_date,
        defenseDeadline: row.defense_deadline,
        formalFlawsDetected: formalFlaws,
      },
      analysis,
      defenseDraft,
      protocolInfo,
      timeline,
      isAnonymous: Boolean(row.is_anonymous),
      claimToken: row.claim_token,
      isPaid: Boolean(row.is_paid),
      paidAt: row.paid_at,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

  /**
   * Convert Frontend Domain (camelCase) to Database Row (snake_case)
   */
  public static domainToRow(domain: CaseDomain | any): CaseRow {
    if (!domain) {
      return {} as CaseRow;
    }

    const vehicle = domain.vehicle || {};
    const infraction = domain.infraction || domain.dadosInfracao || {};
    const clientName = domain.clientName || domain.userNome || infraction.nomeCondutor || 'Condutor';
    const clientEmail = domain.clientEmail || domain.userEmail || '';
    const clientPhone = domain.clientPhone || '';
    const clientCpf = domain.clientCpf || infraction.cpfCondutor || '';

    return {
      id: domain.id || `case_${Date.now()}`,
      title: domain.title || `Recurso Auto ${infraction.aitNumber || infraction.autoInfracao || 'AIT'}`,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      client_cpf: clientCpf,
      user_id: domain.userId,
      status: domain.status || 'novo',
      current_stage: Number(domain.currentStage || domain.stageAtual || 1),
      service_type: domain.serviceType || domain.tipoServico || 'defesa_previa',
      vehicle_plate: vehicle.plate || infraction.placa || 'SEM PLACA',
      vehicle_brand_model: vehicle.brandModel || infraction.marcaModelo || 'Veículo',
      vehicle_renavam: vehicle.renavam || infraction.renavam,
      vehicle_chassis: vehicle.chassis || infraction.chassi,
      vehicle_year: vehicle.year || infraction.anoModelo,
      vehicle_color: vehicle.color || infraction.cor,
      ait_number: infraction.aitNumber || infraction.autoInfracao || 'SEM_AIT',
      infraction_code: infraction.infractionCode || infraction.codigoInfracao || '745-50',
      infraction_description: infraction.description || infraction.descricaoInfracao || 'Infração de Trânsito',
      ctb_article: infraction.ctbArticle || infraction.enquadramentoLegal || 'Art. 218 do CTB',
      severity: infraction.severity || (infraction.gravidade ? String(infraction.gravidade).toLowerCase() : 'grave'),
      points: Number(infraction.points || infraction.pontos || 0),
      fine_amount: Number(infraction.fineAmount || infraction.valorOriginal || 0),
      autuador_body: infraction.autuadorBody || infraction.orgaoAutuador || 'DETRAN',
      date_time: infraction.dateTime || infraction.dataHoraInfracao || new Date().toISOString(),
      location: infraction.location || infraction.localInfracao || 'Via Pública',
      speed_limit: infraction.speedLimit || infraction.velocidadePermitida,
      measured_speed: infraction.measuredSpeed || infraction.velocidadeMedida,
      considered_speed: infraction.consideredSpeed || infraction.velocidadeConsiderada,
      radar_equipment_id: infraction.radarEquipmentId || infraction.numeroEquipamentoInmetro,
      inmetro_aferition_date: infraction.inmetroAferitionDate || infraction.dataAfericaoInmetro,
      notification_expedition_date: infraction.notificationExpeditionDate,
      defense_deadline: infraction.defenseDeadline || infraction.prazoDefesa,
      formal_flaws_json: JSON.stringify(infraction.formalFlawsDetected || infraction.viciosTipicos || []),
      analysis_json: domain.analysis || domain.analiseIA ? JSON.stringify(domain.analysis || domain.analiseIA) : undefined,
      defense_draft_json: domain.defenseDraft ? JSON.stringify(domain.defenseDraft) : undefined,
      protocol_info_json: domain.protocolInfo || domain.protocoloOrgao ? JSON.stringify(domain.protocolInfo || domain.protocoloOrgao) : undefined,
      timeline_json: JSON.stringify(domain.timeline || domain.historicoTimeline || []),
      is_anonymous: Boolean(domain.isAnonymous),
      claim_token: domain.claimToken,
      is_paid: Boolean(domain.isPaid || domain.statusPagamento === 'pago'),
      paid_at: domain.paidAt || domain.dataPagamento,
      created_at: domain.createdAt || domain.criadoEm || new Date().toISOString(),
      updated_at: domain.updatedAt || domain.atualizadoEm || new Date().toISOString(),
    };
  }
}
