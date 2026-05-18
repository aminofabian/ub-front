"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { goldCtaClass } from "./landing-styles";

type LandingNavProps = {
  onCreateShop: () => void;
};

export function LandingNav({ onCreateShop }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-[4.25rem] items-center justify-between px-5 transition-all duration-300 sm:h-[4.5rem] sm:px-10",
        scrolled
          ? "border-b border-[var(--kiosk-border-soft)] bg-[var(--kiosk-nav-blur-bg)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <KioskLogo href="/" size="lg" variant="landing" layout="badge" />

      {/* ── Desktop links ── */}
      <div className="hidden items-center gap-9 md:flex">
        {[
          { href: "#features", label: "Features" },
          { href: "#how", label: "How it works" },
          { href: "#pricing", label: "Pricing" },
          { href: "#stories", label: "Stories" },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm font-normal tracking-[0.01em] text-[var(--kiosk-text-muted)] transition-colors duration-200 hover:text-[var(--kiosk-text)]"
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* ── CTAs ── */}
      <div className="flex items-center gap-3">
        <Link
          href={APP_ROUTES.login}
          className="hidden text-sm font-normal tracking-[0.01em] text-[var(--kiosk-text-muted)] transition-colors duration-200 hover:text-[var(--kiosk-text)] sm:inline"
        >
          Sign in
        </Link>
        <button
          type="button"
          className={`${goldCtaClass} !px-4 !py-2 !text-[13px]`}
          onClick={onCreateShop}
        >
          Get started
        </button>
      </div>
    </nav>
  );
}
