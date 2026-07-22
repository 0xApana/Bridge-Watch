import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import FreshnessMonitoring from "./FreshnessMonitoring";

vi.mock("../hooks/useFreshness", () => ({
  useFreshnessSnapshot: () => ({
    data: {
      sources: [
        {
          key: "stellar-horizon",
          label: "Stellar Horizon",
          status: "fresh",
          lastUpdated: new Date(Date.now() - 5000).toISOString(),
          expectedIntervalMs: 30000,
          trend: "stable",
        },
        {
          key: "circle-usdc",
          label: "Circle USDC",
          status: "stale",
          lastUpdated: new Date(Date.now() - 600000).toISOString(),
          expectedIntervalMs: 60000,
          trend: "degrading",
        },
      ],
      staleSources: 1,
      freshSources: 1,
      timestamp: new Date().toISOString(),
    },
    isLoading: false,
    refetch: vi.fn(),
  }),
  useFreshnessAlerts: () => ({
    data: {
      alerts: [
        {
          source: "circle-usdc",
          label: "Circle USDC",
          severity: "warning",
          message: "No update in 10 minutes",
          since: new Date().toISOString(),
        },
      ],
      timestamp: new Date().toISOString(),
    },
  }),
}));

vi.mock("../hooks/useRefreshControls", () => ({
  useRefreshControls: () => ({
    preferences: {
      autoRefreshEnabled: false,
      refreshIntervalMs: 30000,
      refreshOnFocus: false,
      selectedTargetIds: [],
    },
    setAutoRefreshEnabled: vi.fn(),
    setRefreshIntervalMs: vi.fn(),
    setRefreshOnFocus: vi.fn(),
    setSelectedTargetIds: vi.fn(),
    refreshNow: vi.fn(),
    cancelRefresh: vi.fn(),
    isRefreshing: false,
    lastUpdatedAt: null,
  }),
}));

vi.mock("../components/RefreshControls", () => ({
  default: () => null,
}));

describe("FreshnessMonitoring", () => {
  function renderPage() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FreshnessMonitoring />
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  it("renders the page heading", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Data Freshness" })).toBeInTheDocument();
  });

  it("shows the summary counts", () => {
    renderPage();
    expect(screen.getByText("Total Sources")).toBeInTheDocument();
    expect(screen.getAllByText("Fresh").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Stale").length).toBeGreaterThanOrEqual(1);
  });

  it("renders a row for each data source", () => {
    renderPage();
    expect(screen.getByText("Stellar Horizon")).toBeInTheDocument();
    expect(screen.getByText("Circle USDC")).toBeInTheDocument();
  });

  it("shows a Stale badge for the stale source", () => {
    renderPage();
    const staleElements = screen.getAllByText("Stale");
    expect(staleElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows a Fresh badge for the fresh source", () => {
    renderPage();
    const freshElements = screen.getAllByText("Fresh");
    expect(freshElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders freshness alerts when present", () => {
    renderPage();
    expect(screen.getByText(/Freshness Alerts/)).toBeInTheDocument();
    expect(screen.getByText(/No update in 10 minutes/)).toBeInTheDocument();
  });
});
