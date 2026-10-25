const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:8000");
let csrfToken = "";

export function setCsrfToken(value: string) {
  csrfToken = value;
}

export function apiFetch(path: string, init: RequestInit = {}) {
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const base = new URL(API_URL.replace(/\/$/, "") + "/", origin);
  const url = path.startsWith("http") ? new URL(path) : new URL(path.replace(/^\//, ""), base);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new Error("Invalid API destination.");
  const headers = new Headers(init.headers);
  if (csrfToken && !["GET", "HEAD"].includes((init.method || "GET").toUpperCase())) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  return fetch(url.toString(), { ...init, credentials: "include", headers });
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const detail = typeof data.detail === "string" ? data.detail : "Check the form and try again.";
    throw new Error(detail);
  }
  return response.status === 204 ? undefined as T : response.json();
}

export const jsonBody = (body: unknown, method = "POST"): RequestInit => ({
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

export function callHref(id: string) {
  return "/calls/view?id=" + encodeURIComponent(id);
}

export async function uploadAudio(callId: string, file: File) {
  if (file.size > 100 * 1024 * 1024) throw new Error("Choose an audio file under 100 MB.");
  const parameters = new URLSearchParams({ call_id: callId, file_name: file.name, file_type: file.type });
  const presigned = await api<{ url: string; fields: Record<string, string>; key: string }>(
    "/calls/upload-url?" + parameters.toString(), { method: "POST" });
  const data = new FormData();
  Object.entries(presigned.fields).forEach(([key, value]) => data.append(key, value));
  data.append("file", file);
  const response = await fetch(presigned.url, { method: "POST", body: data });
  if (!response.ok) throw new Error("The audio upload failed. Your call record is saved.");
  return api("/calls/" + encodeURIComponent(callId) + "/transcribe?s3_key=" + encodeURIComponent(presigned.key), { method: "POST" });
}
