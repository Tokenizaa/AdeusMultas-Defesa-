/**
 * Test Document Fixtures for E2E Tests
 * Creates realistic PDF documents for uploads
 */

import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'e2e-fixtures');

// Create directory if not exists
fs.mkdirSync(FIXTURES_DIR, { recursive: true });

/**
 * Simple PDF generator for test documents
 * Uses minimal PDF structure - not for production use
 */
function createSimplePDF(content: string, metadata: { title: string; author: string }): Buffer {
  // Minimal PDF structure
  const pdfHeader = '%PDF-1.4\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;
  const textContent = content.replace(/\n/g, ' Tj\n');
  const obj4 = `4 0 obj\n<< /Length ${textContent.length + 50} >>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(${textContent}) Tj\nET\nendstream\nendobj\n`;
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const xref = `xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000220 00000 n \n0000000400 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n500\n%%EOF\n`;
  
  return Buffer.from(pdfHeader + obj1 + obj2 + obj3 + obj4 + obj5 + xref);
}

/**
 * Generate AIT (Auto de Infração de Trânsito) PDF
 */
export function generateAIT(data: {
  aitNumber: string;
  infractionCode: string;
  description: string;
  ctbArticle: string;
  dateTime: string;
  location: string;
  autuadorBody: string;
  plate: string;
  brandModel: string;
  speedLimit?: number;
  measuredSpeed?: number;
  consideredSpeed?: number;
}): Buffer {
  const content = `
AUTO DE INFRAÇÃO DE TRÂNSITO
============================

NÚMERO DO AIT: ${data.aitNumber}
DATA/HORA: ${new Date(data.dateTime).toLocaleString('pt-BR')}
LOCAL: ${data.location}

VEÍCULO
Placa: ${data.plate}
Marca/Modelo: ${data.brandModel}

INFRAÇÃO
Código: ${data.infractionCode}
Descrição: ${data.description}
Artigo CTB: ${data.ctbArticle}
${data.speedLimit ? `Velocidade Permitida: ${data.speedLimit} km/h` : ''}
${data.measuredSpeed ? `Velocidade Medida: ${data.measuredSpeed} km/h` : ''}
${data.consideredSpeed ? `Velocidade Considerada: ${data.consideredSpeed} km/h` : ''}

ÓRGÃO AUTUADOR: ${data.autuadorBody}

ASSINATURA DO AGENTE: __________________________

OBS: Documento de teste para E2E - ${new Date().toISOString()}
`;
  return createSimplePDF(content, { title: 'AIT', author: data.autuadorBody });
}

/**
 * Generate CNH PDF
 */
export function generateCNH(data: {
  name: string;
  cpf: string;
  cnhNumber: string;
  category: string;
  validity: string;
}): Buffer {
  const content = `
CARTEIRA NACIONAL DE HABILITAÇÃO
================================

NOME: ${data.name}
CPF: ${data.cpf}
NÚMERO CNH: ${data.cnhNumber}
CATEGORIA: ${data.category}
VALIDADE: ${data.validity}

EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}

OBS: Documento de teste para E2E - ${new Date().toISOString()}
`;
  return createSimplePDF(content, { title: 'CNH', author: 'DETRAN' });
}

/**
 * Generate CRLV (Certificado de Registro e Licenciamento de Veículo) PDF
 */
export function generateCRLV(data: {
  plate: string;
  brandModel: string;
  renavam: string;
  year: string;
  color: string;
  ownerName: string;
  ownerCpf: string;
}): Buffer {
  const content = `
CERTIFICADO DE REGISTRO E LICENCIAMENTO DE VEÍCULO
==================================================

PLACA: ${data.plate}
MARCA/MODELO: ${data.brandModel}
RENAVAM: ${data.renavam}
ANO: ${data.year}
COR: ${data.color}

PROPRIETÁRIO: ${data.ownerName}
CPF: ${data.ownerCpf}

EXERCÍCIO: ${new Date().getFullYear()}

OBS: Documento de teste para E2E - ${new Date().toISOString()}
`;
  return createSimplePDF(content, { title: 'CRLV', author: 'DETRAN' });
}

/**
 * Generate Notificação de Autuação (NA) PDF
 */
export function generateNA(data: {
  aitNumber: string;
  infractionCode: string;
  description: string;
  dateTime: string;
  location: string;
  autuadorBody: string;
  plate: string;
  deadline: string;
}): Buffer {
  const content = `
NOTIFICAÇÃO DE AUTUAÇÃO
=======================

NÚMERO DO AIT: ${data.aitNumber}
DATA/HORA DA INFRAÇÃO: ${new Date(data.dateTime).toLocaleString('pt-BR')}
LOCAL: ${data.location}

VEÍCULO
Placa: ${data.plate}

INFRAÇÃO
Código: ${data.infractionCode}
Descrição: ${data.description}

ÓRGÃO AUTUADOR: ${data.autuadorBody}

PRAZO PARA DEFESA PRÉVIA: ${data.deadline}

OBS: Documento de teste para E2E - ${new Date().toISOString()}
`;
  return createSimplePDF(content, { title: 'Notificação de Autuação', author: data.autuadorBody });
}

/**
 * Generate Notificação de Imposição de Penalidade (NIP) PDF
 */
export function generateNIP(data: {
  aitNumber: string;
  infractionCode: string;
  description: string;
  dateTime: string;
  location: string;
  autuadorBody: string;
  plate: string;
  fineAmount: number;
  points: number;
  deadline: string;
}): Buffer {
  const content = `
NOTIFICAÇÃO DE IMPOSIÇÃO DE PENALIDADE
======================================

NÚMERO DO AIT: ${data.aitNumber}
DATA/HORA DA INFRAÇÃO: ${new Date(data.dateTime).toLocaleString('pt-BR')}
LOCAL: ${data.location}

VEÍCULO
Placa: ${data.plate}

INFRAÇÃO
Código: ${data.infractionCode}
Descrição: ${data.description}

PENALIDADE
Valor da Multa: R$ ${data.fineAmount.toFixed(2)}
Pontos na CNH: ${data.points}

ÓRGÃO AUTUADOR: ${data.autuadorBody}

PRAZO PARA RECURSO: ${data.deadline}

OBS: Documento de teste para E2E - ${new Date().toISOString()}
`;
  return createSimplePDF(content, { title: 'Notificação de Penalidade', author: data.autuadorBody });
}

/**
 * Generate Notificação de Instauração de PSDD PDF
 */
export function generatePSDD(data: {
  processNumber: string;
  name: string;
  cpf: string;
  cnh: string;
  points: number;
  infractions: string[];
  autuadorBody: string;
  deadline: string;
}): Buffer {
  const content = `
NOTIFICAÇÃO DE INSTAURAÇÃO DE PROCESSO DE SUSPENSÃO
===================================================

NÚMERO DO PROCESSO: ${data.processNumber}
CONDUTOR: ${data.name}
CPF: ${data.cpf}
CNH: ${data.cnh}

PONTUAÇÃO ACUMULADA: ${data.points} pontos

INFRAÇÕES COMPONENTES:
${data.infractions.map(i => `- ${i}`).join('\n')}

ÓRGÃO AUTUADOR: ${data.autuadorBody}

PRAZO PARA DEFESA: ${data.deadline}

OBS: Documento de teste para E2E - ${new Date().toISOString()}
`;
  return createSimplePDF(content, { title: 'PSDD', author: data.autuadorBody });
}

/**
 * Generate all test fixtures for a test case
 */
export function generateAllFixtures(testCase: any): void {
  const user = testCase.applicant;
  const infraction = testCase.infraction;
  const vehicle = testCase.vehicle;
  
  // AIT
  const aitPdf = generateAIT({
    aitNumber: infraction.aitNumber,
    infractionCode: infraction.infractionCode,
    description: infraction.description,
    ctbArticle: infraction.ctbArticle,
    dateTime: infraction.dateTime,
    location: infraction.location,
    autuadorBody: infraction.autuadorBody,
    plate: vehicle.plate,
    brandModel: vehicle.brandModel,
    speedLimit: infraction.speedLimit,
    measuredSpeed: infraction.measuredSpeed,
    consideredSpeed: infraction.consideredSpeed,
  });
  fs.writeFileSync(path.join(FIXTURES_DIR, `ait-${testCase.id}.pdf`), aitPdf);

  // CNH
  const cnhPdf = generateCNH({
    name: user.applicantName,
    cpf: user.applicantCpf,
    cnhNumber: user.applicantCnh,
    category: user.cnhCategory || 'B',
    validity: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
  });
  fs.writeFileSync(path.join(FIXTURES_DIR, `cnh-${testCase.id}.pdf`), cnhPdf);

  // CRLV
  const crlvPdf = generateCRLV({
    plate: vehicle.plate,
    brandModel: vehicle.brandModel,
    renavam: vehicle.renavam || '85674321098',
    year: vehicle.year || '2022',
    color: vehicle.color || 'Prata',
    ownerName: user.applicantName,
    ownerCpf: user.applicantCpf,
  });
  fs.writeFileSync(path.join(FIXTURES_DIR, `crlv-${testCase.id}.pdf`), crlvPdf);

  // NA or NIP based on procedure type
  if (testCase.procedureType === 'defesa_previa') {
    const naPdf = generateNA({
      aitNumber: infraction.aitNumber,
      infractionCode: infraction.infractionCode,
      description: infraction.description,
      dateTime: infraction.dateTime,
      location: infraction.location,
      autuadorBody: infraction.autuadorBody,
      plate: vehicle.plate,
      deadline: infraction.defenseDeadline,
    });
    fs.writeFileSync(path.join(FIXTURES_DIR, `na-${testCase.id}.pdf`), naPdf);
  } else {
    const nipPdf = generateNIP({
      aitNumber: infraction.aitNumber,
      infractionCode: infraction.infractionCode,
      description: infraction.description,
      dateTime: infraction.dateTime,
      location: infraction.location,
      autuadorBody: infraction.autuadorBody,
      plate: vehicle.plate,
      fineAmount: infraction.fineAmount,
      points: infraction.points,
      deadline: infraction.defenseDeadline,
    });
    fs.writeFileSync(path.join(FIXTURES_DIR, `nip-${testCase.id}.pdf`), nipPdf);
  }

  // PSDD for suspension cases
  if (testCase.procedureType.includes('suspensao')) {
    const psddPdf = generatePSDD({
      processNumber: `PSDD-${infraction.aitNumber}`,
      name: user.applicantName,
      cpf: user.applicantCpf,
      cnh: user.applicantCnh,
      points: 25,
      infractions: [
        `${infraction.infractionCode} - ${infraction.description}`,
        '745-50 - Velocidade até 20%',
        '736-62 - Celular ao volante',
      ],
      autuadorBody: infraction.autuadorBody,
      deadline: infraction.defenseDeadline,
    });
    fs.writeFileSync(path.join(FIXTURES_DIR, `psdd-${testCase.id}.pdf`), psddPdf);
  }
}

/**
 * Generate all fixtures for all test cases
 */
export function generateAllTestFixtures(testCases: any[]): void {
  console.log(`Generating ${testCases.length} test document sets...`);
  for (const testCase of testCases) {
    generateAllFixtures(testCase);
  }
  console.log('All test fixtures generated successfully!');
}

// CLI execution
if (require.main === module) {
  const testCases = JSON.parse(fs.readFileSync(path.join(__dirname, 'e2e-results', process.argv[2] || 'latest', 'initial-state.json'), 'utf8'));
  generateAllTestFixtures(testCases.cases);
}

export { FIXTURES_DIR };