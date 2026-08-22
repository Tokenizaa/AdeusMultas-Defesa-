import { CaseRepository, caseRepository } from '../db/case-repository';
import { CanonicalMapper } from '../../core/mappers/canonical-mapper';
import { CaseDomain, CaseRow, AuditLogEntry } from '../../types';
import { INITIAL_MARKETING_AGENTS, INITIAL_EDITORIAL_CONTENTS } from '../../data/marketing-agents-data';
import { RagPipeline } from '../../core/rag/rag-pipeline';

// State service to hold in-memory data that was previously in server.ts global scope
class StateService {
  private databaseRows: CaseRepository;
  private marketingAgents: any[];
  private editorialContents: any[];
  private auditLogs: AuditLogEntry[];

  constructor() {
    // Use the shared caseRepository instance instead of creating a new one
    this.databaseRows = caseRepository;
    this.marketingAgents = [...INITIAL_MARKETING_AGENTS];
    this.editorialContents = [...INITIAL_EDITORIAL_CONTENTS];
    this.auditLogs = [];
    
    // Seed initial data
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed data — APENAS em desenvolvimento
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    // Seed initial demo case - simplified version
    const sampleDomain: CaseDomain = {
      id: 'case_sp_74550_demo',
      title: 'Recurso Auto 1B892014 — Excesso de Velocidade até 20%',
      clientName: 'Carlos Eduardo Silveira',
      clientEmail: 'carlos.silveira@email.com',
      clientPhone: '(11) 98765-4321',
      clientCpf: '123.456.789-00',
      status: 'defesa_pronta',
      currentStage: 3,
      serviceType: 'conversao_advertencia',
      vehicle: {
        plate: 'ABC4E89',
        brandModel: 'Volkswagen Polo Highline 200 TSI',
        renavam: '00987654321',
        year: '2023',
        color: 'Prata',
      },
      infraction: {
        aitNumber: '1B892014',
        infractionCode: '745-50',
        description: 'Transitar em velocidade superior à máxima permitida em até 20%',
        ctbArticle: 'Art. 218, I do CTB',
        severity: 'media',
        points: 4,
        fineAmount: 130.16,
        autuadorBody: 'DETRAN-SP — Departamento Estadual de Trânsito de São Paulo',
        dateTime: '2026-07-15 14:32:10',
        location: 'Av. das Nações Unidas, alt. nº 14.401 — São Paulo/SP',
        speedLimit: 60,
        measuredSpeed: 68,
        consideredSpeed: 61,
        radarEquipmentId: 'RAD-METRO-0941',
        inmetroAferitionDate: '2025-05-10',
        notificationExpeditionDate: '2026-08-01',
        defenseDeadline: '2026-09-02',
        formalFlawsDetected: [
          'Aferição metrológica do radar expirada há mais de 12 meses',
          'Ausência de placa R-19 regulamentar no trecho fiscalizado',
          'Elegível para conversão em advertência por escrito (Art. 267 CTB)',
        ],
      },
      isAnonymous: false,
      isPaid: true,
      paidAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [],
    };

    // Run initial analysis and generate defense
    const analysis = RagPipeline.analyzeInfraction(sampleDomain.id, sampleDomain.infraction);
    sampleDomain.analysis = analysis;

    const defense = RagPipeline.generateDefenseDraft(
      sampleDomain.id,
      sampleDomain.infraction,
      sampleDomain.vehicle.plate,
      sampleDomain.vehicle.brandModel,
      {
        name: sampleDomain.clientName,
        cpf: sampleDomain.clientCpf || '123.456.789-00',
        cnh: '05492817492',
        address: 'Rua das Flores, 450, Apto 82, Vila Madalena',
        cityState: 'São Paulo/SP',
      },
      analysis.recommendedArguments,
      'conversao_advertencia'
    );
    sampleDomain.defenseDraft = defense;

    const row = CanonicalMapper.domainToRow(sampleDomain);
    this.databaseRows.set(row.id, row);

    // Initial audit log
    this.auditLogs.unshift({
      id: `audit_init_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Sistema / Seeder',
      role: 'system_orchestrator',
      action: 'CASE_INITIALIZED',
      targetResource: sampleDomain.id,
      ipHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      details: 'Caso de demonstração cadastrado com sucesso.',
      gdprCompliant: true,
    });
  }

  // Getters for the state
  getDatabaseRows() {
    return this.databaseRows;
  }

  getAuditLogs() {
    return this.auditLogs;
  }

  getMarketingAgents() {
    return this.marketingAgents;
  }

  getEditorialContents() {
    return this.editorialContents;
  }
}

export const stateService = new StateService();
