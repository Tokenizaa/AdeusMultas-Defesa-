/**
 * @file canonical-mapper.ts
 * Canonical Mapper enforcing strict Row (database/snake_case) ↔ Domain (frontend/camelCase) separation.
 */

import { CaseDomain, CaseRow, ProcedureType, InfractionSeverity, CaseStatus, JourneyStage, CanonicalOnboardingPayload } from '../../types';

export type CaseDatabaseRow = CaseRow;

export class CanonicalMapper {
  public static toDomain = CanonicalMapper.rowToDomain;
  public static toRow = CanonicalMapper.domainToRow;

  /**
   * Convert Canonical Onboarding Payload to CaseDomain
   *
   * Preserva SEM perda:
   *  - identification (AIT, fase, código, órgão autuador)
   *  - infraction (dados da infração + fatos específicos)
   *  - vehicle (placa, marca, renavam)
   *  - applicant (qualificação do requerente)
   *  - specificFacts (fatos juridicamente relevantes)
   *  - evidence (OCR, fotos, declarações)
   *  - procedure (tipo de procedimento)
   *  - journey stage (fase processual)
   */
  public static onboardingPayloadToDomain(payload: CanonicalOnboardingPayload, caseId?: string): CaseDomain {
    const id = caseId || `case_${Date.now()}`;
    const applicantName = payload.applicant?.name || payload.leadName || 'Condutor';
    const applicantEmail = payload.applicant?.email || payload.leadEmail;
    const applicantPhone = payload.applicant?.phone || payload.leadPhone;
    const applicantCpf = payload.applicant?.cpf;

    // Mescla fatos específicos vindos tanto de `infraction` quanto de `specificFacts`
    // (FAIL CLOSED: regra vê o que veio do chamador — nunca inventa).
    const mergedHasPsychomotorTerm = payload.specificFacts?.hasPsychomotorTerm ?? payload.infraction.hasPsychomotorTerm;
    const mergedHasPhotoProof = payload.specificFacts?.hasPhotoProof ?? payload.infraction.hasPhotoProof;
    const mergedHasR19SignageProof = payload.specificFacts?.hasR19SignageProof ?? payload.infraction.hasR19SignageProof;
    const mergedHasAgentDetailedObservations =
      payload.specificFacts?.hasAgentDetailedObservations ?? payload.infraction.hasAgentDetailedObservations;
    const mergedHasPreviousInfractionsLast12Months =
      payload.specificFacts?.isFirstInfractionLast12Months === false
        ? true
        : payload.specificFacts?.isFirstInfractionLast12Months === true
        ? false
        : payload.infraction.hasPreviousInfractionsLast12Months;

    // Novos campos específicos
    const mergedRefusedTest = payload.specificFacts?.refusedTest ?? payload.infraction.refusedTest;
    const mergedOfferedRetest = payload.specificFacts?.offeredRetest ?? payload.infraction.offeredRetest;
    const mergedCellphoneCircumstance = payload.specificFacts?.cellphoneCircumstance ?? payload.infraction.cellphoneCircumstance;
    const mergedYellowPhaseCrossing = payload.specificFacts?.yellowPhaseCrossing ?? payload.infraction.yellowPhaseCrossing;
    const mergedEmergencyPassage = payload.specificFacts?.emergencyPassage ?? payload.infraction.emergencyPassage;
    const mergedRealDriverName = payload.specificFacts?.realDriverName ?? payload.infraction.realDriverName;
    const mergedRealDriverCpf = payload.specificFacts?.realDriverCpf ?? payload.infraction.realDriverCpf;
    const mergedRealDriverCnh = payload.specificFacts?.realDriverCnh ?? payload.infraction.realDriverCnh;
    const mergedIndicationWithinDeadline = payload.specificFacts?.indicationWithinDeadline ?? payload.infraction.indicationWithinDeadline;
    const mergedHasRegulatorySign = payload.specificFacts?.hasRegulatorySign ?? payload.infraction.hasRegulatorySign;

    return {
      id,
      title: `Defesa Auto ${payload.infraction.aitNumber || 'SN'}`,
      clientName: applicantName,
      clientEmail: applicantEmail,
      clientPhone: applicantPhone,
      clientCpf: applicantCpf,
      status: 'novo',
      currentStage: payload.applicant ? 2 : 1,
      serviceType: payload.procedureType,
      vehicle: {
        plate: (payload.vehicle.plate || 'SEM PLACA').toUpperCase(),
        brandModel: payload.vehicle.brandModel || 'Veículo não informado',
        renavam: payload.vehicle.renavam,
        chassis: payload.vehicle.chassis,
        year: payload.vehicle.year,
        color: payload.vehicle.color,
      },
      infraction: {
        aitNumber: payload.infraction.aitNumber,
        infractionCode: payload.infraction.infractionCode,
        description: payload.infraction.description || '',
        ctbArticle: payload.infraction.ctbArticle || '',
        severity: payload.infraction.severity || 'grave',
        points: payload.infraction.points || 0,
        fineAmount: payload.infraction.fineAmount || 0,
        autuadorBody: payload.infraction.autuadorBody,
        dateTime: payload.infraction.dateTime,
        location: payload.infraction.location,
        speedLimit: payload.infraction.speedLimit ?? payload.specificFacts?.speedLimit,
        measuredSpeed: payload.infraction.measuredSpeed ?? payload.specificFacts?.measuredSpeed,
        consideredSpeed: payload.infraction.consideredSpeed ?? payload.specificFacts?.consideredSpeed,
        speedMeasured: payload.infraction.speedMeasured,
        speedConsidered: payload.infraction.speedConsidered,
        radarEquipmentId: payload.infraction.radarEquipmentId ?? payload.specificFacts?.radarEquipmentId,
        inmetroAferitionDate: payload.infraction.inmetroAferitionDate ?? payload.specificFacts?.inmetroAferitionDate,
        notificationExpeditionDate:
          payload.infraction.notificationExpeditionDate ?? payload.identification?.notificationExpeditionDate,
        notificationDeliveryDate: payload.infraction.notificationDeliveryDate ?? payload.identification?.notificationDeliveryDate,
        defenseDeadline: payload.infraction.defenseDeadline ?? payload.identification?.defenseDeadline,
        hasPreviousInfractionsLast12Months: mergedHasPreviousInfractionsLast12Months,
        hasPsychomotorTerm: mergedHasPsychomotorTerm,
        hasAgentDetailedObservations: mergedHasAgentDetailedObservations,
        hasPhotoProof: mergedHasPhotoProof,
        hasR19SignageProof: mergedHasR19SignageProof,
        hasRegulatorySign: mergedHasRegulatorySign,
        formalFlawsDetected: [],
        // Novos campos
        refusedTest: mergedRefusedTest,
        offeredRetest: mergedOfferedRetest,
        cellphoneCircumstance: mergedCellphoneCircumstance,
        yellowPhaseCrossing: mergedYellowPhaseCrossing,
        emergencyPassage: mergedEmergencyPassage,
        realDriverName: mergedRealDriverName,
        realDriverCpf: mergedRealDriverCpf,
        realDriverCnh: mergedRealDriverCnh,
        indicationWithinDeadline: mergedIndicationWithinDeadline,
        // Fase 8-P1A — Evidência explícita (preserva dados antigos se ausente)
        evidenceFlags: payload.infraction.evidenceFlags,
      },
      applicant: payload.applicant ? {
        applicantName: payload.applicant.name,
        applicantCpf: payload.applicant.cpf,
        applicantRg: payload.applicant.rg,
        applicantCnh: payload.applicant.cnh,
        cnhCategory: payload.applicant.category,
        applicantPhone: payload.applicant.phone || '',
        applicantEmail: payload.applicant.email || '',
        addressStreet: payload.applicant.addressStreet || '',
        addressNumber: payload.applicant.addressNumber || '',
        addressComplement: payload.applicant.addressComplement,
        addressNeighborhood: payload.applicant.addressNeighborhood || '',
        addressZipCode: payload.applicant.addressZipCode || '',
        addressCityState: payload.applicant.addressCityState || '',
        vehicleRenavam: payload.vehicle.renavam,
        factsNarrative: payload.infraction.customFacts,
      } : undefined,
      timeline: [
        {
          id: `evt_${Date.now()}`,
          title: 'Caso Criado',
          description: 'Diagnóstico jurídico preliminar iniciado via Onboarding.',
          timestamp: new Date().toISOString(),
          type: 'system',
        },
      ],
      isPaid: false,
      isAnonymous: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Converte CaseDomain de volta para o contrato canônico do onboarding.
   * Útil para edição do rascunho e para o dashboard do cidadão.
   */
  public static domainToOnboardingPayload(domain: CaseDomain): CanonicalOnboardingPayload {
    const inf = domain.infraction;
    const veh = domain.vehicle;
    const app = domain.applicant;
    return {
      procedureType: domain.serviceType,
      situation: (domain as any).situation,
      processStage: domain.currentStage ? String(domain.currentStage) : undefined,
      leadName: domain.clientName,
      leadEmail: domain.clientEmail,
      leadPhone: domain.clientPhone,
      identification: {
        aitNumber: inf.aitNumber,
        infractionCode: inf.infractionCode,
        autuadorBody: inf.autuadorBody,
        notificationExpeditionDate: inf.notificationExpeditionDate,
        notificationDeliveryDate: inf.notificationDeliveryDate,
        defenseDeadline: inf.defenseDeadline,
      },
      vehicle: {
        plate: veh.plate,
        brandModel: veh.brandModel,
        renavam: veh.renavam,
        chassis: veh.chassis,
        year: veh.year,
        color: veh.color,
      },
      infraction: {
        aitNumber: inf.aitNumber,
        infractionCode: inf.infractionCode,
        description: inf.description,
        ctbArticle: inf.ctbArticle,
        severity: inf.severity,
        points: inf.points,
        fineAmount: inf.fineAmount,
        autuadorBody: inf.autuadorBody,
        dateTime: inf.dateTime,
        location: inf.location,
        speedLimit: inf.speedLimit,
        measuredSpeed: inf.measuredSpeed,
        consideredSpeed: inf.consideredSpeed,
        speedMeasured: inf.speedMeasured,
        speedConsidered: inf.speedConsidered,
        radarEquipmentId: inf.radarEquipmentId,
        inmetroAferitionDate: inf.inmetroAferitionDate,
        notificationExpeditionDate: inf.notificationExpeditionDate,
        notificationDeliveryDate: inf.notificationDeliveryDate,
        defenseDeadline: inf.defenseDeadline,
        hasPreviousInfractionsLast12Months: inf.hasPreviousInfractionsLast12Months,
        hasPsychomotorTerm: inf.hasPsychomotorTerm,
        hasAgentDetailedObservations: inf.hasAgentDetailedObservations,
        hasPhotoProof: inf.hasPhotoProof,
        hasR19SignageProof: inf.hasR19SignageProof,
        hasRegulatorySign: inf.hasRegulatorySign,
        customFacts: app?.factsNarrative,
        // Novos campos
        refusedTest: inf.refusedTest,
        offeredRetest: inf.offeredRetest,
        cellphoneCircumstance: inf.cellphoneCircumstance,
        yellowPhaseCrossing: inf.yellowPhaseCrossing,
        emergencyPassage: inf.emergencyPassage,
        realDriverName: inf.realDriverName,
        realDriverCpf: inf.realDriverCpf,
        realDriverCnh: inf.realDriverCnh,
        indicationWithinDeadline: inf.indicationWithinDeadline,
        // Fase 8-P1A — Evidência explícita (roundtrip)
        evidenceFlags: inf.evidenceFlags,
      },
      specificFacts: {
        speedLimit: inf.speedLimit,
        measuredSpeed: inf.measuredSpeed,
        consideredSpeed: inf.consideredSpeed,
        radarEquipmentId: inf.radarEquipmentId,
        inmetroAferitionDate: inf.inmetroAferitionDate,
        hasR19SignageProof: inf.hasR19SignageProof,
        hasPsychomotorTerm: inf.hasPsychomotorTerm,
        hasAgentDetailedObservations: inf.hasAgentDetailedObservations,
        hasPhotoProof: inf.hasPhotoProof,
        hasRegulatorySign: inf.hasRegulatorySign,
        isFirstInfractionLast12Months: inf.hasPreviousInfractionsLast12Months === undefined ? undefined : !inf.hasPreviousInfractionsLast12Months,
        // Novos campos
        refusedTest: inf.refusedTest,
        offeredRetest: inf.offeredRetest,
        cellphoneCircumstance: inf.cellphoneCircumstance,
        yellowPhaseCrossing: inf.yellowPhaseCrossing,
        emergencyPassage: inf.emergencyPassage,
        realDriverName: inf.realDriverName,
        realDriverCpf: inf.realDriverCpf,
        realDriverCnh: inf.realDriverCnh,
        indicationWithinDeadline: inf.indicationWithinDeadline,
      },
      evidence: domain.ocrAuxiliaryData ? {
        ocrExtractedText: domain.ocrAuxiliaryData.extractedText,
        ocrConfidence: domain.ocrAuxiliaryData.confidenceScore,
      } : undefined,
      applicant: app ? {
        name: app.applicantName,
        cpf: app.applicantCpf,
        rg: app.applicantRg,
        cnh: app.applicantCnh,
        category: app.cnhCategory,
        phone: app.applicantPhone,
        email: app.applicantEmail,
        addressStreet: app.addressStreet,
        addressNumber: app.addressNumber,
        addressComplement: app.addressComplement,
        addressNeighborhood: app.addressNeighborhood,
        addressZipCode: app.addressZipCode,
        addressCityState: app.addressCityState,
      } : undefined,
    };
  }

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

    let applicant = undefined;
    if (row.applicant_json) {
      try {
        applicant = JSON.parse(row.applicant_json);
      } catch (e) {
        applicant = undefined;
      }
    }

    let ocrAuxiliaryData = undefined;
    if (row.ocr_auxiliary_json) {
      try {
        ocrAuxiliaryData = JSON.parse(row.ocr_auxiliary_json);
      } catch (e) {
        ocrAuxiliaryData = undefined;
      }
    }

    // Fase 8-P1A — Evidência explícita (preserva ausência = compatível com dados antigos)
    let evidenceFlags: { [key: string]: boolean } | undefined = undefined;
    if (row.evidence_json) {
      try {
        const parsed = JSON.parse(row.evidence_json);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          evidenceFlags = parsed as { [key: string]: boolean };
        }
      } catch (e) {
        evidenceFlags = undefined;
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
      status: (row.status as CaseStatus) || 'novo',
      currentStage: (row.current_stage as JourneyStage) || 1,
      serviceType: (row.service_type as ProcedureType) || 'recurso_jari',
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
        // Novos campos
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
        // Fase 8-P1A — Evidência explícita (preserva ausência = compatível com dados antigos)
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
      // Fase 8-P1A — Evidência explícita (mapa chave → booleano)
      evidence_json: infraction.evidenceFlags ? JSON.stringify(infraction.evidenceFlags) : undefined,
      commercial_offer_id: domain.commercialOfferId,
      timeline_json: JSON.stringify(domain.timeline || domain.historicoTimeline || []),
      is_anonymous: Boolean(domain.isAnonymous),
      claim_token: domain.claimToken,
      is_paid: Boolean(domain.isPaid || domain.statusPagamento === 'pago'),
      paid_at: domain.paidAt || domain.dataPagamento,
      created_at: domain.createdAt || domain.criadoEm || new Date().toISOString(),
      updated_at: domain.updatedAt || domain.atualizadoEm || new Date().toISOString(),
      // Novos campos
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
}
