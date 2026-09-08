/**
 * Production Golden Path test data contract.
 *
 * No credentials or real personal data belong in this file. The authenticated
 * test account is supplied by the execution environment. Values below are
 * synthetic and intentionally unique enough to identify a single run.
 */

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} é obrigatório para o Golden Path de produção.`);
  return value;
}

export const productionGoldenPath = {
  baseUrl: requiredEnv('PLAYWRIGHT_BASE_URL'),
  credentials: {
    email: requiredEnv('E2E_TEST_EMAIL'),
    password: requiredEnv('E2E_TEST_PASSWORD'),
  },
  case: {
    serviceType: 'recurso_jari',
    procedureType: 'recurso_jari',
    marker: `E2E-GOLDEN-${process.env.E2E_RUN_ID?.trim() || 'RUN'}`,
    applicant: {
      name: 'Condutor E2E Golden Path',
      cpf: '00000000000',
      cnh: '00000000000',
      cityState: 'São Paulo - SP',
    },
    vehicle: {
      plate: 'E2E0A00',
      brandModel: 'Veículo E2E',
    },
    infraction: {
      aitNumber: 'E2E-AIT-GOLDEN',
      autuadorBody: 'DETRAN-SP',
      ctbArticle: 'Art. 218, I do CTB',
    },
  },
};

export function assertProductionEnvironment(): void {
  const url = new URL(productionGoldenPath.baseUrl);
  if (url.protocol !== 'https:') {
    throw new Error('Golden Path bloqueado: PLAYWRIGHT_BASE_URL precisa usar HTTPS.');
  }
  if (!url.hostname.endsWith('vercel.app') && !url.hostname.endsWith('defesai.shop')) {
    throw new Error(`Golden Path bloqueado: host não reconhecido como Vercel/DefesAi: ${url.hostname}`);
  }
}
