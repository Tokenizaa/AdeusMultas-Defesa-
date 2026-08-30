/**
 * Fixtures determinísticos p/ auditoria de fluxos jurídicos.
 * Nenhum dado aqui é fallback em produção — são entradas de teste explícitas.
 */
import type { InfractionData, VehicleData, CaseApplicantData } from '../../src/types';

export function makeInfraction(overrides: Partial<InfractionData> = {}): InfractionData {
  return {
    aitNumber: 'AIT-TST-001',
    infractionCode: '745-50',
    description: 'Transitar em velocidade superior à máxima permitida em até 20%',
    ctbArticle: 'Art. 218, I do CTB',
    severity: 'media',
    points: 4,
    fineAmount: 130.16,
    autuadorBody: 'DETRAN-SP',
    dateTime: '2026-01-15T10:30:00',
    location: 'Av. Central, 1000',
    speedLimit: 60,
    measuredSpeed: 78,
    consideredSpeed: 71,
    defenseDeadline: '15/03/2026',
    ...overrides,
  };
}

export function makeVehicle(plate = 'ABC-1D23'): VehicleData {
  return { plate, brandModel: 'Honda Civic', renavam: '85674321098' };
}

export function makeApplicant(cityState = 'São Paulo/SP'): CaseApplicantData {
  return {
    applicantName: 'João da Silva',
    applicantCpf: '123.456.789-00',
    applicantCnh: '12345678900',
    cnhCategory: 'B',
    applicantPhone: '(11) 99999-0000',
    applicantEmail: 'joao@teste.com',
    addressStreet: 'Rua das Flores, 123',
    addressNumber: '123',
    addressNeighborhood: 'Centro',
    addressZipCode: '01000-000',
    addressCityState: cityState,
  };
}