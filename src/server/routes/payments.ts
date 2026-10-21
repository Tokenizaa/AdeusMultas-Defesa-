import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { pagBankIntegration } from '../integrations/pagbank';
import { gatewayManager, processGatewayWebhook, venopagAdapter } from '../integrations/gateway';
import type { GatewayId } from '../integrations/gateway';
import type { PagBankWebhookPayload } from '../integrations/pagbank';
import { commercialService } from '../commercial/commercial-service';
import { databaseRows, auditLogs } from '../stores';
import { caseRepository } from '../db/case-repository';
import { webhookRepository } from '../db/webhook-repository';
import { domainIdToUuid } from '../db/uuid-v5';
import { getSupabaseServerClient } from '../db/supabase-server';
import { CanonicalMapper } from '../../core/mappers/canonical-mapper';
import { computeDefenseIntegrityHash } from '../../core/documents/defense-integrity';
import { eventBus, EventTopics } from '../../core/events/topics';
import { logger } from '../observability/logger';
import { RagPipeline } from '../../core/rag/rag-pipeline';
import { buildDocumentRollText } from '../../core/documents/document-roll';
import { CaseDomain } from '../../types';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware';
import { assertPaymentCaseAccess, resolveEffectiveUser } from '../payments/case-access';
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
function validatePayerIdentity(name: unknown, email: unknown, cpf: unknown): { name: string; email: string; cpf: string } | null {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  const normalizedCpf = typeof cpf === 'string' ? cpf.replace(/\D/g, '') : '';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  if (!normalizedName || !emailValid || normalizedCpf.length !== 11) return null;
  return { name: normalizedName, email: normalizedEmail, cpf: normalizedCpf };
}

/**
 * Autorização do pagamento: o pagador só pode criar pedido PIX se o caso
 * pertence à sessão autenticada OU se o claim token válido do caso é
 * apresentado. NUNCA confia em userId/role/caseId enviados pelo cliente como
 * fonte de identidade — o caso é resolvido do repositório e cruzado com a
 * sessão real (req.user) ou com o claim token armazenado (comparação em tempo
 * constante). Admin segue autorizado por override.
 */
function canPayCase(req: Request, caseId: string): boolean {
  const user = (req as any).user;
  if (user?.role === 'admin') return true;
  if (user?.id) {
    const row = databaseRows.get(caseId);
    if (!row) return false; // caso inexistente → negar (FAIL CLOSED)
    return row.user_id === user.id;
  }
  // Anônimo/claim: exige claim token válido do caso.
  const provided = req.header('X-Claim-Token');
  const row = databaseRows.get(caseId);
  if (typeof provided !== 'string' || !provided || !row?.claim_token) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(row.claim_token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function assertCanPayCase(req: Request, res: Response, caseId: string): boolean {
  if (!caseId) return true; // sem caseId o fluxo legado segue; sem caso não há IDOR
  if (canPayCase(req, caseId)) return true;
  res.status(403).json({ error: 'Você não tem permissão para pagar este caso.' });
  return false;
}

function prodAuth(req: Request, res: Response, next: NextFunction): void {
  if ((process.env.PAYMENT_MODE || 'sandbox').toLowerCase() === 'production') {
    // Produção: pagar/consultar status exige Supabase JWT (qualquer role — admin
    // NÃO é exigido para checkout normal). Anônimo recebe 401 explícito.
    authenticateToken(req, res, () => {
      if (!req.user) {
        res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
        return;
      }
      next();
    });
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

// Middleware to capture raw body for webhook signature verification.
// GUARD: express.json (app.ts) já consumiu o stream e gravou req.rawBody quando
// Content-Type é application/json — só recaptura quando nenhum body foi parseado,
// senão 'end' nunca dispara e a request trava (bug: webhook oficial PIX pendurava).
router.use('/webhooks/pagbank', (req: Request, _res: Response, next: NextFunction) => {
  if ((req as any).rawBody !== undefined) return next();
  let rawBody = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { rawBody += chunk; });
  req.on('end', () => {
    (req as any).rawBody = rawBody;
    next();
  });
});

// Raw body middleware for VenoPag webhooks (HMAC signature verification)
router.use('/webhooks/venopag', (req: Request, _res: Response, next: NextFunction) => {
  if ((req as any).rawBody !== undefined) return next();
  let rawBody = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { rawBody += chunk; });
  req.on('end', () => {
    (req as any).rawBody = rawBody;
    next();
  });
});

// Official Gateway-Agnostic PIX Creation (resolves price from commercial catalog)
// Agora usa apenas o gateway ativo (VenoPag).
router.post('/pix/create', prodAuth, async (req, res) => {
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

    // Identidade do pagador e userId NUNCA vêm do frontend quando o servidor
    // pode obtê-los do caso (server-authoritative).
    const targetRow = caseId && typeof caseId === 'string' ? databaseRows.get(caseId) : undefined;
    const effectiveUserId = resolveEffectiveUser(targetRow, (req as any).user);
    const payer = validatePayerIdentity(targetRow?.client_name || customerName, targetRow?.client_email || customerEmail, targetRow?.client_cpf || customerCpf);
    if (!payer) return res.status(400).json({ error: 'Nome, email e CPF válidos do pagador são obrigatórios para criação do pagamento PIX.' });

    // serviceType é obrigatório; o backend decide o preço.
    const offerResult = resolveOffer({
      serviceType: serviceType as string,
      userId: effectiveUserId,
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

    // Autorização canônica: caso do usuário autenticado ou claim token válido.
    if (!assertCanPayCase(req, res, caseId)) return;

    const orderResult = await gateway.createPix({
      caseId: caseId || `case_${Date.now()}`,
      referenceId: `defesai_case_${caseId || Date.now()}`,
      payer: {
        name: payer.name,
        email: payer.email,
        document: payer.cpf,
      },
      amountInCents: Math.round(finalAmount * 100),
      description: `DefesAi - ${offerResult.offer.name}`,
      webhookUrl: `${process.env.APP_URL || 'https://www.defesai.shop'}/api/webhooks/venopag`,
    });

    const domain = { serviceType: offerResult.offer.serviceType, commercialOfferId: offerResult.offer.commercialId };

    logger.info('payments', 'gateway', 'create_pix_order', 'VenoPag PIX order created', {
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
    logger.error('payments', 'venopag', 'create_pix_order', 'Error creating PIX order', { error: error.message });
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

    // Identidade e userId NUNCA vêm do frontend quando o servidor pode obtê-los do caso.
    const targetRow = caseId && typeof caseId === 'string' ? databaseRows.get(caseId) : undefined;
    const effectiveUserId = resolveEffectiveUser(targetRow, (req as any).user);
    const payer = validatePayerIdentity(targetRow?.client_name || customerName, targetRow?.client_email || customerEmail, targetRow?.client_cpf || customerCpf);
    if (!payer) return res.status(400).json({ error: 'Nome, email e CPF válidos do pagador são obrigatórios para pagamento com cartão de crédito.' });

    const offerResult = resolveOffer({
      serviceType: serviceType as string,
      userId: effectiveUserId,
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

    // Autorização canônica do caso (sessão ou claim token).
    if (!assertCanPayCase(req, res, caseId)) return;

    if (gateway.id !== 'venopag') {
      return res.status(400).json({
        error: 'Gateway ativo não suporta pagamento com cartão de crédito.',
        message: 'O gateway VenoPag só aceita PIX. Apenas PIX está disponível.',
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
        name: payer.name,
        email: payer.email,
        taxId: payer.cpf,
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
        await caseRepository.set(caseId, updatedRow);
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

// PagBank Official Webhook with HMAC-SHA256 Signature Verification & Durable Idempotency
// Fluxo: verificar assinatura → aceitar evento (durável, dedup) → retornar 2xx →
// processar efeitos colaterais (idempotentes) → marcar como processado.
router.post('/webhooks/pagbank', async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const payload = req.body as PagBankWebhookPayload;
    const signature = req.headers['x-hub-signature-256'] as string || 
                     req.headers['x-pagbank-signature'] as string ||
                     req.headers['x-authenticity-token'] as string;

    // 1. Verificar assinatura HMAC-SHA256 (bloqueador)
    const signatureValid = pagBankIntegration.verifyWebhookSignature(rawBody, signature);
    if (!signatureValid) {
      logger.error('payments', 'pagbank', 'webhook', 'Invalid signature - rejecting webhook', {
        eventId: payload?.id,
      });
      return res.status(401).json({ error: 'Assinatura inválida', received: false });
    }

    // 2. Extrair dados do evento (sem efeitos colaterais aqui)
    const webhookEventId = payload.id || `wh_${Date.now()}`;
    const firstCharge = payload.charges?.[0];
    const isPaid = firstCharge?.status === 'PAID';
    const referenceId = payload.reference_id || firstCharge?.reference_id || '';
    const caseId = typeof referenceId === 'string'
      ? referenceId.replace('defesai_case_', '')
      : null;

    // 3. Idempotência durável: aceitar evento se novo (sobrevive a restarts)
    const accepted = await webhookRepository.acceptEvent(webhookEventId, 'pagbank', payload);
    if (!accepted.isNew) {
      // Entrega duplicada: evento já foi aceito anteriormente.
      // Se já foi processado, retornar 2xx sem efeitos colaterais.
      // Se ainda não foi processado (crash entre accept e complete),
      // o side effect abaixo é idempotente e será aplicado com segurança.
      logger.info('payments', 'pagbank', 'webhook', 'Webhook duplicado — aceitação durável ignorou', {
        webhookEventId,
        caseId,
      });
    }

    // 4. Processar efeitos colaterais (apenas se o pagamento for PAID e o caso não estiver já quitado)
    // Idempotência de negócio: se o caso já está isPaid=true com a mesma transação, pular.
    if (isPaid && caseId) {
      const row = databaseRows.get(caseId);
      if (row) {
        const domain = CanonicalMapper.rowToDomain(row);
        const alreadyPaid = domain.isPaid === true &&
          domain.payment?.transactionId === (firstCharge?.reference_id || payload.id || undefined);

        if (!alreadyPaid) {
          const paymentAmount = Number((firstCharge?.amount?.value || 0) / 100);

          domain.isPaid = true;
          domain.paidAt = firstCharge?.paid_at || new Date().toISOString();
          domain.status = 'defesa_pronta';
          domain.currentStage = 3;
          domain.serviceType = domain.serviceType || 'recurso_jari';

          const paymentMethod = (domain.payment?.paymentMethod ||
            (firstCharge?.payment_method?.type === 'CREDIT_CARD' ? 'credit_card' : 'pix'));

          domain.payment = {
            status: 'approved',
            amount: paymentAmount > 0 ? paymentAmount : (domain.payment?.amount || 0),
            paidAt: new Date().toISOString(),
            transactionId: firstCharge?.reference_id || payload.id || `ord_${domain.id}`,
            paymentMethod,
          };

          // Geração AUTOMÁTICA da defesa após pagamento confirmado (PAID).
          try {
            const defense = generateDefenseDraftForDomain(domain);
            defense.generationCount = 1;
            (defense as any).integrityHash = computeDefenseIntegrityHash(
              defense as any,
              (domain as any).analysis as any
            );
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
            logger.error('payments', 'pagbank', 'webhook', 'Falha ao gerar defesa automaticamente após pagamento (não-bloqueante)', {
              error: defenseError?.message,
              caseId: domain.id,
            });
          }

          domain.timeline.push({
            id: `tl_webhook_${Date.now()}`,
            title: 'Pagamento Confirmado via Webhook PagBank',
            description: `Transação ${firstCharge?.reference_id || payload.id} aprovada pela instituição financeira.`,
            timestamp: new Date().toISOString(),
            type: 'payment',
          });

          const updatedRow = CanonicalMapper.domainToRow(domain);
          await caseRepository.set(caseId, updatedRow);

          commercialService.processPaymentConfirmationEvent({
            paymentId: firstCharge?.reference_id || payload.id || `ord_${domain.id}`,
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
    }

    // 5. Marcar evento como processado (durável)
    try {
      await webhookRepository.completeEvent(webhookEventId);
    } catch (completeErr: any) {
      logger.warn('payments', 'pagbank', 'webhook', 'Falha ao marcar evento como processado — será retryado pelo worker', {
        webhookEventId,
        error: completeErr?.message,
      });
    }

    res.status(200).json({ received: true, duplicate: !accepted.isNew, eventId: webhookEventId });
  } catch (error: any) {
    logger.error('payments', 'pagbank', 'webhook', 'Webhook processing error', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// Simulate confirm for local testing / instant preview & Admin Simulation
// ============================================================================
// PRODUCTION: Block sandbox simulation endpoint — payment state must only be
// changed by real gateway webhooks (PagBank HMAC or GGPIX IP allowlist).
router.post('/simulate-payment', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({
      error: 'Endpoint de simulação não disponível em produção',
      message: 'Estado de pagamento deve ser alterado apenas via webhooks oficiais dos gateways.',
    });
  }
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
    await caseRepository.set(caseId, updatedRow);

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
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({
      error: 'Endpoint de simulação não disponível em produção',
      message: 'Estado de pagamento deve ser alterado apenas via webhooks oficiais dos gateways.',
    });
  }
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
  await caseRepository.set(caseId, updatedRow);
  res.json({ success: true, case: domain });
});

// Admin Sandbox Webhook Trigger
router.post('/sandbox/trigger-webhook', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({
      error: 'Endpoint de simulação não disponível em produção',
      message: 'Estado de pagamento deve ser alterado apenas via webhooks oficiais dos gateways.',
    });
  }
  try {
    const { gateway = 'venopag', eventType = 'PAID', caseId, amount = 89.90 } = req.body;
    if (!caseId) {
      return res.status(400).json({ error: 'caseId é obrigatório' });
    }

    let payload: any;
    let path: string;
    let headers: Record<string, string> = {};

    if (gateway === 'venopag') {
      path = '/webhooks/venopag';
      payload = {
        request_number: `defesai_case_${caseId}`,
        status: eventType === 'PAID' ? 'COMPLETE' : 'CANCELED',
        type: 'PIX_IN',
        amount,
        client_id: 'test_client',
        created_at: new Date().toISOString(),
      };
      headers['x-veno-client-id'] = 'test_client';
      headers['x-veno-signature'] = 't=0,v1=sandbox_dev_hmac';
    } else {
      return res.status(400).json({ error: `Gateway '${gateway}' não suportado em sandbox. Use 'venopag'.` });
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
// GGPIXAPI Webhook — verificação de IP allowlist + idempotência durável
// ============================================================================
// GGPIXAPI não usa HMAC nos webhooks; a segurança é feita por allowlist de IP
// (env GGPIX_WEBHOOK_ALLOWED_IPS). Todo evento é duravelmente aceito antes de
// aplicar efeitos colaterais, e entregas duplicadas são dedup por event_id.
router.post('/webhooks/ggpix', async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const payload = req.body as any;

    // 1. Verificação de IP allowlist (segurança do GGPIXAPI)
    const allowedIpsRaw = process.env.GGPIX_WEBHOOK_ALLOWED_IPS || '';
    const allowedIps = allowedIpsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const clientIp = req.ip || req.headers['x-forwarded-for'] as string || req.connection?.remoteAddress || '';
    const clientIpStr = Array.isArray(clientIp) ? clientIp[0] : String(clientIp);
    // Fail-closed: allowlist vazia rejeita todos os IPs. Sem allowlist
    // configurada explicitamente, nenhum webhook GGPIX e aceito — em qualquer
    // ambiente, e especialmente em producao.
    if (allowedIps.length === 0) {
      logger.warn('payments', 'ggpix', 'webhook', 'Allowlist GGPIX vazia — webhook rejeitado (fail-closed)', {
        clientIp: clientIpStr,
      });
      return res.status(401).json({ error: 'Allowlist GGPIX nao configurada', received: false });
    }

    const ipOk = allowedIps.includes(clientIpStr);

    if (!ipOk) {
      logger.warn('payments', 'ggpix', 'webhook', 'IP não permitido no allowlist GGPIXAPI', {
        clientIp: clientIpStr,
        allowedIps,
      });
      return res.status(401).json({ error: 'IP não autorizado', received: false });
    }

    // 2. Extrair dados do evento (sem efeitos colaterais)
    const gatewayEventId = payload?.gatewayEventId || payload?.event_id || `ggpix_${payload?.referenceId || 'evt'}_${payload?.status || 'status'}`;
    const referenceId = payload?.referenceId || null;
    const caseId = typeof referenceId === 'string' ? referenceId.replace('defesai_case_', '') : null;
    const status = payload?.status || 'PENDING';
    const isPaid = status === 'PAID';

    // 3. Idempotência durável: aceitar evento se novo
    const accepted = await webhookRepository.acceptEvent(gatewayEventId, 'ggpixapi', payload);
    if (!accepted.isNew) {
      logger.info('payments', 'ggpix', 'webhook', 'Webhook duplicado — aceitação durável ignorou', {
        gatewayEventId,
        caseId,
      });
    }

    // 4. Processar efeitos colaterais (apenas se PAID e caso não já quitado — idempotente)
    if (isPaid && caseId) {
      const row = databaseRows.get(caseId);
      if (row) {
        const domain = CanonicalMapper.rowToDomain(row);
        const alreadyPaid = domain.isPaid === true &&
          domain.payment?.transactionId === (payload?.gatewayTransactionId || undefined);

        if (!alreadyPaid) {
          const paymentAmount = Number((payload?.amountInCents || 0) / 100);

          domain.isPaid = true;
          domain.paidAt = payload?.paidAt || new Date().toISOString();
          domain.status = 'defesa_pronta';
          domain.currentStage = 3;
          domain.serviceType = domain.serviceType || 'recurso_jari';

          domain.payment = {
            status: 'approved',
            amount: paymentAmount > 0 ? paymentAmount : (domain.payment?.amount || 0),
            paidAt: payload?.paidAt || new Date().toISOString(),
            transactionId: payload?.gatewayTransactionId || `ord_${domain.id}`,
            paymentMethod: 'pix',
          };

          domain.timeline.push({
            id: `tl_webhook_${Date.now()}`,
            title: 'Pagamento Confirmado via Webhook GGPIXAPI',
            description: `Transação ${payload?.gatewayTransactionId} aprovada automaticamente pelo gateway GGPIXAPI.`,
            timestamp: new Date().toISOString(),
            type: 'payment',
          });

          const updatedRow = CanonicalMapper.domainToRow(domain);
          await caseRepository.set(caseId, updatedRow);

          // INSERT em payment_orders (fonte de verdade para KPIs e reconciliação)
          try {
            const gatewayTxnId = payload?.gatewayTransactionId || `ord_${domain.id}`;
            const caseIdUuid = domainIdToUuid(domain.id);
            const supabaseForOrder = getSupabaseServerClient();
            if (supabaseForOrder && caseIdUuid) {
              await (supabaseForOrder.from('payment_orders') as any).upsert({
                case_id: caseIdUuid,
                user_id: domain.userId && /^[0-9a-f-]{36}$/i.test(domain.userId) ? domain.userId : null,
                reference_id: payload?.referenceId || `defesai_case_${domain.id}`,
                pagbank_order_id: gatewayTxnId,
                gateway: 'ggpixapi',
                status: 'PAID',
                amount: paymentAmount > 0 ? paymentAmount : (domain.payment?.amount || 0),
                currency: 'BRL',
                payment_method: 'pix',
                paid_at: payload?.paidAt || new Date().toISOString(),
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

          commercialService.processPaymentConfirmationEvent({
            paymentId: payload?.gatewayTransactionId || `ord_${domain.id}`,
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
    }

    // 5. Marcar evento como processado (durável)
    try {
      await webhookRepository.completeEvent(gatewayEventId);
    } catch (completeErr: any) {
      logger.warn('payments', 'ggpix', 'webhook', 'Falha ao marcar evento como processado — será retryado pelo worker', {
        gatewayEventId,
        error: completeErr?.message,
      });
    }

    res.status(200).json({ received: true, duplicate: !accepted.isNew, gatewayEventId });
  } catch (error: any) {
    logger.error('payments', 'ggpix', 'webhook', 'GGPIXAPI webhook processing error', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// VenoPag Webhook — HMAC-SHA256 signature verification + durável idempotency
// Fluxo idêntico a PagBank/GGPIXAPI: verificar assinatura → aceitar evento (durável,
// dedup) → processar efeitos colaterais (idempotentes via alreadyPaid) → marcar como
// processado. Nunca reprocessa um evento já concluído, evitando dupla cobrança,
// geração duplicada de defesa e comissão duplicada.
router.post('/webhooks/venopag', async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const payload = req.body;
    const signature = req.headers['x-veno-signature'] as string ||
                     req.headers['x-hub-signature-256'] as string ||
                     req.headers['x-authenticity-token'] as string;

    // Verificação de assinatura (já validada pelo adapter em produção)
    const webhookResult = venopagAdapter.processWebhook(rawBody, req.headers as Record<string, string | undefined>, payload);

    // Já validamos a assinatura antes; se chegamos aqui, é válida
    const signatureValid = true;

    // Extrair dados do evento normalizado (VenoPag usa request_number como referenceId)
    const event = webhookResult as any; // type assertion para acessar campos VenoPag

    // Id do evento ESTÁVEL entre entregas duplicadas (request_number + status),
    // gerado pelo adapter sem Date.now() para permitir dedup durável.
    const webhookEventId = event.gatewayEventId || `venopag_${event.gatewayTransactionId || 'unknown'}_${event.status || 'unknown'}`;

    // Extrair caseId do referenceId (formato: "defesai_case_{caseId}")
    const rawReference = event.referenceId || event.gatewayTransactionId || null;
    const caseId = typeof rawReference === 'string' ? rawReference.replace('defesai_case_', '') : null;

    // 3. Idempotência durável: aceitar evento se novo (sobrevive a restarts).
    // acceptEvent retorna isNew=false quando o evento já foi aceito anteriormente
    // (entrega duplicada por timeout/rede). Não retornamos antecipadamente aqui:
    // se houver crash entre accept e complete, o evento fica 'received' e precisa
    // ser reaplicado — a guarda alreadyPaid abaixo evita efeitos colaterais duplicados.
    const accepted = await webhookRepository.acceptEvent(webhookEventId, 'venopag', payload);
    if (!accepted.isNew) {
      logger.info('payments', 'venopag', 'webhook', 'Webhook duplicado — aceitação durável ignorou', {
        webhookEventId,
        caseId,
      });
    }

    // 4. Processar efeitos colaterais (apenas se PAID e caso não já quitado — idempotente)
    // Idempotência de negócio: se o caso já está isPaid=true com a mesma transação,
    // pular (não gera nova defesa nem comissão).
    if (event.status === 'PAID' && caseId) {
      const row = databaseRows.get(caseId);
      if (row) {
        const domain = CanonicalMapper.rowToDomain(row);
        const alreadyPaid = domain.isPaid === true &&
          domain.payment?.transactionId === (event.gatewayTransactionId || undefined);

        if (!alreadyPaid) {
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
            transactionId: event.gatewayTransactionId || `ord_${domain.id}`,
            paymentMethod: 'pix',
          };
          if (event.commercialOfferId) {
            domain.commercialOfferId = event.commercialOfferId as string;
          }
          if (event.serviceType && !domain.serviceType) {
            domain.serviceType = event.serviceType as any;
          }

          // Geração AUTOMÁTICA da defesa após pagamento confirmado (PAID).
          try {
            const defense = generateDefenseDraftForDomain(domain);
            defense.generationCount = 1;
            (defense as any).integrityHash = computeDefenseIntegrityHash(
              defense as any,
              (domain as any).analysis as any
            );
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
            logger.error('payments', 'venopag', 'webhook', 'Falha ao gerar defesa automaticamente após pagamento (não-bloqueante)', {
              error: defenseError?.message,
              caseId: domain.id,
            });
          }

          domain.timeline.push({
            id: `tl_webhook_${Date.now()}`,
            title: 'Pagamento Confirmado via Webhook VenoPag',
            description: `Transação ${event.gatewayTransactionId} aprovada pela instituição financeira.`,
            timestamp: new Date().toISOString(),
            type: 'payment',
          });

          const updatedRow = CanonicalMapper.domainToRow(domain);
          await caseRepository.set(caseId, updatedRow);

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
            details: `Pagamento de R$ ${domain.payment.amount.toFixed(2).replace('.', ',')} via PIX VenoPag confirmado.`,
            gdprCompliant: true,
          });
        }
      }
    }

    // 5. Marcar evento como processado (durável)
    try {
      await webhookRepository.completeEvent(webhookEventId);
    } catch (completeErr: any) {
      logger.warn('payments', 'venopag', 'webhook', 'Falha ao marcar evento como processado — será retryado pelo worker', {
        webhookEventId,
        error: completeErr?.message,
      });
    }

    res.status(200).json({ received: true, duplicate: !accepted.isNew, eventId: webhookEventId, signatureValid });
  } catch (error: any) {
    logger.error('payments', 'venopag', 'webhook', 'Webhook processing error', { error: error.message });
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
// Apenas VenoPag é suportado agora.
router.post('/gateway/switch', requireAdmin, async (req, res) => {
  const { gatewayId } = req.body;
  if (!gatewayId) {
    return res.status(400).json({ error: 'gatewayId é obrigatório' });
  }

  if (gatewayId !== 'venopag') {
    return res.status(400).json({ error: `Gateway '${gatewayId}' não suportado. Apenas VenoPag está disponível.` });
  }

  const updatedBy = (req as any).user?.email || (req as any).user?.id || 'admin';
  const result = await gatewayManager.setActiveGateway(gatewayId, updatedBy);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ success: true, message: result.message, activeGateway: gatewayId });
});

export default router;
