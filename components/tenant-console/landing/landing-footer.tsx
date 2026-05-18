import Link from "next/link";

import { APP_ROUTES } from "@/lib/config";

const FOOTER_LINKS = {
  Product: [
    { label: "Point of sale", href: "#platform" },
    { label: "Online storefront", href: "#platform" },
    { label: "Multi-branch", href: "#platform" },
    { label: "Custom domains", href: "#domains" },
  ],
  Account: [
    { label: "Sign in", href: APP_ROUTES.login },
    { label: "Create a shop", href: APP_ROUTES.signup },
    { label: "Forgot password", href: APP_ROUTES.forgotPassword },
    { label: "Verify email", href: APP_ROUTES.verifyEmail },
  ],
  Company: [{ label: "Palmart HQ", href: APP_ROUTES.superAdminLogin }],
} as const;

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--landing-border)] bg-[var(--landing-paper)]">
      <div className="mx-auto max-w-[74rem] px-5 pb-10 pt-14 sm:px-8 sm:pb-12 sm:pt-16">
        {/* ── Columns ── */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div>
            <Link
              href="/"
              className="group inline-flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--landing-paper)]"
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
                Palmart
              </span>
            </Link>
            <p className="mt-4 max-w-[28ch] text-sm leading-relaxed text-[var(--landing-ink-muted)]">
              Multi-tenant retail platform for businesses that sell in person,
              online, and everywhere in between.
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--landing-ink-soft)]">
                {group}
              </h4>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--landing-ink-muted)] transition-colors hover:text-[var(--landing-ink)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-12 flex flex-col gap-4 border-t border-[var(--landing-border)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-[var(--landing-ink-soft)]">
            &copy; {year} Palmart. All rights reserved.
          </p>
          <p className="text-[13px] text-[var(--landing-ink-soft)]">
            Built for retailers across East Africa
          </p>
        </div>
      </div>
    </footer>
  );
}
