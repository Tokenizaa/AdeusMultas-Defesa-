export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy do 9Router: /_9router/v1/* -> NINEROUTER_UPSTREAM/v1/*
    if (url.pathname.startsWith("/_9router/v1/")) {
      const upstream = new URL(env.NINEROUTER_UPSTREAM);
      upstream.pathname = url.pathname.replace("/_9router", "");
      upstream.search = url.search;

      const proxyRequest = new Request(upstream.toString(), {
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
          JSON.stringify({ error: "NINEROUTER_UPSTREAM unavailable", detail: String(err) }),
          {
            status: 502,
            headers: { "content-type": "application/json" },
          },
        );
      }
    }

    return new Response("DefesAI Worker", { status: 200 });
  },
};
