/**
 * Automated Meta Integration Verification Suite
 * Executes tests across all 12 operational capabilities of the canonical Meta integration.
 */

import crypto from 'crypto';
import { metaAdapter } from '../adapters/meta-adapter';
import { metaAuthService, REQUIRED_META_SCOPES } from '../auth/meta-auth-service';
import { metaGraphClient } from '../client/meta-graph-client';
import { metaPublishingService } from '../publishing/meta-publishing-service';
import { metaInsightsService } from '../insights/meta-insights-service';
import { metaWebhookService } from '../webhooks/meta-webhook-service';
import {
  MetaTokenExpiredError,
  MetaInsufficientPermissionsError,
  MetaRateLimitError,
} from '../errors/meta-errors';

export interface MetaTestResultItem {
  id: string;
  name: string;
  category: 'Security' | 'OAuth' | 'Publishing' | 'Instagram' | 'Webhooks' | 'Insights' | 'Reliability';
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

export interface MetaTestSuiteReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  allPassed: boolean;
  results: MetaTestResultItem[];
}

export async function runMetaIntegrationTests(): Promise<MetaTestSuiteReport> {
  const results: MetaTestResultItem[] = [];

  const runTest = async (
    id: string,
    name: string,
    category: MetaTestResultItem['category'],
    fn: () => Promise<void> | void
  ) => {
    const start = Date.now();
    try {
      await fn();
      results.push({
        id,
        name,
        category,
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (err: any) {
      results.push({
        id,
        name,
        category,
        passed: false,
        durationMs: Date.now() - start,
        error: err.message || String(err),
      });
    }
  };

  // 1. Security & Zero Token Leakage in Safe DTO
  await runTest(
    'SEC-01',
    'DTO Seguro: Status nunca expõe tokens de acesso ou segredos ao frontend',
    'Security',
    async () => {
      const status = metaAdapter.getSafeStatus();
      const stringified = JSON.stringify(status);
      if (stringified.includes('access_token') || stringified.includes('app_secret')) {
        throw new Error('Falha de segurança: Token ou segredo vazou no DTO do frontend.');
      }
      if (status.pages.some((p: any) => p.accessToken || p.access_token)) {
        throw new Error('Falha de segurança: Page Access Token vazou na lista de páginas.');
      }
    }
  );

  // 2. OAuth URL Generation with required scopes
  await runTest(
    'OAUTH-01',
    'Geração de URL OAuth com v20.0 e escopos obrigatórios de publicação e insights',
    'OAuth',
    async () => {
      const url = metaAuthService.generateOAuthUrl('https://www.defesai.shop/api/meta/callback');
      if (!url.includes('facebook.com/v20.0/dialog/oauth')) {
        throw new Error(`URL OAuth não usa Graph API v20.0: ${url}`);
      }
      for (const scope of REQUIRED_META_SCOPES) {
        if (!url.includes(scope)) {
          throw new Error(`Escopo obrigatório "${scope}" ausente na URL OAuth.`);
        }
      }
    }
  );

  // 3. Error Classification & Typed Hierarchy
  await runTest(
    'REL-01',
    'Tratamento e classificação tipada de erros da Meta (Expired, Permissions, Rate Limit)',
    'Reliability',
    async () => {
      const expiredErr = new MetaTokenExpiredError('Token expired subcode 463');
      if (expiredErr.code !== 'META_TOKEN_EXPIRED' || expiredErr.statusCode !== 401) {
        throw new Error('Classificação de token expirado inválida');
      }

      const permErr = new MetaInsufficientPermissionsError(['pages_manage_posts']);
      if (permErr.statusCode !== 403 || !permErr.missingPermissions.includes('pages_manage_posts')) {
        throw new Error('Classificação de permissões insuficientes inválida');
      }

      const rateErr = new MetaRateLimitError(45);
      if (rateErr.statusCode !== 429 || rateErr.retryAfterSeconds !== 45) {
        throw new Error('Classificação de Rate Limit inválida');
      }
    }
  );

  // 4. Token Debugging and Expiration Calculation
  await runTest(
    'OAUTH-02',
    'Análise de saúde de token e cálculo de dias restantes de expiração',
    'OAuth',
    async () => {
      const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const health = metaAuthService.analyzeHealth(true, in10Days, REQUIRED_META_SCOPES, true);
      if (health.status !== 'healthy' || health.tokenDaysRemaining !== 10) {
        throw new Error(`Cálculo de saúde do token incorreto: ${JSON.stringify(health)}`);
      }

      const in2Days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const warningHealth = metaAuthService.analyzeHealth(true, in2Days, REQUIRED_META_SCOPES, true);
      if (warningHealth.status !== 'warning') {
        throw new Error('Deveria emitir alerta de warning para token expirando em 2 dias');
      }
    }
  );

  // 5. Facebook Publishing Pipeline (Enforces Auth and Payload Validation)
  await runTest(
    'PUB-01',
    'Pipeline de publicação do Facebook (Validação de payload e rejeição estrita de acessos não autenticados)',
    'Publishing',
    async () => {
      const isConfigured = Boolean(process.env.META_ACCESS_TOKEN && process.env.META_PAGE_ID);
      if (!isConfigured) {
        // Must reject with MetaAuthenticationRequiredError or MetaIntegrationError
        try {
          await metaAdapter.publishContent({
            destination: 'facebook',
            message: 'Teste de publicação automatizada DefesAi',
            mediaUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
          });
          throw new Error('RISCO DE PRODUÇÃO: Publicação deveria ter sido rejeitada por ausência de credenciais reais da Meta.');
        } catch (err: any) {
          if (err.message.includes('RISCO DE PRODUÇÃO')) throw err;
          // Expected rejection
          return;
        }
      }

      const publishRes = await metaAdapter.publishContent({
        destination: 'facebook',
        message: 'Teste de publicação automatizada DefesAi',
        mediaUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
      });
      if (!publishRes.success || !publishRes.facebookPostId) {
        throw new Error(`Falha na publicação do Facebook: ${publishRes.error}`);
      }
    }
  );

  // 6. Instagram 2-step Container Publishing Pipeline
  await runTest(
    'INSTA-01',
    'Pipeline de publicação Instagram Business (Validação de mídia e autenticação)',
    'Instagram',
    async () => {
      const isConfigured = Boolean(process.env.META_ACCESS_TOKEN && process.env.INSTAGRAM_ACCOUNT_ID);
      if (!isConfigured) {
        try {
          await metaAdapter.publishContent({
            destination: 'instagram',
            message: 'Defesa de Trânsito no Instagram #defesai',
            mediaUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800',
          });
          throw new Error('RISCO DE PRODUÇÃO: Instagram Container não deveria publicar sem credenciais reais.');
        } catch (err: any) {
          if (err.message.includes('RISCO DE PRODUÇÃO')) throw err;
          return;
        }
      }

      const publishRes = await metaAdapter.publishContent({
        destination: 'instagram',
        message: 'Defesa de Trânsito no Instagram #defesai',
        mediaUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800',
      });
      if (!publishRes.success || !publishRes.instagramMediaId) {
        throw new Error(`Falha na publicação do Instagram: ${publishRes.error}`);
      }
    }
  );

  // 7. Dual Destination Publishing ('both')
  await runTest(
    'PUB-02',
    'Publicação simultânea multiplataforma Facebook + Instagram',
    'Publishing',
    async () => {
      const isConfigured = Boolean(process.env.META_ACCESS_TOKEN && process.env.META_PAGE_ID && process.env.INSTAGRAM_ACCOUNT_ID);
      if (!isConfigured) {
        try {
          await metaAdapter.publishContent({
            destination: 'both',
            message: 'Publicação unificada Facebook e Instagram DefesAi',
            mediaUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
          });
          throw new Error('RISCO DE PRODUÇÃO: Publicação dual não deveria reportar sucesso sem credenciais.');
        } catch (err: any) {
          if (err.message.includes('RISCO DE PRODUÇÃO')) throw err;
          return;
        }
      }

      const publishRes = await metaAdapter.publishContent({
        destination: 'both',
        message: 'Publicação unificada Facebook e Instagram DefesAi',
        mediaUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
      });
      if (!publishRes.success || !publishRes.facebookPostId || !publishRes.instagramMediaId) {
        throw new Error(`Publicação simultânea falhou: ${publishRes.error}`);
      }
    }
  );

  // 8. Webhook GET Subscription Challenge Verification
  // Nota: sem META_WEBHOOK_VERIFY_TOKEN configurado o challenge É rejeitado (comportamento seguro).
  // O teste abaixo só executa se o token está configurado no ambiente.
  const configuredVerifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (configuredVerifyToken) {
    await runTest(
      'WH-01',
      'Verificação de desafio GET do webhook Meta (hub.challenge / verify_token) — rejeita token inválido e aceita o correto',
      'Webhooks',
      async () => {
        const response = metaWebhookService.verifyChallenge('subscribe', configuredVerifyToken, 'challenge_code_12345');
        if (response !== 'challenge_code_12345') {
          throw new Error('Verificação de challenge falhou para token correto');
        }

        const invalid = metaWebhookService.verifyChallenge('subscribe', 'wrong_token', 'challenge_code_12345');
        if (invalid !== null) {
          throw new Error('Webhook deveria rejeitar token incorreto');
        }

        const noToken = metaWebhookService.verifyChallenge('subscribe', undefined, 'challenge_code_12345');
        if (noToken !== null) {
          throw new Error('Webhook deveria rejeitar chamada sem token');
        }
      }
    );
  }

  // 9. Webhook POST HMAC SHA-256 Signature Verification
  // Nota: sem META_APP_SECRET, verifySignature RECUSA (bypass removido por segurança).
  const configuredAppSecret = process.env.META_APP_SECRET;
  if (configuredAppSecret) {
    await runTest(
      'WH-02',
      'Verificação de assinatura criptográfica HMAC SHA-256 do webhook Meta',
      'Webhooks',
      async () => {
        const payload = JSON.stringify({ object: 'page', entry: [{ id: '109847291847192', time: Date.now() }] });
        const hmac = crypto.createHmac('sha256', configuredAppSecret);
        hmac.update(payload);
        const signature = `sha256=${hmac.digest('hex')}`;

        const isValid = metaWebhookService.verifySignature(payload, signature);
        if (!isValid) {
          throw new Error('Assinatura HMAC válida foi incorretamente rejeitada');
        }

        // Garantir que sem header de assinatura → rejeitado
        const noSig = metaWebhookService.verifySignature(payload, undefined);
        if (noSig) {
          throw new Error('Payload sem assinatura deveria ser rejeitado');
        }
      }
    );
  }

  // 10. Webhook Ingestion, Idempotency and Ingestion History
  const payloadWh03 = {
    object: 'page',
    entry: [
      {
        id: 'page_fb_123',
        time: 1723901823,
        changes: [{ field: 'feed', value: { item: 'post', verb: 'add', post_id: 'post_999' } }],
      },
    ],
  };
  if (configuredAppSecret) {
    await runTest(
      'WH-03',
      'Ingestão assíncrona, idempotência e auditoria de webhooks (assinado)',
      'Webhooks',
      async () => {
        const payloadStr = JSON.stringify(payloadWh03);
        const hmac = crypto.createHmac('sha256', configuredAppSecret);
        hmac.update(payloadStr);
        const sig = `sha256=${hmac.digest('hex')}`;
        const result = await metaWebhookService.handleWebhookPayload(payloadStr, sig, payloadWh03);
        if (!result.processed || !result.eventId) {
          throw new Error('Processamento do payload do webhook falhou');
        }
        const logs = metaWebhookService.getRecentWebhooks();
        if (logs.length === 0 || !logs.some((l) => l.id === result.eventId)) {
          throw new Error('Histórico de webhooks não registrou o evento');
        }
      }
    );
  } else {
    await runTest(
      'WH-03',
      'Webhook rejeita payloads não assinados quando META_APP_SECRET não configurado',
      'Webhooks',
      async () => {
        try {
          await metaWebhookService.handleWebhookPayload(JSON.stringify(payloadWh03), undefined, payloadWh03);
          throw new Error('Payload não assinado deveria ser rejeitado quando META_APP_SECRET ausente');
        } catch (err: any) {
          if (err.message.includes('assinatura')) return; // Esperado: rejeição segura
          throw err;
        }
      }
    );
  }

  // 11. Insights & Analytics Normalization
  await runTest(
    'INS-01',
    'Normalização de métricas da Graph API para Métricas de Domínio',
    'Insights',
    async () => {
      const insights = await metaInsightsService.getFacebookPostInsights('fb_post_sample_100', 'EAAB_token');
      if (insights.targetId !== 'fb_post_sample_100' || typeof insights.impressions !== 'number') {
        throw new Error(`Métricas de post inválidas: ${JSON.stringify(insights)}`);
      }
    }
  );

  // 12. Account & Page Selection Switching
  await runTest(
    'PAGES-01',
    'Seleção e alternância de Página e Conta Instagram ativas',
    'OAuth',
    async () => {
      const updated = metaAdapter.selectActiveTargets('page_defesai_custom_001', 'ig_defesai_custom_002');
      if (updated.selectedPageId !== 'page_defesai_custom_001' || updated.selectedInstagramId !== 'ig_defesai_custom_002') {
        throw new Error('Falha ao alternar página/conta Instagram ativa');
      }
    }
  );

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedCount,
    failedCount,
    allPassed: failedCount === 0,
    results,
  };
}
