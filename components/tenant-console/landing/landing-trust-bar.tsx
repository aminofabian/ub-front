"use client";

const METRICS = [
  { value: "Multi-branch", label: "Inventory sync" },
  { value: "Real-time", label: "Stock across channels" },
  { value: "M-Pesa", label: "Payments built in" },
  { value: "Custom domain", label: "Your brand, your URL" },
] as const;

export function LandingTrustBar() {
  return (
    <section
      className="border-y border-[var(--landing-border)] bg-[var(--landing-surface)]"
      aria-label="Platform capabilities"
    >
      <div className="mx-auto max-w-[74rem] px-5 py-10 sm:px-8 sm:py-12">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
          {METRICS.map((metric) => (
            <div key={metric.label} className="text-center sm:text-left">
              <p className="font-heading text-xl font-bold tracking-[-0.02em] text-[var(--landing-ink)] sm:text-2xl">
                {metric.value}
              </p>
              <p className="mt-1 text-[13px] text-[var(--landing-ink-muted)] sm:text-sm">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
