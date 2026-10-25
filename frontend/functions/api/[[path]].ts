interface ProxyContext {
  request: Request;
  env: { API_ORIGIN?: string; PROXY_SECRET?: string };
}

export async function onRequest({ request, env }: ProxyContext): Promise<Response> {
  const unavailable = () => Response.json({ detail: "The workspace API is not configured or is unavailable." },
    { status: 503, headers: { "Cache-Control": "no-store" } });
  if (!env.API_ORIGIN || !env.PROXY_SECRET) return unavailable();
  const incoming = new URL(request.url);
  let upstream: URL;
  try { upstream = new URL(env.API_ORIGIN); } catch { return unavailable(); }
  if (upstream.protocol !== "https:" || upstream.origin === incoming.origin || upstream.username || upstream.password) return unavailable();
  if (!["GET", "POST", "PATCH", "DELETE", "OPTIONS"].includes(request.method)) {
    return new Response(null, { status: 405, headers: { Allow: "GET, POST, PATCH, DELETE, OPTIONS" } });
  }
  upstream.pathname = upstream.pathname.replace(/\/$/, "") + incoming.pathname.replace(/^\/api(?=\/|$)/, "");
  upstream.search = incoming.search;
  const headers = new Headers();
  for (const name of ["Accept", "Content-Type", "Cookie", "Origin", "X-CSRF-Token"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("X-RevenueCoach-Proxy-Secret", env.PROXY_SECRET);
  headers.set("X-RevenueCoach-Client-IP", request.headers.get("CF-Connecting-IP") || "");
  try {
    const response = await fetch(upstream, { method: request.method, headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual", signal: AbortSignal.timeout(30000) });
    if (response.status >= 300 && response.status < 400) return unavailable();
    const outgoing = new Headers(response.headers);
    outgoing.set("Cache-Control", "no-store");
    outgoing.set("X-Content-Type-Options", "nosniff");
    outgoing.set("Referrer-Policy", "no-referrer");
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch { return unavailable(); }
}
