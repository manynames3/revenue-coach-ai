import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { test } from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../functions/api/[[path]].ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { onRequest } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
const env = { API_ORIGIN: "https://backend.example.test", PROXY_SECRET: "test-proxy-secret" };

test("the proxy requires explicit server configuration and HTTPS", async () => {
  const request = new Request("https://site.pages.dev/api/auth/me");
  assert.equal((await onRequest({ request, env: {} })).status, 503);
  assert.equal((await onRequest({ request, env: { ...env, API_ORIGIN: "http://unsafe.test" } })).status, 503);
  assert.equal((await onRequest({ request, env: { ...env, API_ORIGIN: "https://site.pages.dev" } })).status, 503);
});

test("only expected headers are forwarded and session cookies remain same-origin", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url.toString(), "https://backend.example.test/auth/login?step=1");
    assert.equal(options.headers.get("cookie"), "revenuecoach_session=test");
    assert.equal(options.headers.get("origin"), "https://site.pages.dev");
    assert.equal(options.headers.get("X-CSRF-Token"), "test-csrf");
    assert.equal(options.headers.get("X-RevenueCoach-Proxy-Secret"), env.PROXY_SECRET);
    assert.equal(options.headers.get("X-RevenueCoach-Client-IP"), "192.0.2.1");
    assert.equal(options.headers.get("authorization"), null);
    assert.equal(options.redirect, "manual");
    return new Response(JSON.stringify({ user: { id: "one" } }), {
      headers: { "Content-Type": "application/json", "Set-Cookie": "revenuecoach_session=new; Path=/; HttpOnly; Secure; SameSite=Lax" },
    });
  };
  try {
    const request = new Request("https://site.pages.dev/api/auth/login?step=1", { method: "POST", body: "{}",
      headers: { "Cookie": "revenuecoach_session=test", "Origin": "https://site.pages.dev", "X-CSRF-Token": "test-csrf",
        "CF-Connecting-IP": "192.0.2.1", "X-RevenueCoach-Proxy-Secret": "forged", "Authorization": "drop-me" } });
    const response = await onRequest({ request, env });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie"), /HttpOnly; Secure; SameSite=Lax/);
    assert.equal(response.headers.get("cache-control"), "no-store");
  } finally { globalThis.fetch = original; }
});

test("a failed upstream is reported without leaking errors or proxy secrets", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("sensitive upstream diagnostics"); };
  try {
    const response = await onRequest({ request: new Request("https://site.pages.dev/api/calls"), env });
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /sensitive|test-proxy-secret/);
  } finally { globalThis.fetch = original; }
});

test("unsupported methods do not reach the upstream", async () => {
  const response = await onRequest({ request: new Request("https://site.pages.dev/api/calls", { method: "PUT" }), env });
  assert.equal(response.status, 405);
});

test("upstream redirects cannot send browser credentials elsewhere", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 307, headers: { Location: "https://elsewhere.example" } });
  try {
    const response = await onRequest({ request: new Request("https://site.pages.dev/api/auth/login"), env });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("location"), null);
  } finally { globalThis.fetch = original; }
});
