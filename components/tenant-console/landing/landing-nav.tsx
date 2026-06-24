"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { goldCtaClass } from "./landing-styles";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#stories", label: "Stories" },
] as const;

type LandingNavProps = {
  onCreateShop: () => void;
};

export function LandingNav({ onCreateShop }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleCreateShop = () => {
    closeMenu();
    onCreateShop();
  };

  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between px-4 transition-all duration-300 sm:h-[4.5rem] sm:px-10",
          scrolled || menuOpen
            ? "border-b border-[var(--kiosk-border-soft)] bg-[var(--kiosk-nav-blur-bg)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <KioskLogo href="/" size="lg" variant="landing" plain />

        <div className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-normal tracking-[0.01em] text-[var(--kiosk-text-muted)] transition-colors duration-200 hover:text-[var(--kiosk-text)]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={APP_ROUTES.login}
            className="hidden text-sm font-normal tracking-[0.01em] text-[var(--kiosk-text-muted)] transition-colors duration-200 hover:text-[var(--kiosk-text)] sm:inline"
          >
            Sign in
          </Link>
          <button
            type="button"
            className={`${goldCtaClass} hidden !px-3.5 !py-2 !text-[13px] md:inline-flex sm:!px-4`}
            onClick={onCreateShop}
          >
            Get started
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--kiosk-border-strong)] text-[var(--kiosk-text)] transition-colors hover:bg-[var(--kiosk-ghost-hover-bg)] md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? (
              <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            )}
          </button>
        </div>
      </nav>

      <div
        id="landing-mobile-menu"
        className={cn(
          "fixed inset-0 z-40 flex flex-col bg-[var(--kiosk-bg)] pt-16 transition-opacity duration-300 md:hidden",
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        aria-hidden={!menuOpen}
      >
        <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-8 pt-4">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-3.5 text-base font-medium text-[var(--kiosk-text)] transition-colors hover:bg-[var(--kiosk-card-bg)]"
                onClick={closeMenu}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="mt-6 flex flex-col gap-3 border-t border-[var(--kiosk-border-soft)] pt-6">
            <Link
              href={APP_ROUTES.login}
              className="rounded-lg px-3 py-3.5 text-center text-base font-medium text-[var(--kiosk-text-muted)] transition-colors hover:bg-[var(--kiosk-card-bg)] hover:text-[var(--kiosk-text)]"
              onClick={closeMenu}
            >
              Sign in
            </Link>
            <button
              type="button"
              className={`${goldCtaClass} w-full justify-center`}
              onClick={handleCreateShop}
            >
              Get started
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
