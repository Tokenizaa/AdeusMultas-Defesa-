import { useMemo, useState } from 'react';
import type { OnboardingApplication } from '../application/contracts';
import type { CanonicalOnboardingPayload, CaseAnalysis, CaseApplicantData } from '../application/types-bridge';
import type { OnboardingState, OnboardingStep } from '../domain/state';

const initialPayload: CanonicalOnboardingPayload = {
  procedureType: 'defesa_previa',
  vehicle: { plate: '', brandModel: '' },
  infraction: { aitNumber: '', infractionCode: '', autuadorBody: '' },
};

const stepOrder: OnboardingStep[] = ['case', 'facts', 'evidence', 'diagnosis', 'qualification', 'review', 'payment', 'generation'];

export function useOnboarding(application: OnboardingApplication) {
  const [payload, setPayload] = useState<CanonicalOnboardingPayload>(initialPayload);
  const [state, setState] = useState<OnboardingState>({ status: 'collecting', step: 'case', updatedAt: new Date().toISOString() });
  const [analysis, setAnalysis] = useState<CaseAnalysis>();
  const [error, setError] = useState<string>();
  const stepIndex = useMemo(() => stepOrder.indexOf(state.step), [state.step]);

  function patchPayload(patch: Partial<CanonicalOnboardingPayload>) {
    setPayload((current) => ({ ...current, ...patch }));
    setError(undefined);
  }

  async function persist() {
    setError(undefined);
    setState((current) => ({ ...current, status: 'persisting', updatedAt: new Date().toISOString() }));
    try {
      if (state.caseId) {
        await application.updateDraft({ caseId: state.caseId, payload });
      } else {
        const result = await application.createDraft({ payload });
        setState((current) => ({ ...current, caseId: result.case.id, updatedAt: new Date().toISOString() }));
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível salvar o caso.';
      setError(message);
      setState((current) => ({ ...current, status: 'failed', errorCode: 'DRAFT_PERSISTENCE_FAILED', updatedAt: new Date().toISOString() }));
      throw cause;
    }
  }

  async function next() {
    if (state.step === 'case' || state.step === 'facts' || state.step === 'evidence') await persist();
    const nextStep = stepOrder[stepIndex + 1];
    if (!nextStep) return;
    if (nextStep === 'diagnosis') {
      const caseId = state.caseId;
      if (!caseId) throw new Error('Caso ainda não persistido.');
      setState((current) => ({ ...current, status: 'analyzing', step: 'diagnosis', updatedAt: new Date().toISOString() }));
      const result = await application.startAnalysis(caseId);
      if (result.status === 'failed') throw new Error(result.errorCode || 'ANALYSIS_FAILED');
      setAnalysis(result.analysis);
      setState((current) => ({ ...current, status: 'analysis_ready', updatedAt: new Date().toISOString() }));
      return;
    }
    setState((current) => ({ ...current, status: 'collecting', step: nextStep, updatedAt: new Date().toISOString() }));
  }

  function back() {
    const previousStep = stepOrder[stepIndex - 1];
    if (!previousStep) return;
    setState((current) => ({ ...current, status: 'collecting', step: previousStep, updatedAt: new Date().toISOString() }));
  }

  async function qualify(applicant: CaseApplicantData) {
    if (!state.caseId) throw new Error('Caso ainda não persistido.');
    await application.qualify({ caseId: state.caseId, applicant });
    setState((current) => ({ ...current, status: 'reviewing', step: 'review', updatedAt: new Date().toISOString() }));
  }

  return { payload, patchPayload, state, analysis, error, next, back, qualify, stepIndex, stepOrder };
}
