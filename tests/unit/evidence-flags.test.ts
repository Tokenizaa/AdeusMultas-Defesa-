/**
 * Fase 8-P1A — Testes de Captura de Evidência Explícita
 *
 * Estes testes provam que:
 *  1. hasEvidence = false é preservado.
 *  2. hasEvidence = true é preservado quando explicitamente fornecido.
 *  3. ausência do campo mantém comportamento compatível com dados antigos.
 *  4. nenhum valor é inferido automaticamente como evidência.
 *  5. o dado atravessa o mapper/canonical sem ser perdido.
 *  6. o fluxo existente continua fail-closed quando a evidência necessária não existe.
 */
import { describe, it, expect } from 'vitest';
import { CanonicalMapper } from '../../src/core/mappers/canonical-mapper';
import type { CaseDomain, CaseRow, CanonicalOnboardingPayload } from '../../src/types';

describe('Fase 8-P1A — Captura de evidência explícita', () => {
  describe('CaseRow ↔ CaseDomain (canonical-mapper)', () => {
    it('preserva evidenceFlags = true quando explicitamente fornecido', () => {
      const domain: CaseDomain = {
        id: 'case_1',
        title: 'Teste',
        clientName: 'João',
        clientEmail: 'joao@test.com',
        clientPhone: '11999999999',
        clientCpf: '123.456.789-09',
        status: 'novo',
        currentStage: 1,
        serviceType: 'recurso_jari',
        vehicle: { plate: 'ABC-1234', brandModel: 'Fiat' },
        infraction: {
          aitNumber: 'AIT-1',
          infractionCode: '745-50',
          description: 'Excesso de velocidade',
          ctbArticle: 'Art. 218',
          severity: 'media',
          points: 4,
          fineAmount: 130.16,
          autuadorBody: 'DETRAN-SP',
          dateTime: '2024-01-01T10:00:00Z',
          location: 'Av. Paulista',
          evidenceFlags: {
            placaR19Visivel: true,
            fotoSemaforo: true,
          },
        },
        timeline: [],
        isPaid: false,
        isAnonymous: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      };

      const row = CanonicalMapper.domainToRow(domain);
      expect(row.evidence_json).toBeDefined();
      const parsed = JSON.parse(row.evidence_json!);
      expect(parsed).toEqual({
        placaR19Visivel: true,
        fotoSemaforo: true,
      });

      const domainBack = CanonicalMapper.rowToDomain(row);
      expect(domainBack.infraction.evidenceFlags).toEqual({
        placaR19Visivel: true,
        fotoSemaforo: true,
      });
    });

    it('preserva evidenceFlags = false quando explicitamente fornecido', () => {
      const domain: CaseDomain = {
        id: 'case_2',
        title: 'Teste',
        clientName: 'Maria',
        clientEmail: 'maria@test.com',
        clientPhone: '11988888888',
        clientCpf: '987.654.321-00',
        status: 'novo',
        currentStage: 1,
        serviceType: 'recurso_jari',
        vehicle: { plate: 'XYZ-9876', brandModel: 'VW' },
        infraction: {
          aitNumber: 'AIT-2',
          infractionCode: '745-50',
          description: 'Excesso de velocidade',
          ctbArticle: 'Art. 218',
          severity: 'media',
          points: 4,
          fineAmount: 130.16,
          autuadorBody: 'DETRAN-SP',
          dateTime: '2024-01-01T10:00:00Z',
          location: 'Av. Paulista',
          evidenceFlags: {
            placaR19Visivel: false,
            fotoSemaforo: false,
          },
        },
        timeline: [],
        isPaid: false,
        isAnonymous: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      };

      const row = CanonicalMapper.domainToRow(domain);
      expect(row.evidence_json).toBeDefined();
      const parsed = JSON.parse(row.evidence_json!);
      expect(parsed).toEqual({
        placaR19Visivel: false,
        fotoSemaforo: false,
      });

      const domainBack = CanonicalMapper.rowToDomain(row);
      expect(domainBack.infraction.evidenceFlags).toEqual({
        placaR19Visivel: false,
        fotoSemaforo: false,
      });
    });

    it('mantém compatibilidade com dados antigos (ausência do campo)', () => {
      const domain: CaseDomain = {
        id: 'case_3',
        title: 'Teste',
        clientName: 'Ana',
        clientEmail: 'ana@test.com',
        clientPhone: '11977777777',
        clientCpf: '111.222.333-44',
        status: 'novo',
        currentStage: 1,
        serviceType: 'recurso_jari',
        vehicle: { plate: 'OLD-0001', brandModel: 'Chevrolet' },
        infraction: {
          aitNumber: 'AIT-3',
          infractionCode: '745-50',
          description: 'Excesso de velocidade',
          ctbArticle: 'Art. 218',
          severity: 'media',
          points: 4,
          fineAmount: 130.16,
          autuadorBody: 'DETRAN-SP',
          dateTime: '2024-01-01T10:00:00Z',
          location: 'Av. Paulista',
        },
        timeline: [],
        isPaid: false,
        isAnonymous: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      };

      const row = CanonicalMapper.domainToRow(domain);
      expect(row.evidence_json).toBeUndefined();

      const domainBack = CanonicalMapper.rowToDomain(row);
      expect(domainBack.infraction.evidenceFlags).toBeUndefined();
    });

    it('não infere valor automaticamente (campo vazio permanece vazio)', () => {
      const domain: CaseDomain = {
        id: 'case_4',
        title: 'Teste',
        clientName: 'Carlos',
        clientEmail: 'carlos@test.com',
        clientPhone: '11966666666',
        clientCpf: '555.666.777-88',
        status: 'novo',
        currentStage: 1,
        serviceType: 'recurso_jari',
        vehicle: { plate: 'INF-0001', brandModel: 'Renault' },
        infraction: {
          aitNumber: 'AIT-4',
          infractionCode: '745-50',
          description: 'Excesso de velocidade',
          ctbArticle: 'Art. 218',
          severity: 'media',
          points: 4,
          fineAmount: 130.16,
          autuadorBody: 'DETRAN-SP',
          dateTime: '2024-01-01T10:00:00Z',
          location: 'Av. Paulista',
          // O usuário NÃO forneceu nenhuma evidência.
          // O sistema NÃO deve inferir evidenceFlags = {} ou qualquer outro valor.
        },
        timeline: [],
        isPaid: false,
        isAnonymous: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      };

      const row = CanonicalMapper.domainToRow(domain);
      expect(row.evidence_json).toBeUndefined();

      const domainBack = CanonicalMapper.rowToDomain(row);
      expect(domainBack.infraction.evidenceFlags).toBeUndefined();
      // Garantir que o mapper não inventou uma chave "vazia" ou "true".
      expect(domainBack.infraction.evidenceFlags).not.toEqual({});
    });
  });

  describe('OnboardingPayload → CaseDomain (onboardingPayloadToDomain)', () => {
    it('preserva evidenceFlags vindo do payload', () => {
      const payload: CanonicalOnboardingPayload = {
        procedureType: 'recurso_jari',
        vehicle: { plate: 'PAY-0001', brandModel: 'Honda' },
        infraction: {
          aitNumber: 'PAY-1',
          infractionCode: '745-50',
          description: 'Excesso de velocidade',
          ctbArticle: 'Art. 218',
          severity: 'media',
          points: 4,
          fineAmount: 130.16,
          autuadorBody: 'DETRAN-SP',
          dateTime: '2024-01-01T10:00:00Z',
          location: 'Av. Paulista',
          evidenceFlags: {
            placaR19Visivel: true,
            fotoSemaforo: true,
          },
        },
      };

      const domain = CanonicalMapper.onboardingPayloadToDomain(payload, 'case_payload_1');
      expect(domain.infraction.evidenceFlags).toEqual({
        placaR19Visivel: true,
        fotoSemaforo: true,
      });
    });

    it('ausência de evidenceFlags no payload é compatível (não força valor)', () => {
      const payload: CanonicalOnboardingPayload = {
        procedureType: 'recurso_jari',
        vehicle: { plate: 'PAY-0002', brandModel: 'Toyota' },
        infraction: {
          aitNumber: 'PAY-2',
          infractionCode: '745-50',
          description: 'Excesso de velocidade',
          ctbArticle: 'Art. 218',
          severity: 'media',
          points: 4,
          fineAmount: 130.16,
          autuadorBody: 'DETRAN-SP',
          dateTime: '2024-01-01T10:00:00Z',
          location: 'Av. Paulista',
        },
      };

      const domain = CanonicalMapper.onboardingPayloadToDomain(payload, 'case_payload_2');
      expect(domain.infraction.evidenceFlags).toBeUndefined();
    });
  });

  describe('Fluxo fail-closed — evidência ausente não é tratada como fornecida', () => {
    it('quando evidenceFlags é undefined, o sistema continua fail-closed', () => {
      const domain: CaseDomain = {
        id: 'case_failclosed',
        title: 'Teste',
        clientName: 'Pedro',
        clientEmail: 'pedro@test.com',
        clientPhone: '11955555555',
        clientCpf: '999.888.777-66',
        status: 'novo',
        currentStage: 1,
        serviceType: 'recurso_jari',
        vehicle: { plate: 'FAIL-0001', brandModel: 'Ford' },
        infraction: {
          aitNumber: 'FAIL-1',
          infractionCode: '745-50',
          description: 'Excesso de velocidade',
          ctbArticle: 'Art. 218',
          severity: 'media',
          points: 4,
          fineAmount: 130.16,
          autuadorBody: 'DETRAN-SP',
          dateTime: '2024-01-01T10:00:00Z',
          location: 'Av. Paulista',
          // evidenceFlags intencionalmente ausente
        },
        timeline: [],
        isPaid: false,
        isAnonymous: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      };

      const row = CanonicalMapper.domainToRow(domain);
      const domainBack = CanonicalMapper.rowToDomain(row);

      // A ausência de evidência deve permanecer ausência.
      // Nenhuma chave deve ser criada automaticamente.
      expect(domainBack.infraction.evidenceFlags).toBeUndefined();
    });
  });
});