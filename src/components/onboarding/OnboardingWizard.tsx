import React from 'react';
import { OnboardingRoute } from '../../onboarding/ui/OnboardingRoute';

type OnboardingWizardProps = {
  onOpenKnowledge?: () => void;
  isAdmin?: boolean;
};

/** Canonical onboarding entry point kept at the original product import path. */
export const OnboardingWizard: React.FC<OnboardingWizardProps> = () => <OnboardingRoute />;
