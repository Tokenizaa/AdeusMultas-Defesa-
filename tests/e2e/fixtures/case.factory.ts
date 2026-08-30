/**
 * @file case.factory.ts
 * DefesAi — Fábrica de Cenários e Dados de Casos E2E por Serviço
 */

import { ProcedureType, CaseDomain } from '../../src/types';
import { TestUser } from './user.factory';

export interface TestCaseScenario {
  scenarioId: string;
  scenarioName: string;
  serviceKey: string;
  procedureType: ProcedureType;
  user: TestUser;
  watermark: string;
  vehicle: {
    plate: string;
    brandModel: string;
    renavam: string;
  };
  infraction: {
    aitNumber: string;
    infractionCode: string;
    description: string;
    ctbArticle: string;
    severity: 'leve' | 'media' | 'grave' | 'gravissima';
    points: number;
    fineAmount: number;
    autuadorBody: string;
    location: string;
    speedLimit?: number;
    measuredSpeed?: number;
    consideredSpeed?: number;
    formalFlaws: string[];
  };
  factsNarrative: string;
}

export class TestCaseFactory {
  public static createScenario(
    serviceKey: string,
    scenarioIndex: number,
    user: TestUser
  ): TestCaseScenario {
    const pad = String(user.index).padStart(3, '0');
    const watermark = `E2E-WM-${serviceKey.toUpperCase()}-${pad}`;

    switch (serviceKey) {
      case 'defesa-previa':
        return {
          scenarioId: `defesa-previa-sc-0${scenarioIndex}`,
          scenarioName: `Defesa Prévia (Notificação de Autuação) - Variação ${scenarioIndex}`,
          serviceKey,
          procedureType: 'defesa_previa',
          user,
          watermark,
          vehicle: {
            plate: `PRV-${pad.slice(0, 4)}`,
            brandModel: 'Toyota Corolla Altis',
            renavam: `98765432${pad}`,
          },
          infraction: {
            aitNumber: `NA-${pad}-2026`,
            infractionCode: '745-50',
            description: `Transitar em velocidade superior à máxima permitida em até 20% [${watermark}]`,
            ctbArticle: 'Art. 218, Inciso I do CTB',
            severity: 'media',
            points: 4,
            fineAmount: 130.16,
            autuadorBody: 'DETRAN-SP',
            location: `${user.address.city} - ${user.address.uf}`,
            speedLimit: 60,
            measuredSpeed: 69,
            consideredSpeed: 62,
            formalFlaws: ['Notificação expedida após 30 dias (Art. 281, II do CTB)'],
          },
          factsNarrative: `O condutor demonstra que a Notificação de Autuação nº NA-${pad}-2026 foi expedida fora do prazo legal de 30 dias.`,
        };

      case 'recurso-jari':
        return {
          scenarioId: `recurso-jari-sc-0${scenarioIndex}`,
          scenarioName: `Recurso Ordinário à JARI - Variação ${scenarioIndex}`,
          serviceKey,
          procedureType: 'recurso_jari',
          user,
          watermark,
          vehicle: {
            plate: `JAR-${pad.slice(0, 4)}`,
            brandModel: 'Honda Civic Touring',
            renavam: `87654321${pad}`,
          },
          infraction: {
            aitNumber: `NIP-JARI-${pad}`,
            infractionCode: '746-30',
            description: `Transitar em velocidade superior à máxima permitida em mais de 20% até 50% [${watermark}]`,
            ctbArticle: 'Art. 218, Inciso II do CTB',
            severity: 'grave',
            points: 5,
            fineAmount: 195.23,
            autuadorBody: 'DER-SP',
            location: `${user.address.city} - ${user.address.uf}`,
            speedLimit: 80,
            measuredSpeed: 102,
            consideredSpeed: 95,
            formalFlaws: ['Inconsistência na aferição metrológica do radar'],
          },
          factsNarrative: `Recurso à JARI contestando a NIP nº NIP-JARI-${pad} por ausência de aferição metrológica válida no equipamento.`,
        };

      case 'recurso-cetran':
        return {
          scenarioId: `recurso-cetran-sc-0${scenarioIndex}`,
          scenarioName: `Recurso Final ao CETRAN (2ª Instância) - Variação ${scenarioIndex}`,
          serviceKey,
          procedureType: 'recurso_cetran',
          user,
          watermark,
          vehicle: {
            plate: `CET-${pad.slice(0, 4)}`,
            brandModel: 'Volkswagen T-Cross',
            renavam: `76543210${pad}`,
          },
          infraction: {
            aitNumber: `CETRAN-${pad}-2026`,
            infractionCode: '516-91',
            description: `Dirigir sob a influência de álcool ou recusar etilômetro [${watermark}]`,
            ctbArticle: 'Art. 165 do CTB',
            severity: 'gravissima',
            points: 7,
            fineAmount: 2934.70,
            autuadorBody: 'DETRAN-RJ',
            location: `${user.address.city} - ${user.address.uf}`,
            formalFlaws: ['Ausência de motivação na decisão da JARI de 1ª instância'],
          },
          factsNarrative: `Recurso de 2ª instância ao CETRAN demonstrando vício de fundamentação no indeferimento prévio da JARI.`,
        };

      case 'suspensao':
        return {
          scenarioId: `suspensao-sc-0${scenarioIndex}`,
          scenarioName: `Defesa de Suspensão de CNH (PSDD) - Variação ${scenarioIndex}`,
          serviceKey,
          procedureType: 'suspensao_cnh',
          user,
          watermark,
          vehicle: {
            plate: `SUS-${pad.slice(0, 4)}`,
            brandModel: 'Jeep Compass Limited',
            renavam: `65432109${pad}`,
          },
          infraction: {
            aitNumber: `PSDD-${pad}-2026`,
            infractionCode: '747-10',
            description: `Processo de Suspensão do Direito de Dirigir por Acúmulo de Pontos [${watermark}]`,
            ctbArticle: 'Art. 261 do CTB',
            severity: 'gravissima',
            points: 20,
            fineAmount: 0,
            autuadorBody: 'DETRAN-MG',
            location: `${user.address.city} - ${user.address.uf}`,
            formalFlaws: ['Prescrição intercorrente e falha na notificação de instauração'],
          },
          factsNarrative: `Defesa técnica no Processo de Suspensão PSDD-${pad}-2026 visando evitar a penalidade de bloqueio da CNH.`,
        };

      case 'cassacao':
        return {
          scenarioId: `cassacao-sc-0${scenarioIndex}`,
          scenarioName: `Defesa de Cassação de CNH (PCDD) - Variação ${scenarioIndex}`,
          serviceKey,
          procedureType: 'cassacao_cnh',
          user,
          watermark,
          vehicle: {
            plate: `CAS-${pad.slice(0, 4)}`,
            brandModel: 'Chevrolet Tracker Premier',
            renavam: `54321098${pad}`,
          },
          infraction: {
            aitNumber: `PCDD-${pad}-2026`,
            infractionCode: '501-00',
            description: `Defesa em Processo de Cassação do Documento de Habilitação [${watermark}]`,
            ctbArticle: 'Art. 263 do CTB',
            severity: 'gravissima',
            points: 0,
            fineAmount: 0,
            autuadorBody: 'DETRAN-PR',
            location: `${user.address.city} - ${user.address.uf}`,
            formalFlaws: ['Ausência de flagrante com identificação do condutor'],
          },
          factsNarrative: `Defesa em Processo de Cassação da CNH nº PCDD-${pad}-2026 demonstrando não condução no momento da infração.`,
        };

      case 'indicacao-condutor':
        return {
          scenarioId: `indicacao-condutor-sc-0${scenarioIndex}`,
          scenarioName: `Formulário de Indicação do Real Condutor (FARI) - Variação ${scenarioIndex}`,
          serviceKey,
          procedureType: 'indicacao_condutor',
          user,
          watermark,
          vehicle: {
            plate: `FAR-${pad.slice(0, 4)}`,
            brandModel: 'Hyundai HB20',
            renavam: `43210987${pad}`,
          },
          infraction: {
            aitNumber: `FARI-${pad}-2026`,
            infractionCode: '605-03',
            description: `Avançar o sinal vermelho do semáforo [${watermark}]`,
            ctbArticle: 'Art. 208 do CTB',
            severity: 'gravissima',
            points: 7,
            fineAmount: 293.47,
            autuadorBody: 'EPTC Porto Alegre',
            location: `${user.address.city} - ${user.address.uf}`,
            formalFlaws: ['Veículo conduzido por terceiro devidamente habilitado'],
          },
          factsNarrative: `Requerimento de Indicação do Real Condutor Infrator para transferência regular de pontuação.`,
        };

      case 'conversao-advertencia':
        return {
          scenarioId: `conversao-advertencia-sc-0${scenarioIndex}`,
          scenarioName: `Requerimento de Conversão em Advertência (Art. 267) - Variação ${scenarioIndex}`,
          serviceKey,
          procedureType: 'conversao_advertencia',
          user,
          watermark,
          vehicle: {
            plate: `ADV-${pad.slice(0, 4)}`,
            brandModel: 'Fiat Pulse Audace',
            renavam: `32109876${pad}`,
          },
          infraction: {
            aitNumber: `ADV-${pad}-2026`,
            infractionCode: '545-21',
            description: `Estacionar em local proibido (Infração Média) [${watermark}]`,
            ctbArticle: 'Art. 181, Inciso XVIII do CTB',
            severity: 'media',
            points: 4,
            fineAmount: 130.16,
            autuadorBody: 'TRANSALVADOR',
            location: `${user.address.city} - ${user.address.uf}`,
            formalFlaws: ['Condutor sem infrações nos últimos 12 meses (Direito subjetivo)'],
          },
          factsNarrative: `Requerimento formal baseado no Art. 267 do CTB para conversão compulsória de multa média em advertência por escrito.`,
        };

      case 'analise-tecnica':
        return {
          scenarioId: `analise-tecnica-sc-0${scenarioIndex}`,
          scenarioName: `Parecer Técnico de Consistência e Vícios Formais - Variação ${scenarioIndex}`,
          serviceKey,
          procedureType: 'analise_tecnica',
          user,
          watermark,
          vehicle: {
            plate: `TEC-${pad.slice(0, 4)}`,
            brandModel: 'Nissan Kicks Exclusive',
            renavam: `21098765${pad}`,
          },
          infraction: {
            aitNumber: `TEC-${pad}-2026`,
            infractionCode: '745-50',
            description: `Auditoria e Laudo de Inconsistências Formais do Auto [${watermark}]`,
            ctbArticle: 'Portaria SENATRAN nº 354/2022',
            severity: 'media',
            points: 4,
            fineAmount: 130.16,
            autuadorBody: 'DETRAN-SC',
            location: `${user.address.city} - ${user.address.uf}`,
            formalFlaws: ['Campos obrigatórios da Portaria 354/22 ausentes no espelho do AIT'],
          },
          factsNarrative: `Parecer técnico pericial de auditoria regulatória do Auto de Infração de Trânsito nº TEC-${pad}-2026.`,
        };

      case 'relatorio-pericial':
      default:
        return {
          scenarioId: `relatorio-pericial-sc-0${scenarioIndex}`,
          scenarioName: `Relatório Técnico Pericial de Engenharia e Radar - Variação ${scenarioIndex}`,
          serviceKey,
          procedureType: 'relatorio_pericial',
          user,
          watermark,
          vehicle: {
            plate: `PER-${pad.slice(0, 4)}`,
            brandModel: 'Ford Territory Titanium',
            renavam: `10987654${pad}`,
          },
          infraction: {
            aitNumber: `PER-${pad}-2026`,
            infractionCode: '745-50',
            description: `Perícia Metrológica de Radar e Distância de Sinalização R-19 [${watermark}]`,
            ctbArticle: 'Resolução CONTRAN nº 798/2020',
            severity: 'grave',
            points: 5,
            fineAmount: 195.23,
            autuadorBody: 'DNIT',
            location: `${user.address.city} - ${user.address.uf}`,
            speedLimit: 100,
            measuredSpeed: 118,
            consideredSpeed: 110,
            formalFlaws: ['Estudo técnico de visibilidade da placa R-19 não disponibilizado'],
          },
          factsNarrative: `Laudo técnico pericial de engenharia metrológica avaliando a conformidade do equipamento medidor.`,
        };
    }
  }
}
