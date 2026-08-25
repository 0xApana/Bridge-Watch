import { useState, type FormEvent } from "react";
import { previewConfigRollback, type ConfigRollbackPreview as Preview } from "../../services/api";

const environments = ["global", "dev", "staging", "prod-us-east", "prod-eu-west"];

export default function ConfigRollbackPreview() {
  const [environment, setEnvironment] = useState("staging");
  const [key, setKey] = useState("");
  const [revision, setRevision] = useState(1);
  const [apiKey, setApiKey] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const result = await previewConfigRollback(environment, key.trim(), revision, apiKey.trim());
      setPreview(result.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rollback preview failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-stellar-border bg-stellar-card p-6" aria-labelledby="rollback-preview-heading">
      <h2 id="rollback-preview-heading" className="text-lg font-semibold text-stellar-text-primary">
        Config rollback preview
      </h2>
      <p className="mt-1 text-sm text-stellar-text-secondary">
        Compare a historical revision with the active value. Previewing never changes configuration.
      </p>

      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <label className="text-sm text-stellar-text-secondary">
          Environment
          <select className="mt-1 w-full rounded-md border border-stellar-border bg-stellar-dark px-3 py-2 text-white" value={environment} onChange={(event) => setEnvironment(event.target.value)}>
            {environments.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm text-stellar-text-secondary">
          Config key
          <input required className="mt-1 w-full rounded-md border border-stellar-border bg-stellar-dark px-3 py-2 text-white" value={key} onChange={(event) => setKey(event.target.value)} placeholder="RATE_LIMIT_MAX" />
        </label>
        <label className="text-sm text-stellar-text-secondary">
          Target revision
          <input required min={1} type="number" className="mt-1 w-full rounded-md border border-stellar-border bg-stellar-dark px-3 py-2 text-white" value={revision} onChange={(event) => setRevision(Number(event.target.value))} />
        </label>
        <label className="text-sm text-stellar-text-secondary">
          Admin API key
          <input required type="password" autoComplete="off" className="mt-1 w-full rounded-md border border-stellar-border bg-stellar-dark px-3 py-2 text-white" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
        </label>
        <button type="submit" disabled={loading} className="sm:col-span-2 rounded-md bg-stellar-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {loading ? "Generating preview..." : "Generate preview"}
        </button>
      </form>

      {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
      {preview && (
        <div className="mt-5 border-t border-stellar-border pt-4" role="status">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-stellar-text-primary">Revision {preview.currentRevision} to {preview.targetRevision}</p>
            <span className={`text-sm ${preview.validation.valid ? "text-emerald-400" : "text-red-400"}`}>
              {preview.validation.valid ? "Valid rollback target" : "Invalid rollback target"}
            </span>
          </div>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-stellar-text-secondary">Current value</dt><dd className="break-all text-stellar-text-primary">{JSON.stringify(preview.currentValue)}</dd></div>
            <div><dt className="text-stellar-text-secondary">Target value</dt><dd className="break-all text-stellar-text-primary">{JSON.stringify(preview.targetValue)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-stellar-text-secondary">Created by {preview.targetCreatedBy}: {preview.targetChangeReason}</p>
        </div>
      )}
    </section>
  );
}
