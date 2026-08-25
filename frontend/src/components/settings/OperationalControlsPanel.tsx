import { useState, type FormEvent } from "react";

type Change = { id: string; summary: string; environment: string; status: string; proposedBy: string; requiredApprovals: number; approvals: Array<{ approver: string; decision: string }>; version: number };
type ErrorEntry = { code: string; version: number; severity: string; httpStatus: number; messageTemplate: string; remediation: string; retryable: boolean; active: boolean };
type SamplingPolicy = { environment: string; routePattern: string; sampleRate: number; enabled: boolean };

async function request<T>(url: string, apiKey: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", "x-api-key": apiKey, ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status}: ${body.message ?? body.error ?? "Request failed"}`);
  return body as T;
}

export default function OperationalControlsPanel() {
  const [apiKey, setApiKey] = useState("");
  const [environment, setEnvironment] = useState("staging");
  const [changes, setChanges] = useState<Change[]>([]);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [policies, setPolicies] = useState<SamplingPolicy[]>([]);
  const [routePattern, setRoutePattern] = useState("/api/v1/*");
  const [sampleRate, setSampleRate] = useState(1);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [changeResult, errorResult, samplingResult] = await Promise.all([
        request<{ changes: Change[] }>(`/api/v1/operations/changes?environment=${encodeURIComponent(environment)}`, apiKey),
        request<{ entries: ErrorEntry[] }>("/api/v1/admin/error-catalog", apiKey),
        request<{ policies: SamplingPolicy[] }>(`/api/v1/admin/request-sampling?environment=${encodeURIComponent(environment)}`, apiKey),
      ]);
      setChanges(changeResult.changes); setErrors(errorResult.entries); setPolicies(samplingResult.policies); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed to load controls"); }
  }

  async function updateSampling(event: FormEvent) {
    event.preventDefault();
    try {
      await request("/api/v1/admin/request-sampling", apiKey, { method: "PUT", body: JSON.stringify({ environment, routePattern, sampleRate, enabled: true }) });
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed to update sampling"); }
  }

  async function decide(change: Change, decision: "approved" | "rejected") {
    try { await request(`/api/v1/operations/changes/${change.id}/decision`, apiKey, { method: "POST", body: JSON.stringify({ decision, expectedVersion: change.version }) }); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Failed to record decision"); }
  }

  return (
    <section className="rounded-xl border border-stellar-border bg-stellar-card p-6 space-y-6" aria-labelledby="operational-controls-heading">
      <div>
        <h2 id="operational-controls-heading" className="text-lg font-semibold text-stellar-text-primary">Operational controls</h2>
        <p className="mt-1 text-sm text-stellar-text-secondary">Review approved changes, manage structured errors, and tune request sampling. Credentials stay in memory.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-sm text-stellar-text-secondary">Environment<select className="mt-1 w-full rounded border border-stellar-border bg-stellar-dark p-2 text-white" value={environment} onChange={(e) => setEnvironment(e.target.value)}><option>dev</option><option>staging</option><option>production</option></select></label>
        <label className="text-sm text-stellar-text-secondary">Admin API key<input className="mt-1 w-full rounded border border-stellar-border bg-stellar-dark p-2 text-white" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} /></label>
        <button type="button" onClick={() => void load()} className="self-end rounded bg-stellar-blue px-4 py-2 text-sm text-white">Load controls</button>
      </div>
      {message && <p role="alert" className="text-sm text-red-400">{message}</p>}
      <div>
        <h3 className="font-medium text-stellar-text-primary">Pending changes</h3>
        <div className="mt-2 space-y-2">{changes.length === 0 ? <p className="text-sm text-stellar-text-secondary">No changes for this environment.</p> : changes.map((change) => <div key={change.id} className="rounded border border-stellar-border p-3 text-sm"><div className="flex justify-between gap-3"><span className="text-stellar-text-primary">{change.summary}</span><span className="text-stellar-text-secondary">{change.status}</span></div><p className="mt-1 text-xs text-stellar-text-secondary">Proposed by {change.proposedBy}. Approvals: {change.approvals.length}/{change.requiredApprovals}</p>{change.status === "pending" && <div className="mt-2 flex gap-2"><button type="button" onClick={() => void decide(change, "approved")} className="rounded bg-emerald-700 px-3 py-1 text-xs text-white">Approve</button><button type="button" onClick={() => void decide(change, "rejected")} className="rounded bg-red-700 px-3 py-1 text-xs text-white">Reject</button></div>}</div>)}</div>
      </div>
      <form onSubmit={updateSampling} className="border-t border-stellar-border pt-5"><h3 className="font-medium text-stellar-text-primary">Request sampling</h3><div className="mt-2 grid gap-3 sm:grid-cols-[1fr_140px_auto]"><input aria-label="Route pattern" className="rounded border border-stellar-border bg-stellar-dark p-2 text-white" value={routePattern} onChange={(e) => setRoutePattern(e.target.value)} /><input aria-label="Sample rate" type="number" min={0} max={1} step={0.01} className="rounded border border-stellar-border bg-stellar-dark p-2 text-white" value={sampleRate} onChange={(e) => setSampleRate(Number(e.target.value))} /><button className="rounded bg-stellar-blue px-3 py-2 text-sm text-white">Save sampling</button></div><ul className="mt-2 text-xs text-stellar-text-secondary">{policies.map((policy) => <li key={`${policy.environment}:${policy.routePattern}`}>{policy.routePattern}: {policy.sampleRate * 100}%</li>)}</ul></form>
      <div className="border-t border-stellar-border pt-5"><h3 className="font-medium text-stellar-text-primary">Error catalog</h3><ul className="mt-2 grid gap-2 text-sm text-stellar-text-secondary sm:grid-cols-2">{errors.slice(0, 10).map((entry) => <li key={`${entry.code}:${entry.version}`}><code>{entry.code}</code> v{entry.version} {entry.retryable ? "retryable" : "non-retryable"}</li>)}</ul></div>
    </section>
  );
}
