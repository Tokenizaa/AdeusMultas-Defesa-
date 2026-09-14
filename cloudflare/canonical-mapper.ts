/**
 * Canonical Mapper — portado de src/core/mappers/canonical-mapper.ts
 * Row (snake_case/DB) ↔ Domain (camelCase). Mantém a semântica do backend Express.
 */

function safeParse<T>(raw: string | null | undefined): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** DB Row (snake_case) → Domain (camelCase). */
export function rowToDomain(row: any): any {
  const formalFlaws = safeParse<string[]>(row.formal_flaws_json) ?? [];
  const analysis = safeParse<any>(row.analysis_json);
  const defenseDraft = safeParse<any>(row.defense_draft_json);
  const protocolInfo = safeParse<any>(row.protocol_info_json);
  const timeline = safeParse<any[]>(row.timeline_json) ?? [];
  const applicant = safeParse<any>(row.applicant_json);
  const ocrAuxiliaryData = safeParse<any>(row.ocr_auxiliary_json);

  let evidenceFlags: Record<string, boolean> | undefined;
  if (row.evidence_json) {
    const parsed = safeParse<any>(row.evidence_json);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      evidenceFlags = parsed as Record<string, boolean>;
    }
  }

  return {
    id: row.id,
    title: row.title || `Recurso Auto ${row.ait_number}`,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    clientCpf: row.client_cpf,
    userId: row.user_id,
    status: row.status || 'novo',
    currentStage: row.current_stage ?? 1,
    serviceType: row.service_type || 'recurso_jari',
    commercialOfferId: row.commercial_offer_id,
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
      severity: row.severity || 'grave',
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
      hasPreviousInfractionsLast12Months: row.has_previous_infractions_last_12_months,
      hasPsychomotorTerm: row.has_psychomotor_term,
      hasAgentDetailedObservations: row.has_agent_detailed_observations,
      hasPhotoProof: row.has_photo_proof,
      hasR19SignageProof: row.has_r19_signage_proof,
      hasRegulatorySign: row.has_regulatory_sign,
      refusedTest: row.refused_test,
      offeredRetest: row.offered_retest,
      cellphoneCircumstance: row.cellphone_circumstance,
      yellowPhaseCrossing: row.yellow_phase_crossing,
      emergencyPassage: row.emergency_passage,
      realDriverName: row.real_driver_name,
      realDriverCpf: row.real_driver_cpf,
      realDriverCnh: row.real_driver_cnh,
      indicationWithinDeadline: row.indication_within_deadline,
      evidenceFlags,
    },
    analysis,
    applicant,
    ocrAuxiliaryData,
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

/** Domain (camelCase) → DB Row (snake_case). */
export function domainToRow(domain: any): any {
  if (!domain) return {};

  const vehicle = domain.vehicle || {};
  const infraction = domain.infraction || domain.dadosInfracao || {};
  const clientName = domain.clientName || domain.userNome || infraction.nomeCondutor || 'Condutor';
  const clientEmail = domain.clientEmail || domain.userEmail || '';
  const clientPhone = domain.clientPhone || '';
  const clientCpf = domain.clientCpf || infraction.cpfCondutor || '';

  // cases.id é uuid. IDs legados (case_*) viram app_ref (coluna UNIQUE).
  const rawId = domain.id || `case_${crypto.randomUUID()}`;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
  const rowId = isUuid ? rawId : crypto.randomUUID();

  return {
    id: rowId,
    app_ref: isUuid ? undefined : rawId,
    title: domain.title || `Recurso Auto ${infraction.aitNumber || infraction.autoInfracao || 'AIT'}`,
    client_name: clientName,
    client_email: clientEmail,
    client_phone: clientPhone,
    client_cpf: clientCpf,
    user_id: domain.userId,
    status: domain.status || 'novo',
    current_stage: Number(domain.currentStage || domain.stageAtual || 1),
    service_type: domain.serviceType || domain.tipoServico || 'recurso_jari',
    vehicle_plate: vehicle.plate || infraction.placa || 'SEM PLACA',
    vehicle_brand_model: vehicle.brandModel || infraction.marcaModelo || 'Veículo',
    vehicle_renavam: vehicle.renavam || infraction.renavam,
    vehicle_chassis: vehicle.chassis || infraction.chassi,
    vehicle_year: vehicle.year || infraction.anoModelo,
    vehicle_color: vehicle.color || infraction.cor,
    ait_number: infraction.aitNumber || infraction.autoInfracao || 'SEM_AIT',
    infraction_code: infraction.infractionCode || infraction.codigoInfracao,
    infraction_description: infraction.description || infraction.descricaoInfracao || '',
    ctb_article: infraction.ctbArticle || infraction.enquadramentoLegal,
    severity: infraction.severity || (infraction.gravidade ? String(infraction.gravidade).toLowerCase() : 'grave'),
    points: Number(infraction.points || infraction.pontos || 0),
    fine_amount: Number(infraction.fineAmount || infraction.valorOriginal || 0),
    autuador_body: infraction.autuadorBody ?? infraction.orgaoAutuador,
    date_time: infraction.dateTime || infraction.dataHoraInfracao || new Date().toISOString(),
    location: infraction.location || infraction.localInfracao || '',
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
    applicant_json: domain.applicant ? JSON.stringify(domain.applicant) : undefined,
    ocr_auxiliary_json: domain.ocrAuxiliaryData ? JSON.stringify(domain.ocrAuxiliaryData) : undefined,
    evidence_json: infraction.evidenceFlags ? JSON.stringify(infraction.evidenceFlags) : undefined,
    commercial_offer_id: domain.commercialOfferId,
    timeline_json: JSON.stringify(domain.timeline || domain.historicoTimeline || []),
    is_anonymous: Boolean(domain.isAnonymous),
    claim_token: domain.claimToken,
    is_paid: Boolean(domain.isPaid || domain.statusPagamento === 'pago'),
    paid_at: domain.paidAt || domain.dataPagamento,
    created_at: domain.createdAt || domain.criadoEm || new Date().toISOString(),
    updated_at: domain.updatedAt || domain.atualizadoEm || new Date().toISOString(),
    has_previous_infractions_last_12_months: infraction.hasPreviousInfractionsLast12Months,
    has_psychomotor_term: infraction.hasPsychomotorTerm,
    has_agent_detailed_observations: infraction.hasAgentDetailedObservations,
    has_photo_proof: infraction.hasPhotoProof,
    has_r19_signage_proof: infraction.hasR19SignageProof,
    has_regulatory_sign: infraction.hasRegulatorySign,
    refused_test: infraction.refusedTest,
    offered_retest: infraction.offeredRetest,
    cellphone_circumstance: infraction.cellphoneCircumstance,
    yellow_phase_crossing: infraction.yellowPhaseCrossing,
    emergency_passage: infraction.emergencyPassage,
    real_driver_name: infraction.realDriverName,
    real_driver_cpf: infraction.realDriverCpf,
    real_driver_cnh: infraction.realDriverCnh,
    indication_within_deadline: infraction.indicationWithinDeadline,
  };
}