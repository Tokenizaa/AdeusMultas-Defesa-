import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { TestFillButton } from '../ui/TestFillButton';
import { generateRandomCardData } from '../../utils/test-data-generator';

interface CreditCardFormProps {
  caseId: string;
  customerName: string;
  customerEmail: string;
  customerCpf: string;
  amount: number;
  onSuccess: (result: {
    orderId: string;
    status: string;
    threeDsUrl?: string;
    threeDsChallengeRequired?: boolean;
  }) => void;
  onError: (error: string) => void;
}

declare global {
  interface Window {
    PagSeguroDirectPayment: any;
  }
}

export const CreditCardForm: React.FC<CreditCardFormProps> = ({
  caseId,
  customerName,
  customerEmail,
  customerCpf,
  amount,
  onSuccess,
  onError,
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState(customerName);
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardCpf, setCardCpf] = useState(customerCpf);
  const [installments, setInstallments] = useState(1);
  const [installmentOptions, setInstallmentOptions] = useState<Array<{ installments: number; value: number; total: number; hasInterest: boolean }>>([]);
  const [showCvv, setShowCvv] = useState(false);
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardToken, setCardToken] = useState<string | null>(null);
  const [cardBrand, setCardBrand] = useState<string | null>(null);
  
  const cardNumberRef = useRef<HTMLInputElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);

  // Initialize PagBank SDK
  useEffect(() => {
    const publicKey = (import.meta as any).env?.VITE_PAGBANK_PUBLIC_KEY;
    if (publicKey && window.PagSeguroDirectPayment) {
      window.PagSeguroDirectPayment.setSessionId(publicKey);
    }
  }, []);

  // Detect card brand and fetch installments
  useEffect(() => {
    const cleanNumber = cardNumber.replace(/\D/g, '');
    if (cleanNumber.length >= 6 && window.PagSeguroDirectPayment) {
      window.PagSeguroDirectPayment.getBrand({
        cardBin: cleanNumber.substring(0, 6),
        success: (response: any) => {
          const brand = response.brand?.name || 'visa';
          setCardBrand(brand);
          
          // Fetch installment options
          window.PagSeguroDirectPayment.getInstallments({
            amount: amount.toFixed(2),
            brand,
            maxInstallmentNoInterest: 12,
            success: (res: any) => {
              const options = res.installments?.[brand] || [];
              setInstallmentOptions(options.map((opt: any) => ({
                installments: opt.quantity,
                value: opt.installmentAmount,
                total: opt.totalAmount,
                hasInterest: opt.interestFree === false,
              })));
              if (options.length > 0 && installments === 1) {
                setInstallments(options[0].quantity);
              }
            },
            error: () => setInstallmentOptions([]),
            complete: () => {},
          });
        },
        error: () => setCardBrand(null),
        complete: () => {},
      });
    } else if (cleanNumber.length < 6) {
      setCardBrand(null);
      setInstallmentOptions([]);
    }
  }, [cardNumber, amount]);

  // Format card number input
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 16);
    const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  // Format expiry input
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (value.length >= 2) {
      setCardExpiry(`${value.substring(0, 2)}/${value.substring(2)}`);
    } else {
      setCardExpiry(value);
    }
  };

  // Format CPF input
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 11);
    setCardCpf(value);
  };

  // Tokenize card
  const handleTokenize = async () => {
    if (!window.PagSeguroDirectPayment) {
      setError('SDK do PagBank não carregado. Recarregue a página.');
      return;
    }

    const cleanNumber = cardNumber.replace(/\s/g, '');
    const cleanExpiry = cardExpiry.replace('/', '');
    const month = cleanExpiry.substring(0, 2);
    const year = `20${cleanExpiry.substring(2, 4)}`;

    if (!cleanNumber || cleanNumber.length < 13) {
      setError('Número do cartão inválido');
      return;
    }
    if (!month || !year || month > '12' || month < '01') {
      setError('Validade inválida (MM/AA)');
      return;
    }
    if (!cardCvv || cardCvv.length < 3) {
      setError('CVV inválido');
      return;
    }
    if (!cardHolderName.trim()) {
      setError('Nome no cartão é obrigatório');
      return;
    }
    if (!cardCpf || cardCpf.length !== 11) {
      setError('CPF do titular inválido');
      return;
    }

    setIsTokenizing(true);
    setError(null);

    window.PagSeguroDirectPayment.createCardToken({
      cardNumber: cleanNumber,
      brand: cardBrand || 'visa',
      cvv: cardCvv,
      expirationMonth: month,
      expirationYear: year,
      success: (response: any) => {
        if (response.card?.token) {
          setCardToken(response.card.token);
          setError(null);
        } else {
          setError('Falha ao tokenizar cartão');
        }
      },
      error: (response: any) => {
        const msg = response.errors?.map((e: any) => e.message).join(', ') || 'Erro ao tokenizar cartão';
        setError(msg);
      },
      complete: () => setIsTokenizing(false),
    });
  };

  // Submit payment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardToken) {
      setError('Tokenize o cartão primeiro');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/credit-card/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          customerName: cardHolderName,
          customerEmail,
          customerCpf: cardCpf,
          amount,
          installments,
          cardToken,
          authenticationMethod: 'CHALLENGE',
          softDescriptor: 'DEFAI*RECURSO',
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        onSuccess({
          orderId: data.order?.orderId || data.txId,
          status: data.status,
          threeDsUrl: data.threeDsUrl,
          threeDsChallengeRequired: data.threeDsChallengeRequired,
        });
      } else {
        setError(data.error || 'Erro ao processar pagamento');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBrandIcon = (brand: string | null) => {
    const brands: Record<string, string> = {
      visa: 'https://stc.pagseguro.uol.com.br/public/img/payment-methods-flat/visa.svg',
      mastercard: 'https://stc.pagseguro.uol.com.br/public/img/payment-methods-flat/mastercard.svg',
      amex: 'https://stc.pagseguro.uol.com.br/public/img/payment-methods-flat/amex.svg',
      elo: 'https://stc.pagseguro.uol.com.br/public/img/payment-methods-flat/elo.svg',
      hipercard: 'https://stc.pagseguro.uol.com.br/public/img/payment-methods-flat/hipercard.svg',
    };
    return brand && brands[brand.toLowerCase()] ? brands[brand.toLowerCase()] : null;
  };

  return (
    <>
      <div className="flex justify-center mb-3">
        <TestFillButton
          onClick={() => {
            const data = generateRandomCardData();
            setCardNumber(data.cardNumber);
            setCardHolderName(data.cardHolderName);
            setCardExpiry(data.cardExpiry);
            setCardCvv(data.cardCvv);
            setCardCpf(data.cardCpf);
          }}
        />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Card Brand Detection */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="font-mono uppercase">Bandeira:</span>
        {cardBrand ? (
          <img src={getBrandIcon(cardBrand)} alt={cardBrand} className="h-5 w-auto" />
        ) : (
          <span className="text-slate-400">Insira o número do cartão</span>
        )}
        {cardToken && (
          <span className="ml-auto flex items-center gap-1 text-emerald-600">
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="font-mono">Tokenizado</span>
          </span>
        )}
      </div>

      {/* Card Number */}
      <div>
        <label htmlFor="card-number" className="block text-sm font-bold text-slate-700 uppercase font-mono mb-1">
          Número do Cartão
        </label>
        <div className="relative">
          <input
            ref={cardNumberRef}
            id="card-number"
            type="text"
            value={cardNumber}
            onChange={handleCardNumberChange}
            placeholder="0000 0000 0000 0000"
            className="w-full text-base font-mono bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            maxLength={19}
            autoComplete="cc-number"
            required
          />
          {cardBrand && (
            <img 
              src={getBrandIcon(cardBrand)} 
              alt={cardBrand} 
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-auto opacity-70 pointer-events-none"
            />
          )}
        </div>
      </div>

      {/* Card Holder Name */}
      <div>
        <label htmlFor="card-holder" className="block text-sm font-bold text-slate-700 uppercase font-mono mb-1">
          Nome no Cartão (como impresso)
        </label>
        <input
          id="card-holder"
          type="text"
          value={cardHolderName}
          onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
          placeholder="JOÃO DA SILVA"
          className="w-full text-base bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all uppercase"
          autoComplete="cc-name"
          required
        />
      </div>

      {/* Expiry and CVV Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="card-expiry" className="block text-sm font-bold text-slate-700 uppercase font-mono mb-1">
            Validade (MM/AA)
          </label>
          <input
            id="card-expiry"
            type="text"
            value={cardExpiry}
            onChange={handleExpiryChange}
            placeholder="MM/AA"
            className="w-full text-base font-mono bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            maxLength={5}
            autoComplete="cc-exp"
            required
          />
        </div>
        <div className="relative">
          <label htmlFor="card-cvv" className="block text-sm font-bold text-slate-700 uppercase font-mono mb-1">
            CVV
          </label>
          <div className="relative">
            <input
              ref={cvvRef}
              id="card-cvv"
              type={showCvv ? 'text' : 'password'}
              value={cardCvv}
              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
              placeholder="123"
              className="w-full text-base font-mono bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all pr-10"
              maxLength={4}
              autoComplete="cc-csc"
              required
            />
            <button
              type="button"
              onClick={() => setShowCvv(!showCvv)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showCvv ? 'Ocultar CVV' : 'Mostrar CVV'}
            >
              {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* CPF Titular */}
      <div>
        <label htmlFor="card-cpf" className="block text-sm font-bold text-slate-700 uppercase font-mono mb-1">
          CPF do Titular
        </label>
        <input
          id="card-cpf"
          type="text"
          value={cardCpf}
          onChange={handleCpfChange}
          placeholder="000.000.000-00"
          className="w-full text-base font-mono bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          maxLength={14}
          required
        />
      </div>

      {/* Installments Selector */}
      <div>
        <label className="block text-sm font-bold text-slate-700 uppercase font-mono mb-1">
          Parcelamento
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
          {installmentOptions.map((opt) => (
            <button
              key={opt.installments}
              type="button"
              onClick={() => setInstallments(opt.installments)}
              className={`relative p-2 rounded-lg text-sm font-mono transition-all border-2 ${
                installments === opt.installments
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="font-bold">{opt.installments}x</div>
              <div className="text-sm">R$ {opt.value.toFixed(2).replace('.', ',')}</div>
              {opt.hasInterest && (
                <span className="absolute top-1 right-1 text-[8px] bg-amber-100 text-amber-700 px-1 rounded">com juros</span>
              )}
              {!opt.hasInterest && opt.installments > 1 && (
                <span className="absolute top-1 right-1 text-[8px] bg-emerald-100 text-emerald-700 px-1 rounded">sem juros</span>
              )}
              <div className="text-[9px] text-slate-500 mt-0.5">Total: R$ {opt.total.toFixed(2).replace('.', ',')}</div>
            </button>
          ))}
          {installmentOptions.length === 0 && (
            <div className="col-span-full text-center text-sm text-slate-400 py-4">
              Insira o número do cartão para ver parcelas
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-1.5 text-sm text-slate-400 font-mono pt-2 border-t border-slate-100">
        <Lock className="w-3 h-3 text-emerald-600" />
        <span>Dados criptografados TLS 256-bit — Tokenização PagBank</span>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {!cardToken ? (
          <button
            type="button"
            onClick={handleTokenize}
            disabled={isTokenizing}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 uppercase tracking-tight"
          >
            {isTokenizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Tokenizando Cartão...</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Tokenizar & Continuar</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-200 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando Pagamento...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Pagar R$ {amount.toFixed(2).replace('.', ',')} em {installments}x</span>
              </>
            )}
          </button>
        )}
      </div>
    </form>
    </>
  );
};