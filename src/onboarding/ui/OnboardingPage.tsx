import { useState } from 'react';
import type { ReactNode } from 'react';
import type { OnboardingApplication, PaymentResult, GenerationResult } from '../application/contracts';
import type { CaseAnalysis, CanonicalOnboardingPayload, CaseApplicantData } from '../application/types-bridge';
import { useOnboarding } from './useOnboarding';
import { useAuth } from '../../core/auth/AuthContext';
import { AccountVerificationGate } from '../../components/onboarding/AccountVerificationGate';
import { TestFillButton } from '../../components/ui/TestFillButton';
import { buildCoherentTestInfraction } from '../../components/onboarding/testFillData';

const steps = [['case','Caso'],['facts','Fatos'],['evidence','Evidências'],['diagnosis','Diagnóstico'],['qualification','Qualificação'],['review','Revisão'],['payment','Pagamento'],['generation','Documento']] as const;
type FieldProps = { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string };
function Field({ label, value, onChange, required = false, type = 'text' }: FieldProps) { return <label className="grid gap-2 text-sm font-medium text-slate-700"><span>{label}{required ? ' *' : ''}</span><input type={type} value={value} onChange={(e)=>onChange(e.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" /></label>; }
function Shell({ children, stepIndex, error, onBack, onNext, canNext, busy }: { children: ReactNode; stepIndex:number; error?:string; onBack:()=>void; onNext:()=>void; canNext:boolean; busy:boolean }) { return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6"><div className="mx-auto max-w-3xl"><header className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Adeus Multa</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Vamos preparar sua defesa</h1><p className="mt-2 text-sm text-slate-600">Você só verá perguntas relevantes para o seu caso.</p></header><nav aria-label="Progresso" className="mb-8 grid grid-cols-4 gap-2 sm:grid-cols-8">{steps.map(([key,label],i)=><div key={key} className="grid gap-1"><div className={`h-1.5 rounded-full ${i<=stepIndex?'bg-slate-900':'bg-slate-200'}`} /><span className={`hidden text-[11px] sm:block ${i===stepIndex?'font-semibold text-slate-900':'text-slate-500'}`}>{label}</span></div>)}</nav><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">{children}</section>{error&&<div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}<footer className="mt-5 flex items-center justify-between gap-3"><button type="button" onClick={onBack} disabled={stepIndex===0||busy} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-700 disabled:opacity-40">Voltar</button><button type="button" onClick={onNext} disabled={!canNext||busy} className="min-h-11 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy?'Processando…':stepIndex===steps.length-1?'Gerar documento':'Continuar'}</button></footer></div></main>; }

function CaseStep({ payload, patch, isAdmin }: { payload:CanonicalOnboardingPayload; patch:(p:Partial<CanonicalOnboardingPayload>)=>void; isAdmin:boolean }) {
  return <div className="grid gap-6"><div><h2 className="text-xl font-bold">Identifique a infração</h2><p className="mt-1 text-sm text-slate-600">Começamos pelos dados mínimos do auto.</p></div><div className="flex justify-center"><TestFillButton isAdmin={isAdmin} onClick={()=>patch({ infraction: buildCoherentTestInfraction('excesso_velocidade', payload.infraction), vehicle:{ plate:'ABC1D23', brandModel:'Honda Civic 2022' } })}/></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Número do AIT" required value={payload.infraction.aitNumber} onChange={(v)=>patch({infraction:{...payload.infraction,aitNumber:v}})} /><Field label="Código da infração" required value={payload.infraction.infractionCode} onChange={(v)=>patch({infraction:{...payload.infraction,infractionCode:v}})} /><Field label="Órgão autuador" required value={payload.infraction.autuadorBody} onChange={(v)=>patch({infraction:{...payload.infraction,autuadorBody:v}})} /><Field label="Data e hora" type="datetime-local" value={payload.infraction.dateTime||''} onChange={(v)=>patch({infraction:{...payload.infraction,dateTime:v}})} /><Field label="Placa" required value={payload.vehicle.plate} onChange={(v)=>patch({vehicle:{...payload.vehicle,plate:v.toUpperCase()}})} /><Field label="Marca/modelo" required value={payload.vehicle.brandModel} onChange={(v)=>patch({vehicle:{...payload.vehicle,brandModel:v}})} /><div className="sm:col-span-2"><Field label="Local da infração" value={payload.infraction.location||''} onChange={(v)=>patch({infraction:{...payload.infraction,location:v}})} /></div></div></div>;
}

function FactsStep({ payload, patch, isAdmin }: { payload:CanonicalOnboardingPayload; patch:(p:Partial<CanonicalOnboardingPayload>)=>void; isAdmin:boolean }) {
  const f=payload.specificFacts||{};
  return <div className="grid gap-6"><div><h2 className="text-xl font-bold">O que aconteceu?</h2><p className="mt-1 text-sm text-slate-600">Registre apenas fatos que possam mudar a análise.</p></div><div className="flex justify-center"><TestFillButton isAdmin={isAdmin} onClick={()=>patch({ specificFacts:{...f,speedLimit:60,measuredSpeed:68,radarEquipmentId:'E2E-RADAR-001',inmetroAferitionDate:'2026-01-15'} })}/></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Velocidade permitida" type="number" value={String(f.speedLimit??'')} onChange={(v)=>patch({specificFacts:{...f,speedLimit:v?Number(v):undefined}})} /><Field label="Velocidade medida" type="number" value={String(f.measuredSpeed??'')} onChange={(v)=>patch({specificFacts:{...f,measuredSpeed:v?Number(v):undefined}})} /><Field label="Número do equipamento radar" value={f.radarEquipmentId||''} onChange={(v)=>patch({specificFacts:{...f,radarEquipmentId:v}})} /><Field label="Data de aferição do INMETRO" type="date" value={f.inmetroAferitionDate||''} onChange={(v)=>patch({specificFacts:{...f,inmetroAferitionDate:v}})} /><div className="sm:col-span-2"><label className="grid gap-2 text-sm font-medium text-slate-700"><span>Fatos adicionais</span><textarea value={payload.infraction.customFacts||''} onChange={(e)=>patch({infraction:{...payload.infraction,customFacts:e.target.value}})} rows={5} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" /></label></div></div></div>;
}

function EvidenceStep({ payload, onUpload, busy }: { payload:CanonicalOnboardingPayload; onUpload:(file:File)=>Promise<void>; busy:boolean }) { return <div className="grid gap-6"><div><h2 className="text-xl font-bold">Documentos e evidências</h2><p className="mt-1 text-sm text-slate-600">Envie uma imagem do auto para extração real de dados e OCR.</p></div><label className="grid min-h-36 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-slate-500"><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e)=>{const file=e.target.files?.[0];if(file)void onUpload(file);e.currentTarget.value='';}}/><span><strong className="block">{busy?'Processando documento…':'Adicionar documento'}</strong><span className="mt-1 block text-sm text-slate-500">JPG, PNG ou WebP · até 5MB</span></span></label>{payload.evidence?.notes&&<div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold">{payload.evidence.notes}</p><p className="mt-1 text-slate-600">O documento foi enviado e processado pelo OCR.</p></div>}</div>; }
function DiagnosisStep({ analysis }: { analysis?:CaseAnalysis }) { if(!analysis)return <div><h2 className="text-xl font-bold">Análise em preparação</h2></div>; return <div className="grid gap-6"><div><h2 className="text-xl font-bold">Diagnóstico preliminar</h2><p className="mt-1 text-sm text-slate-600">Score determinístico do caso; não representa probabilidade estatística.</p></div><div className="rounded-xl bg-slate-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Força preliminar</p><p className="mt-1 text-3xl font-bold">{Math.round(analysis.overallSuccessRate)}/100</p></div><div className="grid gap-3">{analysis.detectedInconsistencies.map((item)=><article key={`${item.title}-${item.legalArgumentId||item.impact}`} className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm text-slate-600">{item.description}</p></article>)}</div><p className="text-sm leading-6 text-slate-700">{analysis.summaryReasoning}</p></div>; }
function QualificationStep({ value,onChange,isAdmin }: { value:CaseApplicantData; onChange:(v:CaseApplicantData)=>void; isAdmin:boolean }) { const field=(key:keyof CaseApplicantData,label:string,required=true,type='text')=><Field label={label} required={required} type={type} value={String(value[key]||'')} onChange={(v)=>onChange({...value,[key]:v})}/>; return <div className="grid gap-6"><div><h2 className="text-xl font-bold">Dados para a defesa</h2><p className="mt-1 text-sm text-slate-600">Precisamos destes dados para qualificar o documento.</p></div><div className="flex justify-center"><TestFillButton isAdmin={isAdmin} onClick={()=>onChange({applicantName:'Usuário Admin E2E',applicantCpf:'52998224725',applicantCnh:'01234567890',applicantPhone:'11999999999',applicantEmail:'admin-e2e@example.com',addressStreet:'Praça da Sé',addressNumber:'1',addressNeighborhood:'Sé',addressZipCode:'01001000',addressCityState:'São Paulo/SP'})}/></div><div className="grid gap-4 sm:grid-cols-2">{field('applicantName','Nome completo')}{field('applicantCpf','CPF')}{field('applicantCnh','CNH')}{field('applicantPhone','Telefone')}{field('applicantEmail','E-mail',true,'email')}{field('addressZipCode','CEP')}{field('addressStreet','Rua')}{field('addressNumber','Número')}{field('addressNeighborhood','Bairro')}{field('addressCityState','Cidade/UF')}</div></div>; }
function ReviewStep({ payload, applicant }: { payload:CanonicalOnboardingPayload; applicant:CaseApplicantData }) { return <div className="grid gap-6"><div><h2 className="text-xl font-bold">Revise seu caso</h2><p className="mt-1 text-sm text-slate-600">Confira os dados antes do pagamento.</p></div><dl className="grid gap-3 text-sm"><div className="flex justify-between border-b pb-3"><dt className="text-slate-500">AIT</dt><dd className="font-semibold">{payload.infraction.aitNumber}</dd></div><div className="flex justify-between border-b pb-3"><dt className="text-slate-500">Órgão</dt><dd className="font-semibold">{payload.infraction.autuadorBody}</dd></div><div className="flex justify-between border-b pb-3"><dt className="text-slate-500">Veículo</dt><dd className="font-semibold">{payload.vehicle.plate} — {payload.vehicle.brandModel}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Requerente</dt><dd className="font-semibold">{applicant.applicantName}</dd></div></dl></div>; }
function PaymentStep({ payment }: { payment?: PaymentResult }) { return <div className="grid gap-5"><div><h2 className="text-xl font-bold">Pagamento PIX</h2><p className="text-sm leading-6 text-slate-600">O pagamento é criado no gateway real. Nenhuma aprovação é simulada.</p></div>{payment?.qrCodeDataUrl&&<img src={payment.qrCodeDataUrl} alt="QR Code PIX" className="mx-auto h-56 w-56 rounded-xl border p-2" />}{payment?.pixCopyPasteString&&<textarea readOnly value={payment.pixCopyPasteString} className="min-h-28 rounded-xl border border-slate-300 p-3 text-xs" />}{payment&&<p className="text-sm text-slate-600">Status: <strong>{String(payment.status)}</strong>{payment.amount?` · R$ ${payment.amount.toFixed(2)}`:''}</p>}{!payment&&<p className="text-sm text-slate-600">Clique em continuar para criar o PIX.</p>}</div>; }
function GenerationStep({ generation }: { generation?: GenerationResult }) { return <div className="grid gap-5"><h2 className="text-xl font-bold">Documento</h2>{generation?.documentUrl?<a href={generation.documentUrl} className="font-semibold underline" target="_blank" rel="noreferrer">Abrir documento</a>:<p className="text-sm leading-6 text-slate-600">O documento só será exibido quando o backend informar estado pronto.</p>}{generation&&<p className="text-sm text-slate-600">Status: <strong>{String(generation.status)}</strong></p>}</div>; }

export function OnboardingPage({ application }: { application:OnboardingApplication }) {
  const flow=useOnboarding(application);
  const { isAuthenticated, isAdmin } = useAuth();
  const [applicant,setApplicant]=useState<CaseApplicantData>({applicantName:'',applicantCpf:'',applicantCnh:'',applicantPhone:'',applicantEmail:'',addressStreet:'',addressNumber:'',addressNeighborhood:'',addressZipCode:'',addressCityState:''});
  const [payment,setPayment]=useState<PaymentResult>();
  const [generation,setGeneration]=useState<GenerationResult>();
  const [busy,setBusy]=useState(false);
  const [accountGateOpen,setAccountGateOpen]=useState(false);
  const index=flow.stepIndex;
  const canNext=index===0?Boolean(flow.payload.infraction.aitNumber&&flow.payload.infraction.infractionCode&&flow.payload.infraction.autuadorBody&&flow.payload.vehicle.plate&&flow.payload.vehicle.brandModel):index===4?Boolean(applicant.applicantName&&applicant.applicantCpf&&applicant.applicantCnh&&applicant.applicantPhone&&applicant.applicantEmail&&applicant.addressStreet&&applicant.addressNumber&&applicant.addressNeighborhood&&applicant.addressZipCode&&applicant.addressCityState):true;
  const isPaid=(status:unknown)=>['paid','approved','completed','PAID','APPROVED','COMPLETED'].includes(String(status));

  const createPaymentAfterAuthentication = async () => {
    setBusy(true);
    try { setPayment(await flow.requestPayment()); setAccountGateOpen(false); }
    catch (cause) { setAccountGateOpen(false); throw cause; }
    finally { setBusy(false); }
  };

  const next=async()=>{
    setBusy(true);
    try {
      if(index===4){await flow.qualify(applicant);return;}
      if(index===6){
        if(!isAuthenticated){
          setAccountGateOpen(true);
          return;
        }
        if(!payment){setPayment(await flow.requestPayment());return;}
        if(payment.paymentReference||payment.txId){const confirmed=await flow.confirmPayment(payment.paymentReference||payment.txId!);setPayment(confirmed);if(isPaid(confirmed.status))await flow.next();return;}
        return;
      }
      if(index===7){setGeneration(await flow.generateDocument());return;}
      if(index<6)await flow.next();
    }finally{setBusy(false);}
  };

  const upload=async(file:File)=>{setBusy(true);try{await flow.uploadEvidence(file);}finally{setBusy(false);}};

  return <>
    <Shell stepIndex={index} error={flow.error} onBack={flow.back} onNext={()=>void next()} canNext={canNext} busy={busy}>
      {flow.state.step==='case'&&<CaseStep payload={flow.payload} patch={flow.patchPayload} isAdmin={isAdmin}/>} 
      {flow.state.step==='facts'&&<FactsStep payload={flow.payload} patch={flow.patchPayload} isAdmin={isAdmin}/>} 
      {flow.state.step==='evidence'&&<EvidenceStep payload={flow.payload} onUpload={upload} busy={busy}/>} 
      {flow.state.step==='diagnosis'&&<DiagnosisStep analysis={flow.analysis}/>} 
      {flow.state.step==='qualification'&&<QualificationStep value={applicant} onChange={setApplicant} isAdmin={isAdmin}/>} 
      {flow.state.step==='review'&&<ReviewStep payload={flow.payload} applicant={applicant}/>} 
      {flow.state.step==='payment'&&<PaymentStep payment={payment}/>} 
      {flow.state.step==='generation'&&<GenerationStep generation={generation}/>} 
    </Shell>
    {accountGateOpen && flow.analysis && <AccountVerificationGate
      leadName={applicant.applicantName}
      leadPhone={applicant.applicantPhone}
      infractionData={flow.payload.infraction}
      vehicleData={flow.payload.vehicle}
      analysis={flow.analysis}
      onSuccess={async(authenticatedUser)=>{ await flow.claimAuthenticatedCase(authenticatedUser); await createPaymentAfterAuthentication(); }}
      onCancel={()=>setAccountGateOpen(false)}
    />}
  </>;
}
