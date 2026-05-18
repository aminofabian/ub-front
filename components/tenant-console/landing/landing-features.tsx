"use client";

import { ArrowRightLeft, GlobeLock, Store, Users } from "lucide-react";

const FEATURES = [
  {
    icon: Store,
    title: "Point of sale",
    body: "Fast checkout with branch-aware pricing, shift management, and offline-ready registers — built for counters that can't afford sync delays.",
  },
  {
    icon: GlobeLock,
    title: "Online storefront",
    body: "Publish your catalog and take web orders on the same stock ledger your team sees at the register. No double-entry, no spreadsheets.",
  },
  {
    icon: ArrowRightLeft,
    title: "Real-time sync",
    body: "Stock moves, sales close, and inventory adjusts instantly across every branch and channel. Walk-in or web — one source of truth.",
  },
  {
    icon: Users,
    title: "Multi-branch access",
    body: "Role-based permissions let staff see only their branch, while owners manage everything from a single dashboard. Grow without chaos.",
  },
] as const;

export function LandingFeatures() {
  return (
    <section
      id="platform"
      className="border-t border-[var(--landing-border)] bg-[var(--landing-paper)]"
    >
      <div className="mx-auto max-w-[74rem] px-5 py-20 sm:px-8 sm:py-28">
        {/* ── Section header ── */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.20em] text-[var(--landing-ink-muted)]">
            Platform
          </p>
          <h2 className="font-heading mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-4xl xl:text-[2.65rem] xl:leading-[1.05]">
            Everything you need to run retail, in one place
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--landing-ink-muted)] sm:text-lg">
            Kiosk is purpose-built for retailers who sell across counters and
            screens — not a generic e-commerce template adapted for physical
            stores.
          </p>
        </div>

        {/* ── Feature cards ── */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:mt-16">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)] p-6 shadow-[0_1px_3px_rgba(20,20,18,0.03)] transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(20,20,18,0.07)] hover:border-[var(--landing-border-strong)] sm:p-7"
            >
              {/* Icon */}
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--landing-gold-surface)] transition-colors duration-400 group-hover:bg-[var(--landing-gold-soft)]">
                <feature.icon
                  className="h-5 w-5 transition-colors duration-400"
                  style={{ color: "var(--landing-gold)" }}
                  aria-hidden
                />
              </div>

              <h3 className="font-heading mt-5 text-lg font-semibold tracking-[-0.02em] text-[var(--landing-ink)]">
                {feature.title}
              </h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--landing-ink-muted)]">
                {feature.body}
              </p>

              {/* Subtle corner glow on hover */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-60"
                style={{
                  background:
                    "radial-gradient(circle, var(--landing-gold-soft), transparent 68%)",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
