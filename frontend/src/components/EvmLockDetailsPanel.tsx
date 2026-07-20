import { useBridgeStats } from "../hooks/useBridges";

interface EvmLockDetailsPanelProps {
  bridgeName: string;
}

const CHAIN_LABELS: Record<string, string> = {
  ethereum: "Ethereum",
  polygon: "Polygon",
  base: "Base",
};

export default function EvmLockDetailsPanel({ bridgeName }: EvmLockDetailsPanelProps) {
  const { data, isLoading } = useBridgeStats(bridgeName);
  const evmLockDetails = data?.evmLockDetails ?? [];

  if (isLoading || evmLockDetails.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="evm-lock-details-heading"
      className="rounded-xl border border-stellar-border bg-stellar-card p-6 space-y-4"
    >
      <div>
        <h2 id="evm-lock-details-heading" className="text-lg font-semibold text-white">
          EVM Lock Details
        </h2>
        <p className="mt-0.5 text-sm text-stellar-text-secondary">
          Live lock contract balances per chain for{" "}
          <span className="font-medium text-white">{bridgeName}</span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">EVM lock contract balances by chain</caption>
          <thead>
            <tr className="text-left text-stellar-text-secondary border-b border-stellar-border">
              <th scope="col" className="pb-3 pr-4">Chain</th>
              <th scope="col" className="pb-3 pr-4">Asset</th>
              <th scope="col" className="pb-3 pr-4">Locked Amount</th>
              <th scope="col" className="pb-3 pr-4">Status</th>
              <th scope="col" className="pb-3">Contract</th>
            </tr>
          </thead>
          <tbody className="text-stellar-text-primary">
            {evmLockDetails.map((detail) => (
              <tr key={`${detail.chain}-${detail.contractAddress}`} className="border-b border-stellar-border/50 last:border-0">
                <td className="py-3 pr-4">{CHAIN_LABELS[detail.chain] ?? detail.chain}</td>
                <td className="py-3 pr-4">{detail.assetSymbol}</td>
                <td className="py-3 pr-4 font-medium">
                  {detail.error ? "—" : Number(detail.lockedAmount).toLocaleString()}
                </td>
                <td className="py-3 pr-4">
                  {detail.error ? (
                    <span className="text-red-400" title={detail.error}>Unavailable</span>
                  ) : detail.isPaused ? (
                    <span className="text-yellow-400">Paused</span>
                  ) : (
                    <span className="text-green-400">Active</span>
                  )}
                </td>
                <td className="py-3 text-xs text-stellar-text-secondary truncate max-w-[10rem]" title={detail.contractAddress}>
                  {detail.contractAddress}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
