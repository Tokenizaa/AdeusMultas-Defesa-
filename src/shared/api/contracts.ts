export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  ok: false;
  error: { code: ApiErrorCode | string; message: string; details?: unknown; requestId?: string };
}

export interface ApiSuccessBody<T> { ok: true; data: T; requestId?: string }
export type ApiResponse<T> = ApiSuccessBody<T> | ApiErrorBody;
export interface RequestContext { requestId: string; startedAt: number; userId?: string }
export const API_CONTRACT_VERSION = "1" as const;

export function apiSuccess<T>(data: T, requestId?: string): ApiSuccessBody<T> {
  return { ok: true, data, ...(requestId ? { requestId } : {}) };
}

export function apiError(code: ApiErrorCode | string, message: string, options: { details?: unknown; requestId?: string } = {}): ApiErrorBody {
  return { ok: false, error: { code, message, ...(options.details !== undefined ? { details: options.details } : {}), ...(options.requestId ? { requestId: options.requestId } : {}) } };
}
