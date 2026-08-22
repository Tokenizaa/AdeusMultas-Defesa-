// Teste completo do fluxo de onboarding para DefesaAi
// Testa o caminho completo desde a criação do caso até a confirmação de pagamento
// para ambos os tipos de pagamento: PIX e Cartão de Crédito

import dotenv from 'dotenv';
dotenv.config();

import { pagBankIntegration } from './src/server/integrations/pagbank.js';
import { databaseRows } from './src/server/app.js';
import { CanonicalMapper } from './src/server/core/mappers/canonical-mapper.js';
import { RagPipeline } from './src/server/core/rag/rag-pipeline.js';

async function testOnboardingFlowPix() {
  console.log('=== Teste de Fluxo de Onboarding - PIX ===\n');
  
  try {
    // Limpar estado anterior para teste limpo
    databaseRows.clear();
    
    // Passo 1: Criação do Caso
    console.log('--- Passo 1: Criação do Caso ---');
    const caseData = {
      infraction: 'Ultrapassagem em faixa contínua',
      vehicle: {
        plate: 'ABC1234',
        brandModel: 'Honda Civic 2020'
      },
      clientName: 'João Silva',
      clientCpf: '12345678909',
      clientEmail: 'joao.silva@email.com',
      serviceType: 'defesa_previa'
    };
    
    const caseResponse = await fetch('http://localhost:3000/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caseData)
    });
    
    if (!caseResponse.ok) {
      throw new Error(`Falha ao criar caso: ${caseResponse.statusText}`);
    }
    
    const createdCase = await caseResponse.json();
    const caseId = createdCase.id;
    console.log(`✅ Caso criado com ID: ${caseId}`);
    console.log(`   Infração: ${createdCase.infraction}`);
    console.log(`   Veículo: ${createdCase.vehicle.plate}`);
    
    // Passo 2: Geração da Defesa
    console.log('\n--- Passo 2: Geração da Defesa ---');
    const defenseResponse = await fetch(`http://localhost:3000/cases/${caseId}/generate-defense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procedureType: 'defesa_previa',
        selectedArgumentIds: [], // Usar argumentos recomendados
        applicantData: {
          name: caseData.clientName,
          cpf: caseData.clientCpf
        }
      })
    });
    
    if (!defenseResponse.ok) {
      throw new Error(`Falha ao gerar defesa: ${defenseResponse.statusText}`);
    }
    
    const defenseResult = await defenseResponse.json();
    console.log('✅ Defesa gerada com sucesso');
    console.log(`   Status do caso: ${defenseResult.case.status}`);
    console.log(`   Etapa atual: ${defenseResult.case.currentStage}`);
    
    // Passo 3: Iniciar Pagamento PIX
    console.log('\n--- Passo 3: Iniciar Pagamento PIX ---');
    const paymentResponse = await fetch('http://localhost:3000/pix/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: caseId,
        amount: 89.90,
        customerCpf: caseData.clientCpf,
        customerName: caseData.clientName,
        customerEmail: caseData.clientEmail
      })
    });
    
    if (!paymentResponse.ok) {
      throw new Error(`Falha ao criar pagamento PIX: ${paymentResponse.statusText}`);
    }
    
    const paymentResult = await paymentResponse.json();
    console.log('✅ Pagamento PIX iniciado com sucesso');
    console.log(`   Transaction ID: ${paymentResult.txId}`);
    console.log(`   Status: ${paymentResult.status}`);
    console.log(`   QR Code disponível: ${!!paymentResult.pixCopyPasteString}`);
    
    // Passo 4: Simular Confirmação de Pagamento (Webhook)
    console.log('\n--- Passo 4: Confirmação de Pagamento ---');
    // Em ambiente real, isso viria de um webhook do PagBank
    // Para teste, usamos o endpoint de simulação
    const confirmResponse = await fetch('http://localhost:3000/pix/simulate-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: caseId })
    });
    
    if (!confirmResponse.ok) {
      throw new Error(`Falha ao confirmar pagamento: ${confirmResponse.statusText}`);
    }
    
    const confirmResult = await confirmResponse.json();
    console.log('✅ Pagamento confirmado com sucesso');
    console.log(`   Mensagem: ${confirmResult.message}`);
    console.log(`   Status do caso: ${confirmResult.case.status}`);
    console.log(`   Etapa atual: ${confirmResult.case.currentStage}`);
    console.log(`   Pagamento aprovado: ${confirmResult.case.payment?.status === 'approved'}`);
    
    // Passo 5: Verificar Estado Final
    console.log('\n--- Passo 5: Verificação do Estado Final ---');
    const finalCaseResponse = await fetch(`http://localhost:3000/cases/${caseId}`);
    const finalCase = await finalCaseResponse.json();
    
    console.log('✅ Fluxo de onboarding PIX concluído com sucesso');
    console.log(`   Status final do caso: ${finalCase.status}`);
    console.log(`   Etapa final: ${finalCase.currentStage}`);
    console.log(`   Pagamento confirmado: ${finalCase.isPaid === true}`);
    console.log(`   Pagamento method: ${finalCase.payment?.paymentMethod}`);
    console.log(`   Data do pagamento: ${finalCase.payment?.paidAt}`);
    
    // Verificações finais
    if (finalCase.status !== 'defesa_pronta') {
      throw new Error(`Status do caso incorreto: esperado 'defesa_pronta', recebido '${finalCase.status}'`);
    }
    
    if (finalCase.currentStage !== 3) {
      throw new Error(`Etapa do caso incorreta: esperado 3, recebido '${finalCase.currentStage}'`);
    }
    
    if (!finalCase.isPaid) {
      throw new Error('Pagamento não foi marcado como confirmado');
    }
    
    if (finalCase.payment?.paymentMethod !== 'pix') {
      throw new Error(`Método de pagamento incorreto: esperado 'pix', recebido '${finalCase.payment?.paymentMethod}'`);
    }
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste de onboarding PIX:');
    console.error(error.message);
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack);
    }
    return false;
  }
}

async function testOnboardingFlowCreditCard() {
  console.log('\n\n=== Teste de Fluxo de Onboarding - Cartão de Crédito ===\n');
  
  try {
    // Limpar estado anterior para teste limpo
    databaseRows.clear();
    
    // Passo 1: Criação do Caso
    console.log('--- Passo 1: Criação do Caso ---');
    const caseData = {
      infraction: 'Estacionamento proibido',
      vehicle: {
        plate: 'DEF5678',
        brandModel: 'Toyota Corolla 2021'
      },
      clientName: 'Maria Oliveira',
      clientCpf: '98765432100',
      clientEmail: 'maria.oliveira@email.com',
      serviceType: 'defesa_previa'
    };
    
    const caseResponse = await fetch('http://localhost:3000/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caseData)
    });
    
    if (!caseResponse.ok) {
      throw new Error(`Falha ao criar caso: ${caseResponse.statusText}`);
    }
    
    const createdCase = await caseResponse.json();
    const caseId = createdCase.id;
    console.log(`✅ Caso criado com ID: ${caseId}`);
    console.log(`   Infração: ${createdCase.infraction}`);
    console.log(`   Veículo: ${createdCase.vehicle.plate}`);
    
    // Passo 2: Geração da Defesa
    console.log('\n--- Passo 2: Geração da Defesa ---');
    const defenseResponse = await fetch(`http://localhost:3000/cases/${caseId}/generate-defense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procedureType: 'defesa_previa',
        selectedArgumentIds: [],
        applicantData: {
          name: caseData.clientName,
          cpf: caseData.clientCpf
        }
      })
    });
    
    if (!defenseResponse.ok) {
      throw new Error(`Falha ao gerar defesa: ${defenseResponse.statusText}`);
    }
    
    const defenseResult = await defenseResponse.json();
    console.log('✅ Defesa gerada com sucesso');
    console.log(`   Status do caso: ${defenseResult.case.status}`);
    console.log(`   Etapa atual: ${defenseResult.case.currentStage}`);
    
    // Passo 3: Iniciar Pagamento Cartão de Crédito (Frictionless para teste)
    console.log('\n--- Passo 3: Iniciar Pagamento Cartão de Crédito (Frictionless) ---');
    const paymentResponse = await fetch('http://localhost:3000/credit-card/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: caseId,
        amount: 89.90,
        customerCpf: caseData.clientCpf,
        customerName: caseData.clientName,
        customerEmail: caseData.clientEmail,
        installments: 1,
        cardToken: 'test_frictionless_token', // Token para modo frictionless
        authenticationMethod: 'FRICTIONLESS'
      })
    });
    
    if (!paymentResponse.ok) {
      throw new Error(`Falha ao criar pagamento cartão de crédito: ${paymentResponse.statusText}`);
    }
    
    const paymentResult = await paymentResponse.json();
    console.log('✅ Pagamento cartão de crédito iniciado com sucesso');
    console.log(`   Order ID: ${paymentResult.txId}`);
    console.log(`   Status: ${paymentResult.status}`);
    console.log(`   3DS Necessário: ${paymentResult.threeDsChallengeRequired}`);
    
    // Para pagamento frictionless, o status deve ser 'autorizado' imediatamente
    if (paymentResult.status !== 'autorizado') {
      throw new Error(`Pagamento frictionless deveria ter status 'autorizado', recebeu '${paymentResult.status}'`);
    }
    
    // Passo 4: Confirmar Pagamento (já foi confirmado no passo anterior para frictionless)
    console.log('\n--- Passo 4: Verificação de Pagamento Confirmado ---');
    // Para pagamento frictionless, já está confirmado, então vamos apenas buscar o caso atualizado
    const finalCaseResponse = await fetch(`http://localhost:3000/cases/${caseId}`);
    const finalCase = await finalCaseResponse.json();
    
    console.log('✅ Pagamento cartão de crédito processado com sucesso');
    console.log(`   Status do caso: ${finalCase.status}`);
    console.log(`   Etapa atual: ${finalCase.currentStage}`);
    console.log(`   Pagamento confirmado: ${finalCase.isPaid === true}`);
    console.log(`   Método de pagamento: ${finalCase.payment?.paymentMethod}`);
    
    // Passo 5: Verificar Estado Final
    console.log('\n--- Passo 5: Verificação do Estado Final ---');
    console.log('✅ Fluxo de onboarding Cartão de Crédito concluído com sucesso');
    console.log(`   Status final do caso: ${finalCase.status}`);
    console.log(`   Etapa final: ${finalCase.currentStage}`);
    console.log(`   Pagamento confirmado: ${finalCase.isPaid === true}`);
    console.log(`   Pagamento method: ${finalCase.payment?.paymentMethod}`);
    console.log(`   Data do pagamento: ${finalCase.payment?.paidAt}`);
    
    // Verificações finais
    if (finalCase.status !== 'defesa_pronta') {
      throw new Error(`Status do caso incorreto: esperado 'defesa_pronta', recebido '${finalCase.status}'`);
    }
    
    if (finalCase.currentStage !== 3) {
      throw new Error(`Etapa do caso incorreta: esperado 3, recebido '${finalCase.currentStage}'`);
    }
    
    if (!finalCase.isPaid) {
      throw new Error('Pagamento não foi marcado como confirmado');
    }
    
    if (finalCase.payment?.paymentMethod !== 'credit_card') {
      throw new Error(`Método de pagamento incorreto: esperado 'credit_card', recebido '${finalCase.payment?.paymentMethod}'`);
    }
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste de onboarding Cartão de Crédito:');
    console.error(error.message);
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack);
    }
    return false;
  }
}

// Executar ambos os testes
async function runAllTests() {
  console.log('Iniciando testes completos de fluxo de onboarding...\n');
  
  const pixSuccess = await testOnboardingFlowPix();
  const ccSuccess = await testOnboardingFlowCreditCard();
  
  console.log('\n\n=== RESUMO DOS TESTES ===');
  console.log(`Fluxo PIX: ${pixSuccess ? '✅ PASSOU' : '❌ FALHOU'}`);
  console.log(`Fluxo Cartão de Crédito: ${ccSuccess ? '✅ PASSOU' : '❌ FALHOU'}`);
  
  const overallSuccess = pixSuccess && ccSuccess;
  console.log(`\nResultado Geral: ${overallSuccess ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM'}`);
  
  return overallSuccess;
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Erro fatal nos testes:', err);
      process.exit(1);
    });
}

export { testOnboardingFlowPix, testOnboardingFlowCreditCard };