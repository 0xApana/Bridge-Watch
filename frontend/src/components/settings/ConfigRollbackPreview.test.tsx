import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConfigRollbackPreview from "./ConfigRollbackPreview";

describe("ConfigRollbackPreview", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders a successful rollback comparison", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      preview: {
        environment: "staging",
        key: "RATE_LIMIT_MAX",
        currentRevision: 3,
        targetRevision: 1,
        changed: true,
        sensitive: false,
        currentValue: 250,
        targetValue: 100,
        targetCreatedAt: "2026-01-01T00:00:00.000Z",
        targetCreatedBy: "ops",
        targetChangeReason: "baseline",
        validation: { valid: true },
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<ConfigRollbackPreview />);
    fireEvent.change(screen.getByLabelText("Config key"), { target: { value: "RATE_LIMIT_MAX" } });
    fireEvent.change(screen.getByLabelText("Admin API key"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate preview" }));

    await waitFor(() => expect(screen.getByText("Revision 3 to 1")).toBeInTheDocument());
    expect(screen.getByText("Valid rollback target")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/configs/staging/RATE_LIMIT_MAX/rollback-preview",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("surfaces authorization failures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, statusText: "Forbidden", headers: { "Content-Type": "application/json" } }
    ));

    render(<ConfigRollbackPreview />);
    fireEvent.change(screen.getByLabelText("Config key"), { target: { value: "RATE_LIMIT_MAX" } });
    fireEvent.change(screen.getByLabelText("Admin API key"), { target: { value: "invalid" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate preview" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("403 Forbidden");
  });
});
