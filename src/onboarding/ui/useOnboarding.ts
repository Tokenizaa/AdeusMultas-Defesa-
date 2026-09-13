import { useMemo, useState } from 'react';
import type { OnboardingApplication } from '../application/contracts';
import type { CanonicalOnboardingPayload, CaseAnalysis, CaseApplicantData } from '../application/types-bridge';
import type { OnboardingState, OnboardingStep } from '../domain/state';

const CLAIM_STORAGE_KEY = 'defesai_onboarding_claim_token';
const initialPayload: CanonicalOnboardingPayload = { procedureType: 'defesa_previa', vehicle: { plate: '', brandModel: '' }, infraction: { aitNumber: '', infractionCode: '', autuadorBody: '' } };
const stepOrder: OnboardingStep[] = ['case', 'facts', 'evidence', 'diagnosis', 'qualification', 'review', 'payment', 'generation'];

function loadClaimToken(): string {
  try { return sessionStorage.getItem(CLAIM_STORAGE_KEY) || ''; } catch { return ''; }
}

export function useOnboarding(application: OnboardingApplication) {
  const [payload, setPayload] = useState<CanonicalOnboardingPayload>(initialPayload);
  const [state, setState] = useState<OnboardingState>({ status: 'collecting', step: 'case', updatedAt: new Date().toISOString() });
  const [analysis, setAnalysis] = useState<CaseAnalysis>();
  const [error, setError] = useState<string>();
  const stepIndex = useMemo(() => stepOrder.indexOf(state.step), [state.step]);

  function patchPayload(patch: Partial<CanonicalOnboardingPayload>) { setPayload((current) => ({ ...current, ...patch })); setError(undefined); }

  async function persist(): Promise<string> {
    setError(undefined); setState((current) => ({ ...current, status: 'persisting', updatedAt: new Date().toISOString() }));
    try {
      if (state.caseId) { await application.updateDraft({ caseId: state.caseId, payload }); return state.caseId; }
      const result = await application.createDraft({ payload });
      setState((current) => ({ ...current, caseId: result.case.id, updatedAt: new Date().toISOString() }));
      return result.case.id;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível salvar o caso.';
      setError(message); setState((current) => ({ ...current, status: 'failed', errorCode: 'DRAFT_PERSISTENCE_FAILED', updatedAt: new Date().toISOString() })); throw cause;
    }
  }

  async function uploadEvidence(file: File) {
    const caseId = state.caseId || await persist();
    setError(undefined); setState((current) => ({ ...current, status: 'persisting', caseId, updatedAt: new Date().toISOString() }));
    try {
      const result = await application.uploadEvidence(caseId, file);
      setPayload((current) => ({ ...current, vehicle: { ...current.vehicle, ...result.case.vehicle }, infraction: { ...current.infraction, ...result.case.infraction }, evidence: { ...current.evidence, notes: file.name } }));
      setState((current) => ({ ...current, status: 'collecting', caseId, updatedAt: new Date().toISOString() }));
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível processar a evidência.';
      setError(message); setState((current) => ({ ...current, status: 'failed', errorCode: 'EVIDENCE_OCR_FAILED', updatedAt: new Date().toISOString() })); throw cause;
    }
  }

  async function next() {
    let caseId = state.caseId;
    if (state.step === 'case' || state.step === 'facts' || state.step === 'evidence') caseId = await persist();
    const nextStep = stepOrder[stepIndex + 1]; if (!nextStep) return;
    if (nextStep === 'diagnosis') {
      if (!caseId) throw new Error('Caso ainda não persistido.');
      setState((current) => ({ ...current, status: 'analyzing', step: 'diagnosis', caseId, updatedAt: new Date().toISOString() }));
      const result = await application.startAnalysis(caseId);
      if (result.status === 'failed') { setError(result.errorCode || 'ANALYSIS_FAILED'); setState((current) => ({ ...current, status: 'failed', errorCode: 'ANALYSIS_FAILED', updatedAt: new Date().toISOString() })); throw new Error(result.errorCode || 'ANALYSIS_FAILED'); }
      setAnalysis(result.analysis); setState((current) => ({ ...current, status: 'analysis_ready', updatedAt: new Date().toISOString() })); return;
    }
    setState((current) => ({ ...current, status: 'collecting', step: nextStep, updatedAt: new Date().toISOString() }));
  }

  function back() { const previousStep = stepOrder[stepIndex - 1]; if (!previousStep) return; setState((current) => ({ ...current, status: 'collecting', step: previousStep, updatedAt: new Date().toISOString() })); }

  async function qualify(applicant: CaseApplicantData) {
    if (!state.caseId) throw new Error('Caso ainda não persistido.');
    await application.qualify({ caseId: state.caseId, applicant });
    setState((current) => ({ ...current, status: 'reviewing', step: 'review', updatedAt: new Date().toISOString() }));
  }

  async function claimAuthenticatedCase(user: { name?: string; email?: string; phone?: string; cpf?: string }) {
    if (!state.caseId) throw new Error('Caso ainda não persistido.');
    const claimToken = loadClaimToken();
    if (!claimToken) throw new Error('Token de recuperação do caso não encontrado.');
    const claimed = await application.claim({ caseId: state.caseId, claimToken, name: user.name, email: user.email, phone: user.phone, cpf: user.cpf });
    setState((current) => ({ ...current, caseId: claimed.id, updatedAt: new Date().toISOString() }));
    return claimed;
  }

  async function requestPayment() {
    if (!state.caseId) throw new Error('Caso ainda não persistido.');
    return application.requestPayment(state.caseId);
  }

  async function confirmPayment(paymentReference: string) {
    if (!state.caseId) throw new Error('Caso ainda não persistido.');
    return application.confirmPayment(state.caseId, paymentReference);
  }

  async function generateDocument() {
    if (!state.caseId) throw new Error('Caso ainda não persistido.');
    return application.generateDocument(state.caseId);
  }

  return { payload, patchPayload, state, analysis, error, next, back, qualify, claimAuthenticatedCase, uploadEvidence, requestPayment, confirmPayment, generateDocument, stepIndex, stepOrder, caseId: state.caseId };
}