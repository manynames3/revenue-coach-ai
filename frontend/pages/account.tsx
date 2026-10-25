import Head from "next/head";
import { useEffect, useState } from "react";
import { Copy, Loader2, Plus, Save, Trash2, UserPlus } from "lucide-react";
import { useAuth } from "../components/AuthContext";
import { Field, inputClass, Notice, primaryClass, secondaryClass } from "../components/FormUI";
import { api, jsonBody } from "../lib/api";
import type { Account, CoachingCategory } from "../types";

type Invite = { id: string; email: string; role: string; expires_at: string };
type Event = { id: string; action: string; created_at: string };
type Tab = "rubric" | "team" | "privacy";

export default function AccountPage() {
  const { user, establish } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [tab, setTab] = useState<Tab>("rubric");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("rep");
  const [inviteLink, setInviteLink] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const editable = user?.role === "manager";
  async function load() {
    setError("");
    try {
      const result = await api<Account>("/account");
      setAccount(result);
      if (editable) {
        const [invitations, audit] = await Promise.all([api<Invite[]>("/auth/invitations"), api<Event[]>("/account/audit")]);
        setInvites(invitations); setEvents(audit);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Settings unavailable."); }
  }
  useEffect(() => { load(); }, [editable]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!account) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const payload = await api<Account>("/account", jsonBody({
        organization_name: account.organization.name, coaching_framework: account.coaching_framework,
        offer_context: account.offer_context, data_retention_days: account.trust_controls.data_retention_days,
        recording_consent_required: account.trust_controls.recording_consent_required,
        pii_redaction_enabled: account.trust_controls.pii_redaction_enabled,
      }, "PATCH"));
      setAccount(payload); setNotice("Settings saved. New scorecards use the current rubric; existing scorecards keep their original version.");
      setEvents(await api<Event[]>("/account/audit"));
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save settings."); }
    finally { setBusy(false); }
  }
  function category(index: number, patch: Partial<CoachingCategory>) {
    if (!account) return;
    setAccount({ ...account, coaching_framework: { ...account.coaching_framework,
      score_categories: account.coaching_framework.score_categories.map((item, n) => n === index ? { ...item, ...patch } : item) } });
  }
  async function invite(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await api<{ url: string }>("/auth/invitations", jsonBody({ email: inviteEmail, role: inviteRole }));
      setInviteLink(result.url); setInviteEmail("");
      setInvites(await api<Invite[]>("/auth/invitations"));
      setNotice("Invitation created. Share this one-time link with the intended teammate.");
    } catch (err) { setError(err instanceof Error ? err.message : "Invitation failed."); }
    finally { setBusy(false); }
  }
  async function updateMember(id: string, active: boolean, role: string) {
    setBusy(true); setError("");
    try { await api("/account/members/" + id, jsonBody({ active, role }, "PATCH")); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Member update failed."); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setError("");
    try { await api("/auth/invitations/" + id, { method: "DELETE" }); setInvites((items) => items.filter((item) => item.id !== id)); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to revoke invitation."); }
    finally { setBusy(false); }
  }
  async function password(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const session = await api<Parameters<typeof establish>[0]>("/auth/password", jsonBody({ current_password: currentPassword, new_password: newPassword }));
      establish(session); setCurrentPassword(""); setNewPassword(""); setNotice("Password updated. Other sessions were signed out.");
    } catch (err) { setError(err instanceof Error ? err.message : "Password update failed."); }
    finally { setBusy(false); }
  }
  if (!account) return <div className="mx-auto max-w-4xl"><Notice message={error} />{error ? <button className={secondaryClass + " mt-4"} onClick={load}>Retry</button> : <p role="status">Loading workspace settings...</p>}</div>;
  const framework = account.coaching_framework;
  return <div className="mx-auto max-w-6xl space-y-6">
    <Head><title>Workspace settings | RevenueCoach</title></Head>
    <header><p className="text-xs font-semibold uppercase text-[#1684ff]">Workspace settings</p>
      <h1 className="mt-2 text-3xl font-bold text-[#090044]">{account.organization.name}</h1>
      <p className="mt-2 text-sm text-[#5a5886]">Rubric version {account.framework_version} · {user?.role === "manager" ? "Manager access" : "Rep access"}</p></header>
    <Notice message={error} /><Notice message={notice} success />
    <div role="tablist" aria-label="Workspace settings" className="flex gap-1 border-b border-[#dfe4ff]">
      {(["rubric", "team", "privacy"] as Tab[]).map((key) => <button key={key} role="tab" aria-selected={tab === key}
        onClick={() => setTab(key)} className={"px-4 py-3 text-sm font-semibold capitalize " + (tab === key ? "border-b-2 border-[#5c67ff] text-[#3d42ff]" : "text-[#5a5886]")}>{key}</button>)}
    </div>
    {tab === "rubric" && <form onSubmit={save} className="space-y-7">
      <fieldset disabled={!editable || busy} className="grid gap-5 sm:grid-cols-2">
        <Field label="Workspace name"><input required maxLength={100} className={inputClass} value={account.organization.name} onChange={(e) => setAccount({ ...account, organization: { ...account.organization, name: e.target.value } })} /></Field>
        <Field label="Rubric name"><input required maxLength={100} className={inputClass} value={framework.name} onChange={(e) => setAccount({ ...account, coaching_framework: { ...framework, name: e.target.value } })} /></Field>
        <Field label="Coaching goals"><textarea rows={3} maxLength={2000} className={inputClass} value={framework.description} onChange={(e) => setAccount({ ...account, coaching_framework: { ...framework, description: e.target.value } })} /></Field>
        <Field label="Coaching principles"><textarea rows={3} className={inputClass} value={framework.principles.join("\n")} onChange={(e) => setAccount({ ...account, coaching_framework: { ...framework, principles: e.target.value.split("\n") } })} /></Field>
        {Object.entries({ offer: "Offer", buyer: "Target buyer", deal_value: "Typical deal value", success_metric: "Pilot success metric" }).map(([key, label]) =>
          <Field key={key} label={label}><textarea rows={2} maxLength={2000} className={inputClass} value={account.offer_context[key] || ""} onChange={(e) => setAccount({ ...account, offer_context: { ...account.offer_context, [key]: e.target.value } })} /></Field>)}
      </fieldset>
      <section><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Scoring categories</h2><p className="mt-1 text-sm text-[#5a5886]">Unobserved categories are excluded from the weighted total and reduce coverage.</p></div>
        {editable && <button type="button" disabled={busy || framework.score_categories.length >= 12} className={secondaryClass} onClick={() => {
          let key = "skill_" + (framework.score_categories.length + 1); while (framework.score_categories.some((item) => item.key === key)) key += "_new";
          setAccount({ ...account, coaching_framework: { ...framework, score_categories: [...framework.score_categories, { key, label: "New category", description: "", weight: 10, low_anchor: "Little or no evidence of the skill.", high_anchor: "Specific, buyer-centered evidence of the skill." }] } });
        }}><Plus className="h-4 w-4" />Add category</button>}
      </div>
      <div className="mt-4 divide-y divide-[#dfe4ff]">
        {framework.score_categories.map((item, index) => <fieldset disabled={!editable || busy} key={index} className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_100px_40px]">
          <Field label="Category"><input required maxLength={80} className={inputClass} value={item.label} onChange={(e) => category(index, { label: e.target.value })} /></Field>
          <Field label="Scoring key"><input required pattern="[a-z][a-z0-9_]{1,39}" className={inputClass} value={item.key} onChange={(e) => category(index, { key: e.target.value })} /></Field>
          <Field label="Weight"><input type="number" required min={1} max={100} className={inputClass} value={item.weight} onChange={(e) => category(index, { weight: Number(e.target.value) })} /></Field>
          <button type="button" title={"Remove " + item.label} aria-label={"Remove " + item.label} disabled={framework.score_categories.length <= 1} className="mt-6 flex h-10 w-10 items-center justify-center text-rose-700 disabled:opacity-40"
            onClick={() => setAccount({ ...account, coaching_framework: { ...framework, score_categories: framework.score_categories.filter((_, n) => n !== index) } })}><Trash2 className="h-4 w-4" /></button>
          <div className="lg:col-span-2"><Field label="Low-score behavior"><textarea required maxLength={500} rows={2} className={inputClass} value={item.low_anchor} onChange={(e) => category(index, { low_anchor: e.target.value })} /></Field></div>
          <div className="lg:col-span-2"><Field label="High-score behavior"><textarea required maxLength={500} rows={2} className={inputClass} value={item.high_anchor} onChange={(e) => category(index, { high_anchor: e.target.value })} /></Field></div>
        </fieldset>)}
      </div></section>
      {editable && <button disabled={busy} className={primaryClass}><Save className="h-4 w-4" />Save rubric and context</button>}
    </form>}
    {tab === "team" && <div className="space-y-8">
      {editable && <form onSubmit={invite} className="grid items-end gap-4 sm:grid-cols-[1fr_180px_auto]">
        <Field label="Teammate email"><input type="email" required className={inputClass} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></Field>
        <Field label="Access"><select className={inputClass} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}><option value="rep">Rep: own calls</option><option value="manager">Manager: team access</option></select></Field>
        <button disabled={busy} className={primaryClass}><UserPlus className="h-4 w-4" />Create invitation</button>
      </form>}
      {inviteLink && <div className="flex flex-wrap items-center gap-3 rounded-md border border-[#dfe4ff] bg-white p-4"><input readOnly aria-label="Invitation link" className={inputClass + " min-w-0 flex-1"} value={inviteLink} />
        <button className={secondaryClass} onClick={() => navigator.clipboard.writeText(inviteLink).then(() => setNotice("Invitation link copied.")).catch(() => setError("Select the invitation link to copy it manually."))}><Copy className="h-4 w-4" />Copy</button></div>}
      <section><h2 className="text-lg font-bold">Team members</h2>
        <div className="mt-4 divide-y divide-[#dfe4ff]">{account.users.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div><p className="font-semibold">{member.name || member.email}</p><p className="mt-1 text-xs text-[#5a5886]">{member.email} · {member.active ? "Active" : "Suspended"}</p></div>
          {editable && member.id !== user?.id ? <div className="flex items-center gap-3"><select aria-label={"Role for " + member.email} className={inputClass + " w-auto"} disabled={busy} value={member.role} onChange={(e) => member.active && updateMember(member.id, member.active, e.target.value)}><option value="rep">Rep</option><option value="manager">Manager</option></select>
            <button disabled={busy} onClick={() => updateMember(member.id, !member.active, member.role)} className={secondaryClass}>{member.active ? "Suspend" : "Restore"}</button></div> : <span className="text-sm capitalize text-[#5a5886]">{member.role}{member.id === user?.id ? " · You" : ""}</span>}
        </div>)}</div>
      </section>
      {editable && invites.length > 0 && <section><h2 className="text-lg font-bold">Pending invitations</h2>
        {invites.map((item) => <div key={item.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe4ff] pb-3"><p className="text-sm">{item.email} · {item.role} · expires {new Date(item.expires_at).toLocaleDateString()}</p>
          <button className={secondaryClass} disabled={busy} onClick={() => revoke(item.id)}>Revoke</button></div>)}</section>}
    </div>}
    {tab === "privacy" && <div className="space-y-8">
      <form onSubmit={save} className="max-w-2xl space-y-5"><h2 className="text-lg font-bold">Conversation data policy</h2>
        <fieldset disabled={!editable || busy} className="space-y-5">
          <Field label="Delete conversations after this many days"><input required type="number" min={1} max={3650} className={inputClass} value={account.trust_controls.data_retention_days} onChange={(e) => setAccount({ ...account, trust_controls: { ...account.trust_controls, data_retention_days: Number(e.target.value) } })} /></Field>
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4" checked={account.trust_controls.recording_consent_required} onChange={(e) => setAccount({ ...account, trust_controls: { ...account.trust_controls, recording_consent_required: e.target.checked } })} /><span className="text-sm leading-6">Require consent confirmation before uploads and analysis.</span></label>
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4" checked={account.trust_controls.pii_redaction_enabled} onChange={(e) => setAccount({ ...account, trust_controls: { ...account.trust_controls, pii_redaction_enabled: e.target.checked } })} /><span className="text-sm leading-6">Redact email addresses, phone numbers, and long account-like numbers from stored transcripts and coaching.</span></label>
          <p className="text-xs leading-6 text-[#5a5886]">Redaction also applies to existing text and cannot restore removed details. Names and every other type of personal information are not automatically detected. Audio is removed after redacted transcription finishes. Retention deletion includes audio and linked coaching.</p>
        </fieldset>
        {editable && <button disabled={busy} className={primaryClass}><Save className="h-4 w-4" />Save data policy</button>}
      </form>
      <form onSubmit={password} className="max-w-2xl space-y-4 border-t border-[#dfe4ff] pt-6"><h2 className="text-lg font-bold">Change your password</h2>
        <Field label="Current password"><input type="password" required maxLength={128} autoComplete="current-password" className={inputClass} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></Field>
        <Field label="New password"><input type="password" required minLength={12} maxLength={128} autoComplete="new-password" className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></Field>
        <button disabled={busy} className={secondaryClass}>Update password</button>
      </form>
      {editable && <section className="border-t border-[#dfe4ff] pt-6"><h2 className="text-lg font-bold">Recent activity</h2>
        <div className="mt-3 divide-y divide-[#dfe4ff]">{events.map((event) => <div key={event.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{event.action.replaceAll("_", " ")}</span><span className="text-xs text-[#5a5886]">{new Date(event.created_at).toLocaleString()}</span></div>)}</div>
      </section>}
    </div>}
  </div>;
}
