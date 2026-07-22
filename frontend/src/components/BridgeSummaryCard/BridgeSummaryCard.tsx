import { Link } from "react-router-dom";
import type { BridgeSummary } from "../../types";
import SkeletonCard from "../Skeleton/SkeletonCard";

interface BridgeSummaryCardProps {
  /** The bridge summary data to display */
  summary?: BridgeSummary;
  /** Card variant: compact (name + status only), standard (with coverage/performance), or detailed (all fields) */
  variant?: "compact" | "standard" | "detailed";
  /** When true, renders the loading skeleton variant */
  isLoading?: boolean;
  /** When true, renders the error variant */
  isError?: boolean;
  /** Optional error message to display in error state */
  error?: string | null;
  /** Optional CSS classes for layout composition */
  className?: string;
  /** Optional test ID for testing */
  "data-testid"?: string;
}

/**
 * Badge component for displaying bridge status with color and text
 */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    healthy: "bg-green-500/20 text-green-400",
    degraded: "bg-yellow-500/20 text-yellow-400",
    down: "bg-red-500/20 text-red-400",
    unknown: "bg-gray-500/20 text-gray-400",
  };

  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.unknown}`}
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
}

/**
 * Format a percentage value with proper aria-label
 */
function PercentageMetric({
  label,
  value,
  unit = "%",
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  const displayValue = `${value.toFixed(1)}${unit}`;
  const ariaLabel = `${label}: ${displayValue}`;

  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-stellar-text-secondary">{label}</span>
      <span
        className="text-sm text-stellar-text-primary font-medium"
        aria-label={ariaLabel}
      >
        {displayValue}
      </span>
    </div>
  );
}

/**
 * Format a numeric value (time, TVL, etc.) with aria-label
 */
function MetricValue({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit: string;
}) {
  const displayValue = typeof value === "number" 
    ? value.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : value;
  const ariaLabel = `${label}: ${displayValue} ${unit}`;

  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-stellar-text-secondary">{label}</span>
      <span
        className="text-sm text-stellar-text-primary font-medium"
        aria-label={ariaLabel}
      >
        {displayValue} {unit}
      </span>
    </div>
  );
}

/**
 * Format TVL value with proper scaling
 */
function formatTVL(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

/**
 * Format timestamp to relative time (e.g., "2 minutes ago")
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Loading skeleton variant of the card
 */
function BridgeSummaryCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <SkeletonCard
      width="100%"
      rows={4}
      showHeader
      className={className}
      ariaLabel="Loading bridge summary"
    />
  );
}

/**
 * Error variant of the card
 */
function BridgeSummaryCardError({
  error,
  className = "",
}: {
  error: string | null | undefined;
  className?: string;
}) {
  return (
    <div
      className={`bg-stellar-card border border-stellar-border rounded-lg p-6 ${className}`}
      role="alert"
      aria-label="Error loading bridge summary"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl" role="img" aria-hidden="true">
          ⚠️
        </span>
        <div>
          <h3 className="text-sm font-semibold text-stellar-text-primary">
            Unable to load bridge summary
          </h3>
          {error && (
            <p className="text-xs text-stellar-text-secondary mt-1">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact variant: shows only bridge name and status
 */
function CompactVariant({ summary }: { summary: BridgeSummary }) {
  return (
    <Link
      to={`/bridges?selected=${encodeURIComponent(summary.name)}`}
      className="block bg-stellar-card border border-stellar-border rounded-lg hover:border-stellar-blue transition-colors focus:outline-none focus:ring-2 focus:ring-stellar-blue p-4"
      aria-label={`View bridge ${summary.name} with status ${summary.status}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-stellar-text-primary truncate">
          {summary.name}
        </h3>
        <StatusBadge status={summary.status} />
      </div>
    </Link>
  );
}

/**
 * Standard variant: shows name, status, coverage, and performance
 */
function StandardVariant({ summary }: { summary: BridgeSummary }) {
  return (
    <Link
      to={`/bridges?selected=${encodeURIComponent(summary.name)}`}
      className="block bg-stellar-card border border-stellar-border rounded-lg hover:border-stellar-blue transition-colors focus:outline-none focus:ring-2 focus:ring-stellar-blue p-6"
      aria-label={`View bridge ${summary.name}`}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-stellar-text-primary truncate">
          {summary.name}
        </h3>
        <StatusBadge status={summary.status} />
      </div>

      {/* Body */}
      <div className="space-y-3 mb-4">
        {/* Coverage Section */}
        <div>
          <div className="text-xs font-medium text-stellar-text-secondary uppercase tracking-wide mb-2">
            Coverage
          </div>
          <PercentageMetric label="Uptime" value={summary.coverage} />
        </div>

        {/* Performance Section */}
        <div>
          <div className="text-xs font-medium text-stellar-text-secondary uppercase tracking-wide mb-2">
            Performance
          </div>
          <MetricValue
            label="Avg Transfer Time"
            value={summary.performance.toFixed(0)}
            unit="ms"
          />
        </div>

        {/* TVL Section */}
        <div>
          <div className="text-xs font-medium text-stellar-text-secondary uppercase tracking-wide mb-2">
            Value
          </div>
          <MetricValue label="TVL" value={formatTVL(summary.totalValueLocked)} unit="" />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-stellar-border pt-3">
        <p className="text-xs text-stellar-text-secondary">
          Updated {formatRelativeTime(summary.lastUpdated)}
        </p>
      </div>
    </Link>
  );
}

/**
 * Detailed variant: shows all available bridge data
 */
function DetailedVariant({ summary }: { summary: BridgeSummary }) {
  return (
    <Link
      to={`/bridges?selected=${encodeURIComponent(summary.name)}`}
      className="block bg-stellar-card border border-stellar-border rounded-lg hover:border-stellar-blue transition-colors focus:outline-none focus:ring-2 focus:ring-stellar-blue p-6"
      aria-label={`View detailed information for bridge ${summary.name}`}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-stellar-text-primary truncate">
          {summary.name}
        </h3>
        <StatusBadge status={summary.status} />
      </div>

      {/* Body */}
      <div className="space-y-4 mb-4">
        {/* Coverage Section */}
        <div>
          <div className="text-xs font-medium text-stellar-text-secondary uppercase tracking-wide mb-2">
            Coverage & Reliability
          </div>
          <div className="space-y-2">
            <PercentageMetric label="Uptime (30d)" value={summary.coverage} />
          </div>
        </div>

        {/* Performance Section */}
        <div>
          <div className="text-xs font-medium text-stellar-text-secondary uppercase tracking-wide mb-2">
            Performance Metrics
          </div>
          <div className="space-y-2">
            <MetricValue
              label="Avg Transfer Time"
              value={summary.performance.toFixed(0)}
              unit="ms"
            />
          </div>
        </div>

        {/* Value & Supply Section */}
        <div>
          <div className="text-xs font-medium text-stellar-text-secondary uppercase tracking-wide mb-2">
            Assets & Liquidity
          </div>
          <div className="space-y-2">
            <MetricValue label="TVL" value={formatTVL(summary.totalValueLocked)} unit="" />
            <MetricValue
              label="Supply (Stellar)"
              value={summary.supplyOnStellar.toLocaleString()}
              unit="units"
            />
            <MetricValue
              label="Supply (Source)"
              value={summary.supplyOnSource.toLocaleString()}
              unit="units"
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-stellar-text-secondary">Mismatch</span>
              <span
                className={`text-sm font-medium ${
                  summary.mismatchPercentage > 1
                    ? "text-red-400"
                    : summary.mismatchPercentage > 0.5
                      ? "text-yellow-400"
                      : "text-green-400"
                }`}
                aria-label={`Supply mismatch: ${summary.mismatchPercentage.toFixed(2)}%`}
              >
                {summary.mismatchPercentage.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-stellar-border pt-3">
        <p className="text-xs text-stellar-text-secondary">
          Updated {formatRelativeTime(summary.lastUpdated)}
        </p>
      </div>
    </Link>
  );
}

/**
 * BridgeSummaryCard component
 *
 * Displays bridge status, coverage, and performance metrics in a card layout.
 * Supports three variants (compact, standard, detailed) and handles loading/error states.
 *
 * @example
 * ```tsx
 * <BridgeSummaryCard
 *   summary={bridgeSummary}
 *   variant="standard"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With loading state
 * <BridgeSummaryCard isLoading />
 * ```
 *
 * @example
 * ```tsx
 * // With error state
 * <BridgeSummaryCard isError error="Failed to load bridge data" />
 * ```
 */
export default function BridgeSummaryCard({
  summary,
  variant = "standard",
  isLoading = false,
  isError = false,
  error = null,
  className = "",
  "data-testid": dataTestId = "bridge-summary-card",
}: BridgeSummaryCardProps) {
  // Loading state
  if (isLoading) {
    return (
      <BridgeSummaryCardSkeleton className={className} />
    );
  }

  // Error state
  if (isError || !summary) {
    return (
      <BridgeSummaryCardError
        error={error || "No bridge data available"}
        className={className}
      />
    );
  }

  // Render variant
  const cardElement = (() => {
    switch (variant) {
      case "compact":
        return <CompactVariant summary={summary} />;
      case "detailed":
        return <DetailedVariant summary={summary} />;
      case "standard":
      default:
        return <StandardVariant summary={summary} />;
    }
  })();

  return (
    <div className={className} data-testid={dataTestId}>
      {cardElement}
    </div>
  );
}
