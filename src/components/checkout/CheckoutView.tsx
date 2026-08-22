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
  HelpCircle,
  FileCheck2,
  Clock,
  CreditCard,
  RotateCcw,
  AlertCircle,
  Tag,
  Ticket,
  Percent,
} from 'lucide-react';
import { CaseDomain } from '../../types';
import { CreditCardForm } from './CreditCardForm';
import { PRICING } from '../../config/pricing';

interface CheckoutViewProps {
  currentCase: CaseDomain;
  onPaymentSuccess: (updatedCase: CaseDomain) => void;
  onBackToOnboarding: () => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  currentCase,
  onPaymentSuccess,
  onBackToOnboarding,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pixData, setPixData] = useState<{
    qrCodeDataUrl: string;
    pixCopyPasteString: string;
    txId: string;
    amount: number;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [creditCardResult, setCreditCardResult] = useState<{
    orderId: string;
    threeDsUrl?: string;
    threeDsChallengeRequired?: boolean;
  } | null>(null);
  const [creditCardError, setCreditCardError] = useState<string | null>(null);

  // Dynamic Commercial State
  const [standardPrice, setStandardPrice] = useState<number>(119.90);
  const [basePrice, setBasePrice] = useState<number>(PRICING.DEFAULT_PRICE);
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    discountType: string;
    discountValue: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState<boolean>(false);

  const finalAmount = Math.max(0, Number((basePrice - (appliedCoupon?.discountAmount || 0)).toFixed(2)));

  // Check URL params for coupon or referral
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    const promoCode = urlParams.get('cupom') || urlParams.get('coupon');

    if (refCode) {
      sessionStorage.setItem('defesai_ref', refCode);
      // Register referral relation in background
      fetch('/api/commercial/referral/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newUserId: currentCase.clientEmail || `usr_${currentCase.id.substring(0, 8)}`,
          referrerCodeOrId: refCode,
        }),
      }).catch(console.error);
    }

    if (promoCode) {
      setCouponCode(promoCode);
      validateCouponCode(promoCode);
    }
  }, [currentCase.id, currentCase.clientEmail]);

  // Load Pricing from Commercial Service
  useEffect(() => {
    async function loadPricing() {
      try {
        const res = await fetch('/api/admin/commercial/prices');
        if (res.ok) {
          const prices = await res.json();
          const target = prices.find((p: any) => p.serviceType === 'recurso_multa') || prices[0];
          if (target) {
            setStandardPrice(target.standardPrice || 119.90);
            setBasePrice(target.promotionalPrice || target.standardPrice || PRICING.DEFAULT_PRICE);
          }
        }
      } catch (err) {
        console.error('Error loading dynamic price:', err);
      }
    }
    loadPricing();
  }, []);

  const validateCouponCode = async (codeToTest: string) => {
    const code = codeToTest.trim().toUpperCase();
    if (!code) return;

    setCouponLoading(true);
    setCouponError(null);
    setCouponSuccess(null);

    try {
      const res = await fetch('/api/commercial/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          orderAmount: basePrice,
          serviceType: 'recurso_multa',
          userId: currentCase.clientEmail || 'guest',
        }),
      });

      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({
          code: data.coupon.code,
          discountAmount: data.discountAmount,
          discountType: data.coupon.discountType,
          discountValue: data.coupon.discountValue,
        });
        setCouponSuccess(data.message || 'Cupom aplicado com sucesso!');
      } else {
        setAppliedCoupon(null);
        setCouponError(data.message || 'Cupom inválido ou expirado.');
      }
    } catch (err: any) {
      setCouponError(err.message || 'Erro ao validar cupom.');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    validateCouponCode(couponCode);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponSuccess(null);
    setCouponError(null);
  };

  // Load PIX when payment method is PIX or amount changes
  useEffect(() => {
    if (paymentMethod !== 'pix') return;

    async function loadPix() {
      try {
        const res = await fetch('/api/payments/pix/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: currentCase.id,
            amount: finalAmount,
            customerCpf: currentCase.clientCpf,
            customerName: currentCase.clientName,
            customerEmail: currentCase.clientEmail,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setPixData(data);
        }
      } catch (err) {
        console.error('Error fetching PIX:', err);
      }
    }
    loadPix();
  }, [currentCase.id, currentCase.clientCpf, currentCase.clientName, currentCase.clientEmail, paymentMethod, finalAmount]);

  const handleCopyPix = () => {
    if (pixData?.pixCopyPasteString) {
      navigator.clipboard.writeText(pixData.pixCopyPasteString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/payments/pix/simulate-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: currentCase.id }),
      });
      const data = await res.json();
      if (data.success) {
        onPaymentSuccess(data.case);
      }
    } catch (err) {
      console.error('Error confirming simulated payment:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreditCardSuccess = (result: { orderId: string; status: string; threeDsUrl?: string; threeDsChallengeRequired?: boolean }) => {
    setCreditCardResult(result);
    setCreditCardError(null);

    if (result.threeDsChallengeRequired && result.threeDsUrl) {
      window.location.href = result.threeDsUrl;
    } else if (result.status === 'AUTHORIZED' || result.status === 'PAID') {
      setIsProcessing(true);
      fetch('/api/payments/pix/simulate-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: currentCase.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            onPaymentSuccess(data.case);
          }
        })
        .finally(() => setIsProcessing(false));
    }
  };

  const handleCreditCardError = (error: string) => {
    setCreditCardError(error);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      <button
        onClick={onBackToOnboarding}
        className="text-sm font-semibold text-slate-500 hover:text-orange-600 flex items-center gap-1.5 cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar à Análise do Caso
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Order Summary & Guarantee */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded text-sm font-bold bg-orange-50 text-orange-700 border border-orange-200 uppercase font-mono">
                Resumo da Defesa
              </span>
              <span className="text-sm font-mono text-slate-500">Auto nº {currentCase.infraction.aitNumber}</span>
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Liberação da Petição & Checklist de Protocolo
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Gere sua minuta jurídica formal com 52 blocos do CTB/CONTRAN, pronta para impressão e envio aos órgãos autuadores.
            </p>

            <div className="mt-4 border-t border-slate-200 pt-3 space-y-2 text-sm">
              <div className="flex justify-between py-1 text-slate-700">
                <span>Petição Técnica Completa (52 Blocos do CTB)</span>
                <span className="font-semibold text-emerald-700 font-mono">Incluso</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>Teses de Anulação Metrológica & Decadência</span>
                <span className="font-semibold text-emerald-700 font-mono">Incluso</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>Guia Passo a Passo de Protocolo no Órgão</span>
                <span className="font-semibold text-emerald-700 font-mono">Incluso</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>Alertas de Prazo e Linha do Tempo via WhatsApp</span>
                <span className="font-semibold text-emerald-700 font-mono">Incluso</span>
              </div>

              {/* Coupon Field Inside Summary */}
              <div className="pt-3 border-t border-slate-100">
                <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    Possui Cupom de Desconto?
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Ex: DEFESAI10 ou BLACK30"
                      className="w-full text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 uppercase outline-none focus:border-amber-500"
                    />
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-bold hover:bg-rose-100 transition-colors shrink-0 cursor-pointer"
                      >
                        Remover
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={couponLoading || !couponCode.trim()}
                        className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shrink-0 disabled:bg-slate-300 cursor-pointer"
                      >
                        {couponLoading ? '...' : 'Aplicar'}
                      </button>
                    )}
                  </div>
                  {couponSuccess && (
                    <p className="text-sm text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> {couponSuccess}
                    </p>
                  )}
                  {couponError && (
                    <p className="text-sm text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {couponError}
                    </p>
                  )}
                </form>
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-slate-200 pt-3 space-y-1">
                <div className="flex justify-between text-slate-500 text-sm font-mono">
                  <span>Preço Padrão:</span>
                  <span className="line-through">R$ {standardPrice.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 text-sm font-mono font-bold">
                    <span>Cupom ({appliedCoupon.code}):</span>
                    <span>- R$ {appliedCoupon.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-bold text-slate-900 uppercase font-mono">Investimento Único</span>
                    <p className="text-sm text-slate-500 font-mono">Sem mensalidades adicionais</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-slate-900 font-mono">
                      R$ {finalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 7 Days Guarantee */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 text-sm shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-slate-600 text-sm leading-tight">
                <span className="font-bold text-slate-900">Garantia Incondicional de 7 Dias:</span> Se você não ficar satisfeito com a fundamentação técnica, devolvemos seu dinheiro integralmente.
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
                onClick={() => {
                  setPaymentMethod('pix');
                  setCreditCardResult(null);
                  setCreditCardError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  paymentMethod === 'pix'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <span>PIX Instantâneo</span>
              </button>
              <button
                role="tab"
                aria-selected={paymentMethod === 'credit_card'}
                onClick={() => {
                  setPaymentMethod('credit_card');
                  setCreditCardResult(null);
                  setCreditCardError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
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
            <p className="text-sm text-slate-500 text-center mt-2 font-mono">
              {paymentMethod === 'pix'
                ? 'Pagamento instantâneo via Banco Central / PagBank'
                : 'Parcelamento em até 12x — Tokenização segura PagBank'}
            </p>
          </div>

          {/* PIX Payment Component */}
          {paymentMethod === 'pix' && (
            <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm sticky top-20 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-sm font-mono">
                    PIX
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Pagamento Instantâneo</h2>
                    <p className="text-sm text-slate-500 font-mono">Via PagBank / Banco Central</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-slate-400 uppercase font-mono">Total</span>
                  <p className="font-extrabold text-sm text-slate-900 font-mono">
                    R$ {finalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="my-4 text-center">
                {pixData?.qrCodeDataUrl ? (
                  <div className="inline-block p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                    <img
                      src={pixData.qrCodeDataUrl}
                      alt="QR Code PIX PagBank"
                      className="w-40 h-40 mx-auto object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-40 h-40 mx-auto bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                    <Clock className="w-5 h-5 animate-spin" />
                  </div>
                )}
                <p className="text-sm text-slate-500 mt-1.5 font-mono">
                  Abra o app do seu banco e aponte a câmera para o QR Code
                </p>
              </div>

              {/* Copy and Paste PIX */}
              <div className="space-y-1.5 mb-4">
                <label className="text-sm font-bold text-slate-700 uppercase block font-mono">
                  Ou Copie o Código PIX Copia e Cola:
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={pixData?.pixCopyPasteString || 'Carregando código PIX...'}
                    className="w-full text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 truncate outline-none"
                  />
                  <button
                    type="button"
                    id="copy-pix-button"
                    onClick={handleCopyPix}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'OK' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons: Live Simulator */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  id="simulate-pix-success-button"
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-lg transition-all shadow-xs shadow-orange-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 uppercase tracking-tight"
                >
                  {isProcessing ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Confirmando PagBank...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Simular Pagamento PIX Aprovado</span>
                    </>
                  )}
                </button>
                <p className="text-sm text-center text-slate-400 font-mono">
                  Liberação instantânea com idempotência e comissões automáticas.
                </p>
              </div>
            </div>
          )}

          {/* Credit Card Payment Component */}
          {paymentMethod === 'credit_card' && (
            <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm sticky top-20 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-sm font-mono">
                    CC
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Cartão de Crédito</h2>
                    <p className="text-sm text-slate-500 font-mono">Parcelado em até 12x — Tokenização PagBank</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-slate-400 uppercase font-mono">Total</span>
                  <p className="font-extrabold text-sm text-slate-900 font-mono">
                    R$ {finalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              <CreditCardForm
                caseId={currentCase.id}
                customerName={currentCase.clientName}
                customerEmail={currentCase.clientEmail}
                customerCpf={currentCase.clientCpf}
                amount={finalAmount}
                onSuccess={handleCreditCardSuccess}
                onError={handleCreditCardError}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default CheckoutView;
