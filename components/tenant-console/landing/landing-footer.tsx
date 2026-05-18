import Link from "next/link";

import { KioskLogo } from "@/components/brand/kiosk-logo";

const FOOTER_COLS = [
  {
    label: "Product",
    links: ["Features", "Pricing", "Changelog", "Roadmap"],
  },
  {
    label: "Company",
    links: ["About", "Blog", "Careers", "Press"],
  },
  {
    label: "Support",
    links: ["Docs", "Status", "Contact", "Community"],
  },
] as const;

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--kiosk-border-soft)] px-5 pb-10 pt-16 sm:px-10">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <KioskLogo
                href="/"
                size="md"
                variant="landing"
                showTagline
                tagline="KIOSK.KE"
              />
            </div>
            <p className="max-w-[260px] text-sm leading-[1.6] text-[var(--kiosk-text-dim)]">
              Built by shop owners who sell at the counter every day.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.label}>
              <h4 className="mb-5 text-xs font-medium uppercase tracking-[0.08em] text-[var(--kiosk-text-faint)]">
                {col.label}
              </h4>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-sm text-[var(--kiosk-text-dim)] transition-colors duration-200 hover:text-[var(--kiosk-text)]"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <hr className="mb-7 border-t border-[var(--kiosk-border)]" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-[13px] text-[var(--kiosk-text-faint)]">
            &copy; {new Date().getFullYear()} Kiosk Technologies Ltd. Nairobi,
            Kenya.
          </span>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Cookies"].map((l) => (
              <Link
                key={l}
                href="#"
                className="text-[13px] text-[var(--kiosk-text-faint)] transition-colors hover:text-[var(--kiosk-text-dim)]"
              >
                {l}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
