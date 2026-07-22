import { useQuery } from "@tanstack/react-query";
import {
  getFreshnessSnapshot,
  getFreshnessSource,
  getFreshnessSourceTrend,
  getFreshnessAlerts,
} from "../services/api";

type QueryRefreshOptions = {
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
};

export function useFreshnessSnapshot(options?: QueryRefreshOptions) {
  return useQuery({
    queryKey: ["freshness"],
    queryFn: () => getFreshnessSnapshot(),
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
  });
}

export function useFreshnessSource(source: string, options?: QueryRefreshOptions) {
  return useQuery({
    queryKey: ["freshness-source", source],
    queryFn: () => getFreshnessSource(source),
    enabled: !!source,
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
  });
}

export function useFreshnessSourceTrend(source: string, options?: QueryRefreshOptions) {
  return useQuery({
    queryKey: ["freshness-trend", source],
    queryFn: () => getFreshnessSourceTrend(source),
    enabled: !!source,
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
  });
}

export function useFreshnessAlerts() {
  return useQuery({
    queryKey: ["freshness-alerts"],
    queryFn: getFreshnessAlerts,
  });
}
