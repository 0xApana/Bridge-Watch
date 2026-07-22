import { useState } from "react";
import { useBridgeHealthTimeline, useBridges } from "../hooks/useBridgeHealthTimeline";
import type { HealthPeriod } from "../hooks/useBridgeHealthTimeline";
import { HealthTimelineChart, AnnotationList } from "../components/BridgeHealthTimeline";

const PERIODS: { id: HealthPeriod; label: string }[] = [
  { id: "24h", label: "24 Hours" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
];

function scoreColor(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Healthy";
  if (score >= 50) return "Warning";
  return "Critical";
}

export default function BridgeHealthTimeline() {
  const { data: bridgesData, isLoading: bridgesLoading } = useBridges();
  const bridges = bridgesData?.bridges ?? [];

  const [selectedBridge, setSelectedBridge] = useState<string>("");
  const [period, setPeriod] = useState<HealthPeriod>("7d");

  const effectiveBridge = selectedBridge || bridges[0]?.name || "";

  const { points, isLoading, isMockData } = useBridgeHealthTimeline(
    effectiveBridge,
    period
  );

  const latest = points[points.length - 1];
  const earliest = points[0];
  const avg = points.length
    ? Math.round(points.reduce((sum, p) => sum + p.score, 0) / points.length)
    : null;
  const minScore = points.length ? Math.min(...points.map((p) => p.score)) : null;
  const maxScore = points.length ? Math.max(...points.map((p) => p.score)) : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Bridge Health Timeline</h1>
        <p className="mt-2 text-stellar-text-secondary">
          Track health score progression for any bridge over a selected time period.
        </p>
      </header>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <label
            htmlFor="bridge-select"
            className="block text-sm font-medium text-stellar-text-secondary mb-1"
          >
            Bridge
          </label>
          <select
            id="bridge-select"
            value={selectedBridge || effectiveBridge}
            onChange={(e) => setSelectedBridge(e.target.value)}
            disabled={bridgesLoading}
            className="w-full rounded-lg border border-stellar-border bg-stellar-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-stellar-blue disabled:opacity-50"
          >
            {bridgesLoading && (
              <option value="">Loading bridges…</option>
            )}
            {bridges.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
            {!bridgesLoading && bridges.length === 0 && (
              <option value="demo-bridge">Demo Bridge</option>
            )}
          </select>
        </div>

        <div>
          <p className="text-sm font-medium text-stellar-text-secondary mb-1">Time Period</p>
          <div className="flex gap-1" role="group" aria-label="Time period">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                aria-pressed={period === p.id}
                className={`rounded px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-stellar-blue ${
                  period === p.id
                    ? "bg-stellar-blue text-white"
                    : "border border-stellar-border text-stellar-text-secondary hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {points.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Current Score",
              value: latest?.score ?? "—",
              colorFn: (v: number) => scoreColor(v),
              sub: latest ? scoreLabel(latest.score) : "",
            },
            { label: "Average Score", value: avg ?? "—", colorFn: scoreColor, sub: "over period" },
            { label: "Lowest", value: minScore ?? "—", colorFn: scoreColor, sub: "minimum" },
            { label: "Highest", value: maxScore ?? "—", colorFn: scoreColor, sub: "maximum" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-stellar-card border border-stellar-border rounded-lg p-4"
            >
              <p className="text-xs text-stellar-text-secondary uppercase tracking-wide">{stat.label}</p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  typeof stat.value === "number" ? stat.colorFn(stat.value) : "text-white"
                }`}
              >
                {stat.value}
              </p>
              {stat.sub && (
                <p className="text-xs text-stellar-text-secondary mt-0.5">{stat.sub}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-stellar-card border border-stellar-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {effectiveBridge || "Select a bridge"}
            </h2>
            <p className="text-xs text-stellar-text-secondary mt-0.5">
              Health score · {period} period
              {earliest && latest
                ? ` · ${new Date(earliest.timestamp).toLocaleDateString()} – ${new Date(
                    latest.timestamp
                  ).toLocaleDateString()}`
                : ""}
            </p>
          </div>

          {isMockData && (
            <span className="text-xs text-stellar-text-muted border border-stellar-border rounded px-2 py-1">
              Demo data
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="h-[300px] bg-stellar-border/20 rounded animate-pulse" />
        ) : (
          <HealthTimelineChart
            points={points}
            period={period}
            bridgeName={effectiveBridge}
            isMockData={isMockData}
          />
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-stellar-border text-xs text-stellar-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-green-400 block rounded" />
            Healthy ≥ 80
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-yellow-400 block rounded" />
            Warning 50–79
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-red-400 block rounded" />
            Critical &lt; 50
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500 block" />
            Annotation marker
          </span>
        </div>
      </div>

      {/* Annotations panel */}
      <div className="bg-stellar-card border border-stellar-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Health Change Events</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-stellar-border/20 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <AnnotationList points={points} />
        )}
      </div>
    </div>
  );
}
