import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";
import { Field, inputClass, Notice, primaryClass, PublicHeader } from "./FormUI";
import { api, jsonBody } from "../lib/api";
import { useFragmentToken } from "../lib/useFragmentToken";
import type { SessionUser } from "../types";

export default function AuthForm({ mode }: { mode: "login" | "signup" | "invite" }) {
  const router = useRouter();
  const { establish } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspace, setWorkspace] = useState("");
  const token = useFragmentToken(mode === "invite");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = mode === "login" ? "Welcome back" : mode === "signup" ? "Create your coaching workspace" : "Join your team";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = mode === "login" ? { email, password } : mode === "signup"
        ? { email, password, name, workspace_name: workspace } : { token, name, password };
      const session = await api<{ user: SessionUser; csrf_token: string }>(
        "/auth/" + (mode === "invite" ? "accept-invite" : mode), jsonBody(payload));
      establish(session);
      const next = typeof router.query.next === "string" ? router.query.next : "";
      const destination = /^\/(dashboard|calls\/(new|view)|practice|reps|account|welcome)(?:\?|$)/.test(next) ? next : "/dashboard";
      await router.replace(mode === "login" ? destination : "/welcome");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally { setBusy(false); }
  }
  return <><Head><title>{heading + " | RevenueCoach"}</title><meta name="referrer" content="no-referrer" /></Head>
    <PublicHeader />
    <main className="mx-auto max-w-lg px-5 py-12">
      <p className="text-xs font-semibold uppercase text-[#1684ff]">Private team workspace</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-[#090044]">{heading}</h1>
      <p className="mt-3 text-sm leading-6 text-[#5a5886]">Turn call evidence into focused practice and better sales conversations.</p>
      <form onSubmit={submit} className="mt-7 space-y-5">
        <Notice message={error} />
        {mode !== "login" && <Field label="Your name"><input required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></Field>}
        {mode !== "invite" && <Field label="Work email"><input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} /></Field>}
        {mode === "signup" && <Field label="Team or company name"><input required maxLength={100} autoComplete="organization" value={workspace} onChange={(e) => setWorkspace(e.target.value)} className={inputClass} /></Field>}
        <Field label={mode === "login" ? "Password" : "Password (at least 12 characters)"}><input required type="password" minLength={mode === "login" ? 1 : 12} maxLength={128}
          autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} /></Field>
        {mode === "invite" && !token && <Notice message="Open the full invitation link from your manager." />}
        <button disabled={busy || (mode === "invite" && !token)} className={primaryClass + " w-full"}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {mode === "login" ? "Sign in" : mode === "signup" ? "Create workspace" : "Accept invitation"}
        </button>
      </form>
      <p className="mt-6 text-sm text-[#5a5886]">{mode === "login" ? <Link href="/signup" className="font-semibold text-[#3d42ff]">Create a new workspace</Link> :
        <Link href="/login" className="font-semibold text-[#3d42ff]">Already have an account? Sign in</Link>}</p>
      {mode === "login" && <p className="mt-3 text-sm"><Link href="/reset-password" className="font-semibold text-[#3d42ff]">Forgot password?</Link></p>}
      <p className="mt-4 text-xs leading-5 text-[#5a5886]">By continuing, you agree to use only conversations you have permission to process. <Link href="/privacy" className="underline">Data and privacy</Link></p>
    </main></>;
}
