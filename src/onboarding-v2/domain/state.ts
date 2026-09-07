export type OnboardingStatus =
  | 'collecting'
  | 'persisting'
  | 'analyzing'
  | 'analysis_ready'
  | 'qualifying'
  | 'reviewing'
  | 'payment_pending'
  | 'generating'
  | 'completed'
  | 'failed';

export type OnboardingStep =
  | 'case'
  | 'facts'
  | 'evidence'
  | 'diagnosis'
  | 'qualification'
  | 'review'
  | 'payment'
  | 'generation';

export interface OnboardingState {
  caseId?: string;
  status: OnboardingStatus;
  step: OnboardingStep;
  errorCode?: string;
  updatedAt: string;
}

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  status: 'collecting',
  step: 'case',
  updatedAt: new Date(0).toISOString(),
};
