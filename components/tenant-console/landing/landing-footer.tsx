import Link from "next/link";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { PLATFORM_DOMAIN } from "@/lib/config";

import { goldCtaClass } from "./landing-styles";

const TILL_STRIP = [
  { code: "01", label: "Barcode scan" },
  { code: "02", label: "M-Pesa STK" },
  { code: "03", label: "Offline sales" },
  { code: "04", label: "One stock count" },
  { code: "05", label: "Multi-branch" },
  { code: "06", label: "Receipt print" },
] as const;

const FOOTER_COLS = [
  {
    code: "01",
    label: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "How it works", href: "/#how" },
      { label: "Stories", href: "/#stories" },
    ],
  },
  {
    code: "02",
    label: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
    ],
  },
  {
    code: "03",
    label: "Support",
    links: [
      { label: "Help", href: "/help" },
      { label: "Merchants", href: "/help/merchants" },
      { label: "Shoppers", href: "/help/shoppers" },
      { label: "Contact", href: "mailto:support@kiosk.ke" },
    ],
  },
] as const;

const LEGAL = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Cookies", href: "#" },
] as const;

const BARCODE_BARS = [
  2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2,
  2, 1, 1, 3, 2, 1, 2, 1, 1, 2, 3, 1, 1, 2,
] as const;

export function LandingFooter() {
  const year = new Date().getFullYear();
  const tillDoubled = [...TILL_STRIP, ...TILL_STRIP];

  return (
    <footer className="landing-footer relative mt-10 overflow-hidden">
      {/* Counter surface */}
      <div
        aria-hidden
        className="landing-footer-surface pointer-events-none absolute inset-0"
      />

      {/* Perforated tear — page becomes receipt */}
      <div aria-hidden className="landing-footer-perf relative z-10 h-4 w-full" />

      {/* Register status rail */}
      <div
        aria-hidden
        className="landing-footer-till relative z-10 overflow-hidden"
      >
        <div className="landing-footer-till-track flex w-max items-center">
          {tillDoubled.map((item, i) => (
            <span
              key={`${item.code}-${i}`}
              className="landing-footer-till-item"
            >
              <span className="landing-footer-till-code">{item.code}</span>
              <span className="landing-footer-till-label">{item.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 px-4 pb-10 pt-8 sm:px-10 sm:pb-14 sm:pt-12">
        <div className="landing-footer-receipt relative mx-auto max-w-[920px] overflow-hidden">
          {/* Paper grain + soft edges */}
          <div
            aria-hidden
            className="landing-footer-receipt-grain pointer-events-none absolute inset-0"
          />

          <div className="relative px-5 py-8 sm:px-12 sm:py-12">
            {/* Header — merchant lockup */}
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
              <div>
                <KioskLogo
                  href="/"
                  size="md"
                  variant="landing"
                  plain
                />
                <p className="mt-5 max-w-[28rem] text-[15px] leading-[1.65] text-[var(--kiosk-text-muted)]">
                  Point of sale built by people who sell at the counter — scan,
                  take M-Pesa, and keep selling when the network drops.
                </p>
              </div>

              <div className="landing-footer-meta shrink-0 text-left font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-[var(--kiosk-text-faint)] sm:text-right">
                <p>Kiosk Technologies Ltd</p>
                <p>Nairobi · Kenya</p>
                <p className="mt-1 text-[var(--kiosk-gold)]">{PLATFORM_DOMAIN}</p>
                <p className="mt-3 tabular-nums">Rcpt #{year}-KE</p>
              </div>
            </div>

            <div aria-hidden className="landing-footer-dash my-8 sm:my-10" />

            {/* Departments */}
            <div className="grid gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-10">
              {FOOTER_COLS.map((col) => (
                <div key={col.label}>
                  <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-dashed border-[var(--kiosk-border)] pb-2">
                    <h4 className="font-heading text-xl font-semibold tracking-[-0.02em] text-[var(--kiosk-text)]">
                      {col.label}
                    </h4>
                    <span className="font-mono text-[10px] tabular-nums tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                      {col.code}
                    </span>
                  </div>
                  <ul className="flex flex-col">
                    {col.links.map((link) => {
                      const external =
                        link.href.startsWith("mailto:") ||
                        link.href.startsWith("http");
                      const className =
                        "landing-footer-line group/line flex items-baseline gap-2 py-2 text-sm text-[var(--kiosk-text-dim)] transition-colors duration-200 hover:text-[var(--kiosk-text)]";
                      const inner = (
                        <>
                          <span className="shrink-0">{link.label}</span>
                          <span
                            aria-hidden
                            className="landing-footer-dots min-w-[1.5rem] flex-1"
                          />
                          <span
                            aria-hidden
                            className="font-mono text-[10px] tracking-wider text-[var(--kiosk-text-faint)] opacity-50 transition-opacity duration-200 group-hover/line:opacity-100 group-hover/line:text-[var(--kiosk-gold)]"
                          >
                            →
                          </span>
                        </>
                      );
                      return (
                        <li key={link.label}>
                          {external ? (
                            <a href={link.href} className={className}>
                              {inner}
                            </a>
                          ) : (
                            <Link href={link.href} className={className}>
                              {inner}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div aria-hidden className="landing-footer-rule my-8 sm:my-10" />

            {/* TOTAL row */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--kiosk-text-faint)]">
                  Amount due
                </p>
                <p className="mt-1 font-heading text-[clamp(1.75rem,4vw,2.35rem)] font-semibold leading-none tracking-[-0.03em] text-[var(--kiosk-text)]">
                  Start free
                </p>
              </div>
              <Link
                href="/#pricing"
                className={`${goldCtaClass} !px-7 !text-[13px] shadow-[0_8px_22px_-8px_var(--kiosk-success-shadow)]`}
              >
                Start selling
              </Link>
            </div>

            <div aria-hidden className="landing-footer-dash my-8 sm:my-10" />

            {/* Barcode + thank you */}
            <div className="flex flex-col items-center text-center">
              <div
                aria-hidden
                className="landing-footer-barcode flex h-12 items-end justify-center gap-px sm:h-14"
              >
                {BARCODE_BARS.map((w, i) => (
                  <span
                    key={i}
                    className="landing-footer-bar bg-[var(--kiosk-text)]"
                    style={{ width: w, height: `${58 + ((i * 17) % 42)}%` }}
                  />
                ))}
              </div>
              <p className="mt-3 font-mono text-[10px] tracking-[0.35em] text-[var(--kiosk-text-faint)]">
                {PLATFORM_DOMAIN.toUpperCase()}
              </p>
              <p className="landing-footer-thanks mt-6 font-heading text-[clamp(1.5rem,5vw,2.5rem)] font-semibold italic leading-none tracking-[-0.02em] text-[var(--kiosk-text)]">
                Thank you — come again
              </p>
              <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-[var(--kiosk-text-faint)]">
                Built for shops across Kenya. Open tonight. Sell in the morning.
              </p>
            </div>

            {/* Legal strip */}
            <div className="mt-10 flex flex-col gap-4 border-t border-dashed border-[var(--kiosk-border)] pt-6 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-[var(--kiosk-text-faint)]">
                &copy; {year} Kiosk Technologies Ltd.
              </p>
              <nav
                aria-label="Legal"
                className="flex flex-wrap items-center gap-x-1 gap-y-1"
              >
                {LEGAL.map((item, i) => (
                  <span key={item.label} className="inline-flex items-center">
                    {i > 0 ? (
                      <span
                        aria-hidden
                        className="mx-2 text-[10px] text-[var(--kiosk-text-faint)]"
                      >
                        ·
                      </span>
                    ) : null}
                    <Link
                      href={item.href}
                      className="text-[12px] text-[var(--kiosk-text-faint)] transition-colors hover:text-[var(--kiosk-text-muted)]"
                    >
                      {item.label}
                    </Link>
                  </span>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
