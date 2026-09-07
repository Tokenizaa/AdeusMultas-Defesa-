import { useState } from 'react';
import type { ReactNode } from 'react';
import type { OnboardingApplication } from '../application/contracts';
import type { CaseAnalysis, CanonicalOnboardingPayload, CaseApplicantData } from '../application/types-bridge';
import { useOnboarding } from './useOnboarding';

const steps = [
  ['case', 'Caso'], ['facts', 'Fatos'], ['evidence', 'Evidências'], ['diagnosis', 'Diagnóstico'],
  ['qualification', 'Qualificação'], ['review', 'Revisão'], ['payment', 'Pagamento'], ['generation', 'Documento'],
] as const;

function Field({ label, value, onChange, required = false, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return <label className="grid gap-2 text-sm font-medium text-slate-700"><span>{label}{required ? ' *' : ''}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200" /></label>;
}

function Shell({ children, stepIndex, error, onBack, onNext, canNext, busy }: { children: ReactNode; stepIndex: number; error?: string; onBack: () => void; onNext: () => void; canNext: boolean; busy: boolean }) {
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6"><div className="mx-auto max-w-3xl"><header className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Adeus Multa</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Vamos preparar sua defesa</h1><p className="mt-2 text-sm text-slate-600">Você só verá perguntas relevantes para o seu caso.</p></header><nav aria-label="Progresso" className="mb-8 grid grid-cols-4 gap-2 sm:grid-cols-8">{steps.map(([key, label], index) => <div key={key} className="grid gap-1"><div className={`h-1.5 rounded-full ${index <= stepIndex ? 'bg-slate-900' : 'bg-slate-200'}`} /><span className={`hidden text-[11px] sm:block ${index === stepIndex ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{label}</span></div>)}</nav><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">{children}</section>{error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}<footer className="mt-5 flex items-center justify-between gap-3"><button type="button" onClick={onBack} disabled={stepIndex === 0 || busy} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-700 disabled:opacity-40">Voltar</button><button type="button" onClick={onNext} disabled={!canNext || busy} className="min-h-11 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Processando…' : stepIndex === steps.length - 1 ? 'Concluir' : 'Continuar'}</button></footer></div></main>;
}

function CaseStep({ payload, patch }: { payload: CanonicalOnboardingPayload; patch: (patch: Partial<CanonicalOnboardingPayload>) => void }) {
  return <div className="grid gap-6"><div><h2 className="text-xl font-bold">Identifique a infração</h2><p className="mt-1 text-sm text-slate-600">Começamos pelos dados mínimos do auto.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Número do AIT" required value={payload.infraction.aitNumber} onChange={(value) => patch({ infraction: { ...payload.infraction, aitNumber: value } })} /><Field label="Código da infração" required value={payload.infraction.infractionCode} onChange={(value) => patch({ infraction: { ...payload.infraction, infractionCode: value } })} /><Field label="Órgão autuador" required value={payload.infraction.autuadorBody} onChange={(value) => patch({ infraction: { ...payload.infraction, autuadorBody: value } })} /><Field label="Data e hora" type="datetime-local" value={payload.infraction.dateTime || ''} onChange={(value) => patch({ infraction: { ...payload.infraction, dateTime: value } })} /><Field label="Placa" required value={payload.vehicle.plate} onChange={(value) => patch({ vehicle: { ...payload.vehicle, plate: value.toUpperCase() } })} /><Field label="Marca/modelo" required value={payload.vehicle.brandModel} onChange={(value) => patch({ vehicle: { ...payload.vehicle, brandModel: value } })} /><div className="sm:col-span-2"><Field label="Local da infração" value={payload.infraction.location || ''} onChange={(value) => patch({ infraction: { ...payload.infraction, location: value } })} /></div></div></div>;
}

function FactsStep({ payload, patch }: { payload: CanonicalOnboardingPayload; patch: (patch: Partial<CanonicalOnboardingPayload>) => void }) {
  const facts = payload.specificFacts || {};
  return <div className="grid gap-6"><div><h2 className="text-xl font-bold">O que aconteceu?</h2><p className="mt-1 text-sm text-slate-600">Registre apenas fatos que possam mudar a análise.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Velocidade permitida" type="number" value={String(facts.speedLimit ?? '')} onChange={(value) => patch({ specificFacts: { ...facts, speedLimit: value ? Number(value) : undefined } })} /><Field label="Velocidade medida" type="number" value={String(facts.measuredSpeed ?? '')} onChange={(value) => patch({ specificFacts: { ...facts, measuredSpeed: value ? Number(value) : undefined } })} /><Field label="Número do equipamento radar" value={facts.radarEquipmentId || ''} onChange={(value) => patch({ specificFacts: { ...facts, radarEquipmentId: value } })} /><Field label="Data de aferição do INMETRO" type="date" value={facts.inmetroAferitionDate || ''} onChange={(value) => patch({ specificFacts: { ...facts, inmetroAferitionDate: value } })} /><div className="sm:col-span-2"><label className="grid gap-2 text-sm font-medium text-slate-700"><span>Fatos adicionais</span><textarea value={payload.infraction.customFacts || ''} onChange={(event) => patch({ infraction: { ...payload.infraction, customFacts: event.target.value } })} rows={5} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" /></label></div></div></div>;
}

function EvidenceStep({ payload, patch }: { payload: CanonicalOnboardingPayload; patch: (patch: Partial<CanonicalOnboardingPayload>) => void }) {
  return <div className="grid gap-6"><div><h2 className="text-xl font-bold">Você tem documentos ou evidências?</h2><p className="mt-1 text-sm text-slate-600">Nesta fase registramos a evidência; o processamento real será conectado na Fase 6.</p></div><label className="grid min-h-36 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-slate-500"><input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(event) => patch({ evidence: { ...payload.evidence, notes: event.target.files?.[0]?.name || '' } })} /><span><strong className="block">Adicionar documento</strong><span className="mt-1 block text-sm text-slate-500">PDF ou imagem</span></span></label>{payload.evidence?.notes && <p className="text-sm text-slate-600">Arquivo selecionado: {payload.evidence.notes}</p>}</div>;
}

function DiagnosisStep({ analysis }: { analysis?: CaseAnalysis }) {
  if (!analysis) return <div><h2 className="text-xl font-bold">Análise em preparação</h2><p className="mt-2 text-sm text-slate-600">O diagnóstico será carregado pelo serviço canônico.</p></div>;
  return <div className="grid gap-6"><div><h2 className="text-xl font-bold">Diagnóstico preliminar</h2><p className="mt-1 text-sm text-slate-600">Resultado determinístico do caso. Este score não é apresentado como probabilidade estatística.</p></div><div className="rounded-xl bg-slate-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Força preliminar</p><p className="mt-1 text-3xl font-bold">{Math.round(analysis.overallSuccessRate)}/100</p></div><div className="grid gap-3">{analysis.detectedInconsistencies.map((item) => <article key={`${item.title}-${item.legalArgumentId || item.impact}`} className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm text-slate-600">{item.description}</p></article>)}</div><p className="text-sm leading-6 text-slate-700">{analysis.summaryReasoning}</p></div>;
}

function QualificationStep({ value, onChange }: { value: CaseApplicantData; onChange: (value: CaseApplicantData) => void }) {
  return <div className="grid gap-6"><div><h2 className="text-xl font-bold">Dados para a defesa</h2><p className="mt-1 text-sm text-slate-600">Precisamos destes dados para qualificar o documento.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome completo" required value={value.applicantName} onChange={(v) => onChange({ ...value, applicantName: v })} /><Field label="CPF" required value={value.applicantCpf} onChange={(v) => onChange({ ...value, applicantCpf: v })} /><Field label="CNH" required value={value.applicantCnh} onChange={(v) => onChange({ ...value, applicantCnh: v })} /><Field label="Telefone" required value={value.applicantPhone} onChange={(v) => onChange({ ...value, applicantPhone: v })} /><Field label="E-mail" type="email" required value={value.applicantEmail} onChange={(v) => onChange({ ...value, applicantEmail: v })} /><Field label="CEP" required value={value.addressZipCode} onChange={(v) => onChange({ ...value, addressZipCode: v })} /><Field label="Rua" required value={value.addressStreet} onChange={(v) => onChange({ ...value, addressStreet: v })} /><Field label="Número" required value={value.addressNumber} onChange={(v) => onChange({ ...value, addressNumber: v })} /><Field label="Bairro" required value={value.addressNeighborhood} onChange={(v) => onChange({ ...value, addressNeighborhood: v })} /><Field label="Cidade/UF" required value={value.addressCityState} onChange={(v) => onChange({ ...value, addressCityState: v })} /></div></div>;
}

function ReviewStep({ payload, applicant }: { payload: CanonicalOnboardingPayload; applicant: CaseApplicantData }) {
  return <div className="grid gap-6"><div><h2 className="text-xl font-bold">Revise seu caso</h2><p className="mt-1 text-sm text-slate-600">Confira o estado reunido antes de seguir para pagamento.</p></div><dl className="grid gap-3 text-sm"><div className="flex justify-between gap-4 border-b pb-3"><dt className="text-slate-500">AIT</dt><dd className="font-semibold">{payload.infraction.aitNumber}</dd></div><div className="flex justify-between gap-4 border-b pb-3"><dt className="text-slate-500">Órgão</dt><dd className="font-semibold">{payload.infraction.autuadorBody}</dd></div><div className="flex justify-between gap-4 border-b pb-3"><dt className="text-slate-500">Veículo</dt><dd className="font-semibold">{payload.vehicle.plate} — {payload.vehicle.brandModel}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Requerente</dt><dd className="font-semibold">{applicant.applicantName || 'Não informado'}</dd></div></dl></div>;
}

function PaymentStep() { return <div className="grid gap-5"><h2 className="text-xl font-bold">Pagamento</h2><p className="text-sm leading-6 text-slate-600">O checkout real será conectado ao serviço de pagamento na Fase 6. Esta tela não simula aprovação.</p><div className="rounded-xl border border-slate-200 p-5 text-sm">A geração só poderá começar após confirmação de pagamento pelo backend.</div></div>; }
function GenerationStep() { return <div className="grid gap-5"><h2 className="text-xl font-bold">Documento</h2><p className="text-sm leading-6 text-slate-600">O documento só será exibido quando o backend informar o estado `ready`.</p></div>; }

export function OnboardingPage({ application }: { application: OnboardingApplication }) {
  const flow = useOnboarding(application);
  const [applicant, setApplicant] = useState<CaseApplicantData>({ applicantName: '', applicantCpf: '', applicantCnh: '', applicantPhone: '', applicantEmail: '', addressStreet: '', addressNumber: '', addressNeighborhood: '', addressZipCode: '', addressCityState: '' });
  const [busy, setBusy] = useState(false);
  const index = flow.stepIndex;
  const canNext = index === 0 ? Boolean(flow.payload.infraction.aitNumber && flow.payload.infraction.infractionCode && flow.payload.infraction.autuadorBody && flow.payload.vehicle.plate && flow.payload.vehicle.brandModel) : index === 4 ? Boolean(applicant.applicantName && applicant.applicantCpf && applicant.applicantCnh && applicant.applicantPhone && applicant.applicantEmail && applicant.addressStreet && applicant.addressNumber && applicant.addressNeighborhood && applicant.addressZipCode && applicant.addressCityState) : true;

  const next = async () => {
    setBusy(true);
    try {
      if (index === 4) await flow.qualify(applicant);
      else if (index < 3 || index === 5 || index === 6) await flow.next();
    } finally { setBusy(false); }
  };

  return <Shell stepIndex={index} error={flow.error} onBack={flow.back} onNext={() => void next()} canNext={canNext} busy={busy}>
    {flow.state.step === 'case' && <CaseStep payload={flow.payload} patch={flow.patchPayload} />}
    {flow.state.step === 'facts' && <FactsStep payload={flow.payload} patch={flow.patchPayload} />}
    {flow.state.step === 'evidence' && <EvidenceStep payload={flow.payload} patch={flow.patchPayload} />}
    {flow.state.step === 'diagnosis' && <DiagnosisStep analysis={flow.analysis} />}
    {flow.state.step === 'qualification' && <QualificationStep value={applicant} onChange={setApplicant} />}
    {flow.state.step === 'review' && <ReviewStep payload={flow.payload} applicant={applicant} />}
    {flow.state.step === 'payment' && <PaymentStep />}
    {flow.state.step === 'generation' && <GenerationStep />}
  </Shell>;
}
