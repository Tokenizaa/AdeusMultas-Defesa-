import React from 'react';
import { OnboardingV2Route } from '../../onboarding-v2/ui/OnboardingV2Route';

/**
 * Compatibility entry point for the existing /novo-caso route.
 * The legacy onboarding implementation is frozen on the dedicated legacy branch;
 * this rebuild branch delegates the active entry point to canonical Onboarding V2.
 */
export const OnboardingWizard: React.FC = () => <OnboardingV2Route />;
