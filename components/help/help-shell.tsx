"use client";

import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { LandingFooter } from "@/components/tenant-console/landing/landing-footer";
import {
  goldCtaClass,
  landingRootStyle,
} from "@/components/tenant-console/landing/landing-styles";
import { APP_ROUTES } from "@/lib/config";

type HelpShellProps = {
  children: React.ReactNode;
};

export function HelpShell({ children }: HelpShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem("kiosk.migrationBannerDismissed") === "1") {
        setBannerHidden(true);
      }
    } catch {
      /* storage unavailable — banner shows */
    }
  }, []);

  const dismissBanner = () => {
    setBannerHidden(true);
    try {
      window.localStorage.setItem("kiosk.migrationBannerDismissed", "1");
    } catch {
      /* storage unavailable — fine */
    }
  };

  return (
    <div
      className="landing-page relative m-2.5 min-h-[calc(100dvh-1.25rem)] overflow-x-clip rounded-[1.35rem] antialiased shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_48px_-20px_rgba(0,0,0,0.45)] selection:bg-[var(--kiosk-gold-soft)] selection:text-[var(--kiosk-text)] sm:m-[0.85rem] sm:min-h-[calc(100dvh-1.7rem)] sm:rounded-[1.75rem]"
      style={landingRootStyle()}
    >
      <div className="landing-page-canvas" aria-hidden />

      <header className="sticky top-0 z-50 border-b border-[var(--kiosk-border-soft)] bg-[var(--kiosk-nav-blur-bg)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-4 sm:h-[4.5rem] sm:px-10">
          <div className="flex items-center gap-6">
            <KioskLogo href="/" size="md" variant="landing" plain />
            <nav className="hidden items-center gap-5 sm:flex" aria-label="Help">
              <Link
                href="/help"
                className="text-sm font-medium text-[var(--kiosk-text)]"
                aria-current="page"
              >
                Help
              </Link>
              <Link
                href="/help/merchants"
                className="text-sm text-[var(--kiosk-text-muted)] transition-colors hover:text-[var(--kiosk-text)]"
              >
                Merchants
              </Link>
              <Link
                href="/help/shoppers"
                className="text-sm text-[var(--kiosk-text-muted)] transition-colors hover:text-[var(--kiosk-text)]"
              >
                Shoppers
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={APP_ROUTES.staffLogin}
              className="hidden text-sm text-[var(--kiosk-text-muted)] transition-colors hover:text-[var(--kiosk-text)] sm:inline"
            >
              Sign in
            </Link>
            <Link
              href="/#pricing"
              className={`${goldCtaClass} !px-3.5 !py-2 !text-[13px]`}
            >
              Get started
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--kiosk-border-strong)] text-[var(--kiosk-text)] sm:hidden"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? (
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              )}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav
            className="border-t border-[var(--kiosk-border-soft)] px-4 py-3 sm:hidden"
            aria-label="Help mobile"
          >
            <Link
              href="/help"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--kiosk-text)]"
              onClick={() => setMenuOpen(false)}
            >
              Help home
            </Link>
            <Link
              href="/help/merchants"
              className="block rounded-lg px-3 py-2.5 text-sm text-[var(--kiosk-text-muted)]"
              onClick={() => setMenuOpen(false)}
            >
              Merchants
            </Link>
            <Link
              href="/help/shoppers"
              className="block rounded-lg px-3 py-2.5 text-sm text-[var(--kiosk-text-muted)]"
              onClick={() => setMenuOpen(false)}
            >
              Shoppers
            </Link>
            <Link
              href={APP_ROUTES.staffLogin}
              className="block rounded-lg px-3 py-2.5 text-sm text-[var(--kiosk-text-muted)]"
              onClick={() => setMenuOpen(false)}
            >
              Sign in
            </Link>
          </nav>
        ) : null}
      </header>

      {!bannerHidden ? (
        <div className="relative z-10 border-b border-[#14532d]/20 bg-[#15803d] text-white">
          <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-4 py-2 sm:px-10">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bbf7d0]">
              We moved
            </span>
            <p className="min-w-0 flex-1 truncate text-[13px] text-white/95">
              kiosk.co.ke is now kiosk.ke — your shop has a new address.{" "}
              <Link
                href="/migration"
                className="inline-flex items-center gap-1 font-semibold text-white underline decoration-[#bbf7d0]/60 underline-offset-2 transition hover:decoration-white"
              >
                See what changed
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            </p>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Dismiss migration notice"
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      <main className="relative z-10">{children}</main>

      <LandingFooter />
    </div>
  );
}
