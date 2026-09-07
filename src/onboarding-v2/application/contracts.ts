import type {
  CanonicalOnboardingPayload,
  CaseAnalysis,
  CaseApplicantData,
  CaseDomain,
  PaymentStatus,
  DocumentGenerationStatus,
} from './types-bridge';

export interface CreateDraftInput {
  payload: CanonicalOnboardingPayload;
  claimRequested?: boolean;
}

export interface CreateDraftResult {
  case: CaseDomain;
  claimToken?: string;
}

export interface UpdateDraftInput {
  caseId: string;
  payload: Partial<CanonicalOnboardingPayload>;
}

export interface AnalysisResult {
  caseId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  analysis?: CaseAnalysis;
  errorCode?: string;
}

export interface QualificationInput {
  caseId: string;
  applicant: CaseApplicantData;
}

export interface PaymentResult {
  caseId: string;
  status: PaymentStatus;
  paymentReference?: string;
}

export interface GenerationResult {
  caseId: string;
  status: DocumentGenerationStatus;
  documentUrl?: string;
  errorCode?: string;
}

export interface OnboardingApplication {
  createDraft(input: CreateDraftInput): Promise<CreateDraftResult>;
  updateDraft(input: UpdateDraftInput): Promise<CaseDomain>;
  getCase(caseId: string): Promise<CaseDomain>;
  startAnalysis(caseId: string): Promise<AnalysisResult>;
  getAnalysis(caseId: string): Promise<AnalysisResult>;
  qualify(input: QualificationInput): Promise<CaseDomain>;
  requestPayment(caseId: string): Promise<PaymentResult>;
  confirmPayment(caseId: string, paymentReference: string): Promise<PaymentResult>;
  generateDocument(caseId: string): Promise<GenerationResult>;
  getGeneration(caseId: string): Promise<GenerationResult>;
}