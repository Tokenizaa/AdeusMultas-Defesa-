export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Proxy /api/* to backend
    if (url.pathname.startsWith("/api/")) {
      const backendUrl = new URL("https://www.defesai.shop");
      backendUrl.pathname = url.pathname;
      backendUrl.search = url.search;

      const proxyRequest = new Request(backendUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: request.redirect,
      });

      try {
        const proxyResponse = await fetch(proxyRequest);
        return new Response(proxyResponse.body, {
          status: proxyResponse.status,
          statusText: proxyResponse.statusText,
          headers: proxyResponse.headers,
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Backend unavailable", detail: String(err) }),
          {
            status: 502,
            headers: { "content-type": "application/json" },
          },
        );
      }
    }

    // Serve static assets
    return env.ASSETS.fetch(request);
  },
};
