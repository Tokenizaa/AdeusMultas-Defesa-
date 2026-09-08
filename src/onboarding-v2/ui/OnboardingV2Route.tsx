import { useMemo } from 'react';
import { OnboardingPage } from './OnboardingPage';
import { createBrowserOnboardingHttpClient, createOnboardingHttpApplication } from '../application/http-application';

export function OnboardingV2Route() {
  const application = useMemo(
    () => createOnboardingHttpApplication(createBrowserOnboardingHttpClient()),
    [],
  );

  return <OnboardingPage application={application} />;
}
