/**
 * Liquidity types for the aggregation and depth visualization suite.
 * Covers Phase 1 pairs: USDC/XLM, EURC/XLM, PYUSD/XLM, FOBXX/USDC.
 */

/** Supported DEX venues */
export type LiquidityVenue = "SDEX" | "StellarX" | "Phoenix";

/** Phase 1 trading pairs */
export type TradingPair = "USDC/XLM" | "EURC/XLM" | "PYUSD/XLM" | "FOBXX/USDC";

/** A single order book level (price + cumulative volume) */
export interface OrderBookLevel {
  /** Price in quote asset, 7 decimal precision (Stellar standard) */
  price: number;
  /** Cumulative volume at this price level */
  volume: number;
  /** Source venue */
  venue: LiquidityVenue;
}

/** Aggregated depth data for a pair — bids and asks from all venues */
export interface DepthData {
  pair: TradingPair;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  midPrice: number;
  timestamp: string;
}

/** Per-venue liquidity breakdown */
export interface VenueLiquidity {
  venue: LiquidityVenue;
  totalLiquidity: number;
  bidDepth: number;
  askDepth: number;
  /** Percentage share of total aggregated liquidity */
  share: number;
}

/** Historical liquidity snapshot for trend charts */
export interface LiquiditySnapshot {
  timestamp: string;
  totalLiquidity: number;
  pair: TradingPair;
}

/** Price impact calculation result */
export interface PriceImpactResult {
  tradeSize: number;
  expectedPrice: number;
  slippagePct: number;
  fillableLiquidity: number;
}

/** Shape of data emitted by the liquidity WebSocket channel */
export interface LiquidityWsMessage {
  channel: string;
  pair: TradingPair;
  depth: DepthData;
  venues: VenueLiquidity[];
}

/** State managed by the useLiquidity hook */
export interface LiquidityState {
  depth: DepthData | null;
  venues: VenueLiquidity[];
  history: LiquiditySnapshot[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  data?: {
    sources: unknown[];
  } | null;
  refetch: () => Promise<unknown>;
}
