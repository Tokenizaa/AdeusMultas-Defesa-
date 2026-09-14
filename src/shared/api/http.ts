import type { ApiErrorBody, ApiResponse, ApiSuccessBody, RequestContext } from "./contracts";
import { apiError, apiSuccess } from "./contracts";

export function createRequestContext(request: Request): RequestContext {
  return { requestId: request.headers.get("x-request-id") || crypto.randomUUID(), startedAt: Date.now() };
}

export function jsonResponse<T>(body: ApiResponse<T>, status = body.ok ? 200 : 500, requestId?: string): Response {
  return Response.json(body, { status, headers: { "content-type": "application/json; charset=utf-8", ...(requestId ? { "x-request-id": requestId } : {}) } });
}

export function ok<T>(data: T, requestId?: string): Response { return jsonResponse<ApiSuccessBody<T>>(apiSuccess(data, requestId), 200, requestId); }
export function fail(code: ApiErrorBody["error"]["code"], message: string, status: number, options: { details?: unknown; requestId?: string } = {}): Response {
  return jsonResponse(apiError(code, message, options), status, options.requestId);
}
