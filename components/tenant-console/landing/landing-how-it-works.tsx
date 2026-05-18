"use client";

import { MousePointerClick, PackageOpen, ShoppingCart } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: MousePointerClick,
    title: "Claim your domain",
    body: "Pick a subdomain — yourshop.palmart.co.ke — and you're live in seconds. Upgrade to a custom domain when your brand is ready.",
  },
  {
    step: "02",
    icon: PackageOpen,
    title: "Stock your catalog",
    body: "Add products once. They appear on your POS and storefront instantly. Bulk import, variants, and supplier tracking included.",
  },
  {
    step: "03",
    icon: ShoppingCart,
    title: "Sell everywhere",
    body: "Process walk-in sales, web orders, and M-Pesa payments — all pulling from the same inventory. No reconciliation needed.",
  },
] as const;

export function LandingHowItWorks() {
  return (
    <section className="bg-[var(--landing-surface)]">
      <div className="mx-auto max-w-[74rem] px-5 py-20 sm:px-8 sm:py-28">
        {/* ── Section header ── */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.20em] text-[var(--landing-ink-muted)]">
            How it works
          </p>
          <h2 className="font-heading mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
            From zero to selling in three steps
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--landing-ink-muted)] sm:text-lg">
            No migrations, no consultants, no long contracts. Just a retail OS
            that gets out of your way.
          </p>
        </div>

        {/* ── Steps ── */}
        <div className="mt-14 grid gap-6 sm:grid-cols-3 lg:mt-16">
          {STEPS.map((item) => (
            <div
              key={item.step}
              className="group relative flex flex-col items-center text-center"
            >
              {/* Connector line (desktop only) — hidden on last item */}
              {parseInt(item.step) < 3 && (
                <div
                  aria-hidden
                  className="absolute left-[calc(50%+3rem)] top-10 hidden h-[2px] w-[calc(100%-3rem)] sm:block"
                  style={{
                    background: `linear-gradient(to right, var(--landing-border), transparent)`,
                  }}
                />
              )}

              {/* Step marker */}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-paper)] shadow-[0_4px_16px_rgba(20,20,18,0.04)] transition-all duration-400 group-hover:-translate-y-1 group-hover:shadow-[0_8px_28px_rgba(20,20,18,0.08)]">
                <item.icon
                  className="h-6 w-6"
                  style={{ color: "var(--landing-gold)" }}
                  aria-hidden
                />
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--landing-ink)] text-[9px] font-bold text-[#faf9f7]">
                  {item.step}
                </span>
              </div>

              <h3 className="font-heading mt-5 text-lg font-semibold tracking-[-0.02em] text-[var(--landing-ink)]">
                {item.title}
              </h3>
              <p className="mt-2.5 max-w-[28ch] text-[15px] leading-relaxed text-[var(--landing-ink-muted)]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
