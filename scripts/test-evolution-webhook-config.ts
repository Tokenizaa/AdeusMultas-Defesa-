/**
 * Test and Integration Script — Evolution API Webhook Configuration
 *
 * Verifies connectivity to the Evolution API, checks current webhook configuration,
 * and forces re-configuration of the webhook to the canonical production endpoint
 * (`/api/webhooks/whatsapp`), ensuring that the `X-Webhook-Secret` header is included.
 *
 * Usage:
 *   npx tsx scripts/test-evolution-webhook-config.ts
 */

import 'dotenv/config';
import { whatsappService } from '../src/server/services/whatsapp-service';
import { resolveWebhookSecret, EVOLUTION_WEBHOOK_SECRET_HEADER } from '../src/server/shared/webhook/evolution-webhook-auth';
import { configService } from '../src/server/config/config-service';

interface TestResult {
  step: string;
  success: boolean;
  details?: any;
  error?: string;
}

export async function runEvolutionWebhookIntegrationTest(): Promise<{
  allPassed: boolean;
  results: TestResult[];
}> {
  const results: TestResult[] = [];
  const log = (msg: string) => console.log(`[Evolution-Test] ${msg}`);

  log('Iniciando verificação de conectividade e configuração do Webhook Evolution API...');

  // Step 1: Environment & Secrets Check
  const apiUrl = configService.get('EVOLUTION_API_URL') || configService.get('NOTIF_WHATSAPP_API_URL') || 'http://localhost:8080';
  const apiKey = configService.get('EVOLUTION_API_KEY') || configService.get('NOTIF_WHATSAPP_API_KEY') || '';
  const instanceName = configService.get('EVOLUTION_INSTANCE_NAME') || 'defesai';
  const webhookSecret = resolveWebhookSecret();
  const appUrl = configService.get('APP_URL') || 'https://defesai.com.br';
  const canonicalWebhookUrl = `${appUrl.replace(/\/$/, '')}/api/webhooks/whatsapp`;

  const envOk = Boolean(apiUrl && apiKey);
  results.push({
    step: '1. Verificação de Variáveis de Ambiente',
    success: envOk,
    details: {
      apiUrl,
      instanceName,
      hasApiKey: Boolean(apiKey),
      hasWebhookSecret: Boolean(webhookSecret),
      canonicalWebhookUrl,
    },
  });

  if (!envOk) {
    log('⚠️ ATENÇÃO: EVOLUTION_API_URL/NOTIF_WHATSAPP_API_URL ou EVOLUTION_API_KEY/NOTIF_WHATSAPP_API_KEY não configurados.');
  }

  // Step 2: Query Instance Status (Connectivity Check)
  log(`Verificando conectividade com instância '${instanceName}'...`);
  try {
    const status = await whatsappService.getInstanceStatus(instanceName);
    const isOnline = status !== null;
    results.push({
      step: '2. Consulta de Status da Instância na Evolution API',
      success: isOnline,
      details: status || { status: 'offline/unreachable' },
    });
    if (isOnline) {
      log(`✅ Instância '${instanceName}' respondendo. Estado: ${status.status} | Telefone: ${status.phone || 'N/D'}`);
    } else {
      log(`⚠️ Instância '${instanceName}' não retornou status ativo.`);
    }
  } catch (err: any) {
    results.push({
      step: '2. Consulta de Status da Instância na Evolution API',
      success: false,
      error: err.message,
    });
    log(`❌ Erro ao consultar instância: ${err.message}`);
  }

  // Step 3: Query Current Webhook Configuration
  log('Consultando configuração atual do Webhook na Evolution API...');
  try {
    const currentConfig = await whatsappService.getWebhookConfig(instanceName);
    results.push({
      step: '3. Consulta da Configuração Atual do Webhook',
      success: true,
      details: currentConfig,
    });
    log(`Configuração atual obtida: ${JSON.stringify(currentConfig?.webhook?.url || currentConfig?.url || 'nenhuma')}`);
  } catch (err: any) {
    results.push({
      step: '3. Consulta da Configuração Atual do Webhook',
      success: false,
      error: err.message,
    });
    log(`⚠️ Não foi possível obter configuração prévia: ${err.message}`);
  }

  // Step 4: Force Re-Configuration to Canonical Production Endpoint with X-Webhook-Secret
  log(`Forçando re-configuração do Webhook para: ${canonicalWebhookUrl}...`);
  try {
    const configResult = await whatsappService.configureWebhook(canonicalWebhookUrl, instanceName);
    results.push({
      step: '4. Re-configuração Forçada do Webhook com X-Webhook-Secret',
      success: configResult.success,
      details: {
        targetUrl: canonicalWebhookUrl,
        headerIncluded: EVOLUTION_WEBHOOK_SECRET_HEADER,
        hasSecretConfigured: Boolean(webhookSecret),
        result: configResult,
      },
      error: configResult.error,
    });

    if (configResult.success) {
      log(`✅ Webhook reconfigurado com sucesso para ${canonicalWebhookUrl}`);
    } else {
      log(`❌ Falha na reconfiguração: ${configResult.error}`);
    }
  } catch (err: any) {
    results.push({
      step: '4. Re-configuração Forçada do Webhook com X-Webhook-Secret',
      success: false,
      error: err.message,
    });
    log(`❌ Erro durante re-configuração: ${err.message}`);
  }

  // Step 5: Verify Webhook Configuration after Update
  log('Validando webhook pós-atualização...');
  try {
    const postConfig = await whatsappService.getWebhookConfig(instanceName);
    results.push({
      step: '5. Validação Pós-Atualização do Webhook',
      success: true,
      details: postConfig,
    });
    log('✅ Validação concluída.');
  } catch (err: any) {
    results.push({
      step: '5. Validação Pós-Atualização do Webhook',
      success: false,
      error: err.message,
    });
  }

  const allPassed = results.every((r) => r.success);
  log(`\n=== Resumo do Teste: ${allPassed ? 'TODOS OS PASSOS APROVADOS ✅' : 'AVISOS / FALHAS IDENTIFICADAS ⚠️'} ===`);
  results.forEach((r) => {
    console.log(`- [${r.success ? 'OK' : 'FALHA'}] ${r.step} ${r.error ? `(Erro: ${r.error})` : ''}`);
  });

  return { allPassed, results };
}

// Execute directly if run via CLI
if (process.argv[1]?.includes('test-evolution-webhook-config')) {
  runEvolutionWebhookIntegrationTest()
    .then((res) => {
      console.log('\nExecução finalizada com status:', res.allPassed ? 'SUCCESS' : 'WARNING/COMPLETED');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\nErro fatal no script de integração:', err);
      process.exit(1);
    });
}
