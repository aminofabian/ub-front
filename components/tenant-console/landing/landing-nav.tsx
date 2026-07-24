"use client";

import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", label: "Features", code: "01" },
  { href: "#how", label: "How it works", code: "02" },
  { href: "#pricing", label: "Pricing", code: "03" },
  { href: "#stories", label: "Stories", code: "04" },
  { href: "/blog", label: "Blog", code: "05" },
] as const;

type LandingNavProps = {
  onCreateShop: () => void;
  onFindShop: () => void;
};

export function LandingNav({ onCreateShop, onFindShop }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
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
          "landing-nav landing-nav--app sticky top-0 z-50 transition-colors duration-300",
          scrolled || menuOpen ? "landing-nav--solid" : "landing-nav--clear",
        )}
      >
        <div className="landing-nav-inner">
          <div className="landing-nav-brand">
            <KioskLogo
              href="/"
              size="sm"
              variant="landing"
              plain
              className="landing-nav-logo landing-nav-logo--mobile md:hidden"
            />
            <KioskLogo
              href="/"
              size="lg"
              variant="landing"
              plain
              className="landing-nav-logo landing-nav-logo--desktop hidden md:inline-flex"
            />
          </div>

          <div className="landing-nav-links hidden md:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="landing-nav-link">
                <span className="landing-nav-link-code" aria-hidden>
                  {link.code}
                </span>
                <span className="landing-nav-link-label">{link.label}</span>
              </a>
            ))}
          </div>

          <div className="landing-nav-actions">
            <div className="landing-nav-capsule md:hidden" role="group">
              <button
                type="button"
                className="landing-nav-capsule-btn"
                onClick={onFindShop}
                aria-label="Find shop"
              >
                <Search className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
              <span className="landing-nav-capsule-rule" aria-hidden />
              <button
                type="button"
                className="landing-nav-capsule-btn landing-nav-capsule-btn--menu"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="landing-mobile-menu"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
              >
                {menuOpen ? (
                  <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                ) : (
                  <Menu className="h-4 w-4" strokeWidth={2} aria-hidden />
                )}
              </button>
            </div>

            <button
              type="button"
              className="landing-nav-ticket landing-nav-ticket--ghost landing-nav-ticket--desktop"
              onClick={onFindShop}
            >
              Find shop
            </button>
            <button
              type="button"
              className="landing-nav-ticket landing-nav-ticket--primary landing-nav-ticket--desktop"
              onClick={onCreateShop}
            >
              Start free
            </button>
          </div>
        </div>
      </nav>

      <div
        id="landing-mobile-menu"
        className={cn(
          "landing-nav-drawer md:hidden",
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        aria-hidden={!menuOpen}
      >
        <div className="landing-nav-drawer-inner">
          <nav className="flex flex-col" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="landing-nav-drawer-link"
                onClick={closeMenu}
              >
                <span className="landing-nav-link-code">{link.code}</span>
                <span>{link.label}</span>
              </a>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-3 border-t border-[var(--kiosk-border-soft)] pt-6">
            <button
              type="button"
              className="landing-nav-sheet-btn landing-nav-sheet-btn--primary"
              onClick={handleCreateShop}
            >
              Start free
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
