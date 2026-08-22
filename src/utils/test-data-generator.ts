import type { InfractionData, VehicleData, CaseDocumentData } from '../types';
import { INFRACTION_CATALOG } from '../data/knowledge-base';

// ==========================================
// Support arrays (non-exported)
// ==========================================

const NOMES = [
  'Ana Maria', 'Carlos Eduardo', 'Fernanda Lima', 'João Pedro',
  'Mariana Costa', 'Ricardo Santos', 'Juliana Oliveira', 'Lucas Almeida',
  'Patrícia Souza', 'Bruno Ferreira', 'Camila Rodrigues', 'Gustavo Martins',
  'Larissa Ribeiro', 'Thiago Barbosa', 'Isabela Pereira', 'Gabriel Araújo',
  'Amanda Nascimento', 'Felipe Gomes', 'Vanessa Dias', 'Rafael Moreira',
  'Daniela Campos', 'Eduardo Vieira', 'Tatiane Lopes', 'Marcos Silva',
];

const SOBRENOMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira',
  'Almeida', 'Pereira', 'Costa', 'Ribeiro', 'Martins', 'Araújo',
  'Barbosa', 'Gomes', 'Nascimento', 'Lima', 'Azevedo', 'Carvalho',
  'Lopes', 'Moreira', 'Vieira', 'Dias', 'Campos', 'Cavalcanti',
];

const RUAS = [
  'Rua das Flores', 'Av. Paulista', 'Rua XV de Novembro', 'Rua da Consolação',
  'Av. Rebouças', 'Rua Augusta', 'Rua Oscar Freire', 'Av. Brasil',
  'Rua das Américas', 'Alameda Santos', 'Rua Bela Cintra', 'Av. Ipiranga',
];

const BAIRROS = [
  'Centro', 'Vila Mariana', 'Pinheiros', 'Moema', 'Vila Madalena',
  'Jardins', 'Santana', 'Tatuapé', 'Lapa', 'Brooklin',
  'Consolação', 'República',
];

export const CIDADES_UF = [
  'São Paulo/SP', 'Rio de Janeiro/RJ', 'Belo Horizonte/MG',
  'Curitiba/PR', 'Porto Alegre/RS', 'Brasília/DF', 'Salvador/BA',
];

const MARCAS_CARROS = [
  'Onix 1.4', 'Gol 1.0', 'HB20 1.0', 'Argo 1.0', 'Mobi 1.0',
  'Kwid 1.0', 'Creta 1.6', 'T-Cross 1.4', 'Compass 1.3', 'Tracker 1.0',
  'Pulse 1.0', 'Fastback 1.0', 'Corolla XEI', 'Civic Touring', 'HB20S 1.0',
];

const AUTUADORES = ['DETRAN-SP', 'DETRAN-RJ', 'DETRAN-MG', 'PRF', 'DNIT', 'CET-SP', 'DER-SP'];

const INFRACTION_CATEGORIES = [
  'excesso_velocidade', 'lei_seca', 'celular', 'vermelho', 'estacionamento',
] as const;

// ==========================================
// Helper functions
// ==========================================

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function padZero(n: number): string {
  return n.toString().padStart(2, '0');
}

// ==========================================
// Exported generator functions
// ==========================================

export function generateRandomName(): string {
  return `${pick(NOMES)} ${pick(SOBRENOMES)} ${pick(SOBRENOMES)}`;
}

export function generateRandomCPF(): string {
  const n = () => Math.floor(Math.random() * 10);
  const digits = Array.from({ length: 9 }, n);
  // Primeiro digito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  digits.push(d1);
  // Segundo digito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  digits.push(d2);
  return `${digits.slice(0, 3).join('')}.${digits.slice(3, 6).join('')}.${digits.slice(6, 9).join('')}-${digits.slice(9).join('')}`;
}

export function generateRandomPhone(): string {
  const ddd = pick([11, 21, 31, 41, 51, 61, 71, 81, 85, 19, 27, 34, 48, 62, 67, 77]);
  const prefix = `9${randInt(1000, 9999)}`;
  const suffix = `${randInt(1000, 9999)}`;
  return `(${ddd}) ${prefix}-${suffix}`;
}

export function generateRandomPlate(): string {
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ'; // sem I, O, Q para evitar confusao
  const rLetter = () => letters[Math.floor(Math.random() * letters.length)];
  const rDigit = () => Math.floor(Math.random() * 10);
  return `${rLetter()}${rLetter()}${rLetter()}${rDigit()}${rLetter()}${rDigit()}${rDigit()}`;
}

export function generateRandomAIT(): string {
  const len = Math.random() > 0.5 ? 10 : 12;
  return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
}

export function generateRandomAddress(): {
  street: string;
  number: string;
  neighborhood: string;
  zipCode: string;
  cityState: string;
} {
  const streetNum = randInt(10, 2000);
  return {
    street: `${pick(RUAS)}, ${streetNum}`,
    number: String(randInt(1, 1500)),
    neighborhood: pick(BAIRROS),
    zipCode: `${randInt(10000, 99999)}-${randInt(100, 999)}`,
    cityState: pick(CIDADES_UF),
  };
}

export function generateRandomEmail(name: string): string {
  const clean = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');
  const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'uol.com.br'];
  return `${clean}${randInt(10, 99)}@${pick(domains)}`;
}

export function generateRandomRG(): string {
  return `${randInt(10, 99)}.${randInt(100, 999)}.${randInt(100, 999)}-${randInt(0, 9)}`;
}

export function generateRandomCNH(): string {
  return Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
}

export function generateRandomCardData(): {
  cardNumber: string;
  cardHolderName: string;
  cardExpiry: string;
  cardCvv: string;
  cardCpf: string;
} {
  // Generate a valid-looking Visa test card number (starts with 4)
  const bin = `4${randInt(100, 999)}${randInt(1000, 9999)}${randInt(1000, 9999)}`;
  const lastDigit = randInt(0, 9);
  const cardNumber = `${bin}${lastDigit}`;

  const name = generateRandomName().toUpperCase();
  const month = padZero(randInt(1, 12));
  const year = padZero(randInt(26, 32));

  return {
    cardNumber: cardNumber.replace(/(.{4})/g, '$1 ').trim(),
    cardHolderName: name,
    cardExpiry: `${month}/${year}`,
    cardCvv: `${randInt(100, 999)}`,
    cardCpf: generateRandomCPF().replace(/\D/g, ''),
  };
}

// ==========================================
// Aggregate generators for wizard steps
// ==========================================

export function generateRandomInfractionData(
  overrides?: Partial<InfractionData>,
): InfractionData {
  const speedLimit = randInt(40, 120);
  const measuredSpeed = speedLimit + randInt(5, 35);
  const consideredSpeed = measuredSpeed - 7;
  const daysAgo = randInt(1, 60);
  const dateTime = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const catalogItem = pick(INFRACTION_CATALOG);

  return {
    aitNumber: generateRandomAIT(),
    infractionCode: catalogItem.code,
    description: catalogItem.description,
    ctbArticle: catalogItem.article,
    severity: catalogItem.severity,
    points: catalogItem.points,
    fineAmount: catalogItem.fineAmount,
    autuadorBody: pick(AUTUADORES),
    dateTime,
    location: `Rua ${pick(RUAS)}, ${pick(BAIRROS)}, ${pick(CIDADES_UF)}`,
    speedLimit,
    measuredSpeed,
    consideredSpeed,
    ...overrides,
  };
}

export function generateRandomVehicleData(
  overrides?: Partial<VehicleData>,
): VehicleData {
  return {
    plate: generateRandomPlate(),
    brandModel: pick(MARCAS_CARROS),
    renavam: String(randInt(100000000, 999999999)),
    year: String(randInt(2015, 2026)),
    color: pick(['Branco', 'Prata', 'Preto', 'Vermelho', 'Azul', 'Cinza']),
    ...overrides,
  };
}

export function generateRandomDocumentData(
  overrides?: Partial<CaseDocumentData>,
): CaseDocumentData {
  const name = generateRandomName();
  const address = generateRandomAddress();
  return {
    applicantName: name,
    applicantCpf: generateRandomCPF(),
    applicantRg: generateRandomRG(),
    applicantCnh: generateRandomCNH(),
    cnhCategory: pick(['AB', 'B', 'A']),
    applicantPhone: generateRandomPhone(),
    applicantEmail: generateRandomEmail(name),
    addressStreet: address.street,
    addressNumber: address.number,
    addressNeighborhood: address.neighborhood,
    addressZipCode: address.zipCode,
    addressCityState: address.cityState,
    vehicleRenavam: String(randInt(100000000, 999999999)),
    factsNarrative: 'Relato gerado automaticamente para fins de teste. O condutor foi abordado por agente de trânsito e autuado conforme auto de infração indicado.',
    ...overrides,
  };
}
