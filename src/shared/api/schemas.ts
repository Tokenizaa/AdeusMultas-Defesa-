export interface AuthMeResponse {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export interface CaseRecord {
  id: string;
  userId?: string;
  [key: string]: unknown;
}

export interface CasesListResponse extends Array<CaseRecord> {}

export interface PaymentPriceResponse {
  price: number;
  currency?: string;
  [key: string]: unknown;
}

export interface PixCreateResponse {
  [key: string]: unknown;
}

export interface OnboardingRulesResponse {
  [key: string]: unknown;
}

export interface AdminOverviewResponse {
  [key: string]: unknown;
}

export interface MarketingContentResponse {
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}
