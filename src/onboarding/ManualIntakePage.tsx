import { useEffect, useState, type FormEvent } from 'react';
import { authFetch } from '../lib/authFetch';
import { useAuth } from '../core/auth/AuthContext';
import { useRouter } from '../core/router/RouterContext';
import {
  normalizeManualIntake,
  validateManualIntake,
  type ManualIntakeErrors,
  type ManualIntakeInput,
  MANUAL_SERVICE_OPTIONS,
} from './manual-intake-validation';

const EMPTY_FORM: ManualIntakeInput = {
  aitNumber: '',
  infractionCode: '',
  autuadorBody: '',
  dateTime: '',
  location: '',
  plate: '',
  brandModel: '',
  serviceType: 'defesa_previa',
};

type RecoveredCaseData = {
  infraction?: { aitNumber?: string; infractionCode?: string; location?: string };
  vehicle?: { plate?: string };
  serviceType?: string;
};

type CreatedCase = { id: string; claimToken?: string; status?: string; recovered?: boolean; caseData?: RecoveredCaseData };
type Qualification = { name: string; cpf: string; email: string; phone: string; cnh: string; rg: string; cnhCategory: string; addressStreet: string; addressNumber: string; addressComplement: string; cityState: string };
const EMPTY_QUALIFICATION: Qualification = { name: '', cpf: '', email: '', phone: '', cnh: '', rg: '', cnhCategory: '', addressStreet: '', addressNumber: '', addressComplement: '', cityState: '' };

function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  required = false,
  maxLength,
  placeholder,
  type = 'text',
}: {
  id: keyof ManualIntakeInput;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {label}{required ? ' *' : ''}
      </label>
      <p id={`${id}-hint`} className="text-xs leading-5 text-slate-500">{hint}</p>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-200"
      />
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function ManualIntakePage() {
  const [form, setForm] = useState<ManualIntakeInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<ManualIntakeErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [createdCase, setCreatedCase] = useState<CreatedCase>();
  const [recovering, setRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [stage, setStage] = useState<'recorded' | 'qualification' | 'review' | 'payment' | 'paid' | 'document'>('recorded');
  const [qualification, setQualification] = useState<Qualification>(EMPTY_QUALIFICATION);
  const [qualificationError, setQualificationError] = useState('');
  const [qualificationBusy, setQualificationBusy] = useState(false);
  const [pixBusy, setPixBusy] = useState(false);
  const [pixError, setPixError] = useState('');
  const [pix, setPix] = useState<{ txId: string; amount: number; copyPaste: string; qrCodeUrl?: string; gateway?: string }>();
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentCheckBusy, setPaymentCheckBusy] = useState(false);
  const [documentMessage, setDocumentMessage] = useState('');
  const { isAuthenticated } = useAuth();
  const { navigate } = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function recoverCase() {
      let caseId = '';
      let claimToken = '';
      let savedStage = '';
      try {
        caseId = sessionStorage.getItem('defesai_manual_onboarding_case_id') || '';
        claimToken = sessionStorage.getItem('defesai_manual_onboarding_claim_token') || '';
        savedStage = sessionStorage.getItem('defesai_manual_onboarding_stage') || '';
      } catch { return; }
      if (!caseId) return;

      setRecovering(true);
      try {
        let caseRecord: any;
        if (claimToken) {
          const response = await authFetch(`/api/cases/anonymous/${encodeURIComponent(caseId)}/recover`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claimToken }),
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok || !body?.case || body.case.id !== caseId) throw new Error(typeof body?.message === 'string' ? body.message : 'Não foi possível recuperar este caso nesta sessão.');
          caseRecord = body.case;
        } else if (isAuthenticated) {
          const response = await authFetch(`/api/cases/${encodeURIComponent(caseId)}/onboarding-state`);
          const body = await response.json().catch(() => ({}));
          if (!response.ok || body.id !== caseId) throw new Error(typeof body?.message === 'string' ? body.message : 'Não foi possível retomar a jornada desta conta.');
          caseRecord = body;
          if (body.applicant) {
            setQualification({
              name: body.applicant.applicantName || '',
              cpf: body.applicant.applicantCpf || '',
              email: body.applicant.email || '',
              phone: body.applicant.phone || '',
              cnh: body.applicant.applicantCnh || '',
              rg: body.applicant.applicantRg || '',
              cnhCategory: body.applicant.cnhCategory || '',
              addressStreet: body.applicant.addressStreet || '',
              addressNumber: body.applicant.addressNumber || '',
              addressComplement: body.applicant.addressComplement || '',
              cityState: body.applicant.addressCityState || '',
            });
          }
          if (body.payment?.txId && body.payment?.copyPaste && Number(body.payment.amount) > 0) {
            setPix({ txId: body.payment.txId, amount: Number(body.payment.amount), copyPaste: body.payment.copyPaste, qrCodeUrl: body.payment.qrCodeUrl });
            setPaymentStatus(body.paymentStatus || 'PENDING');
          }
          if (body.isPaid === true) savedStage = 'paid';
        } else {
          return;
        }
        if (!cancelled) {
          const recoveredInfraction = caseRecord.infraction || {};
          const recoveredVehicle = caseRecord.vehicle || {};
          setForm((current) => ({
            ...current,
            aitNumber: typeof recoveredInfraction.aitNumber === 'string' ? recoveredInfraction.aitNumber : current.aitNumber,
            infractionCode: typeof recoveredInfraction.infractionCode === 'string' ? recoveredInfraction.infractionCode : current.infractionCode,
            autuadorBody: typeof recoveredInfraction.autuadorBody === 'string' ? recoveredInfraction.autuadorBody : current.autuadorBody,
            dateTime: typeof recoveredInfraction.dateTime === 'string' ? recoveredInfraction.dateTime.slice(0, 16) : current.dateTime,
            location: typeof recoveredInfraction.location === 'string' ? recoveredInfraction.location : current.location,
            plate: typeof recoveredVehicle.plate === 'string' ? recoveredVehicle.plate : current.plate,
            brandModel: typeof recoveredVehicle.brandModel === 'string' ? recoveredVehicle.brandModel : current.brandModel,
            serviceType: MANUAL_SERVICE_OPTIONS.some((option) => option.value === caseRecord.serviceType) ? caseRecord.serviceType as ManualIntakeInput['serviceType'] : 'defesa_previa',
          }));
          setCreatedCase({
            id: caseId,
            claimToken: claimToken || undefined,
            status: typeof caseRecord.status === 'string' ? caseRecord.status : undefined,
            recovered: true,
            caseData: { infraction: caseRecord.infraction, vehicle: caseRecord.vehicle, serviceType: caseRecord.serviceType },
          });
          if (savedStage === 'qualification' || savedStage === 'review' || savedStage === 'payment' || savedStage === 'paid' || savedStage === 'document') {
            setStage(savedStage as 'qualification' | 'review' | 'payment' | 'paid' | 'document');
          } else if (!claimToken) {
            setStage('qualification');
          }
          if (caseRecord.isPaid === true) setStage('paid');
          else if (savedStage === 'payment' && caseRecord.payment?.txId) setStage('payment');
        }
      } catch (cause) {
        if (!cancelled) setRecoveryError(cause instanceof Error ? cause.message : 'Não foi possível recuperar este caso nesta sessão.');
      } finally {
        if (!cancelled) setRecovering(false);
      }
    }
    void recoverCase();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  async function claimCurrentCase() {
    if (!createdCase?.id || !createdCase.claimToken) {
      setClaimError('O token seguro de vinculação não está disponível nesta sessão. Recupere o caso antes de continuar.');
      return;
    }
    setClaimBusy(true);
    setClaimError('');
    try {
      const response = await authFetch(`/api/cases/${encodeURIComponent(createdCase.id)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimToken: createdCase.claimToken }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body?.message === 'string' ? body.message : `Não foi possível vincular o caso (HTTP ${response.status}).`);
      }
      try {
        sessionStorage.setItem('defesai_manual_onboarding_stage', 'qualification');
        sessionStorage.removeItem('defesai_manual_onboarding_claim_token');
      } catch {
        // A vinculação já foi confirmada pelo servidor; storage é apenas auxiliar.
      }
      setStage('qualification');
    } catch (cause) {
      setClaimError(cause instanceof Error ? cause.message : 'Não foi possível vincular o caso à conta.');
    } finally {
      setClaimBusy(false);
    }
  }

  async function saveQualification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createdCase?.id) return;
    setQualificationBusy(true);
    setQualificationError('');
    try {
      const response = await authFetch(`/api/cases/${encodeURIComponent(createdCase.id)}/qualification`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qualification),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Não foi possível salvar a qualificação.');
      setStage('review');
      try { sessionStorage.setItem('defesai_manual_onboarding_stage', 'review'); } catch { /* optional session marker */ }
    } catch (cause) {
      setQualificationError(cause instanceof Error ? cause.message : 'Não foi possível salvar a qualificação.');
    } finally { setQualificationBusy(false); }
  }

  async function createPix() {
    if (!createdCase?.id) return;
    setPixBusy(true); setPixError('');
    try {
      const response = await authFetch('/api/payments/pix/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: createdCase.id, serviceType: form.serviceType, customerCpf: qualification.cpf, customerName: qualification.name, customerEmail: qualification.email, customerPhone: qualification.phone }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'O provedor não confirmou a criação do PIX.');
      if (body.simulated === true) throw new Error('O provedor retornou pagamento simulado. Esta jornada não aceita simulação.');
      const txId = body.txId || body.order?.request_number || body.paymentOrder?.gateway_transaction_id;
      const amount = Number(body.amount ?? body.paymentOrder?.amount);
      const copyPaste = body.pixCopyPasteString || body.order?.copyPaste || body.paymentOrder?.qr_code_text;
      if (!txId || !Number.isFinite(amount) || amount <= 0 || typeof copyPaste !== 'string' || !copyPaste) throw new Error('A API não devolveu os dados completos de uma cobrança PIX real.');
      setPix({ txId: String(txId), amount, copyPaste, qrCodeUrl: body.qrCodeDataUrl || body.qrCodeUrl || body.paymentOrder?.qr_code_url, gateway: body.gateway });
      setStage('payment');
      try { sessionStorage.setItem('defesai_manual_onboarding_stage', 'payment'); sessionStorage.setItem('defesai_manual_onboarding_txid', String(txId)); } catch { /* optional session marker */ }
      setPaymentStatus(String(body.status || 'PENDING'));
    } catch (cause) {
      setPixError(cause instanceof Error ? cause.message : 'Não foi possível iniciar o PIX.');
    } finally { setPixBusy(false); }
  }

  async function checkPaymentStatus() {
    if (!pix?.txId) return;
    setPaymentCheckBusy(true); setPixError('');
    try {
      const response = await authFetch(`/api/payments/pix/status/${encodeURIComponent(pix.txId)}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Não foi possível consultar o status do pagamento.');
      const status = String(body.status || '').toUpperCase();
      setPaymentStatus(status || 'PENDING');
      if (status !== 'PAID') {
        setPixError('O provedor ainda não confirmou o pagamento. Não gere a minuta nem faça outro pagamento; consulte novamente depois.');
        return;
      }
      setStage('paid');
      try { sessionStorage.setItem('defesai_manual_onboarding_stage', 'paid'); } catch { /* optional session marker */ }
    } catch (cause) {
      setPixError(cause instanceof Error ? cause.message : 'Não foi possível consultar o pagamento.');
    } finally { setPaymentCheckBusy(false); }
  }

  async function generateDocument() {
    if (!createdCase?.id) return;
    setDocumentMessage('');
    try {
      const response = await authFetch(`/api/cases/${encodeURIComponent(createdCase.id)}/generate-defense`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantData: { name: qualification.name, cpf: qualification.cpf, cnh: qualification.cnh, rg: qualification.rg, category: qualification.cnhCategory, address: `${qualification.addressStreet}, ${qualification.addressNumber}${qualification.addressComplement ? ' - ' + qualification.addressComplement : ''}`, cityState: qualification.cityState } }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'A geração foi bloqueada pelo servidor.');
      if (!body?.defenseDraft) throw new Error('O servidor não devolveu uma minuta validada.');
      setDocumentMessage('Minuta gerada e validada pelo servidor. Acesse Meus Casos para consultar o documento e o checklist.');
      setStage('document');
      try { sessionStorage.setItem('defesai_manual_onboarding_stage', 'document'); } catch { /* optional session marker */ }
    } catch (cause) {
      setDocumentMessage(cause instanceof Error ? cause.message : 'Não foi possível gerar a minuta.');
    }
  }

  function update<K extends keyof ManualIntakeInput>(key: K, value: ManualIntakeInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeManualIntake(form);
    const nextErrors = validateManualIntake(normalized);
    setErrors(nextErrors);
    setError('');
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      const response = await authFetch('/api/cases/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          infraction: {
            aitNumber: normalized.aitNumber,
            infractionCode: normalized.infractionCode,
            autuadorBody: normalized.autuadorBody,
            dateTime: normalized.dateTime || undefined,
            location: normalized.location,
          },
          vehicle: { plate: normalized.plate, brandModel: normalized.brandModel || undefined },
          serviceType: normalized.serviceType,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body?.message === 'string' ? body.message : typeof body?.error === 'string' ? body.error : `Não foi possível salvar o caso (HTTP ${response.status}).`);
      }
      if (typeof body?.id !== 'string' || !body.id) throw new Error('A API não confirmou a criação do caso.');
      const result: CreatedCase = { id: body.id, claimToken: typeof body.claimToken === 'string' ? body.claimToken : undefined, status: typeof body.status === 'string' ? body.status : undefined };
      try {
        sessionStorage.setItem('defesai_manual_onboarding_case_id', result.id);
        if (result.claimToken) sessionStorage.setItem('defesai_manual_onboarding_claim_token', result.claimToken);
      } catch {
        // Persistência do caso é do backend; storage local serve somente à recuperação da sessão.
      }
      setCreatedCase(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ocorreu um erro inesperado ao salvar o caso.');
    } finally {
      setBusy(false);
    }
  }

  if (createdCase && stage !== 'recorded') {
    const field = (key: keyof Qualification, label: string, required = true, type = 'text') => (
      <label className="grid gap-1.5 text-sm font-semibold text-slate-800" key={key}>
        {label}{required ? ' *' : ''}
        <input type={type} required={required} value={qualification[key]} onChange={(event) => setQualification((current) => ({ ...current, [key]: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 px-3 text-base font-normal" />
      </label>
    );
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6">
        <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Adeus Multa · Continuação segura</p>
          {stage === 'qualification' && <>
            <h1 className="mt-2 text-2xl font-bold">Qualifique o requerente</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Informe os dados exatamente como aparecem nos documentos. Eles serão usados na identificação do requerente, não como prova de fatos da infração.</p>
            <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={saveQualification}>
              {field('name', 'Nome completo')}
              {field('cpf', 'CPF')}
              {field('email', 'E-mail', true, 'email')}
              {field('phone', 'Telefone')}
              {field('cnh', 'Número da CNH')}
              {field('cnhCategory', 'Categoria da CNH')}
              {field('rg', 'RG', false)}
              {field('addressStreet', 'Rua/avenida')}
              {field('addressNumber', 'Número')}
              {field('addressComplement', 'Complemento', false)}
              <div className="sm:col-span-2">{field('cityState', 'Município/UF')}</div>
              {qualificationError && <p role="alert" className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">{qualificationError}</p>}
              <div className="sm:col-span-2"><button disabled={qualificationBusy} className="min-h-11 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-60">{qualificationBusy ? 'Salvando…' : 'Salvar e revisar'}</button></div>
            </form>
          </>}
          {stage === 'review' && <>
            <h1 className="mt-2 text-2xl font-bold">Revise antes de contratar</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Confira os dados informados. O preço e a cobrança serão resolvidos pelo servidor; a minuta só poderá ser solicitada depois da confirmação autoritativa do pagamento.</p>
            <dl className="mt-5 grid gap-3 rounded-lg border border-slate-200 p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Auto de infração</dt><dd className="font-semibold">{form.aitNumber}</dd></div>
              <div><dt className="text-slate-500">Código</dt><dd className="font-semibold">{form.infractionCode}</dd></div>
              <div><dt className="text-slate-500">Placa</dt><dd className="font-semibold">{form.plate}</dd></div>
              <div><dt className="text-slate-500">Serviço</dt><dd className="font-semibold">{MANUAL_SERVICE_OPTIONS.find((option) => option.value === form.serviceType)?.label || 'Defesa prévia'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Requerente</dt><dd className="font-semibold">{qualification.name} · CPF terminado em {qualification.cpf.replace(/\D/g, '').slice(-2)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Endereço</dt><dd className="font-semibold">{qualification.addressStreet}, {qualification.addressNumber} {qualification.addressComplement} · {qualification.cityState}</dd></div>
            </dl>
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">O registro dos dados não representa parecer jurídico nem garante resultado. Confirme que os dados correspondem aos documentos oficiais.</p>
            {pixError && <p role="alert" className="mt-4 text-sm text-red-700">{pixError}</p>}
            <div className="mt-5 flex flex-wrap gap-3"><button onClick={() => setStage('qualification')} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold">Corrigir dados</button><button disabled={pixBusy} onClick={() => void createPix()} className="min-h-11 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-60">{pixBusy ? 'Consultando oferta…' : 'Consultar preço e gerar PIX'}</button></div>
          </>}
          {stage === 'payment' && <>
            <h1 className="mt-2 text-2xl font-bold">Pagamento via PIX</h1>
            <p className="mt-2 text-sm text-slate-600">Valor informado pelo servidor: <strong>{pix?.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
            {pix?.qrCodeUrl && <div className="my-5 flex justify-center"><img src={pix.qrCodeUrl} alt="QR Code PIX" className="max-h-64 max-w-64 object-contain" /></div>}
            <label className="mt-4 grid gap-2 text-sm font-semibold">PIX copia e cola<textarea readOnly value={pix?.copyPaste || ''} rows={4} className="rounded-lg border border-slate-300 p-3 font-mono text-xs font-normal" /></label>
            <button onClick={() => { if (pix?.copyPaste) void navigator.clipboard.writeText(pix.copyPaste); }} className="mt-3 min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold">Copiar código PIX</button>
            <p className="mt-4 text-sm text-slate-600">Status consultado: <strong>{paymentStatus}</strong>. A página não considera um PIX pago até o endpoint autenticado retornar um estado aprovado.</p>
            {pixError && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{pixError}</p>}
            <button disabled={paymentCheckBusy} onClick={() => void checkPaymentStatus()} className="mt-4 min-h-11 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-60">{paymentCheckBusy ? 'Consultando…' : 'Verificar pagamento'}</button>
          </>}
          {stage === 'paid' && <>
            <h1 className="mt-2 text-2xl font-bold">Pagamento confirmado pelo servidor</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">O endpoint autenticado confirmou o status da ordem. Agora o servidor tentará gerar a minuta usando a análise e as regras de qualidade canônicas.</p>
            {documentMessage && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{documentMessage}</p>}
            <button onClick={() => void generateDocument()} className="mt-5 min-h-11 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white">Solicitar geração validada</button>
          </>}
          {stage === 'document' && <>
            <h1 className="mt-2 text-2xl font-bold">Resultado da geração</h1>
            <p role="status" className="mt-4 rounded-lg border border-slate-200 p-4 text-sm leading-6">{documentMessage}</p>
            <button onClick={() => navigate('/cases')} className="mt-5 min-h-11 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white">Ir para Meus Casos</button>
          </>}
        </section>
      </main>
    );
  }

  if (createdCase) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6">
        <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <p className="text-sm font-semibold text-emerald-800">{createdCase.recovered ? 'Recuperação concluída' : 'Dados salvos'}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{createdCase.recovered ? 'Seu caso foi recuperado' : 'Seu caso foi registrado'}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Identificador do caso: <span className="font-mono">{createdCase.id}</span></p>
          {createdCase.recovered && createdCase.caseData && (
            <dl className="mt-5 grid gap-3 rounded-lg border border-slate-200 p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Auto de infração</dt><dd className="font-semibold">{createdCase.caseData.infraction?.aitNumber || 'Não informado'}</dd></div>
              <div><dt className="text-slate-500">Código</dt><dd className="font-semibold">{createdCase.caseData.infraction?.infractionCode || 'Não informado'}</dd></div>
              <div><dt className="text-slate-500">Placa</dt><dd className="font-semibold">{createdCase.caseData.vehicle?.plate || 'Não informado'}</dd></div>
              <div><dt className="text-slate-500">Etapa selecionada</dt><dd className="font-semibold">{MANUAL_SERVICE_OPTIONS.find((option) => option.value === createdCase.caseData.serviceType)?.label || 'Defesa prévia'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Local</dt><dd className="font-semibold">{createdCase.caseData.infraction?.location || 'Não informado'}</dd></div>
            </dl>
          )}
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Esta etapa confirma apenas o registro dos dados. A análise jurídica e a geração do documento não são declaradas concluídas nesta versão de validação.
          </div>
          {claimError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{claimError}</p>}
          <section className="mt-6 rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold">Próxima etapa: vincular à sua conta</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Para continuar com qualificação, revisão e contratação, vincule este caso a uma conta. Isso não confirma pagamento nem gera uma defesa.</p>
            {isAuthenticated ? (
              <button type="button" disabled={claimBusy} onClick={() => void claimCurrentCase()} className="mt-4 min-h-11 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60">
                {claimBusy ? 'Vinculando…' : 'Vincular caso à minha conta'}
              </button>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={() => navigate('/login?redirect=%2Fnovo-caso-rebuild')} className="min-h-11 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">Entrar para vincular</button>
                <button type="button" onClick={() => navigate('/cadastro?redirect=%2Fnovo-caso-rebuild')} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold">Criar conta</button>
              </div>
            )}
          </section>
          <button type="button" onClick={() => { setCreatedCase(undefined); setForm(EMPTY_FORM); setRecoveryError(''); setClaimError(''); try { sessionStorage.removeItem('defesai_manual_onboarding_case_id'); sessionStorage.removeItem('defesai_manual_onboarding_claim_token'); } catch { /* storage may be disabled */ } }} className="mt-6 min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold">Iniciar outro caso</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {recovering && <p role="status" className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">Recuperando o caso salvo nesta sessão…</p>}
        {recoveryError && <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Não foi possível recuperar o caso salvo automaticamente. {recoveryError}</p>}
        <header className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Adeus Multa · Novo fluxo</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Informe os dados da autuação</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Preencha os campos manualmente. Você encontra essas informações na notificação de autuação ou no documento enviado pelo órgão. Não envie arquivos nesta etapa.</p>
          <p className="mt-2 text-sm text-slate-500">* Campos obrigatórios. Não invente dados: se uma informação não estiver disponível, consulte o documento ou o órgão responsável antes de continuar.</p>
        </header>

        <form onSubmit={submit} noValidate className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField id="aitNumber" label="Número do auto de infração (AIT)" hint="Copie o número completo, preservando letras e zeros." value={form.aitNumber} onChange={(v) => update('aitNumber', v)} error={errors.aitNumber} required maxLength={80} placeholder="Ex.: A123456789" />
            <TextField id="infractionCode" label="Código da infração" hint="Informe o código que aparece na notificação." value={form.infractionCode} onChange={(v) => update('infractionCode', v)} error={errors.infractionCode} required maxLength={20} placeholder="Ex.: 745-5" />
            <TextField id="autuadorBody" label="Órgão autuador" hint="Ex.: DETRAN, prefeitura ou órgão rodoviário. Se não souber, deixe em branco." value={form.autuadorBody} onChange={(v) => update('autuadorBody', v)} error={errors.autuadorBody} maxLength={120} placeholder="Nome indicado na notificação" />
            <TextField id="dateTime" label="Data e hora da infração" hint="Use a data e o horário indicados no documento." value={form.dateTime} onChange={(v) => update('dateTime', v)} error={errors.dateTime} type="datetime-local" maxLength={40} />
            <div className="sm:col-span-2">
              <TextField id="location" label="Local da infração" hint="Informe rua/rodovia, número ou km, município e UF, conforme constar na notificação." value={form.location} onChange={(v) => update('location', v)} error={errors.location} required maxLength={240} placeholder="Ex.: Av. Brasil, km 12, Porto Alegre/RS" />
            </div>
            <TextField id="plate" label="Placa do veículo" hint="Digite a placa sem adivinhar caracteres ilegíveis." value={form.plate} onChange={(v) => update('plate', v.toUpperCase())} error={errors.plate} required maxLength={8} placeholder="ABC1D23" />
            <TextField id="brandModel" label="Marca e modelo" hint="Opcional nesta etapa. Consulte o documento do veículo se precisar confirmar." value={form.brandModel} onChange={(v) => update('brandModel', v)} error={errors.brandModel} maxLength={120} placeholder="Ex.: Fiat Argo" />
            <div className="sm:col-span-2 grid gap-2">
              <label htmlFor="serviceType" className="text-sm font-semibold text-slate-800">Etapa do processo</label>
              <p className="text-xs leading-5 text-slate-500">Escolha conforme o documento recebido. Se ainda não recebeu penalidade, normalmente está na fase de defesa da autuação; confira a notificação antes de selecionar.</p>
              <select id="serviceType" name="serviceType" value={form.serviceType} onChange={(event) => update('serviceType', event.target.value as ManualIntakeInput['serviceType'])} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base">
                {MANUAL_SERVICE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>

          {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-xs leading-5 text-slate-500">Seus dados são enviados ao servidor para registrar o caso. Nenhum OCR ou extração automática de documentos é executado.</p>
            <button type="submit" disabled={busy} className="min-h-12 rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{busy ? 'Salvando dados…' : 'Registrar dados'}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
