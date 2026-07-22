import { fireEvent, render, screen } from "../test/utils";
import { WatchlistProvider } from "../hooks/useWatchlist";
import Navbar from "./Navbar";
import { useNotificationStore } from "../stores/notificationStore";

vi.mock("../hooks/useWebSocketEnhanced", () => ({
  useWebSocket: vi.fn(() => ({
    send: vi.fn(),
    isConnected: true,
    isSubscribed: true,
  })),
}));

function resetNotifications() {
  useNotificationStore.setState(useNotificationStore.getInitialState(), true);
}

describe("Navbar", () => {
  beforeEach(() => {
    resetNotifications();
  });
  it("toggles the mobile navigation panel", () => {
    render(
      <WatchlistProvider>
        <Navbar />
      </WatchlistProvider>
    );

    const trigger = screen.getByRole("button", { name: /open notifications/i });
    fireEvent.click(trigger);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });
});
