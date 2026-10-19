import Link from "next/link";
import type { Metadata } from "next";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import {
  ghostCtaClass,
  goldCtaClass,
  landingRootStyle,
} from "@/components/tenant-console/landing/landing-styles";

export const metadata: Metadata = {
  title: "Page not found — Kiosk",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div
      className="landing-page flex min-h-dvh flex-col bg-[var(--kiosk-bg)]"
      style={landingRootStyle()}
    >
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-5 py-6 sm:px-8">
        <KioskLogo size="sm" href="/" />
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--kiosk-text-dim)]">
          404
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center px-5 pb-24 pt-8 sm:px-8">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--kiosk-gold)]">
          Page not found
        </p>
        <h1 className="mt-4 max-w-[12ch] font-heading text-[clamp(3.2rem,9vw,5.6rem)] font-normal leading-[0.95] tracking-[-0.03em] text-[var(--kiosk-text)]">
          This shelf is empty.
        </h1>
        <p className="mt-6 max-w-[46ch] text-[15.5px] leading-[1.75] text-[var(--kiosk-text-muted)]">
          The page you are looking for has moved, sold, or never existed. The
          shop is still open. Go back to the counter, or browse the marketplace.
        </p>
        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link href="/" className={goldCtaClass}>
            Back to the shop
          </Link>
          <Link href="/marketplace" className={ghostCtaClass}>
            Browse the marketplace
          </Link>
          <Link
            href="/help"
            className="inline-flex min-h-11 items-center px-1 text-[13px] font-medium text-[var(--kiosk-text-muted)] underline-offset-4 hover:text-[var(--kiosk-text)] hover:underline"
          >
            Get help
          </Link>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-3 border-t border-[var(--kiosk-border)] px-5 pb-24 pt-5 font-mono sm:pb-5 text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-text-dim)] sm:px-8">
        <span>Kiosk · Retail, in order.</span>
        <span className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-[var(--kiosk-text)]">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[var(--kiosk-text)]">
            Terms
          </Link>
        </span>
      </footer>
    </div>
  );
}
