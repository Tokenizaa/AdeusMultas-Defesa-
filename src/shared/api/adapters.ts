import type { Context } from "hono";
import { jsonResponse } from "./http";
import { apiError, apiSuccess } from "./contracts";
import type { ApiErrorCode } from "./contracts";

const requestId = (c: Context) => c.req.header("x-request-id") || crypto.randomUUID();
export function adapterOk<T>(c: Context, data: T, status = 200): Response {
  const id = requestId(c); return jsonResponse(apiSuccess(data, id), status, id);
}
export function adapterError(c: Context, code: ApiErrorCode | string, message: string, status: number, details?: unknown): Response {
  const id = requestId(c); return jsonResponse(apiError(code, message, { details, requestId: id }), status, id);
}
