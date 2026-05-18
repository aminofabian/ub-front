import Link from "next/link";
import { MapPin, ScanBarcode, Smartphone, WifiOff } from "lucide-react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { PLATFORM_DOMAIN } from "@/lib/config";

import { goldCtaClass } from "./landing-styles";

const TICKER = [
  "Barcode scan",
  "M-Pesa STK",
  "Offline sales",
  "One stock count",
  "Multi-branch",
  "Built at the counter",
] as const;

const TRUST_CHIPS = [
  { icon: ScanBarcode, label: "Scan & sell" },
  { icon: Smartphone, label: "M-Pesa ready" },
  { icon: WifiOff, label: "Works offline" },
] as const;

const FOOTER_COLS = [
  {
    label: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "How it works", href: "#how" },
      { label: "Stories", href: "#stories" },
    ],
  },
  {
    label: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
    ],
  },
  {
    label: "Support",
    links: [
      { label: "Docs", href: "#" },
      { label: "Status", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Community", href: "#" },
    ],
  },
] as const;

const LEGAL = ["Privacy", "Terms", "Cookies"] as const;

export function LandingFooter() {
  const year = new Date().getFullYear();
  const tickerDoubled = [...TICKER, ...TICKER];

  return (
    <footer className="landing-footer relative mt-8 overflow-hidden">
      {/* Ambient */}
      <div
        aria-hidden
        className="landing-footer-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]"
      />
      <div
        aria-hidden
        className="landing-footer-grid pointer-events-none absolute inset-0 opacity-[0.55]"
      />
      <div
        aria-hidden
        className="landing-footer-watermark pointer-events-none absolute bottom-[18%] left-1/2 -translate-x-1/2 select-none font-heading text-[clamp(7rem,22vw,16rem)] font-semibold uppercase leading-none tracking-[-0.06em] text-[var(--kiosk-text)]"
      >
        KIOSK
      </div>

      {/* Perforated tear-off edge */}
      <div aria-hidden className="landing-footer-perf relative z-10 h-3 w-full" />

      {/* Capability ticker */}
      <div
        aria-hidden
        className="landing-footer-ticker-wrap relative z-10 overflow-hidden border-y border-[var(--kiosk-border-soft)] bg-[color-mix(in_srgb,var(--kiosk-panel)_70%,transparent)] py-3 backdrop-blur-sm"
      >
        <div className="landing-footer-ticker flex w-max gap-0">
          {tickerDoubled.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex shrink-0 items-center gap-3 px-6 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]"
            >
              <span
                className="h-1 w-1 rounded-full bg-[var(--kiosk-gold)] opacity-70"
                aria-hidden
              />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 px-5 pb-6 pt-14 sm:px-10 sm:pt-16">
        <div className="mx-auto max-w-[1100px]">
          {/* Main panel */}
          <div className="landing-footer-panel relative overflow-hidden rounded-[1.75rem] p-[1px]">
            <div
              aria-hidden
              className="landing-footer-panel-ring absolute inset-0 rounded-[1.75rem]"
            />
            <div className="landing-footer-panel-inner relative rounded-[calc(1.75rem-1px)] bg-[color-mix(in_srgb,var(--kiosk-elevated)_92%,transparent)] px-6 py-10 backdrop-blur-xl sm:px-10 sm:py-12">
              {/* POS corner brackets */}
              <div
                aria-hidden
                className="landing-footer-corner landing-footer-corner-tl"
              />
              <div
                aria-hidden
                className="landing-footer-corner landing-footer-corner-br"
              />

              <div className="mb-12 grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))] lg:gap-10">
                {/* Brand */}
                <div className="relative">
                  <KioskLogo
                    href="/"
                    size="md"
                    variant="landing"
                    layout="badge"
                    showTagline
                    tagline={PLATFORM_DOMAIN.toUpperCase()}
                  />
                  <p className="mt-6 max-w-[300px] text-[15px] leading-[1.65] text-[var(--kiosk-text-dim)]">
                    Point of sale built by people who sell at the counter — scan,
                    take M-Pesa, and keep selling when the network drops.
                  </p>

                  <ul className="mt-6 flex flex-wrap gap-2">
                    {TRUST_CHIPS.map(({ icon: Icon, label }) => (
                      <li key={label}>
                        <span className="landing-footer-chip inline-flex items-center gap-2 rounded-full border border-[var(--kiosk-border)] bg-[var(--kiosk-gold-surface)] px-3 py-1.5 text-[11px] font-medium tracking-[0.02em] text-[var(--kiosk-text-muted)]">
                          <Icon
                            className="h-3.5 w-3.5 shrink-0 text-[var(--kiosk-gold)]"
                            strokeWidth={2}
                            aria-hidden
                          />
                          {label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <Link href="#pricing" className={`${goldCtaClass} !text-[13px]`}>
                      Start selling
                    </Link>
                    <span className="landing-footer-stamp inline-flex items-center gap-2 rounded-full border border-dashed border-[var(--kiosk-gold-border)] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--kiosk-gold)]">
                      <MapPin className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                      Nairobi · KE
                    </span>
                  </div>
                </div>

                {/* Columns */}
                {FOOTER_COLS.map((col, colIndex) => (
                  <div key={col.label} className="relative">
                    <p className="landing-footer-col-index mb-3 font-mono text-[10px] tabular-nums text-[var(--kiosk-text-faint)]">
                      {String(colIndex + 1).padStart(2, "0")}
                    </p>
                    <h4 className="landing-footer-col-title mb-5 font-heading text-lg font-semibold tracking-[-0.02em] text-[var(--kiosk-text)]">
                      {col.label}
                    </h4>
                    <ul className="flex flex-col gap-1">
                      {col.links.map((link) => (
                        <li key={link.label}>
                          <Link
                            href={link.href}
                            className="landing-footer-link group/link inline-flex items-center gap-2 rounded-lg py-2 pr-2 text-sm text-[var(--kiosk-text-dim)] transition-colors duration-200"
                          >
                            <span
                              className="h-px w-0 bg-[var(--kiosk-gold)] transition-all duration-300 group-hover/link:w-3"
                              aria-hidden
                            />
                            <span className="transition-colors group-hover/link:text-[var(--kiosk-text)]">
                              {link.label}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Receipt divider */}
              <div
                aria-hidden
                className="landing-footer-receipt my-10 flex items-center gap-3"
              >
                <span className="h-px flex-1 bg-[var(--kiosk-border)]" />
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--kiosk-text-faint)]">
                  · · · end of page · · ·
                </span>
                <span className="h-px flex-1 bg-[var(--kiosk-border)]" />
              </div>

              {/* Bottom bar */}
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[13px] leading-relaxed text-[var(--kiosk-text-faint)]">
                    &copy; {year} Kiosk Technologies Ltd.
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--kiosk-text-faint)]">
                    {PLATFORM_DOMAIN} · Built for shops across Kenya
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {LEGAL.map((label) => (
                    <Link
                      key={label}
                      href="#"
                      className="landing-footer-legal rounded-full border border-transparent px-3.5 py-1.5 text-[12px] text-[var(--kiosk-text-faint)] transition-all duration-200 hover:border-[var(--kiosk-border)] hover:bg-[var(--kiosk-card-bg)] hover:text-[var(--kiosk-text-dim)]"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
