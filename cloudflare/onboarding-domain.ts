/**
 * Portado de src/core/mappers/canonical-mapper.ts (onboardingPayloadToDomain).
 * Converte payload canônico do onboarding em CaseDomain.
 */
export function onboardingPayloadToDomain(payload: any, caseId?: string): any {
  const id = caseId || `case_${Date.now()}`;
  const applicantName = payload.applicant?.name || payload.leadName || 'Condutor';
  const applicantEmail = payload.applicant?.email || payload.leadEmail;
  const applicantPhone = payload.applicant?.phone || payload.leadPhone;
  const applicantCpf = payload.applicant?.cpf;

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
      radarEquipmentId: payload.infraction.radarEquipmentId ?? payload.specificFacts?.radarEquipmentId,
      inmetroAferitionDate: payload.infraction.inmetroAferitionDate ?? payload.specificFacts?.inmetroAferitionDate,
      notificationExpeditionDate:
        payload.infraction.notificationExpeditionDate ?? payload.identification?.notificationExpeditionDate,
      notificationDeliveryDate:
        payload.infraction.notificationDeliveryDate ?? payload.identification?.notificationDeliveryDate,
      defenseDeadline: payload.infraction.defenseDeadline ?? payload.identification?.defenseDeadline,
      hasPreviousInfractionsLast12Months: payload.infraction.hasPreviousInfractionsLast12Months,
      hasPsychomotorTerm: payload.infraction.hasPsychomotorTerm,
      hasAgentDetailedObservations: payload.infraction.hasAgentDetailedObservations,
      hasPhotoProof: payload.infraction.hasPhotoProof,
      hasR19SignageProof: payload.infraction.hasR19SignageProof,
      hasRegulatorySign: payload.infraction.hasRegulatorySign,
      formalFlawsDetected: [],
      refusedTest: payload.infraction.refusedTest,
      offeredRetest: payload.infraction.offeredRetest,
      cellphoneCircumstance: payload.infraction.cellphoneCircumstance,
      yellowPhaseCrossing: payload.infraction.yellowPhaseCrossing,
      emergencyPassage: payload.infraction.emergencyPassage,
      realDriverName: payload.infraction.realDriverName,
      realDriverCpf: payload.infraction.realDriverCpf,
      realDriverCnh: payload.infraction.realDriverCnh,
      indicationWithinDeadline: payload.infraction.indicationWithinDeadline,
      evidenceFlags: payload.infraction.evidenceFlags,
    },
    applicant: payload.applicant
      ? {
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
        }
      : undefined,
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