import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { apiError } from "./contracts";

const idFor = (c: Context) => c.req.header("x-request-id") || crypto.randomUUID();
function withId(response: Response, id: string) {
  const headers = new Headers(response.headers); headers.set("x-request-id", id);
  return new Response(response.body, { status: response.status, headers });
}

/** Compatibility boundary: preserves existing success payloads and normalizes errors/request IDs. */
export async function apiBoundary(c: Context, next: Next): Promise<Response | void> {
  const id = idFor(c); c.header("x-request-id", id);
  try { await next(); return withId(c.res, id); }
  catch (error) {
    if (error instanceof HTTPException) {
      const code = error.status === 401 ? "UNAUTHENTICATED" : error.status === 403 ? "FORBIDDEN" : error.status === 404 ? "NOT_FOUND" : error.status === 409 ? "CONFLICT" : "INTERNAL_ERROR";
      return withId(Response.json(apiError(code, error.message, { requestId: id }), { status: error.status }), id);
    }
    console.error("[api-boundary] unhandled error", { requestId: id, error: error instanceof Error ? error.message : String(error) });
    return withId(Response.json(apiError("INTERNAL_ERROR", "Erro interno do servidor.", { requestId: id }), { status: 500 }), id);
  }
}
