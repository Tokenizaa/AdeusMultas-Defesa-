import type { Context } from "hono";
import { fail, ok } from "./http";
import type { ApiErrorCode } from "./contracts";

export function adapterOk<T>(c: Context, data: T, status = 200): Response {
  const requestId = c.req.header("x-request-id") || crypto.randomUUID();
  return ok(data, requestId).status === status
    ? ok(data, requestId)
    : new Response(ok(data, requestId).body, {
        status,
        headers: ok(data, requestId).headers,
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
