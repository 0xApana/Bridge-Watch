import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OperationalControlsPanel from "./OperationalControlsPanel";

describe("OperationalControlsPanel", () => {
  it("loads controls and renders an approval queue", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("operations/changes")) return new Response(JSON.stringify({ changes: [{ id: "1", summary: "Rotate provider", environment: "staging", status: "pending", proposedBy: "alice", requiredApprovals: 1, approvals: [], version: 1 }] }));
      if (url.includes("error-catalog")) return new Response(JSON.stringify({ entries: [] }));
      return new Response(JSON.stringify({ policies: [] }));
    });
    render(<OperationalControlsPanel />);
    fireEvent.change(screen.getByLabelText("Admin API key"), { target: { value: "admin-key" } });
    fireEvent.click(screen.getByRole("button", { name: "Load controls" }));
    await waitFor(() => expect(screen.getByText("Rotate provider")).toBeInTheDocument());
  });
});
