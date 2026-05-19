import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import type { Account, CoachingCategory } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function categoriesToText(categories: CoachingCategory[]) {
  return categories
    .map((category) => `${category.key} | ${category.label} | ${category.weight} | ${category.description}`)
    .join("\n");
}

function parseCategories(value: string): CoachingCategory[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [key = "", label = "", weight = "10", description = ""] = line.split("|").map((part) => part.trim());
      const parsedWeight = Number.parseInt(weight, 10);
      return {
        key,
        label: label || key,
        weight: Number.isFinite(parsedWeight) ? parsedWeight : 10,
        description,
      };
    })
    .filter((category) => category.key && category.label);
}

function ReadinessItem({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#dfe4ff] bg-white p-4">
      <span className="text-sm font-bold text-[#312f61]">{label}</span>
      <span className={`text-sm font-black ${ready ? "text-emerald-700" : "text-amber-700"}`}>
        {ready ? "Ready" : "Needs work"}
      </span>
    </div>
  );
}

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [frameworkName, setFrameworkName] = useState("");
  const [frameworkDescription, setFrameworkDescription] = useState("");
  const [principlesText, setPrinciplesText] = useState("");
  const [categoriesText, setCategoriesText] = useState("");
  const [dataRetentionDays, setDataRetentionDays] = useState(90);
  const [recordingConsentRequired, setRecordingConsentRequired] = useState(true);
  const [piiRedactionEnabled, setPiiRedactionEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadAccount = async () => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/account`);
      if (!response.ok) throw new Error("Account settings could not be loaded.");
      const payload: Account = await response.json();
      setAccount(payload);
      setOrganizationName(payload.organization.name);
      setFrameworkName(payload.coaching_framework.name);
      setFrameworkDescription(payload.coaching_framework.description);
      setPrinciplesText(payload.coaching_framework.principles.join("\n"));
      setCategoriesText(categoriesToText(payload.coaching_framework.score_categories));
      setDataRetentionDays(payload.trust_controls.data_retention_days);
      setRecordingConsentRequired(payload.trust_controls.recording_consent_required);
      setPiiRedactionEnabled(payload.trust_controls.pii_redaction_enabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load account settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccount();
  }, []);

  const parsedCategories = useMemo(() => parseCategories(categoriesText), [categoriesText]);

  const saveAccount = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/account`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_name: organizationName,
          coaching_framework: {
            name: frameworkName,
            description: frameworkDescription,
            principles: principlesText
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
            score_categories: parsedCategories,
          },
          data_retention_days: dataRetentionDays,
          recording_consent_required: recordingConsentRequired,
          pii_redaction_enabled: piiRedactionEnabled,
        }),
      });
      if (!response.ok) throw new Error("Account settings could not be saved.");
      const payload: Account = await response.json();
      setAccount(payload);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save account settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-28 animate-pulse rounded-lg bg-white" />
        <div className="h-96 animate-pulse rounded-lg bg-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase text-[#1684ff]">Workspace settings</p>
          <h1 className="mt-1 text-3xl font-black text-[#090044]">Account, framework, and trust controls</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4c4a7d]">
            Configure the coaching rubric that shapes new analyses and show the controls a buyer expects before
            uploading real sales conversations.
          </p>
        </div>
        <button
          onClick={saveAccount}
          disabled={saving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#090044] px-4 text-sm font-bold text-white hover:bg-[#1b1670] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          Save settings
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" aria-hidden="true" />
            <p className="text-sm font-semibold text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden="true" />
            <p className="text-sm font-semibold text-emerald-800">Settings saved. New scorecards will use this framework.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-lg border border-[#dfe4ff] bg-white p-5 shadow-[0_12px_30px_rgba(9,0,68,0.04)]">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eef1ff] text-[#5c67ff]">
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black text-[#090044]">Coaching framework</h2>
              <p className="text-sm text-[#5a5886]">This rubric is injected into the analysis prompt for new calls.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-black text-[#312f61]">Workspace name</span>
              <input
                className="h-11 w-full rounded-md border border-[#cbd2f7] px-3 text-sm text-[#090044]"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black text-[#312f61]">Framework name</span>
              <input
                className="h-11 w-full rounded-md border border-[#cbd2f7] px-3 text-sm text-[#090044]"
                value={frameworkName}
                onChange={(event) => setFrameworkName(event.target.value)}
              />
            </label>
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-black text-[#312f61]">Description</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-[#cbd2f7] px-3 py-3 text-sm leading-6 text-[#090044]"
                value={frameworkDescription}
                onChange={(event) => setFrameworkDescription(event.target.value)}
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black text-[#312f61]">Principles</span>
              <textarea
                className="min-h-56 w-full rounded-md border border-[#cbd2f7] px-3 py-3 text-sm leading-6 text-[#090044]"
                value={principlesText}
                onChange={(event) => setPrinciplesText(event.target.value)}
                placeholder="One principle per line"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black text-[#312f61]">Score categories</span>
              <textarea
                className="min-h-56 w-full rounded-md border border-[#cbd2f7] px-3 py-3 font-mono text-xs leading-6 text-[#090044]"
                value={categoriesText}
                onChange={(event) => setCategoriesText(event.target.value)}
                placeholder="key | label | weight | description"
              />
              <span className="mt-2 block text-xs leading-5 text-[#5a5886]">
                Format: key | label | weight | description
              </span>
            </label>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-[#dfe4ff] bg-white p-5 shadow-[0_12px_30px_rgba(9,0,68,0.04)]">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eef1ff] text-[#5c67ff]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-black text-[#090044]">Trust controls</h2>
                <p className="text-sm text-[#5a5886]">Visible policy settings for pilot customers.</p>
              </div>
            </div>
            <div className="space-y-4">
              <label>
                <span className="mb-2 block text-sm font-black text-[#312f61]">Data retention days</span>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  className="h-11 w-full rounded-md border border-[#cbd2f7] px-3 text-sm text-[#090044]"
                  value={dataRetentionDays}
                  onChange={(event) => setDataRetentionDays(Number.parseInt(event.target.value, 10) || 90)}
                />
              </label>
              <label className="flex gap-3 rounded-lg border border-[#dfe4ff] bg-[#fbfcff] p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-[#cbd2f7]"
                  checked={recordingConsentRequired}
                  onChange={(event) => setRecordingConsentRequired(event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-black text-[#090044]">Require call consent confirmation</span>
                  <span className="mt-1 block text-sm leading-6 text-[#5a5886]">New call intake asks managers to confirm upload permission.</span>
                </span>
              </label>
              <label className="flex gap-3 rounded-lg border border-[#dfe4ff] bg-[#fbfcff] p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-[#cbd2f7]"
                  checked={piiRedactionEnabled}
                  onChange={(event) => setPiiRedactionEnabled(event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-black text-[#090044]">Mark PII redaction required</span>
                  <span className="mt-1 block text-sm leading-6 text-[#5a5886]">
                    Flags the workspace as requiring redaction review before broad sharing.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe4ff] bg-white p-5 shadow-[0_12px_30px_rgba(9,0,68,0.04)]">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eef1ff] text-[#5c67ff]">
                <Users className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-black text-[#090044]">Team basics</h2>
                <p className="text-sm text-[#5a5886]">Visible account model for pilot review.</p>
              </div>
            </div>
            <div className="space-y-3">
              <ReadinessItem label={`${account?.users.length || 0} manager seat`} ready={Boolean(account?.users.length)} />
              <ReadinessItem label={`${account?.reps.length || 0} rep profiles`} ready={Boolean(account?.reps.length)} />
              <ReadinessItem label="Audio upload deletion path" ready={Boolean(account?.trust_controls.delete_call_removes_audio_artifacts)} />
              <ReadinessItem
                label="Production authentication mode"
                ready={Boolean(account && account.trust_controls.auth_mode !== "demo_workspace")}
              />
            </div>
            <p className="mt-4 text-xs leading-5 text-[#5a5886]">
              This demo surfaces the account model, but production auth and billing still need to be wired before paid self-serve use.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
