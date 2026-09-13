interface Env {
  ASSETS: Fetcher;
  API_ORIGIN: string;
}

function buildApiRequest(request: Request, apiOrigin: string): Request {
  const incoming = new URL(request.url);
  const origin = new URL(apiOrigin);
  const target = new URL(incoming.pathname + incoming.search, origin);
  const headers = new Headers(request.headers);

  // The API still runs on the existing production origin. Rewrite origin-related
  // headers so backend origin/CSRF checks see the origin they were configured for.
  headers.set("origin", origin.origin);
  headers.set("referer", `${origin.origin}${incoming.pathname}`);
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));

  return new Request(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return fetch(buildApiRequest(request, env.API_ORIGIN));
    }

    return env.ASSETS.fetch(request);
  },
};
