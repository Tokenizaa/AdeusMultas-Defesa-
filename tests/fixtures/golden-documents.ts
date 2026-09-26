/**
 * @file golden-documents.ts
 * Fonte única dos 10 Golden Documents (GD-01..GD-10) da FASE 19.
 *
 * EXTRAÍDO de `test/golden-document-test.ts` em 2026-09-25 (FASE 12 — auditoria
 * de acurácia) sem alteração de nenhum valor de dado. Motivo: a suíte canônica
 * (`tests/integration/golden-document-accuracy.integration.test.ts`) precisa
 * dos MESMOS inputs que o teste histórico, e duplicar 600 linhas de fixture
 * criaria duas verdades. O teste histórico continua existindo e importa daqui.
 */

import { InfractionData, CaseAnalysis, DefenseDraft } from '../../src/types';


// Test case structure
export interface GoldenDocumentTestCase {
  id: string; // GD-01 to GD-10
  name: string;
  description: string;
  infraction: InfractionData;
  expectedFacts: string[]; // facts that should be present in output
  expectedIssues: string[]; // issues that should be identified
  expectedArguments: string[]; // argument IDs that should be recommended
  forbiddenClaims: string[]; // claims that should NOT appear
  expectedDocumentCharacteristics: string[]; // e.g., "mentions specific speed", "references article 218-I"
  // For evaluation
  actualAnalysis?: CaseAnalysis;
  actualDefense?: DefenseDraft;
  evaluation?: {
    fidelityFactual: number; // 0-5
    problemIdentification: number; // 0-5
    thesisQuality: number; // 0-5
    legalGrounding: number; // 0-5
    personalization: number; // 0-5
    coherence: number; // 0-5
    docStructure: number; // 0-5
    consistency: number; // 0-5
    noHallucination: number; // 0-5
    utility: number; // 0-5
  };
  criticalFailure?: string; // if any
  verdict?: 'PASS' | 'FAIL';
}


function createBaseInfraction(): InfractionData {
  return {
    aitNumber: '',
    infractionCode: '',
    code: '',
    description: '',
    ctbArticle: '',
    severity: 'media',
    points: 0,
    fineAmount: 0,
    autuadorBody: 'DETRAN-SP',
    dateTime: new Date().toISOString(),
    location: '',
    speedLimit: undefined,
    measuredSpeed: undefined,
    consideredSpeed: undefined,
    speedMeasured: undefined,
    speedConsidered: undefined,
    radarEquipmentId: undefined,
    inmetroAferitionDate: undefined,
    notificationExpeditionDate: undefined,
    notificationDeliveryDate: undefined,
    defenseDeadline: undefined,
    formalFlawsDetected: [],
    hasPreviousInfractionsLast12Months: false,
    hasR19SignageProof: false,
    hasPsychomotorTerm: false,
    hasAgentDetailedObservations: false,
    hasPhotoProof: false,
    hasRegulatorySign: false,
    refusedTest: undefined,
    offeredRetest: undefined,
    cellphoneCircumstance: undefined,
    yellowPhaseCrossing: undefined,
    emergencyPassage: undefined,
    realDriverName: undefined,
    realDriverCpf: undefined,
    realDriverCnh: undefined,
    indicationWithinDeadline: undefined,
    ocrExtractedText: undefined,
    ocrConfidence: undefined,
    photoProofUrls: [],
    notes: undefined,
    evidenceFlags: {}
  };
}

// Test Case 01: Simple speeding violation with clear evidence
const GD01: GoldenDocumentTestCase = {
  id: 'GD-01',
  name: 'Speeding violation - clear case',
  description: 'Auto de velocidade com medição clara, placa visível, sem controvérsias',
  infraction: {
    ...createBaseInfraction(),
    aitNumber: '12345678901',
    infractionCode: '745-50',
    code: '74550',
    description: 'Excesso de velocidade',
    ctbArticle: 'Art. 218, I',
    severity: 'media',
    points: 3,
    fineAmount: 130.16,
    autuadorBody: 'DETRAN-SP',
    dateTime: '2023-10-15T08:30:00Z',
    location: 'Rodovia Anchieta, km 45, sentido capital',
    speedLimit: 80,
    measuredSpeed: 95,
    consideredSpeed: 91, // after 5% tolerance
    speedMeasured: 95,
    speedConsidered: 91,
    radarEquipmentId: 'DECUTRAN123',
    inmetroAferitionDate: '2023-09-01',
    notificationExpeditionDate: '2023-10-20',
    evidenceFlags: {
      fotoVeiculo: true,
      placaLegivel: true
    }
  },
  expectedFacts: [
    'Vehicle was traveling at 91 km/h',
    'Speed limit was 80 km/h',
    'Infraction occurred on 2023-10-15 at 08:30',
    'Location: Rodovia Anchieta, km 45',
    'Radar equipment DECUTRAN123 was calibrated on 2023-09-01'
  ],
  expectedIssues: [], // No inconsistencies - clear speeding
  expectedArguments: ['ARG-006', 'ARG-001'], // foto radar múltiplo?, calibration expired
  forbiddenClaims: [
    'Vehicle was stopped',
    'Speed was within limit',
    'Radar was malfunctioning'
  ],
  expectedDocumentCharacteristics: [
    'Mentions specific speed of 91 km/h',
    'References Art. 218, I of CTB',
    'Calculates excess of 11 km/h',
    'References radar calibration requirement'
  ]
};

// Test Case 02: Formal error - missing R-19 signage proof
const GD02: GoldenDocumentTestCase = {
  id: 'GD-02',
  name: 'Missing speed limit signage',
  description: 'Autuação por excesso de velocidade sem comprovação de placa R-19',
  infraction: {
    ...createBaseInfraction(),
    aitNumber: '98765432109',
    infractionCode: '745-50',
    code: '74550',
    description: 'Excesso de velocidade',
    ctbArticle: 'Art. 218, I',
    severity: 'media',
    points: 3,
    fineAmount: 130.16,
    autuadorBody: 'DETRAN-SP',
    dateTime: '2023-10-15T14:15:00Z',
    location: 'Avenida Paulista, sentido interior',
    speedLimit: 50,
    measuredSpeed: 68,
    consideredSpeed: 65, // after 5%
    speedMeasured: 68,
    speedConsidered: 65,
    radarEquipmentId: 'DECUTRAN456',
    inmetroAferitionDate: '2023-09-10',
    notificationExpeditionDate: '2023-10-20',
    evidenceFlags: {
      fotoVeiculo: true,
      placaLegivel: false, // plate not clearly visible
      r19SignageProof: false // missing signage proof
    }
  },
  expectedFacts: [
    'Vehicle was traveling at 65 km/h',
    'Speed limit was 50 km/h',
    'No proof of R-19 signage presence'
  ],
  expectedIssues: [
    'Missing or illegible speed limit signage (R-19)'
  ],
  expectedArguments: [
    'ARG-007', // incorrect distance between R-19 and radar
    'ARG-002', // missing or illegible R-19 signage
    'ARG-001'  // radar calibration (if expired)
  ],
  forbiddenClaims: [
    'Speed limit signage was present and visible',
    'Driver was properly warned of speed limit'
  ],
  expectedDocumentCharacteristics: [
    'Mentions absence of R-19 signage proof',
    'References Art. 90 of CTB',
    'Discusses requirement for speed limit signage'
  ]
};

// Test Case 03: Weak defense case - excessive speed with all evidence
const GD03: GoldenDocumentTestCase = {
  id: 'GD-03',
  name: 'Excessive speed - weak defense',
  description: 'Velocidade muito acima do limite, dificulta defesa técnicamente válida',
  infraction: {
    ...createBaseInfraction(),
    aitNumber: '45678912303',
    infractionCode: '745-70',
    code: '74570',
    description: 'Excesso de velocidade',
    ctbArticle: 'Art. 218, III',
    severity: 'grave',
    points: 5,
    fineAmount: 294.23,
    autuadorBody: 'DETRAN-SP',
    dateTime: '2023-10-15T16:45:00Z',
    location: 'Rodovia dos Imigrantes, km 20',
    speedLimit: 100,
    measuredSpeed: 150,
    consideredSpeed: 143, // after 5% tolerance
    speedMeasured: 150,
    speedConsidered: 143,
    radarEquipmentId: 'DECUTRAN789',
    inmetroAferitionDate: '2023-09-05',
    notificationExpeditionDate: '2023-10-20',
    evidenceFlags: {
      fotoVeiculo: true,
      placaLegivel: true,
      fotoPlaca: true
    }
  },
  expectedFacts: [
    'Vehicle was traveling at 143 km/h',
    'Speed limit was 100 km/h',
    'Excess of 43 km/h over limit',
    'Considered severe infraction (5 points)'
  ],
  expectedIssues: [], // Technically valid speeding
  expectedArguments: [
    'ARG-001' // only calibration might help, but unlikely to succeed
  ],
  forbiddenClaims: [
    'Vehicle was within speed limit',
    'Radar was malfunctioning significantly',
    'Driver was not operating vehicle'
  ],
  expectedDocumentCharacteristics: [
    'Acknowledges high speed of 143 km/h',
    'May suggest calibration issue as only possible defense',
    'References Art. 218, III of CTB',
    'Discusses severity and points'
  ]
};

// Test Case 04: Insufficient information - missing speed measurement
const GD04: GoldenDocumentTestCase = {
  id: 'GD-04',
  name: 'Incomplete AIT - missing speed data',
  description: 'Auto de infração sem dados de velocidade medidos',
  infraction: {
    ...createBaseInfraction(),
    aitNumber: '78912345604',
    infractionCode: '745-50',
    code: '74550',
    description: 'Excesso de velocidade',
    ctbArticle: 'Art. 218, I',
    severity: 'media',
    points: 3,
    fineAmount: 130.16,
    autuadorBody: 'DETRAN-SP',
    dateTime: '2023-10-15T09:00:00Z',
    location: 'Rodovia Anchieta, km 30',
    speedLimit: 100,
    // missing speed measurements
    measuredSpeed: undefined,
    consideredSpeed: undefined,
    speedMeasured: undefined,
    speedConsidered: undefined,
    radarEquipmentId: 'DECUTRAN999',
    inmetroAferitionDate: '2023-09-01',
    notificationExpeditionDate: '2023-10-20',
    evidenceFlags: {}
  },
  expectedFacts: [
    'Speed limit was 100 km/h',
    'Location: Rodovia Anchieta, km 30',
    'Date/time: 2023-10-15 09:00'
  ],
  expectedIssues: [
    'Missing speed measurement data',
    'Unable to verify if speeding occurred'
  ],
  expectedArguments: [
    // No specific arguments possible without speed data
    // Might argue procedural defects
    'ARG-001' // calibration as procedural
  ],
  forbiddenClaims: [
    'Vehicle was exceeding speed limit',
    'Vehicle was traveling at specific speed',
    'Measured speed was above limit'
  ],
  expectedDocumentCharacteristics: [
    'Notes lack of speed measurement evidence',
    'Questions validity of speeding allegation',
    'References requirement for speed measurement',
    'May suggest procedural nullity'
  ]
};

// Test Case 05: Strong defensive thesis - calibration expired
const GD05: GoldenDocumentTestCase = {
  id: 'GD-05',
  name: 'Radar calibration expired - strong defense',
  description: 'Radar com calibração vencida - boa base para nulidade',
  infraction: {
    ...createBaseInfraction(),
    aitNumber: '22233344405',
    infractionCode: '745-50',
    code: '74550',
    description: 'Excesso de velocidade',
    ctbArticle: 'Art. 218, I',
    severity: 'media',
    points: 3,
    fineAmount: 130.16,
    autuadorBody: 'DETRAN-SP',
    dateTime: '2023-10-15T11:20:00Z',
    location: 'Rodovia Régis Bittencourt, km 150',
    speedLimit: 110,
    measuredSpeed: 125,
    consideredSpeed: 119, // after 5%
    speedMeasured: 125,
    speedConsidered: 119,
    radarEquipmentId: 'DECUTRAN111',
    inmetroAferitionDate: '2022-05-15', // expired >12 months ago
    notificationExpeditionDate: '2023-10-20',
    evidenceFlags: {
      fotoVeiculo: true,
      placaLegivel: true,
      inmetroAferitionDateProvided: true
    }
  },
  expectedFacts: [
    'Vehicle was traveling at 119 km/h',
    'Speed limit was 110 km/h',
    'Radar calibration date: 2022-05-15 (expired)',
    'More than 12 months since last calibration'
  ],
  expectedIssues: [
    'Radar calibration expired (more than 12 months)'
  ],
  expectedArguments: [
    'ARG-001' // calibration expired - strong argument
  ],
  forbiddenClaims: [
    'Radar was properly calibrated',
    'Measurement was accurate and reliable',
    'Driver was actually speeding'
  ],
  expectedDocumentCharacteristics: [
    'Strongly argues radar calibration expired',
    'Cites Res. CONTRAN 798/2020 and INMETRO requirements',
    'References specific calibration date',
    'Demands annulment of infraction'
  ]
};

// Test Case 06: Lei Seca - refused test with symptoms
const GD06: GoldenDocumentTestCase = {
  id: 'GD-06',
  name: 'Lei Seca - recusa ao teste com sintomas',
  description: 'Condutor recusou etilômetro mas apresentou sinais de embriaguez',
  infraction: {
    ...createBaseInfraction(),
    aitNumber: '55566677706',
    infractionCode: '275-10',
    code: '27510',
    description: 'Direção sob influência de álcool',
    ctbArticle: 'Art. 306',
    severity: 'grave',
    points: 7,
    fineAmount: 2934.70,
    autuadorBody: 'PRF',
    dateTime: '2023-10-15T02:30:00Z',
    location: 'Rodovia Fernão Dias, km 100',
    speedLimit: 100,
    // Not speeding - this is drunk driving
    measuredSpeed: undefined,
    consideredSpeed: undefined,
    refusedTest: true,
    offeredRetest: true,
    hasPsychomotorTerm: true, // signs of intoxication observed
    evidenceFlags: {
      psicomotorTerm: true
    }
  },
  expectedFacts: [
    'Driver refused breathalyzer test',
    'Officer observed signs of intoxication',
    'Retest was offered',
    'Time: 02:30 AM (high risk period)'
  ],
  expectedIssues: [
    'Driver refused to submit to breathalyzer test',
    'Psychomotor test indicates possible intoxication'
  ],
  expectedArguments: [
    'ARG-025', // missing psicomotor term? actually they have it
    'ARG-027', // Nemo tenetur - right to remain silent
    'ARG-028'  // margin of tolerance (if test was done)
  ],
  forbiddenClaims: [
    'Driver submitted to and passed breathalyzer',
    'No signs of intoxication were observed',
    'Blood alcohol level was measured and legal'
  ],
  expectedDocumentCharacteristics: [
    'Discusses right to remain silent (Nemo tenetur)',
    'References Art. 306 of CTB',
    'Notes refusal of test does not prove guilt',
    'May question reliability of psychomotor test'
  ]
};

// Test Case 07: Semaphore - yellow time too short
const GD07: GoldenDocumentTestCase = {
  id: 'GD-07',
  name: 'Semaphore - yellow phase too short',
  description: 'Autuação por avanço do sinal amarelo com tempo insuficiente',
  infraction: {
    ...createBaseInfraction(),
    aitNumber: '88899900007',
    infractionCode: '208-10',
    code: '20810',
    description: 'Avanço do sinal vermelho',
    ctbArticle: 'Art. 208, § 2º',
    severity: 'media',
    points: 5,
    fineAmount: 130.16,
    autuadorBody: 'CET-SP',
    dateTime: '2023-10-15T17:45:00Z',
    location: 'Av. Paulista x Rua da Consolação',
    speedLimit: 40,
    // Not speeding - this is red light running
    measuredSpeed: undefined,
    consideredSpeed: undefined,
    yellowPhaseCrossing: true, // they crossed during yellow
    evidenceFlags: {
      tempoAmarelo: true // yellow timing data available
    }
  },
  expectedFacts: [
    'Vehicle crossed intersection during yellow phase',
    'Location: Av. Paulista x Rua da Consolação',
    'Time: 17:45 (peak hour)'
  ],
  expectedIssues: [
    'Yellow signal phase duration insufficient for safe stopping'
  ],
  expectedArguments: [
    'ARG-010' // yellow time insufficient
  ],
  forbiddenClaims: [
    'Vehicle entered intersection after red light',
    'Yellow phase was adequate for stopping',
    'Driver intentionally ran red light'
  ],
  expectedDocumentCharacteristics: [
    'Argues yellow phase duration below CONTRAN 973/2022 standards',
    'References Art. 208, §2º of CTB',
    'Cites required yellow timing for safe stopping',
    'May suggest innocence due to inadequate timing'
  ]
};

// Test Case 08: Celular - hands-free use
const GD08: GoldenDocumentTestCase = {
  id: 'GD-08',
  name: 'Cellular - hands-free Bluetooth use',
  description: 'Autuação por uso de celular mas comprovado uso viva-voz',
  infraction: {
    ...createBaseInfraction(),
    aitNumber: '11122233308',
    infractionCode: '252-10',
    code: '25210',
    description: 'Uso de telefone celular',
    ctbArticle: 'Art. 252',
    severity: 'media',
    points: 4,
    fineAmount: 88.38,
    autuadorBody: 'DETRAN-SP',
    dateTime: '2023-10-15T10:15:00Z',
    location: 'Marginal Tietê, sentido oeste',
    speedLimit: 80,
    // Not necessarily speeding
    measuredSpeed: undefined,
    consideredSpeed: undefined,
    cellphoneCircumstance: 'bluetooth-handsfree',
    evidenceFlags: {
      celularVivaVoz: true
    }
  },
  expectedFacts: [
    'Driver was using Bluetooth hands-free system',
    'Vehicle was in motion on Marginal Tietê',
    'Time: 10:15 AM'
  ],
  expectedIssues: [
    'Evidence indicates hands-free Bluetooth use',
    'No manual handling of device demonstrated'
  ],
  expectedArguments: [
    'ARG-019' // Bluetooth viva-voz
  ],
  forbiddenClaims: [
    'Driver was holding the phone',
    'Driver was manually texting or dialing',
    'Phone was not connected to vehicle audio system'
  ],
  expectedDocumentCharacteristics: [
    'Argues use of hands-free Bluetooth system',
    'References Art. 252 of CTB and CONTRAN 985/2022',
    'Notes legality of Bluetooth use for calls',
    'May demand annulment based on lawful use'
  ]
};

// Test Case 09: Estacionamento - vagas especiais com credencial
const GD09: GoldenDocumentTestCase = {
  id: 'GD-09',
  name: 'Estacionamento - vaga especial com credencial válida',
  description: 'Autuação por estacionamento irregular mas com credencial de PCD',
  infraction: {
    ...createBaseInfraction(),
    aitNumber: '44455566609',
    infractionCode: '167-10',
    code: '16710',
    description: 'Estacionamento',
    ctbArticle: 'Art. 167',
    severity: 'media',
    points: 0, // parking infractions often 0 points
    fineAmount: 88.38,
    autuadorBody: 'CET-SP',
    dateTime: '2023-10-15T12:00:00Z',
    location: 'Av. Paulista, número 1000',
    speedLimit: undefined,
    measuredSpeed: undefined,
    consideredSpeed: undefined,
    evidenceFlags: {
      creditoIdosoPc: true // has elderly/PCD credential
    }
  },
  expectedFacts: [
    'Vehicle was parked in Av. Paulista, nº 1000',
    'Driver possesses valid PCD credential',
    'Time: 12:00 PM'
  ],
  expectedIssues: [
    'Valid PCD/elderly credential presented at time of parking'
  ],
  expectedArguments: [
    'ARG-024' // valid credential for special spot
  ],
  forbiddenClaims: [
    'Driver had no special parking authorization',
    'Vehicle was parked in regular spot without permission',
    'Credential was expired or invalid'
  ],
  expectedDocumentCharacteristics: [
    'Argues valid PVD credential exempts from parking fee/time limits',
    'References Art. 167 of CTB',
    'Cites specific credential validation',
    'May demand annulment based on lawful parking'
  ]
};

// Test Case 10: Complex case - multiple issues
const GD10: GoldenDocumentTestCase = {
  id: 'GD-10',
  name: 'Complex case - multiple potential issues',
  description: 'Auto com várias questões possíveis: velocidade, sinalização, documento',
  infraction: {
    ...createBaseInfraction(),
    aitNumber: '99988877710',
    infractionCode: '745-50',
    code: '74550',
    description: 'Excesso de velocidade',
    ctbArticle: 'Art. 218, I',
    severity: 'media',
    points: 3,
    fineAmount: 130.16,
    autuadorBody: 'DETRAN-SP',
    dateTime: '2023-10-15T08:00:00Z',
    location: 'Rodovia Anchieta, km 50 (construção)',
    speedLimit: 80,
    measuredSpeed: 90,
    consideredSpeed: 86, // after 5%
    speedMeasured: 90,
    speedConsidered: 86,
    radarEquipmentId: 'DECUTRAN321',
    inmetroAferitionDate: '2023-06-01', // old but maybe still valid?
    notificationExpeditionDate: '2023-10-20',
    evidenceFlags: {
      fotoVeiculo: true,
      placaLegivel: true,
      r19SignageProof: false, // missing signage in work zone
      obraEmAndamento: true // construction zone
    }
  },
  expectedFacts: [
    'Vehicle was traveling at 86 km/h',
    'Speed limit was 80 km/h',
    'Location in construction zone',
    'Possible missing R-19 signage due to works'
  ],
  expectedIssues: [
    'Possible missing or illegible speed limit signage (R-19) due to construction',
    'Minor excess of 6 km/h over limit'
  ],
  expectedArguments: [
    'ARG-002', // missing R-19 signage
    'ARG-001', // radar calibration (check date)
    'ARG-006'  // possibly foto radar multiplo?
  ],
  forbiddenClaims: [
    'Vehicle was stopped or parked',
    'Speed was significantly over limit (>20 km/h)',
    'Signage was clearly visible and compliant'
  ],
  expectedDocumentCharacteristics: [
    'Discusses speed excess in context of construction zone',
    'Questions signage visibility due to works',
    'Evaluates both speed and signage issues',
    'May suggest reduced penalty or annulment'
  ]
};

// All test cases
const testCases: GoldenDocumentTestCase[] = [
  GD01, GD02, GD03, GD04, GD05, GD06, GD07, GD08, GD09, GD10
];

/** Todos os Golden Documents, na ordem canônica GD-01..GD-10. */
export const ALL_GOLDEN_DOCUMENTS: GoldenDocumentTestCase[] = testCases;
