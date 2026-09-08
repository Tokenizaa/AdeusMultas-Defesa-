import type { OnboardingStatus } from './state';

const transitions: Record<OnboardingStatus, readonly OnboardingStatus[]> = {
  collecting: ['persisting'],
  persisting: ['collecting', 'analyzing', 'failed'],
  analyzing: ['analysis_ready', 'failed'],
  analysis_ready: ['qualifying', 'failed'],
  qualifying: ['reviewing', 'failed'],
  reviewing: ['payment_pending', 'failed'],
  payment_pending: ['generating', 'failed'],
  generating: ['completed', 'failed'],
  completed: [],
  failed: ['collecting', 'persisting', 'analyzing', 'qualifying', 'payment_pending', 'generating'],
};

export function canTransition(from: OnboardingStatus, to: OnboardingStatus): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: OnboardingStatus, to: OnboardingStatus): void {
  if (!canTransition(from, to)) throw new Error(`Invalid onboarding transition: ${from} -> ${to}`);
}
