import type { OnboardingApplication, CreateDraftInput, CreateDraftResult, UpdateDraftInput, AnalysisResult, QualificationInput, PaymentResult, GenerationResult } from './contracts';

export interface OnboardingHttpClient { request<T>(path: string, init?: RequestInit): Promise<T>; }

export function createOnboardingHttpApplication(client: OnboardingHttpClient): OnboardingApplication {
  return {
    async createDraft(input: CreateDraftInput): Promise<CreateDraftResult> {
      return client.request<CreateDraftResult>('/api/onboarding-v2/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    },
    async updateDraft(input: UpdateDraftInput): Promise<CreateDraftResult['case']> {
      const result = await client.request<{ case: CreateDraftResult['case'] }>('/api/onboarding-v2/draft', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      return result.case;
    },
    async getCase(caseId: string): Promise<CreateDraftResult['case']> { return client.request<CreateDraftResult['case']>(`/api/onboarding-v2/draft/${encodeURIComponent(caseId)}`); },
    async startAnalysis(caseId: string): Promise<AnalysisResult> { return client.request<AnalysisResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/analysis`, { method: 'POST' }); },
    async getAnalysis(caseId: string): Promise<AnalysisResult> { return client.request<AnalysisResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/analysis`); },
    async qualify(input: QualificationInput): Promise<CreateDraftResult['case']> {
      const result = await client.request<{ case: CreateDraftResult['case'] }>(`/api/onboarding-v2/cases/${encodeURIComponent(input.caseId)}/qualification`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      return result.case;
    },
    async requestPayment(caseId: string): Promise<PaymentResult> { return client.request<PaymentResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/payment`, { method: 'POST' }); },
    async confirmPayment(caseId: string, paymentId: string): Promise<PaymentResult> { return client.request<PaymentResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/payment/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId }) }); },
    async generateDocument(caseId: string): Promise<GenerationResult> { return client.request<GenerationResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/generation`, { method: 'POST' }); },
    async getGeneration(caseId: string): Promise<GenerationResult> { return client.request<GenerationResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/generation`); },
  };
}

export function createBrowserOnboardingHttpClient(): OnboardingHttpClient {
  return { async request<T>(path, init) { const response = await fetch(path, init); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : `Request failed (${response.status})`); return body as T; } };
}
