"use client";

import { Menu, X } from "lucide-react";
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

  const handleFindShop = () => {
    closeMenu();
    onFindShop();
  };

  return (
    <>
      <nav
        className={cn(
          "landing-nav sticky top-0 z-50 transition-colors duration-300",
          scrolled || menuOpen ? "landing-nav--solid" : "landing-nav--clear",
        )}
      >
        <div className="landing-nav-inner">
          <KioskLogo href="/" size="lg" variant="landing" plain />

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
            <button
              type="button"
              className="landing-nav-ticket landing-nav-ticket--ghost hidden sm:inline-flex"
              onClick={onFindShop}
            >
              <span className="landing-nav-ticket-code">FIND</span>
              <span className="landing-nav-ticket-label">My shop</span>
            </button>
            <button
              type="button"
              className="landing-nav-ticket landing-nav-ticket--primary hidden md:inline-flex"
              onClick={onCreateShop}
            >
              <span className="landing-nav-ticket-code">NEW</span>
              <span className="landing-nav-ticket-label">Open till</span>
            </button>
            <button
              type="button"
              className="landing-nav-menu-btn md:hidden"
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
        </div>
      </nav>

      <div
        id="landing-mobile-menu"
        className={cn(
          "landing-nav-drawer fixed inset-x-[0.625rem] bottom-[0.625rem] top-[calc(0.625rem+4rem)] z-40 flex flex-col sm:inset-x-[0.85rem] sm:bottom-[0.85rem] sm:top-[calc(0.85rem+4.5rem)] md:hidden",
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        aria-hidden={!menuOpen}
      >
        <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-8 pt-2">
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

          <div className="mt-auto flex flex-col gap-3 border-t border-dashed border-[var(--kiosk-border)] pt-6">
            <button
              type="button"
              className="landing-nav-ticket landing-nav-ticket--ghost w-full justify-center"
              onClick={handleFindShop}
            >
              <span className="landing-nav-ticket-code">FIND</span>
              <span className="landing-nav-ticket-label">My shop</span>
            </button>
            <button
              type="button"
              className="landing-nav-ticket landing-nav-ticket--primary w-full justify-center"
              onClick={handleCreateShop}
            >
              <span className="landing-nav-ticket-code">NEW</span>
              <span className="landing-nav-ticket-label">Open till</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
