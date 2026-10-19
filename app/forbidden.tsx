import Link from "next/link";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import {
  ghostCtaClass,
  goldCtaClass,
  landingRootStyle,
} from "@/components/tenant-console/landing/landing-styles";
import { APP_ROUTES } from "@/lib/config";

export const metadata = {
  title: "Access denied — Kiosk",
  robots: { index: false, follow: false },
};

export default function ForbiddenPage() {
  return (
    <div
      className="landing-page flex min-h-dvh flex-col bg-[var(--kiosk-bg)]"
      style={landingRootStyle()}
    >
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-5 py-6 sm:px-8">
        <KioskLogo size="sm" href="/" />
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--kiosk-text-dim)]">
          Restricted
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center px-5 pb-24 pt-8 sm:px-8">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--kiosk-gold)]">
          Access denied
        </p>
        <h1 className="mt-4 max-w-[13ch] font-heading text-[clamp(3.2rem,9vw,5.6rem)] font-normal leading-[0.95] tracking-[-0.03em] text-[var(--kiosk-text)]">
          This door is locked.
        </h1>
        <p className="mt-6 max-w-[48ch] text-[15.5px] leading-[1.75] text-[var(--kiosk-text-muted)]">
          Your account does not have access to this part of the shop. Sign in
          with an account that has the right role, or ask an owner to open the
          door for you.
        </p>
        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link href={APP_ROUTES.staffLogin} className={goldCtaClass}>
            Sign in
          </Link>
          <Link href="/" className={ghostCtaClass}>
            Go to the shop
          </Link>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-[1100px] border-t border-[var(--kiosk-border)] px-5 py-5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-text-dim)] sm:px-8">
        Kiosk · Retail, in order.
      </footer>
    </div>
  );
}
