import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  Zap,
  Lock,
  ArrowLeft,
  Sparkles,
  Clock,
  FileCheck2,
  Download,
  CreditCard,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { CaseDomain, CaseDocumentData, InfractionData, VehicleData, CaseAnalysis, ProcedureType } from '../../../types';
import { CreditCardForm } from '../../checkout/CreditCardForm';
import { useAuthFetch } from '../../../hooks/useAuthFetch';

interface DocumentCheckoutStepProps {
  currentCaseId?: string;
  documentData: CaseDocumentData;
  infractionData: InfractionData;
  vehicleData: VehicleData;
  analysis: CaseAnalysis;
  serviceType: ProcedureType;
  isAdmin?: boolean;
  /** Id do usuário autenticado (Supabase auth.uid) — vincula cases.user_id */
  userId?: string;
  onPaymentSuccess: (finalCase: CaseDomain) => void;
  onBack: () => void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const DocumentCheckoutStep: React.FC<DocumentCheckoutStepProps> = ({
  currentCaseId,
  documentData,
  infractionData,
  vehicleData,
  analysis,
  serviceType,
  isAdmin = false,
  userId = '',
  onPaymentSuccess,
  onBack,
}) => {
  const authFetch = useAuthFetch();
  const [copied, setCopied] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pixData, setPixData] = useState<{
    qrCodeDataUrl: string;
    pixCopyPasteString: string;
    txId: string;
    amount: number;
    gateway?: string;
  } | null>(null);
  const [pixError, setPixError] = useState<string | null>(null);
  const [pixReloadKey, setPixReloadKey] = useState<number>(0);
  const [payError, setPayError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [creditCardResult, setCreditCardResult] = useState<{
    orderId: string;
    threeDsUrl?: string;
    threeDsChallengeRequired?: boolean;
  } | null>(null);
  const [creditCardError, setCreditCardError] = useState<string | null>(null);
  // Preço efetivo resolvido pelo catálogo comercial (backend decide).
  const [resolvedPrice, setResolvedPrice] = useState<number | null>(null);
  // Breakdown completo retornado por /api/payments/resolve-price
  const [resolvedBreakdown, setResolvedBreakdown] = useState<{
    baseAmount: number;
    promotionDiscount: number;
    firstDocumentsDiscount: number;
    finalAmount: number;
    documentNumber: number;
    couponDiscount?: number;
  } | null>(null);
  // Código do cupom aplicado (enviado ao backend no create)
  const [couponCode, setCouponCode] = useState<string>('');
  // Modo de teste anunciado pelo servidor (/gateway/status → testMode).
  // Não dependemos de import.meta.env.DEV: funciona também rodando o build
  // localmente enquanto o backend estiver fora de produção.
  const [testMode, setTestMode] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    fetch('/api/payments/gateway/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data && typeof data.testMode === 'boolean') setTestMode(data.testMode);
      })
      .catch(() => {/* status é best-effort */});
    return () => { active = false; };
  }, []);

  // Resolve preço do catálogo comercial (funciona para qualquer método de pagamento)
  useEffect(() => {
    let active = true;
    fetch(`/api/payments/resolve-price?serviceType=${encodeURIComponent(serviceType)}${couponCode ? `&couponCode=${encodeURIComponent(couponCode)}` : ''}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data) {
          if (typeof data.finalAmount === 'number') {
            setResolvedPrice(data.finalAmount);
          }
          if (typeof data.baseAmount === 'number' && typeof data.finalAmount === 'number') {
            setResolvedBreakdown({
              baseAmount: data.baseAmount,
              promotionDiscount: data.promotionDiscount || 0,
              firstDocumentsDiscount: data.firstDocumentsDiscount || 0,
              finalAmount: data.finalAmount,
              documentNumber: data.documentNumber ?? 0,
              couponDiscount: data.couponDiscount,
            });
          }
        }
      })
      .catch(() => {/* fallback para pixData.amount */});
    return () => { active = false; };
  }, [serviceType, couponCode]);

  // Simulação só aparece para admin E quando o servidor confirma modo de teste
  const canSimulate = isAdmin && testMode;

  // Preço efetivo: breakdown (finalAmount) > catálogo > PIX response > documentData > fallback 89.90
  const effectivePrice: number =
    resolvedBreakdown?.finalAmount
    ?? resolvedPrice
    ?? pixData?.amount
    ?? (typeof documentData.price === 'number' ? documentData.price : 89.90);

  // Load PIX when payment method is PIX
  useEffect(() => {
    if (paymentMethod !== 'pix') return;

    async function loadPix() {
      setPixError(null);
      try {
        const res = await fetch('/api/payments/pix/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: currentCaseId || `case_${Date.now()}`,
            serviceType,
            customerName: documentData.applicantName,
            customerEmail: documentData.applicantEmail,
            customerCpf: documentData.applicantCpf,
            userId: userId || null,
            couponCode: couponCode || null,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(
            data.error || data.hint || 'Não foi possível gerar o PIX. Verifique o catálogo comercial.'
          );
        }
        setPixData(data);
      } catch (err: any) {
        const msg = err?.message || 'Falha ao gerar PIX. Tente novamente.';
        setPixError(msg);
        console.error('Error fetching PIX:', msg);
      }
    }
    loadPix();
  }, [currentCaseId, serviceType, documentData.applicantCpf, documentData.applicantName, documentData.applicantEmail, paymentMethod, pixReloadKey]);

  const gatewayLabel = pixData?.gateway === 'ggpixapi' ? 'GGPIXAPI' : 'PagBank';

  const handleCopyPix = () => {
    if (pixData?.pixCopyPasteString) {
      navigator.clipboard.writeText(pixData.pixCopyPasteString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreditCardSuccess = (result: { orderId: string; status: string; threeDsUrl?: string; threeDsChallengeRequired?: boolean }) => {
    setCreditCardResult(result);
    setCreditCardError(null);

    if (result.threeDsChallengeRequired && result.threeDsUrl) {
      window.location.href = result.threeDsUrl;
    } else if (result.status === 'AUTHORIZED' || result.status === 'PAID') {
      finalizeAfterPayment();
    }
  };

  const handleCreditCardError = (error: string) => {
    setCreditCardError(error);
  };

  const buildCasePayload = (): CaseDomain => {
    return {
      id: currentCaseId || `case_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `Recurso Auto ${infractionData.aitNumber || 'N/A'} — ${infractionData.ctbArticle || 'Art. 218 CTB'}`,
      clientName: documentData.applicantName,
      clientEmail: documentData.applicantEmail,
      clientPhone: documentData.applicantPhone,
      clientCpf: documentData.applicantCpf,
      // Identidade do usuário autenticado — mapeada pelo backend para cases.user_id
      userId: userId || undefined,
      status: 'defesa_pronta',
      currentStage: 3,
      serviceType,
      vehicle: vehicleData,
      infraction: infractionData,
      analysis,
      isAnonymous: false,
      isPaid: true,
      paidAt: new Date().toISOString(),
      payment: {
        status: 'approved',
        amount: effectivePrice,
        paidAt: new Date().toISOString(),
        paymentMethod: paymentMethod === 'credit_card' ? 'credit_card' : 'pix',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [
        {
          id: `tl_${Date.now()}_1`,
          title: 'Diagnóstico Gratuito Realizado',
          description: `Análise técnica com ${analysis?.overallSuccessRate != null ? analysis.overallSuccessRate : 0}% de probabilidade de êxito.`,
          timestamp: new Date(Date.now() - 300000).toISOString(),
          type: 'analysis',
        },
        {
          id: `tl_${Date.now()}_2`,
          title: `Pagamento ${paymentMethod === 'credit_card' ? 'Cartão' : 'PIX'} Confirmado`,
          description: `Valor de R$ ${effectivePrice.toFixed(2)} recebido com sucesso.`,
          timestamp: new Date().toISOString(),
          type: 'payment',
        },
        {
          id: `tl_${Date.now()}_3`,
          title: 'Petição Formal Gerada',
          description: 'Minuta jurídica diagramada pronta para protocolo no órgão autuador.',
          timestamp: new Date().toISOString(),
          type: 'defense',
        },
      ],
    };
  };

  const persistCase = async (): Promise<CaseDomain> => {
    // 1. Create / Persist Case if not existing
    const casePayload = buildCasePayload();

    const saveRes = await authFetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(casePayload),
    });
    const savedCase = await saveRes.json();
    return savedCase.id ? savedCase : casePayload;
  };

  const finalizeAfterPayment = async () => {
    setIsProcessing(true);
    try {
      const finalCase = await persistCase();
      onPaymentSuccess(finalCase);
    } catch (err) {
      console.error('Error generating document:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!pixData) return;
    setIsProcessing(true);
    setPayError(null);
    try {
      const deadline = Date.now() + 90_000;
      let paid = false;
      while (Date.now() < deadline) {
        await sleep(3000);
        try {
          const res = await fetch(`/api/payments/pix/status/${encodeURIComponent(pixData.txId)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.status === 'PAID') {
              paid = true;
              break;
            }
            if (data.success && (data.status === 'CANCELED' || data.status === 'DECLINED')) {
              break;
            }
          }
        } catch {
          // Erro transitório — continua tentando até o deadline
        }
      }

      if (!paid) {
        setPayError('Não conseguimos confirmar o pagamento ainda. Aguarde alguns instantes e tente verificar novamente — a confirmação bancária pode levar até 1 minuto.');
        return;
      }
      await finalizeAfterPayment();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setPayError(null);
    try {
      // Envia o payload canônico completo: o simulate-confirm faz upsert
      // server-side caso /api/cases não tenha conseguido persistir (auth em dev).
      const casePayload = buildCasePayload();
      try { await persistCase(); } catch { /* upsert cobre no servidor */ }

      const res = await fetch('/api/payments/pix/simulate-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: casePayload.id, case: casePayload }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Falha ao simular pagamento (HTTP ${res.status})`);
      }
      onPaymentSuccess(casePayload);
    } catch (err: any) {
      console.error('Error simulating payment:', err);
      setPayError(err?.message || 'Não foi possível simular o pagamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={onBack}
        className="text-xs font-semibold text-slate-500 hover:text-orange-600 flex items-center gap-1.5 cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar à Revisão dos Dados
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Order Summary & Guarantee */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 uppercase font-mono">
                Fase 2 • Emissão da Peça
              </span>
              <span className="text-[11px] font-mono text-slate-500">Auto nº {infractionData.aitNumber || 'N/A'}</span>
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Liberação da Petição & Checklist de Protocolo
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Gere sua minuta jurídica formal com 52 blocos do CTB/CONTRAN, pronta para impressão e protocolo perante {infractionData.autuadorBody || 'o órgão autuador'}.
            </p>

            <div className="mt-4 border-t border-slate-200 pt-3 space-y-2 text-xs">
              <div className="flex justify-between py-1 text-slate-700">
                <span>Petição Técnica Completa (52 Blocos do CTB)</span>
                <span className="font-semibold text-emerald-700 font-mono">Incluso</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>Teses de Nulidade & Decadência (Art. 281 CTB)</span>
                <span className="font-semibold text-emerald-700 font-mono">Incluso</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>Guia Passo a Passo de Protocolo no Órgão</span>
                <span className="font-semibold text-emerald-700 font-mono">Incluso</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>Alertas de Prazo via WhatsApp</span>
                <span className="font-semibold text-emerald-700 font-mono">Incluso</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>Exportação Ilimitada em PDF Diagramado A4</span>
                <span className="font-semibold text-emerald-700 font-mono">Incluso</span>
              </div>

              {(() => {
                const displayBaseAmount = resolvedBreakdown?.baseAmount ?? 197;
                const displayPromotionDiscount = resolvedBreakdown?.promotionDiscount ?? 0;
                const displayFirstDocumentsDiscount = resolvedBreakdown?.firstDocumentsDiscount ?? 0;
                const isFirstThreeDocuments = (resolvedBreakdown?.documentNumber ?? 0) <= 3;
                return (
                  <div className="border-t border-slate-200 pt-3 space-y-1">
                    <div className="flex justify-between text-slate-500 text-xs font-mono">
                      <span>Preço padrão:</span>
                      <span className="line-through">R$ {displayBaseAmount.toFixed(2).replace('.', ',')}</span>
                    </div>
                    {displayPromotionDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600 text-xs font-mono font-bold">
                        <span>Desconto da promoção:</span>
                        <span>- R$ {displayPromotionDiscount.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                    {displayFirstDocumentsDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600 text-xs font-mono font-bold">
                        <span>Desconto Primeiros Documentos:</span>
                        <span>- R$ {displayFirstDocumentsDiscount.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                    {isFirstThreeDocuments && displayFirstDocumentsDiscount > 0 && (
                      <div className="flex items-center justify-center gap-1.5 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700">
                          Benefício dos 3 primeiros documentos: 50% OFF aplicado!
                        </span>
                      </div>
                    )}
                    <div className="pt-2 flex justify-between items-baseline">
                      <div>
                        <span className="text-xs font-bold text-slate-900 uppercase font-mono">Investimento Único</span>
                        <p className="text-[10px] text-slate-500 font-mono">Sem mensalidade ou cobranças adicionais</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-slate-900 font-mono">
                          R$ {effectivePrice.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Guarantee Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-xs shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-slate-600 text-[11px] leading-tight">
                <span className="font-bold text-slate-900 block text-xs mb-0.5">Garantia Incondicional de 7 Dias</span>
                Se você não ficar satisfeito com a fundamentação técnica da peça, devolvemos seu dinheiro integralmente via PIX.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Method Selector + Payment Component */}
        <div className="lg:col-span-5">
          {/* Payment Method Tabs */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-2xs">
            <div className="flex gap-2" role="tablist" aria-label="Método de pagamento">
              <button
                role="tab"
                aria-selected={paymentMethod === 'pix'}
                onClick={() => { setPaymentMethod('pix'); setCreditCardResult(null); setCreditCardError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  paymentMethod === 'pix'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <span>PIX</span>
              </button>
              <button
                role="tab"
                aria-selected={paymentMethod === 'credit_card'}
                onClick={() => { setPaymentMethod('credit_card'); setCreditCardResult(null); setCreditCardError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  paymentMethod === 'credit_card'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <span>Cartão</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-2 font-mono">
              {paymentMethod === 'pix'
                ? `Pagamento instantâneo via PIX — ${pixData?.gateway ? gatewayLabel : 'processadora segura'}`
                : 'Parcelamento em até 12x — Tokenização segura PagBank'}
            </p>
          </div>

          {/* PIX Payment Component */}
          {paymentMethod === 'pix' && (
            <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-sm sticky top-20 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs font-mono">
                    PIX
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-900">Pagamento Instantâneo</h2>
                    <p className="text-[10px] text-slate-500 font-mono">Via Banco Central / Chave Segura</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Total</span>
                  <p className="font-extrabold text-sm text-slate-900 font-mono">R$ {effectivePrice.toFixed(2).replace('.', ',')}</p>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="my-4 text-center">
                {pixError ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                    <div className="flex items-start gap-2 text-rose-700 text-xs text-left">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{pixError}</span>
                    </div>
                    <button
                      type="button"
                      id="btn-retry-pix"
                      onClick={() => setPixReloadKey((k) => k + 1)}
                      disabled={isProcessing}
                      className="mt-2 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : pixData?.qrCodeDataUrl ? (
                  <div className="inline-block p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                    <img
                      src={pixData.qrCodeDataUrl}
                      alt={`QR Code PIX ${gatewayLabel}`}
                      className="w-40 h-40 mx-auto object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-40 h-40 mx-auto bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                    <Clock className="w-5 h-5 animate-spin" />
                  </div>
                )}
                {!pixError && (
                  <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
                    Abra o app do seu banco e aponte a câmera para o QR Code
                  </p>
                )}
              </div>

              {/* Copy and Paste PIX */}
              {!pixError && (
                <div className="space-y-1.5 mb-4">
                  <label className="text-[10px] font-bold text-slate-700 uppercase block font-mono">
                    Ou Copie o Código PIX Copia e Cola:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={pixData?.pixCopyPasteString || 'Carregando código PIX...'}
                      className="w-full text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 truncate outline-none"
                    />
                    <button
                      type="button"
                      id="copy-pix-button"
                      onClick={handleCopyPix}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'OK' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons: Confirm / Simulate */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                {payError && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2 text-amber-700 text-[11px] text-left">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{payError}</span>
                    </div>
                  </div>
                )}
                {canSimulate ? (
                  /* MODO DE TESTE: ação única — simula o pagamento e libera a defesa */
                  <button
                    type="button"
                    id="btn-simulate-payment"
                    onClick={handleSimulatePayment}
                    disabled={isProcessing}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Aprovando pagamento (simulado)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Simular Pagamento &amp; Emitir Defesa</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    id="btn-confirm-payment-pix"
                    onClick={handleVerifyPayment}
                    disabled={!pixData || isProcessing}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Verificando pagamento no banco...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Já paguei — Verificar e Emitir Defesa</span>
                      </>
                    )}
                  </button>
                )}

                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-mono">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>Ambiente Seguro Criptografado TLS 256-bit</span>
                </div>
              </div>
            </div>
          )}

          {/* Credit Card Payment Component */}
          {paymentMethod === 'credit_card' && (
            <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-sm sticky top-20 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs font-mono">
                    CC
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-900">Cartão de Crédito</h2>
                    <p className="text-[10px] text-slate-500 font-mono">Parcelado em até 12x — Tokenização PagBank</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Total</span>
                  <p className="font-extrabold text-sm text-slate-900 font-mono">R$ {effectivePrice.toFixed(2).replace('.', ',')}</p>
                </div>
              </div>

              <CreditCardForm
                caseId={currentCaseId || `case_${Date.now()}`}
                customerName={documentData.applicantName}
                customerEmail={documentData.applicantEmail}
                customerCpf={documentData.applicantCpf}
                amount={effectivePrice}
                onSuccess={handleCreditCardSuccess}
                onError={handleCreditCardError}
              />

              {creditCardError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <div className="flex items-center gap-2 text-rose-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{creditCardError}</span>
                  </div>
                </div>
              )}

              {creditCardResult && creditCardResult.threeDsChallengeRequired && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700 text-xs">
                    <RotateCcw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Redirecionando para autenticação 3D Secure...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
