/**
 * @file user.factory.ts
 * DefesAi — Fábrica Determinística e Sequencial de Usuários de Teste E2E
 * 
 * Regras:
 * - Nomes simples e sequenciais: 'Teste 001', 'Teste 002', etc.
 * - Senha padrão única: 'E2E@2026Teste' (ou process.env.E2E_TEST_PASSWORD).
 * - Email determinístico: teste001@e2e.local
 * - CPFs e CNHs válidos para testes.
 * - Usuários ficam persistidos e associados aos casos correspondentes.
 */

export interface TestUser {
  index: number;
  name: string;
  email: string;
  password: string;
  cpf: string;
  cnh: string;
  rg: string;
  phone: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    zipCode: string;
    city: string;
    uf: string;
    cityState: string;
  };
}

export const E2E_DEFAULT_PASSWORD = process.env.E2E_TEST_PASSWORD || 'E2E@2026Teste';

const UF_VARIATIONS = [
  { uf: 'SP', city: 'São Paulo', zip: '01310-100', street: 'Avenida Paulista' },
  { uf: 'RJ', city: 'Rio de Janeiro', zip: '20040-002', street: 'Avenida Rio Branco' },
  { uf: 'MG', city: 'Belo Horizonte', zip: '30130-100', street: 'Avenida Afonso Pena' },
  { uf: 'RS', city: 'Porto Alegre', zip: '90010-150', street: 'Rua dos Andradas' },
  { uf: 'PR', city: 'Curitiba', zip: '80020-000', street: 'Rua XV de Novembro' },
  { uf: 'BA', city: 'Salvador', zip: '40020-000', street: 'Avenida Sete de Setembro' },
  { uf: 'SC', city: 'Florianópolis', zip: '88010-000', street: 'Rua Felipe Schmidt' },
  { uf: 'GO', city: 'Goiânia', zip: '74000-000', street: 'Avenida Goiás' },
  { uf: 'PE', city: 'Recife', zip: '50010-000', street: 'Avenida Conde da Boa Vista' },
];

/**
 * Gera CPF determinístico de teste formatado
 */
function generateDeterministicCpf(num: number): string {
  const base = String(100000000 + num).padStart(9, '0');
  // Calcula dígitos verificadores para validade formal
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += parseInt(base[i], 10) * (10 - i);
  }
  const d1 = (sum1 * 10) % 11 % 10;

  let sum2 = 0;
  for (let i = 0; i < 9; i++) {
    sum2 += parseInt(base[i], 10) * (11 - i);
  }
  sum2 += d1 * 2;
  const d2 = (sum2 * 10) % 11 % 10;

  return `${base.slice(0, 3)}.${base.slice(3, 6)}.${base.slice(6, 9)}-${d1}${d2}`;
}

export class TestUserFactory {
  private static userMap = new Map<number, TestUser>();

  public static create(index: number): TestUser {
    if (this.userMap.has(index)) {
      return this.userMap.get(index)!;
    }

    const pad = String(index).padStart(3, '0');
    const ufData = UF_VARIATIONS[(index - 1) % UF_VARIATIONS.length];

    const user: TestUser = {
      index,
      name: `Teste ${pad}`,
      email: `teste${pad}@e2e.local`,
      password: E2E_DEFAULT_PASSWORD,
      cpf: generateDeterministicCpf(index),
      cnh: `0${pad}12345678`,
      rg: `RG-${pad}-SP`,
      phone: `(11) 98765-${pad}0`,
      address: {
        street: `${ufData.street}`,
        number: `${100 + index}`,
        neighborhood: 'Centro',
        zipCode: ufData.zip,
        city: ufData.city,
        uf: ufData.uf,
        cityState: `${ufData.city} - ${ufData.uf}`,
      },
    };

    this.userMap.set(index, user);
    return user;
  }
}
