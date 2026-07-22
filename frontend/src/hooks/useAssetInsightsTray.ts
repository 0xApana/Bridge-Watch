import { useQuery } from "@tanstack/react-query";
import { getAssetHealth, getAssetAlerts, getAssetVolume, getAssetHealthHistory } from "../services/api";

export interface AssetAlert {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  createdAt: string;
}

export function useAssetInsightsTray(symbol: string | null) {
  const enabled = !!symbol;

  const health = useQuery({
    queryKey: ["asset-health", symbol],
    queryFn: () => getAssetHealth(symbol!),
    enabled,
    refetchInterval: 30_000,
  });

  const alerts = useQuery({
    queryKey: ["asset-alerts", symbol],
    queryFn: () => getAssetAlerts(symbol!),
    enabled,
  });

  const volume = useQuery({
    queryKey: ["asset-volume", symbol],
    queryFn: () => getAssetVolume(symbol!),
    enabled,
  });

  const healthHistory = useQuery({
    queryKey: ["asset-health-history", symbol],
    queryFn: () => getAssetHealthHistory(symbol!),
    enabled,
  });

  const recentAlerts: AssetAlert[] = (alerts.data ?? []).slice(0, 5);

  return {
    health: health.data,
    healthLoading: health.isLoading,
    volume: volume.data,
    volumeLoading: volume.isLoading,
    healthHistory: healthHistory.data,
    healthHistoryLoading: healthHistory.isLoading,
    recentAlerts,
    alertsLoading: alerts.isLoading,
  };
}
