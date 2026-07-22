import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useNotificationLiveUpdates } from "../hooks/useNotificationLiveUpdates";
import { useWatchlist } from "../hooks/useWatchlist";
import { selectUnreadCount, useNotificationStore } from "../stores/notificationStore";
import EntitySwitcher from "./EntitySwitcher";
import HamburgerButton from "./MobileNav/HamburgerButton";
import MobileMenu from "./MobileNav/MobileMenu";
import { isNavItemActive } from "./MobileNav/navigation";
import { useTranslatedDesktopNavItems } from "../hooks/useTranslatedNav";
import NotificationsDrawer from "./NotificationsDrawer";
import GlobalSearch from "./search/GlobalSearch";
import UnreadCountBadge from "./UnreadCountBadge";

export default function Navbar() {
  const location = useLocation();
  const desktopNavItems = useTranslatedDesktopNavItems();
  const { activeSymbols } = useWatchlist();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const notificationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previousDrawerOpen = useRef(false);
  const unreadCount = useNotificationStore(selectUnreadCount);

  useNotificationLiveUpdates();

  useEffect(() => {
    if (previousDrawerOpen.current && !isNotificationsOpen) {
      notificationTriggerRef.current?.focus();
    }
    previousDrawerOpen.current = isNotificationsOpen;
  }, [isNotificationsOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav className="border-b border-stellar-border bg-stellar-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-6">
              <Link to="/dashboard" className="shrink-0 text-xl font-bold text-white">
                Bridge Watch
              </Link>

              <div className="hidden items-center gap-1 xl:flex" aria-label="Primary navigation">
                {desktopNavItems.slice(0, 8).map((item) => {
                  const active = isNavItemActive(location.pathname, item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-stellar-blue/20 text-white"
                          : "text-stellar-text-secondary hover:bg-stellar-dark hover:text-white"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:block">
                <GlobalSearch />
              </div>
              <div className="hidden md:block">
                <EntitySwitcher />
              </div>
              <button
                type="button"
                className="hidden rounded-md px-2 py-1 text-sm text-stellar-text-secondary hover:bg-stellar-dark hover:text-white lg:inline-flex"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("bridgewatch:open-shortcuts"))
                }
                aria-label="Keyboard shortcuts"
              >
                ?
              </button>
              <div className="hidden items-center gap-2 text-xs text-stellar-text-secondary lg:flex">
                <span>Quick:</span>
                {activeSymbols.length === 0 ? (
                  <span>No watchlist assets</span>
                ) : (
                  activeSymbols.slice(0, 3).map((symbol) => (
                    <Link
                      key={symbol}
                      to={`/assets/${symbol}`}
                      className="rounded border border-stellar-border px-2 py-1 hover:text-white"
                    >
                      {symbol}
                    </Link>
                  ))
                )}
              </div>

              <button
                ref={notificationTriggerRef}
                type="button"
                onClick={() => setIsNotificationsOpen((open) => !open)}
                className={`relative rounded-full p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-stellar-blue ${
                  isNotificationsOpen
                    ? "bg-stellar-blue/20 text-white"
                    : "text-stellar-text-secondary hover:text-white"
                }`}
                aria-label={
                  isNotificationsOpen
                    ? "Close notifications"
                    : `Open notifications (${unreadCount} unread)`
                }
                aria-expanded={isNotificationsOpen}
                aria-controls="notifications-drawer"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <UnreadCountBadge unreadCount={unreadCount} />
              </button>

              <HamburgerButton
                open={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen((open) => !open)}
              />
            </div>
          </div>
        </div>
      </nav>

      <NotificationsDrawer
        open={isNotificationsOpen}
        drawerId="notifications-drawer"
        onClose={() => setIsNotificationsOpen(false)}
      />
      <MobileMenu
        open={isMobileMenuOpen}
        pathname={location.pathname}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
