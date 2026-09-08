import { authFetch } from '../../lib/authFetch';
import type { OnboardingApplication, CreateDraftInput, CreateDraftResult, ClaimInput, AnalysisResult, QualificationInput, PaymentResult, GenerationResult, EvidenceUploadResult } from './contracts';

export interface OnboardingHttpClient { request<T>(path: string, init?: RequestInit): Promise<T>; }

const CLAIM_STORAGE_KEY = 'defesai_onboarding_claim_token';

function withJson(init: RequestInit = {}, claimToken?: string): RequestInit {
  return { ...init, headers: { 'Content-Type': 'application/json', ...(claimToken ? { 'X-Claim-Token': claimToken } : {}), ...(init.headers || {}) } };
}

function loadClaimToken(): string { try { return sessionStorage.getItem(CLAIM_STORAGE_KEY) || ''; } catch { return ''; } }
function clearClaimToken(): void { try { sessionStorage.removeItem(CLAIM_STORAGE_KEY); } catch { /* storage unavailable */ } }

export function createOnboardingHttpApplication(client: OnboardingHttpClient, setClaimToken?: (token: string) => void): OnboardingApplication {
  let token = loadClaimToken();
  return {
    async createDraft(input: CreateDraftInput): Promise<CreateDraftResult> {
      const result = await client.request<CreateDraftResult>('/api/onboarding-v2/draft', withJson({ method: 'POST', body: JSON.stringify(input) }));
      if (result.claimToken) { token = result.claimToken; setClaimToken?.(result.claimToken); }
      return result;
    },
    async updateDraft(input) { const result = await client.request<{ case: CreateDraftResult['case'] }>('/api/onboarding-v2/draft', withJson({ method: 'PUT', body: JSON.stringify(input) }, token)); return result.case; },
    async getCase(caseId: string) { return client.request<CreateDraftResult['case']>(`/api/onboarding-v2/draft/${encodeURIComponent(caseId)}`, withJson({}, token)); },
    async uploadEvidence(caseId: string, file: File): Promise<EvidenceUploadResult> {
      const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ''; const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      return client.request<EvidenceUploadResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/evidence`, withJson({ method: 'POST', body: JSON.stringify({ base64: btoa(binary), filename: file.name, mimeType: file.type }) }, token));
    },
    async claim(input: ClaimInput) {
      const result = await client.request<CreateDraftResult['case']>(`/api/cases/${encodeURIComponent(input.caseId)}/claim`, withJson({ method: 'POST', body: JSON.stringify({ claimToken: input.claimToken, name: input.name, email: input.email, phone: input.phone, cpf: input.cpf }) }));
      token = ''; clearClaimToken(); return result;
    },
    async startAnalysis(caseId: string): Promise<AnalysisResult> { return client.request<AnalysisResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/analysis`, withJson({ method: 'POST' }, token)); },
    async getAnalysis(caseId: string): Promise<AnalysisResult> { return client.request<AnalysisResult>(`/api/onboarding-v2/cases/${encodeURIComponent(caseId)}/analysis`, withJson({}, token)); },
    async qualify(input: QualificationInput) { const result = await client.request<{ case: CreateDraftResult['case'] }>(`/api/onboarding-v2/cases/${encodeURIComponent(input.caseId)}/qualification`, withJson({ method: 'PUT', body: JSON.stringify(input) }, token)); return result.case; },
    async requestPayment(caseId: string): Promise<PaymentResult> { const current = await this.getCase(caseId); if (!current.applicant) throw new Error('Qualificação do requerente é obrigatória antes do pagamento.'); return client.request<PaymentResult>('/api/payments/pix/create', withJson({ method: 'POST', body: JSON.stringify({ caseId, customerName: current.applicant.applicantName, customerEmail: current.applicant.applicantEmail, customerCpf: current.applicant.applicantCpf, serviceType: current.serviceType }) }, token)); },
    async confirmPayment(caseId: string, paymentReference: string): Promise<PaymentResult> { return client.request<PaymentResult>(`/api/payments/pix/status/${encodeURIComponent(paymentReference)}?caseId=${encodeURIComponent(caseId)}`, withJson({}, token)); },
    async generateDocument(caseId: string): Promise<GenerationResult> { const result = await client.request<any>(`/api/cases/${encodeURIComponent(caseId)}/generate-defense`, withJson({ method: 'POST' }, token)); return { ...(result || {}), status: 'ready' } as GenerationResult; },
    async getGeneration(caseId: string): Promise<GenerationResult> { const result = await client.request<any>(`/api/cases/${encodeURIComponent(caseId)}`, withJson({}, token)); return { caseId, ...(result?.defenseDraft ? { defenseDraft: result.defenseDraft } : {}), status: result?.defenseDraft ? 'ready' : 'not_requested' } as GenerationResult; },
  };
}

export function createBrowserOnboardingHttpClient(): OnboardingHttpClient {
  return { async request<T>(path, init) { const response = await authFetch(path, init); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : `Request failed (${response.status})`); return body as T; } };
}
