"use client";

const PILLARS = [
  {
    index: "01",
    title: "Point of sale",
    body: "Fast checkout, shifts, and branch-aware pricing — built for counters that cannot afford sync delays.",
  },
  {
    index: "02",
    title: "Online storefront",
    body: "Publish catalog and take web orders on the same stock ledger your team sees at the register.",
  },
  {
    index: "03",
    title: "Domains & branding",
    body: "Launch on a tenant subdomain, then map a custom hostname with SSL when your brand is ready.",
  },
] as const;

const CAPABILITIES = [
  "Multi-branch inventory",
  "Role-based staff access",
  "M-Pesa-ready payments",
  "Purchase & supplier flows",
  "Real-time stock sync",
  "Branded checkout",
] as const;

export function LandingPlatform() {
  return (
    <section
      id="platform"
      className="border-t border-[var(--landing-border)] bg-[var(--landing-surface)]"
    >
      <div className="mx-auto max-w-[72rem] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--landing-ink-muted)]">
              Platform
            </p>
            <h2 className="font-heading mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
              One system for how you actually sell
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--landing-ink-muted)]">
              Palmart is multi-tenant by architecture — each business runs in its
              own isolated space with dedicated domains, users, and catalog data.
            </p>
          </div>

          <ol className="space-y-0 divide-y divide-[var(--landing-border)] border-y border-[var(--landing-border)]">
            {PILLARS.map((pillar) => (
              <li
                key={pillar.index}
                className="group grid gap-4 py-8 transition-colors duration-300 first:pt-8 last:pb-8 sm:grid-cols-[4rem_1fr] sm:gap-8"
              >
                <span className="font-mono text-sm font-medium tabular-nums text-[var(--landing-gold)]">
                  {pillar.index}
                </span>
                <div>
                  <h3 className="font-heading text-xl font-semibold tracking-[-0.02em] transition-colors group-hover:text-[var(--landing-gold)]">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--landing-ink-muted)] sm:text-[15px]">
                    {pillar.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-16 flex flex-wrap gap-2 sm:mt-20">
          {CAPABILITIES.map((cap) => (
            <span
              key={cap}
              className="rounded-full border border-[var(--landing-border)] bg-[var(--landing-paper)] px-3.5 py-1.5 text-xs font-medium text-[var(--landing-ink-muted)] transition-colors duration-300 hover:border-[color-mix(in_srgb,var(--landing-gold)_30%,transparent)] hover:text-[var(--landing-ink)]"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
