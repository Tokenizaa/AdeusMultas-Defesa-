import { authFetch } from '../../lib/authFetch';
import type { OnboardingApplication, CreateDraftInput, CreateDraftResult, UpdateDraftInput, ClaimInput, AnalysisResult, QualificationInput, PaymentResult, GenerationResult, EvidenceUploadResult } from './contracts';

export interface OnboardingHttpClient { request<T>(path: string, init?: RequestInit): Promise<T>; }

function withJson(init: RequestInit = {}, claimToken?: string): RequestInit {
  return { ...init, headers: { 'Content-Type': 'application/json', ...(claimToken ? { 'X-Claim-Token': claimToken } : {}), ...(init.headers || {}) } };
}

export function createOnboardingHttpApplication(client: OnboardingHttpClient, setClaimToken?: (token: string) => void): OnboardingApplication {
  let token = '';
  const authInit = (init?: RequestInit): RequestInit => withJson(init, token);
  return {
    async createDraft(input: CreateDraftInput): Promise<CreateDraftResult> {
      const result = await client.request<CreateDraftResult>('/api/onboarding-v2/draft', withJson({ method: 'POST', body: JSON.stringify(input) }));
      if (result.claimToken) { token = result.claimToken; setClaimToken?.(result.claimToken); }
      return result;
    },
    async updateDraft(input: UpdateDraftInput): Promise<CreateDraftResult['case']> {
      const result = await client.request<{ case: CreateDraftResult['case'] }>('/api/onboarding-v2/draft', authInit({ method: 'PUT', body: JSON.stringify(input) }));
      return result.case;
    },
    async getCase(caseId: string): Promise<CreateDraftResult['case']> { return client.request<CreateDraftResult['case']>(`/api/onboarding-v2/draft/${encodeURIComponent(caseId)}`, authInit()); },
    async uploadEvidence(caseId: string, file: File): Promise<EvidenceUploadResult> {
      const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ''; const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      const base64 = btoa(binary);
      return client.request<EvidenceUploadResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/evidence`, authInit({ method: 'POST', body: JSON.stringify({ base64, filename: file.name, mimeType: file.type }) }));
    },
    async claim(input: ClaimInput): Promise<CreateDraftResult['case']> {
      const result = await client.request<CreateDraftResult['case']>(`/api/cases/${encodeURIComponent(input.caseId)}/claim`, withJson({ method: 'POST', body: JSON.stringify({ claimToken: input.claimToken, name: input.name, email: input.email, phone: input.phone, cpf: input.cpf }) }));
      token = '';
      return result;
    },
    async startAnalysis(caseId: string): Promise<AnalysisResult> { return client.request<AnalysisResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/analysis`, authInit({ method: 'POST' })); },
    async getAnalysis(caseId: string): Promise<AnalysisResult> { return client.request<AnalysisResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/analysis`, authInit()); },
    async qualify(input: QualificationInput): Promise<CreateDraftResult['case']> {
      const result = await client.request<{ case: CreateDraftResult['case'] }>(`/api/onboarding-v2/cases/${encodeURIComponent(input.caseId)}/qualification`, authInit({ method: 'PUT', body: JSON.stringify(input) }));
      return result.case;
    },
    async requestPayment(caseId: string): Promise<PaymentResult> { return client.request<PaymentResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/payment`, authInit({ method: 'POST' })); },
    async confirmPayment(caseId: string, paymentReference: string): Promise<PaymentResult> { return client.request<PaymentResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/payment/confirm`, authInit({ method: 'POST', body: JSON.stringify({ paymentReference }) })); },
    async generateDocument(caseId: string): Promise<GenerationResult> { return client.request<GenerationResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/generation`, authInit({ method: 'POST' })); },
    async getGeneration(caseId: string): Promise<GenerationResult> { return client.request<GenerationResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/generation`, authInit()); },
  };
}

export function createBrowserOnboardingHttpClient(): OnboardingHttpClient {
  return { async request<T>(path, init) {
    const response = await authFetch(path, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : `Request failed (${response.status})`);
    return body as T;
  } };
}
