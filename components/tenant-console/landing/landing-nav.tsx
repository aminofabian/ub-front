"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { goldCtaClass } from "./landing-styles";

type LandingNavProps = {
  onCreateShop: () => void;
};

export function LandingNav({ onCreateShop }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-[var(--landing-border)] bg-[color-mix(in_srgb,var(--landing-paper)_90%,white)] shadow-[0_1px_3px_rgba(20,20,18,0.04),0_8px_32px_rgba(20,20,18,0.05)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[4rem] max-w-[74rem] items-center justify-between gap-6 px-5 sm:px-8">
        {/* ── Logo ── */}
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--landing-paper)]"
        >
          <span
            className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] bg-[var(--landing-ink)] text-[#faf9f7] transition-transform duration-300 group-hover:scale-[1.02]"
            aria-hidden
          >
            <span className="font-heading text-sm font-extrabold tracking-tighter">
              P
            </span>
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--landing-gold-bright)]" />
          </span>
          <span className="font-heading text-[1.05rem] font-bold tracking-[-0.03em]">
            Kiosk
          </span>
        </Link>

        {/* ── Desktop nav ── */}
        <nav
          className="hidden items-center gap-8 text-sm font-medium text-[var(--landing-ink-muted)] md:flex"
          aria-label="Primary"
        >
          <a
            href="#platform"
            className="transition-colors hover:text-[var(--landing-ink)]"
          >
            Platform
          </a>
          <a
            href="#domains"
            className="transition-colors hover:text-[var(--landing-ink)]"
          >
            Domains
          </a>
        </nav>

        {/* ── CTAs ── */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={APP_ROUTES.login}
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-[var(--landing-ink-muted)] transition-colors hover:text-[var(--landing-ink)] sm:inline-block"
          >
            Sign in
          </Link>
          <button
            type="button"
            className={`${goldCtaClass} text-sm`}
            onClick={onCreateShop}
          >
            Create your shop
          </button>
        </div>
      </div>
    </header>
  );
}
