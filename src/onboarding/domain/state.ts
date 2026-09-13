export type OnboardingStep =
  | 'case'
  | 'facts'
  | 'evidence'
  | 'diagnosis'
  | 'qualification'
  | 'review'
  | 'payment'
  | 'generation';

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

export interface OnboardingState {
  caseId?: string;
  step: OnboardingStep;
  status: OnboardingStatus;
  errorCode?: string;
  updatedAt: string;
}
