/**
 * @file document-audit-fixtures.ts
 * Synthetic test data generators for the Document Audit suite.
 *
 * Each generated case has a deterministic AUDIT-<procedure>-<category>-NNN id
 * and a complete, internally consistent set of applicant + vehicle + infraction data.
 *
 * All values are synthetic. No real CPF, CNH, plate, AIT or personal data.
 */

import type { AuditCaseData, AuditApplicant, AuditVehicle, AuditInfraction, AuditCaseIdentity } from './document-audit.types';
import type { ProcedureType } from '../../src/types';

// ─── Deterministic ID helpers ─────────────────────────────────────────────────

function pad(n: number, width = 3): string {
  return String(n).padStart(width, '0');
}

export function makeAuditId(procedureType: string, category: string, index: number): string {
  const proc = procedureType.toUpperCase().replace(/_/g, '-');
  const cat = category.toUpperCase().replace(/_/g, '-');
  return `AUDIT-${proc}-${cat}-${pad(index + 1)}`;
}

export function makeRunWatermark(runId: string): string {
  return `AUDIT-2026-${runId}`;
}

// ─── Synthetic Data Building Blocks ──────────────────────────────────────────

const AIT_PREFIXES = ['1B', '2C', '3D', '4E', '5F', '6G', '7H', '8I', '9J', '0K'];
const ORGANS = ['DETRAN-SP', 'DETRAN-RJ', 'DETRAN-MG', 'DETRAN-BA', 'DETRAN-PR'];
const CITIES: Array<[string, string]> = [
  ['São Paulo', 'SP'], ['Rio de Janeiro', 'RJ'], ['Belo Horizonte', 'MG'],
  ['Salvador', 'BA'], ['Curitiba', 'PR'], ['Fortaleza', 'CE'],
  ['Porto Alegre', 'RS'], ['Recife', 'PE'], ['Goiânia', 'GO'],
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function aitFor(seed: number): string {
  const p1 = pick(AIT_PREFIXES, seed);
  const p2 = pick(AIT_PREFIXES, seed * 7);
  const p3 = pick(AIT_PREFIXES, seed * 13);
  const num = String(100000 + Math.abs(seed * 31) % 900000);
  return `${p1}${p2}${p3}${num}`;
}

function plateFor(index: number, seed: number): string {
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const l1 = letters[Math.abs(seed * 3) % letters.length];
  const l2 = letters[Math.abs(seed * 7) % letters.length];
  const l3 = letters[Math.abs(seed * 11) % letters.length];
  const n1 = String(Math.abs(seed * 17 + index) % 10);
  const n2 = String(Math.abs(seed * 23 + index * 3) % 10);
  const n3 = String(Math.abs(seed * 29 + index * 7) % 10);
  const n4 = String(Math.abs(seed * 31 + index * 11) % 10);
  return `${l1}${l2}${l3}${n1}${n2}${n3}${n4}`;
}

function cpfRaw(seed: number): string {
  // Synthetic CPF (valid format, not a real number)
  const base = 10000000000 + Math.abs(seed * 997) % 89999999999;
  return String(base);
}

function cpfFormatted(seed: number): string {
  const raw = cpfRaw(seed);
  return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
}

function cnhFor(seed: number): string {
  const base = 100000000 + Math.abs(seed * 887) % 899999999;
  return String(base);
}

const VEHICLE_MODELS = [
  'Toyota Corolla 2022', 'Honda Civic 2020', 'Volkswagen Polo 2021',
  'Chevrolet Onix 2019', 'Ford Ka 2020', 'Hyundai HB20 2021',
  'Renault Kwid 2022', 'Fiat Argo 2021', 'Jeep Renegade 2022',
  'Nissan Kicks 2021', 'Toyota Yaris 2020', 'Volkswagen T-Cross 2022',
  'Honda HR-V 2021', 'Chevrolet Tracker 2022', 'Fiat Pulse 2023',
];
const VEHICLE_COLORS = ['Prata', 'Branco', 'Preto', 'Cinza', 'Vermelho', 'Azul', 'Verde'];
const RENAVAM_BASE = 10000000000;

const APPLICANT_FIRST = ['João', 'Maria', 'Carlos', 'Ana', 'Pedro', 'Juliana', 'André', 'Carla', 'Rafael', 'Fernanda'];
const APPLICANT_LAST = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida'];

function applicantName(seed: number): string {
  return `${pick(APPLICANT_FIRST, seed * 3)} ${pick(APPLICANT_LAST, seed * 7)}`;
}

function addressFor(city: string, seed: number): string {
  const num = 100 + Math.abs(seed * 13) % 9900;
  const streets = ['Rua das Flores', 'Av. Brasil', 'Rua do Centro', 'Av. Paulista', 'Rua Hilda', 'Av. Nossa Senhora'];
  return `${pick(streets, seed)} ${num}`;
}

function cityState(seed: number): string {
  return pick(CITIES, seed).join('/');
}

// ─── Infraction definitions per category ──────────────────────────────────────

interface InfractionDef {
  code: string;
  article: string;
  description: string;
  severity: AuditInfraction['severity'];
  points: number;
  fineAmount: number;
}

const INFRACTION_DEFS: Record<string, InfractionDef> = {
  excesso_velocidade: {
    code: '745-50',
    article: 'Art. 218, I',
    description: 'Transitar em velocidade superior à máxima permitida em até 20%',
    severity: 'media',
    points: 4,
    fineAmount: 130.16,
  },
  lei_seca: {
    code: '516-91',
    article: 'Art. 165-A',
    description: 'Recusa ao teste do etilômetro / alcoolemia',
    severity: 'gravissima',
    points: 7,
    fineAmount: 2934.70,
  },
  celular: {
    code: '736-62',
    article: 'Art. 252, VIII',
    description: 'Segurar ou manusear telefone celular ao volante',
    severity: 'gravissima',
    points: 7,
    fineAmount: 293.47,
  },
  vermelho: {
    code: '746-50',
    article: 'Art. 208',
    description: 'Avançar o sinal vermelho ou parar no cruzamento',
    severity: 'grave',
    points: 5,
    fineAmount: 195.23,
  },
  estacionamento: {
    code: '762-50',
    article: 'Art. 181, XVII',
    description: 'Estacionar em local proibido pela sinalização',
    severity: 'grave',
    points: 3,
    fineAmount: 130.16,
  },
  indicacao_condutor: {
    code: '745-50',
    article: 'Art. 218, I',
    description: 'Transitar em velocidade superior à máxima permitida em até 20%',
    severity: 'media',
    points: 4,
    fineAmount: 130.16,
  },
  conversao_advertencia: {
    code: '500-10',
    article: 'Art. 161, I',
    description: 'Transitar em velocidade inferior à mínima permitida',
    severity: 'leve',
    points: 3,
    fineAmount: 88.38,
  },
  cnh_geral: {
    code: '505-34',
    article: 'Art. 162, I',
    description: 'Dirigir sem portar habilitação',
    severity: 'grave',
    points: 7,
    fineAmount: 293.47,
  },
  outro: {
    code: '573-80',
    article: 'Art. 187, I',
    description: 'Transitar em local proibido para pedestres',
    severity: 'grave',
    points: 3,
    fineAmount: 130.16,
  },
};

// ─── Master generator ─────────────────────────────────────────────────────────

export interface AuditCaseParams {
  procedureType: ProcedureType;
  category: string;
  caseIndex: number;
  runId: string;
  seed: number; // must be unique per case across entire run
}

export function generateAuditCase(params: AuditCaseParams): AuditCaseData {
  const { procedureType, category, caseIndex, runId, seed } = params;

  const cityPair = pick(CITIES, seed * 17);
  const [city, state] = cityPair;

  const applicant: AuditApplicant = {
    name: applicantName(seed),
    cpf: cpfFormatted(seed),
    cpfRaw: cpfRaw(seed),
    cnh: cnhFor(seed),
    cnhCategory: 'B',
    email: `test${Math.abs(seed * 7) % 10000}@audit.fake`,
    phone: `(11) 9${String(Math.abs(seed * 3) % 9000 + 1000)}-${String(Math.abs(seed * 7) % 9000 + 1000)}`,
    address: addressFor(city, seed),
    cityState: `${city}/${state}`,
  };

  const vehicle: AuditVehicle = {
    plate: plateFor(caseIndex, seed),
    brandModel: pick(VEHICLE_MODELS, seed * 11),
    renavam: String(RENAVAM_BASE + Math.abs(seed * 13) % 9999999999),
    year: String(2018 + Math.abs(seed) % 7),
    color: pick(VEHICLE_COLORS, seed * 5),
  };

  const infDef = INFRACTION_DEFS[category] ?? INFRACTION_DEFS['outro'];

  // Date varies by case index so 5 cases of same subtype have different dates
  const dayBase = 1 + (caseIndex * 3);
  const monthBase = 1 + (Math.abs(seed) % 11);
  const infractionDate = `2024-${String(monthBase).padStart(2, '0')}-${String(dayBase).padStart(2, '0')}`;

  const infraction: AuditInfraction = {
    aitNumber: aitFor(seed + caseIndex * 100),
    infractionCode: infDef.code,
    ctbArticle: infDef.article,
    description: infDef.description,
    autuadorBody: pick(ORGANS, seed * 5),
    dateTime: infractionDate,
    location: `${pick(['Av. Paulista', 'Av. Brasil', 'Rua das Flores', 'Av. Central', 'Av. Getúlio Vargas'], seed * 3)}, ${city} - ${state}`,
    severity: infDef.severity,
    points: infDef.points,
    fineAmount: infDef.fineAmount,
  };

  // Speed data for velocidade cases
  if (category === 'excesso_velocidade') {
    infraction.speedLimit = 60;
    infraction.measuredSpeed = 60 + 5 + caseIndex * 3; // 65, 68, 71, 74, 77
    infraction.consideredSpeed = infraction.measuredSpeed - 7; // 58, 61, 64, 67, 70
  }

  const extras: Record<string, string | number | boolean> = {};
  if (category === 'lei_seca') {
    extras.refusedTest = caseIndex % 2 === 0;
    extras.hasPsychomotorTerm = caseIndex % 3 !== 0;
  }
  if (category === 'celular') {
    extras.circunstancia = pick(['segurando', 'manuseando', 'consultando'], caseIndex);
    extras.hadPhysicalApproach = caseIndex < 3;
  }

  return {
    auditId: makeAuditId(procedureType, category, caseIndex),
    runWatermark: makeRunWatermark(runId),
    caseIndex,
    procedureType,
    category,
    scenarioName: `${procedureType} / ${category}`,
    applicant,
    vehicle,
    infraction,
    extras,
  };
}

// ─── Matrix definition ────────────────────────────────────────────────────────

/**
 * All (procedureType, category) pairs that have real templates and
 * are reachable via the onboarding wizard. Excludes:
 * - analise_tecnica (template: [])
 * - relatorio_pericial (template: [])
 */
export const AUDIT_MATRIX: Array<{ procedureType: ProcedureType; category: string }> = [
  // recurso_jari
  { procedureType: 'recurso_jari', category: 'excesso_velocidade' },
  { procedureType: 'recurso_jari', category: 'lei_seca' },
  { procedureType: 'recurso_jari', category: 'celular' },
  { procedureType: 'recurso_jari', category: 'vermelho' },
  { procedureType: 'recurso_jari', category: 'estacionamento' },
  { procedureType: 'recurso_jari', category: 'cnh_geral' },
  { procedureType: 'recurso_jari', category: 'outro' },
  // recurso_cetran
  { procedureType: 'recurso_cetran', category: 'excesso_velocidade' },
  { procedureType: 'recurso_cetran', category: 'lei_seca' },
  { procedureType: 'recurso_cetran', category: 'celular' },
  { procedureType: 'recurso_cetran', category: 'vermelho' },
  { procedureType: 'recurso_cetran', category: 'estacionamento' },
  { procedureType: 'recurso_cetran', category: 'cnh_geral' },
  { procedureType: 'recurso_cetran', category: 'outro' },
  // defesa_previa
  { procedureType: 'defesa_previa', category: 'excesso_velocidade' },
  { procedureType: 'defesa_previa', category: 'lei_seca' },
  { procedureType: 'defesa_previa', category: 'celular' },
  { procedureType: 'defesa_previa', category: 'vermelho' },
  { procedureType: 'defesa_previa', category: 'estacionamento' },
  { procedureType: 'defesa_previa', category: 'indicacao_condutor' },
  { procedureType: 'defesa_previa', category: 'conversao_advertencia' },
  { procedureType: 'defesa_previa', category: 'cnh_geral' },
  { procedureType: 'defesa_previa', category: 'outro' },
  // conversao_advertencia
  { procedureType: 'conversao_advertencia', category: 'conversao_advertencia' },
  // indicacao_condutor
  { procedureType: 'indicacao_condutor', category: 'indicacao_condutor' },
  // suspensao_cnh (alias: processo_suspensao uses same template)
  { procedureType: 'suspensao_cnh', category: 'lei_seca' },
  { procedureType: 'suspensao_cnh', category: 'excesso_velocidade' },
  { procedureType: 'suspensao_cnh', category: 'cnh_geral' },
  // cassacao_cnh (alias: processo_cassacao uses same template)
  { procedureType: 'cassacao_cnh', category: 'cnh_geral' },
];

export const CASES_PER_SUBTYPE = 5;

export function generateMatrix(): AuditCaseData[] {
  const runId = `RUN-${Date.now()}`;
  const cases: AuditCaseData[] = [];
  let globalSeed = Math.abs(Date.now() % 100000);

  for (const { procedureType, category } of AUDIT_MATRIX) {
    for (let i = 0; i < CASES_PER_SUBTYPE; i++) {
      cases.push(generateAuditCase({
        procedureType,
        category,
        caseIndex: i,
        runId,
        seed: globalSeed,
      }));
      globalSeed += 1;
    }
  }

  return cases;
}

export function countMatrix(): { combinations: number; totalCases: number; byProcedure: Record<string, number> } {
  const byProcedure: Record<string, number> = {};
  for (const { procedureType, category } of AUDIT_MATRIX) {
    byProcedure[procedureType] = (byProcedure[procedureType] ?? 0) + CASES_PER_SUBTYPE;
  }
  return {
    combinations: AUDIT_MATRIX.length,
    totalCases: AUDIT_MATRIX.length * CASES_PER_SUBTYPE,
    byProcedure,
  };
}
