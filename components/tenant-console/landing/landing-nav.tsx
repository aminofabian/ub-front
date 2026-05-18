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
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between px-5 transition-all duration-300 sm:px-10",
        scrolled
          ? "border-b border-[var(--kiosk-border-soft)] bg-[var(--kiosk-nav-blur-bg)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      {/* ── Logo ── */}
      <Link
        href="/"
        className="flex items-center gap-2 focus-visible:outline-none"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="3" width="8" height="8" rx="2" fill="#C8A96E" />
          <rect
            x="13"
            y="3"
            width="8"
            height="8"
            rx="2"
            fill="#C8A96E"
            opacity="0.5"
          />
          <rect
            x="3"
            y="13"
            width="8"
            height="8"
            rx="2"
            fill="#C8A96E"
            opacity="0.5"
          />
          <rect
            x="13"
            y="13"
            width="8"
            height="8"
            rx="2"
            fill="#C8A96E"
            opacity="0.3"
          />
        </svg>
        <span className="text-[17px] font-medium tracking-[-0.01em] text-[var(--kiosk-text)]">
          Kiosk
        </span>
      </Link>

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
