import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { Field, inputClass, Notice, primaryClass, PublicHeader } from "../components/FormUI";
import { api, jsonBody } from "../lib/api";
import { useFragmentToken } from "../lib/useFragmentToken";

export default function PasswordRecovery() {
  const token = useFragmentToken();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await api<{ message: string }>("/auth/" + (token ? "reset-password" : "forgot-password"),
        jsonBody(token ? { token, password } : { email }));
      setMessage(result.message); setPassword("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to recover your account."); }
    finally { setBusy(false); }
  }
  return <><Head><title>Recover your account | RevenueCoach</title><meta name="referrer" content="no-referrer" /></Head><PublicHeader />
    <main className="mx-auto max-w-lg space-y-5 px-5 py-12"><h1 className="text-3xl font-bold">{token ? "Set a new password" : "Recover your account"}</h1>
      <Notice message={error} /><Notice success message={message} />
      <form onSubmit={submit} className="space-y-5">
        {token ? <Field label="New password"><input type="password" required minLength={12} maxLength={128} autoComplete="new-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} /></Field> :
          <Field label="Account email"><input type="email" required maxLength={254} autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>}
        <button disabled={busy} className={primaryClass}>{token ? "Update password" : "Request recovery link"}</button>
      </form>
      <Link href="/login" className="inline-block text-sm font-semibold text-[#3d42ff]">Return to sign in</Link>
    </main></>;
}
