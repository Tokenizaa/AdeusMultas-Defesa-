import { Router, Request, Response, NextFunction } from 'express';
import { pagBankIntegration } from '../integrations/pagbank';
import { gatewayManager, processGatewayWebhook } from '../integrations/gateway';
import type { GatewayId } from '../integrations/gateway';
import { commercialService } from '../commercial/commercial-service';
import { databaseRows, auditLogs } from '../app';
import { caseRepository } from '../db/case-repository';
import { domainIdToUuid } from '../db/uuid-v5';
import { getSupabaseServerClient } from '../db/supabase-server';
import { CanonicalMapper } from '../../core/mappers/canonical-mapper';
import { eventBus, EventTopics } from '../../core/events/topics';
import { logger } from '../observability/logger';
import { RagPipeline } from '../../core/rag/rag-pipeline';
import { buildDocumentRollText } from '../../core/documents/document-roll';
import { LEGAL_ARGUMENTS } from '../../data/knowledge-base';
import { CaseDomain } from '../../types';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware';
import { PRICING } from '../config/pricing';
const router = Router();

// ============================================================================
// Validação comercial (backend decide o preço)
// ============================================================================

type CommercialOffer = {
  commercialId: string;
  serviceType: string;
  stageId: string | null;
  name: string;
  description: string;
  price: number;
  currency: string;
  eligible: boolean;
  available: boolean;
  requirements: string[];
  baseAmount: number;
  promotionDiscount: number;
  firstDocumentsDiscount: number;
  couponDiscount?: number;
  finalAmount: number;
  promotionId?: string;
  documentNumber: number;
};

function resolveOffer(params: {
  serviceType: string;
  userId?: string;
  couponCode?: string;
  caseId?: string;
}): { offer: CommercialOffer | null; error?: string } {
  const { serviceType, userId, couponCode } = params;

  if (!serviceType) {
    return { offer: null, error: 'serviceType é obrigatório para criar o pagamento.' };
  }

  const result = commercialService.resolveCommercialOffer({
    serviceType,
    userId,
    couponCode,
  });

  if (!result.offer) {
    return {
      offer: null,
      error: result.reason || `Serviço "${serviceType}" não possui oferta comercial disponível.`,
    };
  }

  const offer = result.offer;
  if (!offer.eligible || !offer.available) {
    return {
      offer: null,
      error: offer.name
        ? `A oferta "${offer.name}" não está disponível no momento.`
        : result.reason,
    };
  }

  return { offer };
}

function assertAmountMatchesOffer(amount: number, offer: CommercialOffer): void {
  const tolerance = 0.01;
  if (Math.abs(amount - offer.price) > tolerance) {
    throw new Error(
      `Valor de cobrança incompatível com a oferta. ` +
      `Oferta: R$ ${offer.price.toFixed(2)} | Recebido: R$ ${amount.toFixed(2)}`
    );
  }
}

// ============================================================================
// Geração automática da defesa após pagamento confirmado
// ============================================================================

/**
 * Gera o draft da defesa a partir dos dados do domínio do caso, de forma
 * consistente com o endpoint `POST /api/cases/:id/generate-defense`.
 *
 * É chamada automaticamente após a confirmação de pagamento (webhook), para
 * que o caso chegue ao estado `defesa_pronta` com a peça jurídica já montada.
 * Usa `RagPipeline.generateDefenseDraft` (minuta determinística completa,
 * incluindo o rol dinâmico de documentos do procedimento).
 */
function generateDefenseDraftForDomain(domain: CaseDomain): CaseDomain['defenseDraft'] {
  const procedureType = domain.serviceType || 'recurso_jari';
  const selectedArgs = domain.analysis?.recommendedArguments || [];

  // FAIL CLOSED: a peça paga usa APENAS os dados reais de qualificação do
  // onboarding (domain.applicant). Ausente/incompleto → erro, NUNCA fabricar
  // CNH/cidade/CPF. O webhook captura esse erro (não-bloqueante) e mantém o
  // pagamento confirmado sem peça fabricada.
  const a = domain.applicant;
  if (!a || !a.applicantName || !a.applicantCpf || !a.applicantCnh || !a.addressStreet || !a.addressCityState) {
    throw new Error('Dados de qualificação do requerente ausentes. Não é possível gerar a peça sem os dados reais.');
  }

  const defense = RagPipeline.generateDefenseDraft(
    domain.id,
    domain.infraction,
    domain.vehicle?.plate || 'SEM PLACA',
    domain.vehicle?.brandModel || 'Veículo',
    {
      name: a.applicantName,
      cpf: a.applicantCpf,
      rg: a.applicantRg,
      cnh: a.applicantCnh,
      address: `${a.addressStreet}, ${a.addressNumber || ''}`,
      cityState: a.addressCityState,
    },
    selectedArgs,
    procedureType
  );

  // Garantia de conformidade documental (BLK-068): o texto final SEMPRE termina
  // com o rol de documentos anexos (dinâmico por procedimento).
  if (!defense.fullDraftText.includes('ROL DE DOCUMENTOS')) {
    const aitNumber = domain.infraction?.aitNumber || '—';
    defense.fullDraftText = `${defense.fullDraftText.trimEnd()}\n\n${buildDocumentRollText(procedureType, aitNumber)}\n`;
  }

  return defense;
}

// ============================================================================
// Modo de teste / auth condicional
// ============================================================================

/** Em sandbox o sistema opera em modo de teste (simulação liberada). */
function isTestMode(): boolean {
  return (process.env.PAYMENT_MODE || 'sandbox').toLowerCase() !== 'production';
}

/**
 * Exige JWT apenas em produção (PAYMENT_MODE=production). Em sandbox a rota fica aberta
 * para permitir E2E e validação local sem Supabase configurado.
 */
function prodAuth(req: Request, res: Response, next: NextFunction): void {
  if ((process.env.PAYMENT_MODE || 'sandbox').toLowerCase() === 'production') {
    authenticateToken(req, res, next);
    return;
  }
  next();
}

// ============================================================================
// Resolução de preço a partir do catálogo comercial (endpoint público)
// ============================================================================

router.get('/resolve-price', (req: Request, res: Response) => {
  const { serviceType, userId, couponCode } = req.query;
  if (!serviceType || typeof serviceType !== 'string') {
    return res.status(400).json({ error: 'serviceType é obrigatório.' });
  }
  const result = resolveOffer({
    serviceType,
    userId: typeof userId === 'string' ? userId : undefined,
    couponCode: typeof couponCode === 'string' ? couponCode : undefined,
  });
  if (!result.offer) {
    return res.status(404).json({ error: result.error || 'Serviço não encontrado no catálogo.' });
  }
  res.json({
    price: result.offer.price,
    finalAmount: result.offer.finalAmount,
    baseAmount: result.offer.baseAmount,
    promotionDiscount: result.offer.promotionDiscount,
    firstDocumentsDiscount: result.offer.firstDocumentsDiscount,
    couponDiscount: result.offer.couponDiscount,
    promotionId: result.offer.promotionId,
    documentNumber: result.offer.documentNumber,
    serviceName: result.offer.name,
    serviceType: result.offer.serviceType,
    currency: result.offer.currency,
  });
});

// Middleware to capture raw body for webhook signature verification
router.use('/webhooks/pagbank', (req: Request, res: Response, next) => {
  let rawBody = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { rawBody += chunk; });
  req.on('end', () => {
    (req as any).rawBody = rawBody;
    next();
  });
});

// Raw body middleware for GGPIXAPI webhooks (no HMAC, but needs raw for logging)
router.use('/webhooks/ggpix', (req: Request, res: Response, next) => {
  let rawBody = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { rawBody += chunk; });
  req.on('end', () => {
    (req as any).rawBody = rawBody;
    next();
  });
});

// Official Gateway-Agnostic PIX Creation (resolves price from commercial catalog)
// MANTÉM alias /api/pagbank/orders para compatibilidade reversa.
router.post(['/pagbank/orders', '/pix/create'], prodAuth, async (req, res) => {
  try {
    const {
      caseId,
      customerName,
      customerEmail,
      customerCpf,
      amount,
      serviceType,
      userId,
      couponCode,
    } = req.body;

    // serviceType é obrigatório; o backend decide o preço.
    const offerResult = resolveOffer({
      serviceType: serviceType as string,
      userId: userId as string | undefined,
      couponCode: couponCode as string | undefined,
      caseId,
    });
    if (!offerResult.offer) {
      return res.status(400).json({
        error: offerResult.error || 'Não foi possível determinar a oferta comercial.',
        hint: 'Informe serviceType válido (ex: recurso_jari) ou verifique o catálogo.',
      });
    }

    const finalAmount = offerResult.offer.price;
    const gateway = gatewayManager.getActiveGateway();

    if (gateway.id === 'pagbank') {
      const userRole = (req as any).user?.role;
      if (userRole && userRole !== 'admin') {
        return res.status(403).json({ error: "Não autorizado. Faça login como administrador." });
      }
    }

    const orderResult = await gateway.createPix({
      caseId: caseId || `case_${Date.now()}`,
      referenceId: `defesai_case_${caseId || Date.now()}`,
      payer: {
        name: customerName || 'Condutor DefesAi',
        email: customerEmail || 'contato@www.defesai.shop',
        document: (customerCpf || '12345678909').replace(/\D/g, ''),
      },
      amountInCents: Math.round(finalAmount * 100),
      description: `DefesAi - ${offerResult.offer.name}`,
      webhookUrl: `${process.env.APP_URL || 'https://www.defesai.shop'}/api/webhooks/${gateway.id === 'ggpixapi' ? 'ggpix' : 'pagbank'}`,
    });

    const domain = { serviceType: offerResult.offer.serviceType, commercialOfferId: offerResult.offer.commercialId };

    logger.info('payments', 'gateway', 'create_pix_order', 'PIX order created', {
      serviceType: offerResult.offer.serviceType,
      pricingId: offerResult.offer.commercialId,
      baseAmount: offerResult.offer.baseAmount,
      discounts: {
        promotion: offerResult.offer.promotionDiscount,
        firstDocuments: offerResult.offer.firstDocumentsDiscount,
        coupon: offerResult.offer.couponDiscount,
      },
      finalAmount: offerResult.offer.finalAmount,
      gateway: gateway.id,
      environment: process.env.PAYMENT_MODE || 'sandbox',
      userRole: (req as any).user?.role,
    });

    res.json({
      success: true,
      order: orderResult,
      pixCopyPasteString: orderResult.pixCopyPaste,
      qrCodeDataUrl: orderResult.qrCodeDataUrl,
      txId: orderResult.gatewayTransactionId,
      amount: finalAmount,
      serviceType: offerResult.offer.serviceType,
      commercialOfferId: offerResult.offer.commercialId,
      status: 'aguardando_pagamento',
      gateway: gateway.id,
    });
  } catch (error: any) {
    logger.error('payments', 'pix_create', 'create_pix_order', 'Error creating PIX order', { error: error.message });
    res.status(500).json({ error: error.message || 'Erro ao gerar pedido PIX' });
  }
});

// PIX Status Polling — consulta o status da transação no gateway
// Usado pelo frontend após o usuário pagar o QR (webhook pode atrasar)
router.get('/pix/status/:txId', prodAuth, async (req, res) => {
  try {
    const { txId } = req.params;
    if (!txId) {
      return res.status(400).json({ error: 'txId é obrigatório' });
    }

    // Consulta apenas o gateway ativo. Em produção, NÃO há fallback para PagBank.
    const activeGatewayId = gatewayManager.getActiveGatewayId();
    const gw = gatewayManager.getGateway(activeGatewayId);
    if (!gw || !gw.isConfigured()) {
      return res.status(500).json({ error: 'Gateway ativo não configurado.' });
    }

    try {
      const result = await gw.getPaymentStatus(txId);
      if (result.status !== 'PENDING') {
        return res.json({ success: true, txId, status: result.status, paidAt: result.paidAt });
      }
      return res.json({ success: true, txId, status: result.status });
    } catch (err: any) {
      logger.error('payments', 'gateway', 'pix_status', 'Error querying payment status', {
        error: err.message,
        gateway: activeGatewayId,
        environment: process.env.PAYMENT_MODE || 'sandbox',
      });
      return res.status(500).json({ error: err.message || 'Erro ao consultar status do pagamento' });
    }
  } catch (err: any) {
    logger.error('payments', 'gateway', 'pix_status', 'Error querying payment status', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

// Credit Card Order Creation Endpoint — gateway-agnostic
// Only PagBank supports credit card; GGPIXAPI is blocked by the gateway manager.
router.post('/credit-card/create', prodAuth, async (req, res) => {
  try {
    const {
      caseId,
      customerName,
      customerEmail,
      customerCpf,
      amount,
      installments = 1,
      serviceType,
      cardToken,
      authenticationMethod = 'CHALLENGE',
      softDescriptor,
      userId,
      couponCode,
    } = req.body;

    if (!cardToken) {
      return res.status(400).json({ error: 'cardToken é obrigatório para pagamento com cartão de crédito' });
    }

    if (!serviceType) {
      return res.status(400).json({
        error: 'serviceType é obrigatório para criar o pagamento.',
        hint: 'Informe serviceType válido (ex: recurso_jari).',
      });
    }

    const offerResult = resolveOffer({
      serviceType: serviceType as string,
      userId: userId as string | undefined,
      couponCode: couponCode as string | undefined,
      caseId,
    });
    if (!offerResult.offer) {
      return res.status(400).json({
        error: offerResult.error || 'Não foi possível determinar a oferta comercial.',
        hint: 'Verifique o catálogo comercial antes de prosseguir.',
      });
    }

    if (amount !== undefined && Number(amount) !== offerResult.offer.price) {
      return res.status(400).json({
        error: 'Valor informado não corresponde ao preço da oferta. O backend recalcula automaticamente.',
        expectedPrice: offerResult.offer.price,
        receivedAmount: Number(amount),
      });
    }

    const gateway = gatewayManager.getActiveGateway();

    if (gateway.id === 'pagbank') {
      const userRole = (req as any).user?.role;
      if (userRole && userRole !== 'admin') {
        return res.status(403).json({ error: "Não autorizado. Faça login como administrador." });
      }
    }

    if (gateway.id !== 'pagbank') {
      return res.status(400).json({
        error: 'Gateway ativo não suporta pagamento com cartão de crédito.',
        message: `O gateway '${gateway.displayName}' só aceita PIX. Altere o gateway para PagBank nas configurações de pagamento.`,
        gateway: gateway.id,
        supportedMethods: ['pix'],
      });
    }

    logger.info('payments', 'gateway', 'credit_card_gateway_check', 'Credit card gateway validated', {
      gateway: gateway.id,
      environment: process.env.PAYMENT_MODE || 'sandbox',
      userRole: (req as any).user?.role,
      serviceType: offerResult.offer?.serviceType,
    });

    const orderResult = await pagBankIntegration.createCreditCardOrder({
      caseId: caseId || `case_${Date.now()}`,
      referenceId: `defesai_case_${caseId || Date.now()}`,
      customer: {
        name: customerName || 'Condutor DefesAi',
        email: customerEmail || 'contato@www.defesai.shop',
        taxId: (customerCpf || '12345678909').replace(/\D/g, ''),
      },
      amount: offerResult.offer.price,
      installments: Number(installments),
      cardToken,
      authenticationMethod,
      softDescriptor,
      notificationUrls: [`${process.env.APP_URL || 'https://www.defesai.shop'}/api/webhooks/pagbank`],
    });

    // Update case with payment and commercial offer reference
    if (caseId) {
      const row = databaseRows.get(caseId);
      if (row) {
        const domain = CanonicalMapper.rowToDomain(row);
        domain.payment = {
          status: 'pending',
          amount: offerResult.offer.price,
          transactionId: orderResult.orderId,
          paymentMethod: 'credit_card',
        };
        domain.serviceType = offerResult.offer.serviceType as any;
        domain.commercialOfferId = offerResult.offer.commercialId;
        const updatedRow = CanonicalMapper.domainToRow(domain);
        databaseRows.set(caseId, updatedRow);
        caseRepository.set(caseId, updatedRow);
      }
    }

    logger.info('payments', 'gateway', 'create_credit_card_order', 'Credit card order endpoint called', {
      caseId,
      status: 'success',
      metadata: {
        orderId: orderResult.orderId,
        orderStatus: orderResult.status,
        threeDsRequired: orderResult.threeDsChallengeRequired,
        serviceType: offerResult.offer.serviceType,
        commercialOfferId: offerResult.offer.commercialId,
        gateway: 'pagbank',
      },
    });

    res.json({
      success: true,
      order: orderResult,
      txId: orderResult.orderId,
      amount: offerResult.offer.price,
      serviceType: offerResult.offer.serviceType,
      commercialOfferId: offerResult.offer.commercialId,
      status: orderResult.threeDsChallengeRequired ? 'aguardando_3ds' : 'autorizado',
      threeDsUrl: orderResult.threeDsUrl,
      threeDsChallengeRequired: orderResult.threeDsChallengeRequired,
    });
  } catch (error: any) {
    logger.error('payments', 'gateway', 'create_credit_card_order', 'Error creating credit card order', { error: error.message });
    res.status(500).json({ error: error.message || 'Erro ao gerar pedido de cartão de crédito' });
  }
});

// PagBank Order Status polling endpoint
router.get('/pagbank/orders/:id', (req, res) => {
  const order = pagBankIntegration.getOrder(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Pedido PagBank não encontrado' });
  }
  res.json(order);
});

// PagBank Official Webhook with HMAC-SHA256 Signature Verification & Idempotency
router.post('/webhooks/pagbank', async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const payload = req.body;
    const signature = req.headers['x-hub-signature-256'] as string || 
                     req.headers['x-pagbank-signature'] as string ||
                     req.headers['x-authenticity-token'] as string;

    const webhookResult = pagBankIntegration.processWebhook(rawBody, signature, payload) as {
      signatureValid: boolean;
      status: string;
      orderId?: string;
      amountInCents?: number;
      transactionType?: string;
      gatewayTransactionId?: string;
      commercialOfferId?: string;
      serviceType?: string;
      paidAt?: string;
    };

    if (!webhookResult.signatureValid) {
      logger.error('payments', 'pagbank', 'webhook', 'Invalid signature - rejecting webhook', {
        eventId: payload.id,
      });
      return res.status(401).json({ error: 'Assinatura inválida', received: false });
    }

    const caseId = typeof payload.referenceId === 'string'
      ? payload.referenceId.replace('defesai_case_', '')
      : null;

    if (caseId && webhookResult.status === 'PAID') {
      const row = databaseRows.get(caseId);
      if (row) {
        const domain = CanonicalMapper.rowToDomain(row);
        const paymentAmount = Number((webhookResult.amountInCents || 0) / 100);

        domain.isPaid = true;
        domain.paidAt = new Date().toISOString();
        domain.status = 'defesa_pronta';
        domain.currentStage = 3;
        domain.serviceType = domain.serviceType || 'recurso_jari';

        const paymentMethod = (domain.payment?.paymentMethod ||
          (webhookResult.transactionType === 'CREDIT_CARD' ? 'credit_card' : 'pix'));

        domain.payment = {
          status: 'approved',
          amount: paymentAmount > 0 ? paymentAmount : (domain.payment?.amount || 0),
          paidAt: new Date().toISOString(),
          transactionId: webhookResult.orderId || webhookResult.gatewayTransactionId,
          paymentMethod,
        };
        if (webhookResult.commercialOfferId) {
          domain.commercialOfferId = webhookResult.commercialOfferId;
        }
        if (webhookResult.serviceType && !domain.serviceType) {
          domain.serviceType = webhookResult.serviceType as any;
        }

        // Geração AUTOMÁTICA da defesa após pagamento confirmado (PAID).
        // O caso chega a `defesa_pronta` já com a peça jurídica montada.
        // Envolvida em try/catch para NUNCA quebrar o webhook caso a geração
        // falhe — o pagamento permanece confirmado (isPaid=true).
        try {
          const defense = generateDefenseDraftForDomain(domain);
          defense.generationCount = 1;
          domain.defenseDraft = defense;
          domain.documentGenerationStatus = 'ready';

          domain.timeline.push({
            id: `tl_def_auto_${Date.now()}`,
            title: 'Defesa Gerada Automaticamente',
            description: `Minuta da defesa (${domain.serviceType}) gerada automaticamente após confirmação do pagamento.`,
            timestamp: new Date().toISOString(),
            type: 'defense',
          });
        } catch (defenseError: any) {
          // Não-bloqueante: mantém o caso pago mesmo se a geração falhar.
          logger.error('payments', 'pagbank', 'webhook', 'Falha ao gerar defesa automaticamente após pagamento (não-bloqueante)', {
            error: defenseError?.message,
            caseId: domain.id,
          });
        }

        domain.timeline.push({
          id: `tl_webhook_${Date.now()}`,
          title: 'Pagamento Confirmado via Webhook PagBank',
          description: `Transação ${webhookResult.orderId || webhookResult.gatewayTransactionId} aprovada pela instituição financeira.`,
          timestamp: new Date().toISOString(),
          type: 'payment',
        });

        const updatedRow = CanonicalMapper.domainToRow(domain);
        databaseRows.set(caseId, updatedRow);
        caseRepository.set(caseId, updatedRow);

        commercialService.processPaymentConfirmationEvent({
          paymentId: webhookResult.orderId || webhookResult.gatewayTransactionId || `ord_${domain.id}`,
          caseId: domain.id,
          buyerUserId: domain.clientEmail || `usr_${domain.id.substring(0, 8)}`,
          buyerUserName: domain.clientName || 'Condutor DefesAi',
          grossAmount: domain.payment.amount,
          discountAmount: 0,
          effectivelyPaid: domain.payment.amount,
        });

        auditLogs.unshift({
          id: `audit_pay_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: domain.clientName || 'Cliente',
          role: 'citizen',
          action: 'PAYMENT_CONFIRMED',
          targetResource: domain.id,
          ipHash: '3a88c42b109e',
          details: `Pagamento de R$ ${domain.payment.amount.toFixed(2).replace('.', ',')} via ${paymentMethod.toUpperCase()} PagBank confirmado.`,
          gdprCompliant: true,
        });
      }
    }

    res.status(200).json({ received: true, ...webhookResult });
  } catch (error: any) {
    logger.error('payments', 'pagbank', 'webhook', 'Webhook processing error', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// Simulate confirm for local testing / instant preview & Admin Simulation
// ============================================================================
router.post('/simulate-payment', async (req: Request, res: Response) => {
  try {
    const { caseId, amount, paymentMethod = 'pix', gateway = 'pagbank' } = req.body;
    if (!caseId) {
      return res.status(400).json({ error: 'caseId é obrigatório para simulação de pagamento' });
    }

    let row = databaseRows.get(caseId);
    let domain: CaseDomain;

    if (row) {
      domain = CanonicalMapper.rowToDomain(row);
    } else {
      // Fallback domain if case not yet persisted
      domain = {
        id: caseId,
        title: 'Recurso JARI - Auto TEST-123456',
        serviceType: 'recurso_jari',
        isPaid: false,
        isAnonymous: true,
        currentStage: 1,
        status: 'analisado',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clientName: 'Condutor Teste',
        clientEmail: 'teste@defesai.com.br',
        clientCpf: '12345678909',
        applicant: {
          applicantName: 'Condutor Teste',
          applicantCpf: '123.456.789-09',
          applicantCnh: '12345678900',
          cnhCategory: 'B',
          applicantPhone: '(11) 98765-4321',
          applicantEmail: 'teste@defesai.com.br',
          addressStreet: 'Av. Paulista',
          addressNumber: '1000',
          addressNeighborhood: 'Bela Vista',
          addressZipCode: '01310-100',
          addressCityState: 'São Paulo - SP',
        },
        infraction: {
          aitNumber: 'TEST-123456',
          autuadorBody: 'DETRAN-SP',
          ctbArticle: 'Art. 218, I do CTB',
          description: 'Transitar em velocidade superior à máxima permitida em até 20%',
          severity: 'media',
          points: 4,
          fineAmount: 130.16,
          location: 'Av. Paulista, 1000 - São Paulo/SP',
          dateTime: new Date().toISOString(),
        } as any,
        vehicle: {
          plate: 'ABC1D23',
          brandModel: 'VW GOL 1.0',
        },
        timeline: [],
      };
    }

    const effectiveAmount = typeof amount === 'number' && amount > 0 ? amount : 89.90;

    domain.isPaid = true;
    domain.paidAt = new Date().toISOString();
    domain.status = 'defesa_pronta';
    domain.currentStage = 3;
    domain.serviceType = domain.serviceType || 'recurso_jari';
    domain.payment = {
      status: 'approved',
      amount: effectiveAmount,
      paidAt: new Date().toISOString(),
      transactionId: `sim_${gateway}_${Date.now()}`,
      paymentMethod: paymentMethod === 'credit_card' ? 'credit_card' : 'pix',
    };

    if (!domain.applicant) {
      domain.applicant = {
        applicantName: domain.clientName || 'Condutor Requerente',
        applicantCpf: domain.clientCpf || '123.456.789-09',
        applicantCnh: '12345678900',
        cnhCategory: 'B',
        applicantPhone: domain.clientPhone || '(11) 98765-4321',
        applicantEmail: domain.clientEmail || 'contato@defesai.com.br',
        addressStreet: 'Av. Paulista',
        addressNumber: '1000',
        addressNeighborhood: 'Bela Vista',
        addressZipCode: '01310-100',
        addressCityState: 'São Paulo - SP',
      };
    }

    try {
      const defense = generateDefenseDraftForDomain(domain);
      if (defense) {
        defense.generationCount = 1;
        domain.defenseDraft = defense;
        domain.documentGenerationStatus = 'ready';
      }

      domain.timeline.push({
        id: `tl_def_sim_${Date.now()}`,
        title: 'Defesa Gerada Automaticamente (Simulação)',
        description: `Minuta da defesa (${domain.serviceType}) gerada automaticamente após confirmação de pagamento simulado.`,
        timestamp: new Date().toISOString(),
        type: 'defense',
      });
    } catch (defErr: any) {
      logger.warn('payments', 'simulation', 'defense_generation', 'Defense draft generation warning', {
        error: defErr?.message,
        caseId,
      });
    }

    domain.timeline.push({
      id: `tl_sim_${Date.now()}`,
      title: `Pagamento Aprovado (${gateway.toUpperCase()} Simulação / Admin)`,
      description: `Pagamento de R$ ${effectiveAmount.toFixed(2).replace('.', ',')} via ${paymentMethod.toUpperCase()} simulado com sucesso.`,
      timestamp: new Date().toISOString(),
      type: 'payment',
    });

    const updatedRow = CanonicalMapper.domainToRow(domain);
    databaseRows.set(caseId, updatedRow);
    caseRepository.set(caseId, updatedRow);

    // Upsert em payment_orders
    try {
      const caseIdUuid = domainIdToUuid(domain.id);
      const supabaseForOrder = getSupabaseServerClient();
      if (supabaseForOrder && caseIdUuid) {
        await (supabaseForOrder.from('payment_orders') as any).upsert({
          case_id: caseIdUuid,
          user_id: domain.userId && /^[0-9a-f-]{36}$/i.test(domain.userId) ? domain.userId : null,
          reference_id: `defesai_case_${domain.id}`,
          pagbank_order_id: `sim_${gateway}_${domain.id}`,
          gateway,
          status: 'PAID',
          amount: effectiveAmount,
          currency: 'BRL',
          payment_method: paymentMethod,
          paid_at: new Date().toISOString(),
          base_amount: effectiveAmount,
          discount_amount: 0,
          final_amount: effectiveAmount,
          expires_at: null,
        }, { onConflict: 'case_id' });
      }
    } catch (orderErr: any) {
      logger.warn('payments', 'simulation', 'order_insert', 'Non-blocking order insert issue', {
        error: orderErr?.message,
      });
    }

    auditLogs.unshift({
      id: `audit_sim_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Admin / Sandbox',
      role: 'admin',
      action: 'PAYMENT_CONFIRMED',
      targetResource: domain.id,
      ipHash: '127.0.0.1',
      details: `Pagamento simulado de R$ ${effectiveAmount.toFixed(2).replace('.', ',')} para o caso #${domain.id}.`,
      gdprCompliant: true,
    });

    eventBus.publish(EventTopics.PAYMENT_CONFIRMED, {
      caseId: domain.id,
      amount: effectiveAmount,
      gateway,
      paymentMethod,
    }, 'payment_engine');

    res.json({
      success: true,
      message: 'Pagamento simulado com sucesso!',
      case: domain,
      defenseDraft: domain.defenseDraft,
    });
  } catch (err: any) {
    logger.error('payments', 'simulation', 'error', 'Error simulating payment', { error: err.message });
    res.status(500).json({ error: err.message || 'Erro ao simular pagamento' });
  }
});

// Alias for backwards compatibility with test scripts
router.post('/simulate-confirm', async (req: Request, res: Response) => {
  const { caseId } = req.body;
  if (!caseId) {
    return res.status(400).json({ error: 'caseId é obrigatório' });
  }
  const row = databaseRows.get(caseId);
  if (!row) {
    return res.status(404).json({ error: 'Caso não encontrado' });
  }
  const domain = CanonicalMapper.rowToDomain(row);
  domain.isPaid = true;
  domain.paidAt = new Date().toISOString();
  domain.status = 'defesa_pronta';
  domain.currentStage = 3;
  domain.payment = {
    status: 'approved',
    amount: 89.90,
    paidAt: new Date().toISOString(),
    paymentMethod: 'pix',
  };
  try {
    domain.defenseDraft = generateDefenseDraftForDomain(domain);
  } catch {}
  const updatedRow = CanonicalMapper.domainToRow(domain);
  databaseRows.set(caseId, updatedRow);
  res.json({ success: true, case: domain });
});

// Admin Sandbox Webhook Trigger
router.post('/sandbox/trigger-webhook', async (req: Request, res: Response) => {
  try {
    const { gateway = 'pagbank', eventType = 'PAID', caseId, amount = 89.90 } = req.body;
    if (!caseId) {
      return res.status(400).json({ error: 'caseId é obrigatório' });
    }

    let payload: any;
    let path: string;
    let headers: Record<string, string> = {};

    if (gateway === 'pagbank') {
      path = '/webhooks/pagbank';
      payload = {
        id: `evt_sim_${Date.now()}`,
        reference_id: `defesai_case_${caseId}`,
        created_at: new Date().toISOString(),
        charges: [
          {
            id: `ch_sim_${Date.now()}`,
            reference_id: `defesai_case_${caseId}`,
            status: eventType === 'PAID' ? 'PAID' : 'CANCELED',
            created_at: new Date().toISOString(),
            paid_at: eventType === 'PAID' ? new Date().toISOString() : undefined,
            amount: { value: Math.round(amount * 100), currency: 'BRL' },
            payment_method: { type: 'PIX' },
          },
        ],
      };
      // In dev/sandbox mode or direct call
      headers['x-hub-signature-256'] = 'sha256=sandbox_dev_signature';
    } else {
      path = '/webhooks/ggpix';
      payload = {
        transactionId: `ggpix_tx_sim_${Date.now()}`,
        externalId: `defesai_case_${caseId}`,
        status: eventType === 'PAID' ? 'COMPLETE' : 'CANCELED',
        type: 'PIX_IN',
        amount,
        netAmount: amount * 0.98,
        gatewayFee: amount * 0.02,
        paidAt: eventType === 'PAID' ? new Date().toISOString() : undefined,
      };
      headers['x-forwarded-for'] = '127.0.0.1';
    }

    const rawBody = JSON.stringify(payload);
    const result = processGatewayWebhook(path, rawBody, headers, payload);

    res.json({
      success: true,
      message: `Webhook sandbox disparado para ${gateway.toUpperCase()}`,
      result,
    });
  } catch (err: any) {
    logger.error('payments', 'sandbox', 'webhook_trigger', 'Error triggering sandbox webhook', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GGPIXAPI Webhook — gateway-agnostic via processGatewayWebhook()
// ============================================================================
router.post('/webhooks/ggpix', async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const payload = req.body;

    const result = processGatewayWebhook('/webhooks/ggpix', rawBody, req.headers as Record<string, string | undefined>, payload);

    if (!result) {
      logger.warn('payments', 'ggpix', 'webhook', 'GGPIXAPI webhook not recognized', {
        hasTransactionId: !!payload?.transactionId,
      });
      return res.status(400).json({ error: 'Webhook não reconhecido' });
    }

    const { event } = result;

    // Normalizar: extrair caseId do referenceId (formato: "defesai_case_{caseId}")
    const caseId = event.referenceId?.replace('defesai_case_', '') || null;

    if (caseId && event.status === 'PAID') {
      const row = databaseRows.get(caseId);
      if (row) {
        const domain = CanonicalMapper.rowToDomain(row);
        const paymentAmount = Number((event.amountInCents || 0) / 100);

        domain.isPaid = true;
        domain.paidAt = event.paidAt || new Date().toISOString();
        domain.status = 'defesa_pronta';
        domain.currentStage = 3;
        domain.serviceType = domain.serviceType || 'recurso_jari';

        domain.payment = {
          status: 'approved',
          amount: paymentAmount > 0 ? paymentAmount : (domain.payment?.amount || 0),
          paidAt: event.paidAt || new Date().toISOString(),
          transactionId: event.gatewayTransactionId,
          paymentMethod: 'pix',
        };
        if ((event as any).commercialOfferId) {
          domain.commercialOfferId = (event as any).commercialOfferId as string;
        }
        if ((event as any).serviceType && !domain.serviceType) {
          domain.serviceType = (event as any).serviceType as any;
        }

        domain.timeline.push({
          id: `tl_webhook_${Date.now()}`,
          title: 'Pagamento Confirmado via Webhook GGPIXAPI',
          description: `Transação ${event.gatewayTransactionId} aprovada automaticamente pelo gateway GGPIXAPI.`,
          timestamp: new Date().toISOString(),
          type: 'payment',
        });

        const updatedRow = CanonicalMapper.domainToRow(domain);
        databaseRows.set(caseId, updatedRow);
        caseRepository.set(caseId, updatedRow);

        // INSERT em payment_orders (fonte de verdade para KPIs e reconciliação)
        if (event.status === 'PAID') {
          try {
            const paymentAmount = Number((event.amountInCents || 0) / 100);
            const gatewayTxnId = event.gatewayTransactionId || `ord_${domain.id}`;
            const caseIdUuid = domainIdToUuid(domain.id);
            const supabaseForOrder = getSupabaseServerClient();
            if (supabaseForOrder && caseIdUuid) {
              await (supabaseForOrder.from('payment_orders') as any).upsert({
                case_id: caseIdUuid,
                user_id: domain.userId && /^[0-9a-f-]{36}$/i.test(domain.userId) ? domain.userId : null,
                reference_id: event.referenceId || `defesai_case_${domain.id}`,
                pagbank_order_id: gatewayTxnId,
                gateway: 'ggpixapi',
                status: 'PAID',
                amount: paymentAmount > 0 ? paymentAmount : (domain.payment?.amount || 0),
                currency: 'BRL',
                payment_method: 'pix',
                paid_at: event.paidAt || new Date().toISOString(),
                base_amount: paymentAmount > 0 ? paymentAmount : (domain.payment?.amount || 0),
                discount_amount: 0,
                final_amount: paymentAmount > 0 ? paymentAmount : (domain.payment?.amount || 0),
                expires_at: null,
              }, { onConflict: 'case_id' });
            }
          } catch (orderErr) {
            logger.warn('payments', 'ggpix', 'webhook', 'Falha ao inserir payment_orders (não-bloqueante)', {
              error: (orderErr as Error).message,
              caseId: domain.id,
            });
          }
        }

        commercialService.processPaymentConfirmationEvent({
          paymentId: event.gatewayTransactionId || `ord_${domain.id}`,
          caseId: domain.id,
          buyerUserId: domain.clientEmail || `usr_${domain.id.substring(0, 8)}`,
          buyerUserName: domain.clientName || 'Condutor DefesAi',
          grossAmount: domain.payment.amount,
          discountAmount: 0,
          effectivelyPaid: domain.payment.amount,
        });

        auditLogs.unshift({
          id: `audit_pay_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: domain.clientName || 'Cliente',
          role: 'citizen',
          action: 'PAYMENT_CONFIRMED',
          targetResource: domain.id,
          ipHash: '3a88c42b109e',
          details: `Pagamento de R$ ${domain.payment.amount.toFixed(2).replace('.', ',')} via PIX GGPIXAPI confirmado.`,
          gdprCompliant: true,
        });
      }
    }

    res.status(200).json({ received: true, gatewayEventId: event.gatewayEventId });
  } catch (error: any) {
    logger.error('payments', 'ggpix', 'webhook', 'GGPIXAPI webhook processing error', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// Gateway Status — usado pelo Admin UI para exibir status dos gateways
// ============================================================================
router.get('/gateway/status', (req, res) => {
  const status = gatewayManager.getGatewayStatus();
  const activeId = gatewayManager.getActiveGatewayId();
  res.json({
    activeGateway: activeId,
    gateways: status,
    testMode: isTestMode(),
  });
});

// ============================================================================
// Gateway Switch — Admin UI pode alternar gateway em runtime
// ============================================================================
router.post('/gateway/switch', requireAdmin, async (req, res) => {
  const { gatewayId } = req.body;
  if (!gatewayId) {
    return res.status(400).json({ error: 'gatewayId é obrigatório' });
  }

  const updatedBy = (req as any).user?.email || (req as any).user?.id || 'admin';
  const result = await gatewayManager.setActiveGateway(gatewayId, updatedBy);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ success: true, message: result.message, activeGateway: gatewayId });
});

export default router;