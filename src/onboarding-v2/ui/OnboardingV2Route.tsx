import { useMemo } from 'react';
import { OnboardingPage } from './OnboardingPage';
import { createBrowserOnboardingHttpClient, createOnboardingHttpApplication } from '../application/http-application';

const CLAIM_STORAGE_KEY = 'defesai_onboarding_v2_claim_token';

export function OnboardingV2Route() {
  const application = useMemo(() => {
    const setClaimToken = (token: string) => {
      try { sessionStorage.setItem(CLAIM_STORAGE_KEY, token); } catch { /* storage unavailable */ }
    };
    return createOnboardingHttpApplication(createBrowserOnboardingHttpClient(), setClaimToken);
  }, []);
  return <OnboardingPage application={application} />;
}
