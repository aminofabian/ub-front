"use client";

import { domainSuffix } from "./landing-host";

type LandingProductPreviewProps = {
  shopHost: string;
};

export function LandingProductPreview({
  shopHost,
}: LandingProductPreviewProps) {
  const suffix = domainSuffix(shopHost);

  return (
    <div
      className="group relative w-full max-w-[34rem] lg:max-w-none lg:justify-self-end"
      aria-hidden
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -inset-8 rounded-[2.5rem] opacity-50 blur-3xl transition-opacity duration-700 group-hover:opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 40%, var(--landing-gold-soft), transparent 70%)",
        }}
      />

      {/* ── Browser chrome card ── */}
      <div className="relative overflow-hidden rounded-[1.35rem] border border-[var(--landing-border)] bg-[var(--landing-surface)] shadow-[0_20px_56px_rgba(20,20,18,0.09),0_2px_6px_rgba(20,20,18,0.03)] transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[0_28px_72px_rgba(20,20,18,0.11),0_4px_10px_rgba(20,20,18,0.04)]">
        {/* Browser toolbar */}
        <div className="flex items-center gap-3 border-b border-[var(--landing-border)] bg-[var(--landing-paper-deep)] px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[#d4d2cc]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#d4d2cc]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#d4d2cc]" />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--landing-border)] bg-[var(--landing-surface)] px-3 py-1.5">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
              aria-hidden
            />
            <p className="truncate font-mono text-[11px] text-[var(--landing-ink-muted)]">
              <span className="font-medium text-[var(--landing-ink)]">
                yourshop
              </span>
              {suffix}
            </p>
          </div>
        </div>

        {/* Dashboard body */}
        <div className="grid grid-cols-[3.25rem_1fr] sm:grid-cols-[4rem_1fr]">
          {/* Sidebar */}
          <aside className="border-r border-[var(--landing-border)] bg-[var(--landing-paper)] p-2.5 sm:p-3">
            <nav className="flex flex-col gap-2" aria-hidden>
              {[
                { label: "P", active: true },
                { label: "S" },
                { label: "W" },
                { label: "T" },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-lg px-2 py-2 text-center text-[10px] font-bold transition-colors ${
                    item.active
                      ? "bg-[var(--landing-ink)] text-[#faf9f7]"
                      : "text-[var(--landing-ink-muted)]"
                  }`}
                >
                  {item.label}
                </div>
              ))}
            </nav>
          </aside>

          {/* Main panel */}
          <div className="p-4 sm:p-5">
            {/* Stats row */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--landing-ink-muted)]">
                  Today&apos;s sales
                </p>
                <p className="font-heading mt-1 text-2xl font-bold tracking-[-0.03em] sm:text-[1.65rem]">
                  KES 48,200
                </p>
              </div>
              <span className="rounded-full border border-[var(--landing-border)] bg-[var(--landing-paper)] px-2.5 py-1 text-[10px] font-medium text-[var(--landing-ink-muted)]">
                23 orders
              </span>
            </div>

            {/* Recent orders */}
            <div className="mt-4 space-y-2">
              {[
                {
                  label: "Walk-in · #1042",
                  amount: "KES 1,240",
                  channel: "POS",
                },
                {
                  label: "Web order · #1041",
                  amount: "KES 3,890",
                  channel: "Online",
                },
                {
                  label: "Walk-in · #1040",
                  amount: "KES 560",
                  channel: "POS",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-paper)] px-3 py-2.5 transition-all duration-300 hover:border-[var(--landing-border-strong)] hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{row.label}</p>
                    <p className="text-[10px] text-[var(--landing-ink-muted)]">
                      {row.channel} · synced
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-xs font-medium tabular-nums">
                    {row.amount}
                  </p>
                </div>
              ))}
            </div>

            {/* Live sync indicator */}
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--landing-gold)_30%,transparent)] bg-[var(--landing-gold-surface)] px-3 py-2.5">
              <span
                className="text-[10px] font-semibold"
                style={{ color: "var(--landing-gold)" }}
              >
                +7 web orders
              </span>
              <span className="text-[10px] text-[var(--landing-ink-muted)]">
                same stock count across all channels
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating domain card ── */}
      <div
        className="absolute -bottom-4 left-4 right-4 mx-auto w-[calc(100%-2rem)] max-w-[18rem] rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)] px-4 py-3 shadow-[0_10px_28px_rgba(20,20,18,0.07)] transition-all duration-500 group-hover:translate-y-1 group-hover:shadow-[0_14px_36px_rgba(20,20,18,0.09)] sm:left-auto sm:right-[-1.5rem] sm:mx-0 sm:w-auto sm:min-w-[14rem]"
        id="domains"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--landing-ink-muted)]">
          Custom domain
        </p>
        <p className="mt-0.5 font-mono text-xs font-medium text-[var(--landing-ink)]">
          shop.yourbrand.com
        </p>
        <p className="mt-1 text-[10px] text-[var(--landing-ink-soft)]">
          SSL included · auto-renew
        </p>
      </div>
    </div>
  );
}
