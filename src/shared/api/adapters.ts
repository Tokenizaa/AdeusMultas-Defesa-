import type { Context } from "hono";
import { fail, ok } from "./http";
import type { ApiErrorCode } from "./contracts";

export function adapterOk<T>(c: Context, data: T, status = 200): Response {
  const requestId = c.req.header("x-request-id") || crypto.randomUUID();
  const response = ok(data, requestId);
  if (response.status === status) return response;
  return new Response(response.body, {
    status,
    headers: response.headers,
  });
}

export function adapterError(
  c: Context,
  code: ApiErrorCode | string,
  message: string,
  status: number,
  details?: unknown,
): Response {
  const requestId = c.req.header("x-request-id") || crypto.randomUUID();
  return fail(code, message, status, { details, requestId });
}
