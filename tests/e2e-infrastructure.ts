/**
 * E2E Test Infrastructure for AdeusMultas-Defesa-
 * Real persistent tests using Supabase database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://llmxnpgjpxcvyrqjkfwb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

export const TEST_RUN_ID = `E2E-NATIONAL-${new Date().toISOString().split('T')[0]}`;
export const EVIDENCE_DIR = path.join(__dirname, 'e2e-results', TEST_RUN_ID);

// Commercial Service Types with their 4 scenarios each
export const COMMERCIAL_SERVICES: Record<string, ServiceConfig[]> = {
  'defesa_previa': [
    { scenario: '01', name: 'Defesa Prévia - Velocidade', infractionCode: '745-50', uf: 'SP', autuador: 'DETRAN-SP' },
    { scenario: '02', name: 'Defesa Prévia - Lei Seca', infractionCode: '516-91', uf: 'RJ', autuador: 'DETRAN-RJ' },
    { scenario: '03', name: 'Defesa Prévia - Celular', infractionCode: '736-62', uf: 'MG', autuador: 'DETRAN-MG' },
    { scenario: '04', name: 'Defesa Prévia - Sinal Vermelho', infractionCode: '746-30', uf: 'RS', autuador: 'DETRAN-RS' },
  ],
  'recurso_jari': [
    { scenario: '01', name: 'Recurso JARI - Velocidade', infractionCode: '745-50', uf: 'SP', autuador: 'DETRAN-SP' },
    { scenario: '02', name: 'Recurso JARI - Lei Seca', infractionCode: '516-91', uf: 'BA', autuador: 'DETRAN-BA' },
    { scenario: '03', name: 'Recurso JARI - Celular', infractionCode: '736-62', uf: 'PR', autuador: 'DETRAN-PR' },
    { scenario: '04', name: 'Recurso JARI - Estacionamento', infractionCode: '666-10', uf: 'PE', autuador: 'DETRAN-PE' },
  ],
  'recurso_cetran': [
    { scenario: '01', name: 'Recurso CETRAN - Velocidade', infractionCode: '745-50', uf: 'SP', autuador: 'DETRAN-SP' },
    { scenario: '02', name: 'Recurso CETRAN - Lei Seca', infractionCode: '516-91', uf: 'GO', autuador: 'DETRAN-GO' },
    { scenario: '03', name: 'Recurso CETRAN - Celular', infractionCode: '736-62', uf: 'AM', autuador: 'DETRAN-AM' },
    { scenario: '04', name: 'Recurso CETRAN - Sinal Vermelho', infractionCode: '746-30', uf: 'DF', autuador: 'DETRAN-DF' },
  ],
  'suspensao': [
    { scenario: '01', name: 'Suspensão - Pontuação', infractionCode: '745-50', uf: 'SP', autuador: 'DETRAN-SP' },
    { scenario: '02', name: 'Suspensão - Lei Seca', infractionCode: '516-91', uf: 'RJ', autuador: 'DETRAN-RJ' },
    { scenario: '03', name: 'Suspensão - Velocidade 50%', infractionCode: '747-10', uf: 'MG', autuador: 'DETRAN-MG' },
    { scenario: '04', name: 'Suspensão - Mandatória', infractionCode: '736-62', uf: 'RS', autuador: 'DETRAN-RS' },
  ],
  'cassacao': [
    { scenario: '01', name: 'Cassação - Dirigir Suspenso', infractionCode: '516-91', uf: 'SP', autuador: 'DETRAN-SP' },
    { scenario: '02', name: 'Cassação - Reincidência Lei Seca', infractionCode: '516-92', uf: 'RJ', autuador: 'DETRAN-RJ' },
    { scenario: '03', name: 'Cassação - Reincidência Velocidade', infractionCode: '747-10', uf: 'PR', autuador: 'DETRAN-PR' },
    { scenario: '04', name: 'Cassação - Outra Mandatória', infractionCode: '736-62', uf: 'SC', autuador: 'DETRAN-SC' },
  ],
  'indicacao_condutor': [
    { scenario: '01', name: 'Indicação - Velocidade', infractionCode: '745-50', uf: 'SP', autuador: 'DETRAN-SP' },
    { scenario: '02', name: 'Indicação - Lei Seca', infractionCode: '516-91', uf: 'RJ', autuador: 'DETRAN-RJ' },
    { scenario: '03', name: 'Indicação - Sinal Vermelho', infractionCode: '746-30', uf: 'MG', autuador: 'DETRAN-MG' },
    { scenario: '04', name: 'Indicação - Estacionamento', infractionCode: '666-10', uf: 'ES', autuador: 'DETRAN-ES' },
  ],
  'conversao_advertencia': [
    { scenario: '01', name: 'Conversão - Velocidade Leve', infractionCode: '745-50', uf: 'SP', autuador: 'DETRAN-SP' },
    { scenario: '02', name: 'Conversão - Celular', infractionCode: '736-62', uf: 'RJ', autuador: 'DETRAN-RJ' },
    { scenario: '03', name: 'Conversão - Estacionamento', infractionCode: '666-10', uf: 'BA', autuador: 'DETRAN-BA' },
    { scenario: '04', name: 'Conversão - Sinal Vermelho Leve', infractionCode: '735-80', uf: 'CE', autuador: 'DETRAN-CE' },
  ],
};

export interface ServiceConfig {
  scenario: string;
  name: string;
  infractionCode: string;
  uf: string;
  autuador: string;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  cpf: string;
  cnh: string;
  cnhCategory: string;
  addressStreet: string;
  addressNumber: string;
  addressNeighborhood: string;
  addressZipCode: string;
  addressCityState: string;
  serviceType: string;
  scenario: string;
  testRunId: string;
}

export interface TestCase {
  id: string;
  userId: string;
  serviceType: string;
  scenario: string;
  procedureType: string;
  infraction: any;
  vehicle: any;
  applicant: any;
  analysis?: any;
  document?: any;
  protocolInfo?: any;
  testRunId: string;
  status: 'created' | 'onboarding_complete' | 'analysis_complete' | 'document_complete' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export class E2ETestManager {
  private supabase: SupabaseClient;
  private testUsers: TestUser[] = [];
  private testCases: TestCase[] = [];
  private evidenceDir: string;

  constructor() {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    this.evidenceDir = EVIDENCE_DIR;
    fs.mkdirSync(this.evidenceDir, { recursive: true });
  }

  async initialize(): Promise<void> {
    console.log(`[${TEST_RUN_ID}] Initializing E2E test infrastructure...`);
    
    // Verify database connection
    const { data, error } = await this.supabase.from('profiles').select('count').limit(1);
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    console.log(`[${TEST_RUN_ID}] Database connected successfully`);

    // Generate all test users
    await this.generateTestUsers();
    console.log(`[${TEST_RUN_ID}] Generated ${this.testUsers.length} test users`);

    // Create users in Supabase Auth
    await this.createUsersInAuth();
    console.log(`[${TEST_RUN_ID}] Created users in Supabase Auth`);

    // Create profiles and cases
    await this.createProfilesAndCases();
    console.log(`[${TEST_RUN_ID}] Created profiles and cases in database`);

    // Save initial state
    await this.saveEvidence('initial-state.json', {
      testRunId: TEST_RUN_ID,
      users: this.testUsers,
      cases: this.testCases,
      timestamp: new Date().toISOString(),
    });
  }

  private async generateTestUsers(): Promise<void> {
    const ufData: Record<string, { city: string; state: string }> = {
      'SP': { city: 'São Paulo', state: 'SP' },
      'RJ': { city: 'Rio de Janeiro', state: 'RJ' },
      'MG': { city: 'Belo Horizonte', state: 'MG' },
      'RS': { city: 'Porto Alegre', state: 'RS' },
      'PR': { city: 'Curitiba', state: 'PR' },
      'PE': { city: 'Recife', state: 'PE' },
      'BA': { city: 'Salvador', state: 'BA' },
      'GO': { city: 'Goiânia', state: 'GO' },
      'AM': { city: 'Manaus', state: 'AM' },
      'DF': { city: 'Brasília', state: 'DF' },
      'SC': { city: 'Florianópolis', state: 'SC' },
      'ES': { city: 'Vitória', state: 'ES' },
      'CE': { city: 'Fortaleza', state: 'CE' },
    };

    for (const [serviceType, configs] of Object.entries(COMMERCIAL_SERVICES)) {
      for (const config of configs) {
        const ufInfo = ufData[config.uf] || { city: 'São Paulo', state: 'SP' };
        const user: TestUser = {
          id: randomUUID(),
          email: `e2e+${serviceType}+${config.scenario}@test.local`,
          password: 'Test@123456',
          name: `Teste ${config.name}`,
          phone: this.generatePhone(config.uf),
          cpf: this.generateCPF(),
          cnh: this.generateCNH(),
          cnhCategory: 'B',
          addressStreet: `Rua de Teste ${config.scenario}`,
          addressNumber: config.scenario.padStart(3, '0'),
          addressNeighborhood: 'Centro',
          addressZipCode: this.generateCEP(config.uf),
          addressCityState: `${ufInfo.city}/${ufInfo.state}`,
          serviceType,
          scenario: config.scenario,
          testRunId: TEST_RUN_ID,
        };
        this.testUsers.push(user);
      }
    }
  }

  private generatePhone(uf: string): string {
    const dddMap: Record<string, string> = {
      'SP': '11', 'RJ': '21', 'MG': '31', 'RS': '51',
      'PR': '41', 'PE': '81', 'BA': '71', 'GO': '62',
      'AM': '92', 'DF': '61', 'SC': '48', 'ES': '27', 'CE': '85',
    };
    const ddd = dddMap[uf] || '11';
    const num = Math.floor(100000000 + Math.random() * 900000000);
    return `(${ddd}) 9${num.toString().slice(0, 4)}-${num.toString().slice(4, 8)}`;
  }

  private generateCPF(): string {
    const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    const calc = (arr: number[], factor: number) => {
      const sum = arr.reduce((acc, d, i) => acc + d * (factor - i), 0);
      const mod = (sum * 10) % 11;
      return mod === 10 ? 0 : mod;
    };
    const d10 = calc(digits, 10);
    const d11 = calc([...digits, d10], 11);
    return `${digits.slice(0, 3).join('')}.${digits.slice(3, 6).join('')}.${digits.slice(6, 9).join('')}-${d10}${d11}`;
  }

  private generateCNH(): string {
    return Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
  }

  private generateCEP(uf: string): string {
    const cepMap: Record<string, string> = {
      'SP': '01000-000', 'RJ': '20000-000', 'MG': '30000-000', 'RS': '90000-000',
      'PR': '80000-000', 'PE': '50000-000', 'BA': '40000-000', 'GO': '74000-000',
      'AM': '69000-000', 'DF': '70000-000', 'SC': '88000-000', 'ES': '29000-000', 'CE': '60000-000',
    };
    return cepMap[uf] || '01000-000';
  }

  private async createUsersInAuth(): Promise<void> {
    for (const user of this.testUsers) {
      const { data, error } = await this.supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          phone_e164: user.phone.replace(/\D/g, ''),
          cpf: user.cpf,
          cnh: user.cnh,
          test_run_id: TEST_RUN_ID,
        },
      });
      
      if (error) {
        console.error(`[${TEST_RUN_ID}] Failed to create user ${user.email}:`, error.message);
      } else {
        user.id = data.user.id;
      }
    }
  }

  private async createProfilesAndCases(): Promise<void> {
    for (const user of this.testUsers) {
      // Create profile
      const { error: profileError } = await this.supabase
        .from('profiles')
        .insert({
          id: user.id,
          name: user.name,
          phone_e164: user.phone.replace(/\D/g, ''),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      if (profileError) {
        console.error(`[${TEST_RUN_ID}] Profile error for ${user.email}:`, profileError.message);
      }

      // Create case
      const caseConfig = COMMERCIAL_SERVICES[user.serviceType].find(c => c.scenario === user.scenario);
      if (!caseConfig) continue;

      const caseId = randomUUID();
      const testCase: TestCase = {
        id: caseId,
        userId: user.id,
        serviceType: user.serviceType,
        scenario: user.scenario,
        procedureType: this.getProcedureType(user.serviceType, caseConfig),
        infraction: this.buildInfraction(caseConfig, user),
        vehicle: this.buildVehicle(user),
        applicant: this.buildApplicant(user),
        testRunId: TEST_RUN_ID,
        status: 'created',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Map to database schema
      const caseRow = this.mapCaseToRow(testCase);
      const { error: caseError } = await this.supabase.from('cases').insert(caseRow);
      
      if (caseError) {
        console.error(`[${TEST_RUN_ID}] Case error for ${user.email}:`, caseError.message);
      } else {
        this.testCases.push(testCase);
      }
    }
  }

  private getProcedureType(serviceType: string, config: ServiceConfig): string {
    const mapping: Record<string, string> = {
      'defesa_previa': 'defesa_previa',
      'recurso_jari': 'recurso_jari',
      'recurso_cetran': 'recurso_cetran',
      'suspensao': 'suspensao_cnh',
      'cassacao': 'cassacao_cnh',
      'indicacao_condutor': 'indicacao_condutor',
      'conversao_advertencia': 'conversao_advertencia',
    };
    return mapping[serviceType] || 'recurso_jari';
  }

  private buildInfraction(config: ServiceConfig, user: TestUser): any {
    const infractionData: Record<string, any> = {
      '745-50': { description: 'Transitar em velocidade superior à máxima permitida em até 20%', ctbArticle: 'Art. 218, I do CTB', severity: 'media', points: 4, fineAmount: 130.16, speedLimit: 60, measuredSpeed: 73, consideredSpeed: 64 },
      '516-91': { description: 'Recusa ao teste do etilômetro / alcoolemia', ctbArticle: 'Art. 165-A do CTB', severity: 'gravissima', points: 7, fineAmount: 2934.70 },
      '736-62': { description: 'Segurar ou manusear telefone celular ao volante', ctbArticle: 'Art. 252, IV do CTB', severity: 'gravissima', points: 7, fineAmount: 293.47 },
      '746-30': { description: 'Avançar sinal vermelho', ctbArticle: 'Art. 208 do CTB', severity: 'gravissima', points: 7, fineAmount: 293.47 },
      '747-10': { description: 'Transitar em velocidade superior à máxima permitida em mais de 50%', ctbArticle: 'Art. 218, III do CTB', severity: 'gravissima', points: 7, fineAmount: 880.41, speedLimit: 60, measuredSpeed: 95, consideredSpeed: 88 },
      '516-92': { description: 'Condutor com capacidade psicomotora alterada por álcool', ctbArticle: 'Art. 165 do CTB', severity: 'gravissima', points: 7, fineAmount: 2934.70 },
      '666-10': { description: 'Estacionar em desacordo com a sinalização', ctbArticle: 'Art. 181 do CTB', severity: 'leve', points: 3, fineAmount: 88.38 },
      '735-80': { description: 'Transitar em velocidade superior à máxima permitida em até 20% (leve)', ctbArticle: 'Art. 218, I do CTB', severity: 'leve', points: 3, fineAmount: 88.38, speedLimit: 60, measuredSpeed: 71, consideredSpeed: 64 },
    };

    const base = infractionData[config.infractionCode] || infractionData['745-50'];
    return {
      aitNumber: `AIT-${config.uf}-${config.scenario}-${Date.now().toString().slice(-6)}`,
      infractionCode: config.infractionCode,
      ...base,
      autuadorBody: config.autuador,
      dateTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      location: `Av. Principal, 100 - ${user.addressCityState}`,
      notificationExpeditionDate: new Date().toISOString(),
      defenseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
    };
  }

  private buildVehicle(user: TestUser): any {
    const plates = ['ABC1D23', 'DEF2E34', 'GHI3F45', 'JKL4G56', 'MNO5H67', 'PQR6I78', 'STU7J89', 'VWX8K90'];
    return {
      plate: plates[Math.floor(Math.random() * plates.length)],
      brandModel: 'Honda Civic 2022',
      renavam: '85674321098',
      year: '2022',
      color: 'Prata',
    };
  }

  private buildApplicant(user: TestUser): any {
    return {
      applicantName: user.name,
      applicantCpf: user.cpf,
      applicantRg: `${Math.floor(10000000 + Math.random() * 90000000)}`,
      applicantCnh: user.cnh,
      cnhCategory: user.cnhCategory,
      applicantPhone: user.phone,
      applicantEmail: user.email,
      addressStreet: user.addressStreet,
      addressNumber: user.addressNumber,
      addressComplement: '',
      addressNeighborhood: user.addressNeighborhood,
      addressZipCode: user.addressZipCode,
      addressCityState: user.addressCityState,
      vehicleRenavam: '85674321098',
    };
  }

  private mapCaseToRow(testCase: TestCase): any {
    const infraction = testCase.infraction;
    const vehicle = testCase.vehicle;
    const applicant = testCase.applicant;
    
    return {
      id: testCase.id,
      title: `${testCase.serviceType} - ${testCase.scenario}`,
      client_name: applicant.applicantName,
      client_email: applicant.applicantEmail,
      client_phone: applicant.applicantPhone,
      client_cpf: applicant.applicantCpf,
      user_id: testCase.userId,
      status: 'draft',
      current_stage: 1,
      service_type: testCase.procedureType,
      vehicle_plate: vehicle.plate,
      vehicle_brand_model: vehicle.brandModel,
      vehicle_renavam: vehicle.renavam,
      vehicle_chassis: vehicle.chassis || null,
      vehicle_year: vehicle.year || null,
      vehicle_color: vehicle.color || null,
      ait_number: infraction.aitNumber,
      infraction_code: infraction.infractionCode,
      infraction_description: infraction.description,
      ctb_article: infraction.ctbArticle,
      severity: infraction.severity,
      points: infraction.points,
      fine_amount: infraction.fineAmount,
      autuador_body: infraction.autuadorBody,
      date_time: infraction.dateTime,
      location: infraction.location,
      speed_limit: infraction.speedLimit || null,
      measured_speed: infraction.measuredSpeed || null,
      considered_speed: infraction.consideredSpeed || null,
      radar_equipment_id: null,
      inmetro_aferition_date: null,
      notification_expedition_date: infraction.notificationExpeditionDate,
      defense_deadline: infraction.defenseDeadline,
      formal_flaws_json: '[]',
      analysis_json: null,
      defense_draft_json: null,
      protocol_info_json: null,
      applicant_json: JSON.stringify(applicant),
      ocr_auxiliary_json: null,
      commercial_offer_id: null,
      timeline_json: '[]',
      is_anonymous: false,
      claim_token: null,
      is_paid: false,
      paid_at: null,
      created_at: testCase.createdAt,
      updated_at: testCase.updatedAt,
    };
  }

  async saveEvidence(filename: string, data: any): Promise<void> {
    const filepath = path.join(this.evidenceDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`[${TEST_RUN_ID}] Evidence saved: ${filename}`);
  }

  async getTestUsers(): Promise<TestUser[]> {
    return this.testUsers;
  }

  async getTestCases(): Promise<TestCase[]> {
    return this.testCases;
  }

  async getEvidenceDir(): Promise<string> {
    return this.evidenceDir;
  }
}

// Singleton instance
let managerInstance: E2ETestManager | null = null;

export async function getE2ETestManager(): Promise<E2ETestManager> {
  if (!managerInstance) {
    managerInstance = new E2ETestManager();
    await managerInstance.initialize();
  }
  return managerInstance;
}