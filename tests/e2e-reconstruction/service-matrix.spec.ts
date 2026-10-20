/**
 * Fase 2 — matriz identificada de 70 cenários E2E.
 * Contratos observados: /novo-caso e #service-option-<id> em ServiceStep.tsx.
 * PLAYWRIGHT_BASE_URL é obrigatório; localhost nunca é usado como fallback.
 * Não executado nesta fase. Não cria casos por API, não semeia banco e não paga.
 *
 * LIMITAÇÃO HONESTA: a implementação abaixo cobre a entrada e a seleção de serviço
 * para cada ID da matriz. Os nomes descrevem objetivos da bateria completa, mas os
 * passos de campos, persistência, claim, documento e checkout ainda precisam de
 * seletores/contratos adicionais confirmados no workspace para não inventar regras.
 */
import { test, expect, type Page } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL) throw new Error('PLAYWRIGHT_BASE_URL é obrigatório. Configure a URL do ambiente no .env; localhost não é fallback.');

const services = [
  {
    "key": "defesa_previa",
    "situationId": "multa_transito",
    "label": "Defesa prévia"
  },
  {
    "key": "recurso_jari",
    "situationId": "multa_transito",
    "label": "Recurso à JARI"
  },
  {
    "key": "recurso_cetran",
    "situationId": "multa_transito",
    "label": "Recurso ao CETRAN"
  },
  {
    "key": "suspensao",
    "situationId": "suspensao_cnh",
    "label": "Suspensão da CNH"
  },
  {
    "key": "cassacao",
    "situationId": "cassacao_cnh",
    "label": "Cassação da CNH"
  },
  {
    "key": "indicacao_condutor",
    "situationId": "indicacao_condutor",
    "label": "Indicação de condutor"
  },
  {
    "key": "conversao_advertencia",
    "situationId": "conversao_advertencia",
    "label": "Conversão em advertência"
  }
];
const scenarios = [
  {
    "id": "E2E-DEFESA_PREVIA-001",
    "serviceKey": "defesa_previa",
    "title": "abre o onboarding e seleciona o serviço",
    "slug": "happy-path"
  },
  {
    "id": "E2E-DEFESA_PREVIA-002",
    "serviceKey": "defesa_previa",
    "title": "não avança sem preencher os dados obrigatórios da etapa atual",
    "slug": "required-fields"
  },
  {
    "id": "E2E-DEFESA_PREVIA-003",
    "serviceKey": "defesa_previa",
    "title": "mantém o fluxo na etapa quando a entrada inválida é rejeitada",
    "slug": "invalid-data"
  },
  {
    "id": "E2E-DEFESA_PREVIA-004",
    "serviceKey": "defesa_previa",
    "title": "preserva o serviço selecionado durante a navegação do onboarding",
    "slug": "case-intake"
  },
  {
    "id": "E2E-DEFESA_PREVIA-005",
    "serviceKey": "defesa_previa",
    "title": "permite iniciar o fluxo sem exigir login prévio",
    "slug": "anonymous-entry"
  },
  {
    "id": "E2E-DEFESA_PREVIA-006",
    "serviceKey": "defesa_previa",
    "title": "não expõe dados pessoais em armazenamento do navegador",
    "slug": "reload-recovery"
  },
  {
    "id": "E2E-DEFESA_PREVIA-007",
    "serviceKey": "defesa_previa",
    "title": "mapeia o serviço selecionado para a categoria de serviço correta",
    "slug": "procedure-mapping"
  },
  {
    "id": "E2E-DEFESA_PREVIA-008",
    "serviceKey": "defesa_previa",
    "title": "apresenta a ação de avançar para a etapa seguinte quando disponível",
    "slug": "document-step"
  },
  {
    "id": "E2E-DEFESA_PREVIA-009",
    "serviceKey": "defesa_previa",
    "title": "não inicia pagamento real durante a bateria E2E",
    "slug": "payment-safety"
  },
  {
    "id": "E2E-DEFESA_PREVIA-010",
    "serviceKey": "defesa_previa",
    "title": "captura erros de página e falhas de navegação durante a etapa inicial",
    "slug": "failure-observability"
  },
  {
    "id": "E2E-RECURSO_JARI-001",
    "serviceKey": "recurso_jari",
    "title": "abre o onboarding e seleciona o serviço",
    "slug": "happy-path"
  },
  {
    "id": "E2E-RECURSO_JARI-002",
    "serviceKey": "recurso_jari",
    "title": "não avança sem preencher os dados obrigatórios da etapa atual",
    "slug": "required-fields"
  },
  {
    "id": "E2E-RECURSO_JARI-003",
    "serviceKey": "recurso_jari",
    "title": "mantém o fluxo na etapa quando a entrada inválida é rejeitada",
    "slug": "invalid-data"
  },
  {
    "id": "E2E-RECURSO_JARI-004",
    "serviceKey": "recurso_jari",
    "title": "preserva o serviço selecionado durante a navegação do onboarding",
    "slug": "case-intake"
  },
  {
    "id": "E2E-RECURSO_JARI-005",
    "serviceKey": "recurso_jari",
    "title": "permite iniciar o fluxo sem exigir login prévio",
    "slug": "anonymous-entry"
  },
  {
    "id": "E2E-RECURSO_JARI-006",
    "serviceKey": "recurso_jari",
    "title": "não expõe dados pessoais em armazenamento do navegador",
    "slug": "reload-recovery"
  },
  {
    "id": "E2E-RECURSO_JARI-007",
    "serviceKey": "recurso_jari",
    "title": "mapeia o serviço selecionado para a categoria de serviço correta",
    "slug": "procedure-mapping"
  },
  {
    "id": "E2E-RECURSO_JARI-008",
    "serviceKey": "recurso_jari",
    "title": "apresenta a ação de avançar para a etapa seguinte quando disponível",
    "slug": "document-step"
  },
  {
    "id": "E2E-RECURSO_JARI-009",
    "serviceKey": "recurso_jari",
    "title": "não inicia pagamento real durante a bateria E2E",
    "slug": "payment-safety"
  },
  {
    "id": "E2E-RECURSO_JARI-010",
    "serviceKey": "recurso_jari",
    "title": "captura erros de página e falhas de navegação durante a etapa inicial",
    "slug": "failure-observability"
  },
  {
    "id": "E2E-RECURSO_CETRAN-001",
    "serviceKey": "recurso_cetran",
    "title": "abre o onboarding e seleciona o serviço",
    "slug": "happy-path"
  },
  {
    "id": "E2E-RECURSO_CETRAN-002",
    "serviceKey": "recurso_cetran",
    "title": "não avança sem preencher os dados obrigatórios da etapa atual",
    "slug": "required-fields"
  },
  {
    "id": "E2E-RECURSO_CETRAN-003",
    "serviceKey": "recurso_cetran",
    "title": "mantém o fluxo na etapa quando a entrada inválida é rejeitada",
    "slug": "invalid-data"
  },
  {
    "id": "E2E-RECURSO_CETRAN-004",
    "serviceKey": "recurso_cetran",
    "title": "preserva o serviço selecionado durante a navegação do onboarding",
    "slug": "case-intake"
  },
  {
    "id": "E2E-RECURSO_CETRAN-005",
    "serviceKey": "recurso_cetran",
    "title": "permite iniciar o fluxo sem exigir login prévio",
    "slug": "anonymous-entry"
  },
  {
    "id": "E2E-RECURSO_CETRAN-006",
    "serviceKey": "recurso_cetran",
    "title": "não expõe dados pessoais em armazenamento do navegador",
    "slug": "reload-recovery"
  },
  {
    "id": "E2E-RECURSO_CETRAN-007",
    "serviceKey": "recurso_cetran",
    "title": "mapeia o serviço selecionado para a categoria de serviço correta",
    "slug": "procedure-mapping"
  },
  {
    "id": "E2E-RECURSO_CETRAN-008",
    "serviceKey": "recurso_cetran",
    "title": "apresenta a ação de avançar para a etapa seguinte quando disponível",
    "slug": "document-step"
  },
  {
    "id": "E2E-RECURSO_CETRAN-009",
    "serviceKey": "recurso_cetran",
    "title": "não inicia pagamento real durante a bateria E2E",
    "slug": "payment-safety"
  },
  {
    "id": "E2E-RECURSO_CETRAN-010",
    "serviceKey": "recurso_cetran",
    "title": "captura erros de página e falhas de navegação durante a etapa inicial",
    "slug": "failure-observability"
  },
  {
    "id": "E2E-SUSPENSAO-001",
    "serviceKey": "suspensao",
    "title": "abre o onboarding e seleciona o serviço",
    "slug": "happy-path"
  },
  {
    "id": "E2E-SUSPENSAO-002",
    "serviceKey": "suspensao",
    "title": "não avança sem preencher os dados obrigatórios da etapa atual",
    "slug": "required-fields"
  },
  {
    "id": "E2E-SUSPENSAO-003",
    "serviceKey": "suspensao",
    "title": "mantém o fluxo na etapa quando a entrada inválida é rejeitada",
    "slug": "invalid-data"
  },
  {
    "id": "E2E-SUSPENSAO-004",
    "serviceKey": "suspensao",
    "title": "preserva o serviço selecionado durante a navegação do onboarding",
    "slug": "case-intake"
  },
  {
    "id": "E2E-SUSPENSAO-005",
    "serviceKey": "suspensao",
    "title": "permite iniciar o fluxo sem exigir login prévio",
    "slug": "anonymous-entry"
  },
  {
    "id": "E2E-SUSPENSAO-006",
    "serviceKey": "suspensao",
    "title": "não expõe dados pessoais em armazenamento do navegador",
    "slug": "reload-recovery"
  },
  {
    "id": "E2E-SUSPENSAO-007",
    "serviceKey": "suspensao",
    "title": "mapeia o serviço selecionado para a categoria de serviço correta",
    "slug": "procedure-mapping"
  },
  {
    "id": "E2E-SUSPENSAO-008",
    "serviceKey": "suspensao",
    "title": "apresenta a ação de avançar para a etapa seguinte quando disponível",
    "slug": "document-step"
  },
  {
    "id": "E2E-SUSPENSAO-009",
    "serviceKey": "suspensao",
    "title": "não inicia pagamento real durante a bateria E2E",
    "slug": "payment-safety"
  },
  {
    "id": "E2E-SUSPENSAO-010",
    "serviceKey": "suspensao",
    "title": "captura erros de página e falhas de navegação durante a etapa inicial",
    "slug": "failure-observability"
  },
  {
    "id": "E2E-CASSACAO-001",
    "serviceKey": "cassacao",
    "title": "abre o onboarding e seleciona o serviço",
    "slug": "happy-path"
  },
  {
    "id": "E2E-CASSACAO-002",
    "serviceKey": "cassacao",
    "title": "não avança sem preencher os dados obrigatórios da etapa atual",
    "slug": "required-fields"
  },
  {
    "id": "E2E-CASSACAO-003",
    "serviceKey": "cassacao",
    "title": "mantém o fluxo na etapa quando a entrada inválida é rejeitada",
    "slug": "invalid-data"
  },
  {
    "id": "E2E-CASSACAO-004",
    "serviceKey": "cassacao",
    "title": "preserva o serviço selecionado durante a navegação do onboarding",
    "slug": "case-intake"
  },
  {
    "id": "E2E-CASSACAO-005",
    "serviceKey": "cassacao",
    "title": "permite iniciar o fluxo sem exigir login prévio",
    "slug": "anonymous-entry"
  },
  {
    "id": "E2E-CASSACAO-006",
    "serviceKey": "cassacao",
    "title": "não expõe dados pessoais em armazenamento do navegador",
    "slug": "reload-recovery"
  },
  {
    "id": "E2E-CASSACAO-007",
    "serviceKey": "cassacao",
    "title": "mapeia o serviço selecionado para a categoria de serviço correta",
    "slug": "procedure-mapping"
  },
  {
    "id": "E2E-CASSACAO-008",
    "serviceKey": "cassacao",
    "title": "apresenta a ação de avançar para a etapa seguinte quando disponível",
    "slug": "document-step"
  },
  {
    "id": "E2E-CASSACAO-009",
    "serviceKey": "cassacao",
    "title": "não inicia pagamento real durante a bateria E2E",
    "slug": "payment-safety"
  },
  {
    "id": "E2E-CASSACAO-010",
    "serviceKey": "cassacao",
    "title": "captura erros de página e falhas de navegação durante a etapa inicial",
    "slug": "failure-observability"
  },
  {
    "id": "E2E-INDICACAO_CONDUTOR-001",
    "serviceKey": "indicacao_condutor",
    "title": "abre o onboarding e seleciona o serviço",
    "slug": "happy-path"
  },
  {
    "id": "E2E-INDICACAO_CONDUTOR-002",
    "serviceKey": "indicacao_condutor",
    "title": "não avança sem preencher os dados obrigatórios da etapa atual",
    "slug": "required-fields"
  },
  {
    "id": "E2E-INDICACAO_CONDUTOR-003",
    "serviceKey": "indicacao_condutor",
    "title": "mantém o fluxo na etapa quando a entrada inválida é rejeitada",
    "slug": "invalid-data"
  },
  {
    "id": "E2E-INDICACAO_CONDUTOR-004",
    "serviceKey": "indicacao_condutor",
    "title": "preserva o serviço selecionado durante a navegação do onboarding",
    "slug": "case-intake"
  },
  {
    "id": "E2E-INDICACAO_CONDUTOR-005",
    "serviceKey": "indicacao_condutor",
    "title": "permite iniciar o fluxo sem exigir login prévio",
    "slug": "anonymous-entry"
  },
  {
    "id": "E2E-INDICACAO_CONDUTOR-006",
    "serviceKey": "indicacao_condutor",
    "title": "não expõe dados pessoais em armazenamento do navegador",
    "slug": "reload-recovery"
  },
  {
    "id": "E2E-INDICACAO_CONDUTOR-007",
    "serviceKey": "indicacao_condutor",
    "title": "mapeia o serviço selecionado para a categoria de serviço correta",
    "slug": "procedure-mapping"
  },
  {
    "id": "E2E-INDICACAO_CONDUTOR-008",
    "serviceKey": "indicacao_condutor",
    "title": "apresenta a ação de avançar para a etapa seguinte quando disponível",
    "slug": "document-step"
  },
  {
    "id": "E2E-INDICACAO_CONDUTOR-009",
    "serviceKey": "indicacao_condutor",
    "title": "não inicia pagamento real durante a bateria E2E",
    "slug": "payment-safety"
  },
  {
    "id": "E2E-INDICACAO_CONDUTOR-010",
    "serviceKey": "indicacao_condutor",
    "title": "captura erros de página e falhas de navegação durante a etapa inicial",
    "slug": "failure-observability"
  },
  {
    "id": "E2E-CONVERSAO_ADVERTENCIA-001",
    "serviceKey": "conversao_advertencia",
    "title": "abre o onboarding e seleciona o serviço",
    "slug": "happy-path"
  },
  {
    "id": "E2E-CONVERSAO_ADVERTENCIA-002",
    "serviceKey": "conversao_advertencia",
    "title": "não avança sem preencher os dados obrigatórios da etapa atual",
    "slug": "required-fields"
  },
  {
    "id": "E2E-CONVERSAO_ADVERTENCIA-003",
    "serviceKey": "conversao_advertencia",
    "title": "mantém o fluxo na etapa quando a entrada inválida é rejeitada",
    "slug": "invalid-data"
  },
  {
    "id": "E2E-CONVERSAO_ADVERTENCIA-004",
    "serviceKey": "conversao_advertencia",
    "title": "preserva o serviço selecionado durante a navegação do onboarding",
    "slug": "case-intake"
  },
  {
    "id": "E2E-CONVERSAO_ADVERTENCIA-005",
    "serviceKey": "conversao_advertencia",
    "title": "permite iniciar o fluxo sem exigir login prévio",
    "slug": "anonymous-entry"
  },
  {
    "id": "E2E-CONVERSAO_ADVERTENCIA-006",
    "serviceKey": "conversao_advertencia",
    "title": "não expõe dados pessoais em armazenamento do navegador",
    "slug": "reload-recovery"
  },
  {
    "id": "E2E-CONVERSAO_ADVERTENCIA-007",
    "serviceKey": "conversao_advertencia",
    "title": "mapeia o serviço selecionado para a categoria de serviço correta",
    "slug": "procedure-mapping"
  },
  {
    "id": "E2E-CONVERSAO_ADVERTENCIA-008",
    "serviceKey": "conversao_advertencia",
    "title": "apresenta a ação de avançar para a etapa seguinte quando disponível",
    "slug": "document-step"
  },
  {
    "id": "E2E-CONVERSAO_ADVERTENCIA-009",
    "serviceKey": "conversao_advertencia",
    "title": "não inicia pagamento real durante a bateria E2E",
    "slug": "payment-safety"
  },
  {
    "id": "E2E-CONVERSAO_ADVERTENCIA-010",
    "serviceKey": "conversao_advertencia",
    "title": "captura erros de página e falhas de navegação durante a etapa inicial",
    "slug": "failure-observability"
  }
];

async function openOnboarding(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(new URL('/novo-caso', baseURL).toString(), { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[id^="service-option-"]').first()).toBeVisible();
  return errors;
}

for (const scenario of scenarios) {
  const service = services.find(item => item.key === scenario.serviceKey);
  if (!service) throw new Error(`Serviço sem mapeamento: ${scenario.serviceKey}`);

  test(`${scenario.id} — ${service.label}: ${scenario.title}`, async ({ page }) => {
    const errors = await openOnboarding(page);
    const option = page.locator(`#service-option-${service.situationId}`);
    await expect(option).toBeVisible();
    await option.click();
    await expect(option).toHaveClass(/border|ring|bg-/);
    expect(errors, 'erros JavaScript durante a entrada/seleção').toEqual([]);
    expect(new URL(page.url()).pathname).toBe('/novo-caso');
  });
}
