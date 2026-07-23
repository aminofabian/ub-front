"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { LandingFooter } from "@/components/tenant-console/landing/landing-footer";
import {
  goldCtaClass,
  landingRootStyle,
} from "@/components/tenant-console/landing/landing-styles";
import { APP_ROUTES } from "@/lib/config";

type BlogShellProps = {
  children: React.ReactNode;
};

export function BlogShell({ children }: BlogShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="landing-page relative m-2.5 min-h-[calc(100dvh-1.25rem)] overflow-x-clip rounded-[1.35rem] antialiased shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_48px_-20px_rgba(0,0,0,0.45)] selection:bg-[var(--kiosk-gold-soft)] selection:text-[var(--kiosk-text)] sm:m-[0.85rem] sm:min-h-[calc(100dvh-1.7rem)] sm:rounded-[1.75rem]"
      style={landingRootStyle()}
    >
      <div className="landing-page-canvas" aria-hidden />

      <header className="sticky top-0 z-50 border-b border-[var(--kiosk-border-soft)] bg-[var(--kiosk-nav-blur-bg)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:h-[4.5rem] sm:px-10">
          <div className="flex items-center gap-6">
            <KioskLogo href="/" size="md" variant="landing" plain />
            <nav className="hidden items-center gap-5 sm:flex" aria-label="Blog">
              <Link
                href="/blog"
                className="text-sm font-medium text-[var(--kiosk-text)]"
                aria-current="page"
              >
                Blog
              </Link>
              <Link
                href="/help"
                className="text-sm text-[var(--kiosk-text-muted)] transition-colors hover:text-[var(--kiosk-text)]"
              >
                Help
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
              onClick={() => setMenuOpen((open) => !open)}
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
            aria-label="Blog mobile"
          >
            <Link
              href="/blog"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--kiosk-text)]"
              onClick={() => setMenuOpen(false)}
            >
              Blog
            </Link>
            <Link
              href="/help"
              className="block rounded-lg px-3 py-2.5 text-sm text-[var(--kiosk-text-muted)]"
              onClick={() => setMenuOpen(false)}
            >
              Help
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

      <main className="relative z-10">{children}</main>

      <LandingFooter />
    </div>
  );
}
