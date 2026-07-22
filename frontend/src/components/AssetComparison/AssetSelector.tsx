import type { AssetWithHealth } from "../../types";

interface Props {
  assets: AssetWithHealth[];
  selected: string[];
  max: number;
  onToggle: (symbol: string) => void;
  isLoading: boolean;
}

export default function AssetSelector({ assets, selected, max, onToggle, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-8 w-16 bg-stellar-border/30 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-stellar-text-secondary mb-2">
        Select up to {max} assets to compare. {selected.length}/{max} selected.
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Asset selection">
        {assets.map((a) => {
          const isSelected = selected.includes(a.symbol);
          const isDisabled = !isSelected && selected.length >= max;
          return (
            <button
              key={a.symbol}
              type="button"
              onClick={() => onToggle(a.symbol)}
              disabled={isDisabled}
              aria-pressed={isSelected}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-stellar-blue ${
                isSelected
                  ? "bg-stellar-blue text-white"
                  : isDisabled
                    ? "border border-stellar-border text-stellar-text-muted opacity-50 cursor-not-allowed"
                    : "border border-stellar-border text-stellar-text-secondary hover:text-white hover:border-stellar-blue/50"
              }`}
            >
              {a.symbol}
            </button>
          );
        })}
      </div>
    </div>
  );
}
