import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { apiError } from "./contracts";

function getRequestId(c: Context): string {
  return c.req.header("x-request-id") || crypto.randomUUID();
}

function withRequestId(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set("x-request-id", requestId);
  return new Response(response.body, { status: response.status, headers });
}

/**
 * Compatibility boundary for the current Cloudflare API.
 *
 * Success payloads remain unchanged so existing frontend consumers do not
 * regress during the migration. Errors are normalized immediately to the
 * shared API contract. Full success envelopes can be enabled per family once
 * its consumer contract has been migrated and tested.
 */
export async function apiBoundary(c: Context, next: Next): Promise<Response | void> {
  const requestId = getRequestId(c);
  c.header("x-request-id", requestId);

  try {
    await next();
    return withRequestId(c.res, requestId);
  } catch (error) {
    if (error instanceof HTTPException) {
      return withRequestId(
        Response.json(
          apiError(
            error.status === 401
              ? "UNAUTHENTICATED"
              : error.status === 403
                ? "FORBIDDEN"
                : error.status === 404
                  ? "NOT_FOUND"
                  : error.status === 409
                    ? "CONFLICT"
                    : "INTERNAL_ERROR",
            error.message,
            { requestId },
          ),
          { status: error.status },
        ),
        requestId,
      );
    }

    console.error("[api-boundary] unhandled error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return withRequestId(
      Response.json(
        apiError("INTERNAL_ERROR", "Erro interno do servidor.", { requestId }),
        { status: 500 },
      ),
      requestId,
    );
  }
}
