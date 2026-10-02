import Link from "next/link";
import type { ReactNode } from "react";

import { LandingFooter } from "@/components/tenant-console/landing/landing-footer";
import { landingRootStyle } from "@/components/tenant-console/landing/landing-styles";
import { PLATFORM_DOMAIN } from "@/lib/config";
import { KIOSK_PLATFORM_CONTACT } from "@/lib/platform-contact";

/**
 * Shared shell for the legal notices.
 *
 * The "pending counsel review" banner is deliberate: the body copy below is
 * derived from what the platform observably does and is NOT legal advice.
 * Remove the banner only once qualified counsel has signed the text off.
 */
export function LegalDocument({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div
      style={landingRootStyle()}
      className="flex min-h-dvh flex-col bg-[var(--kiosk-bg)]"
    >
      <main className="mx-auto w-full max-w-[760px] flex-1 px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm text-[var(--kiosk-text-dim)] transition-colors hover:text-[var(--kiosk-text)]"
        >
          &larr; Back to {PLATFORM_DOMAIN}
        </Link>

        <p className="mt-8 inline-flex items-center border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
          Pending counsel review
        </p>

        <h1 className="mt-5 font-heading text-[clamp(30px,7vw,46px)] leading-[1.1] tracking-[-0.02em] text-[var(--kiosk-text)]">
          {title}
        </h1>

        <p className="mt-5 text-[15px] leading-[1.7] text-[var(--kiosk-text-muted)]">
          {intro}
        </p>
        <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--kiosk-text-dim)]">
          Last updated {updated}
        </p>

        <div className="mt-12 flex flex-col gap-10">{children}</div>

        <section className="mt-14 border-t border-[var(--kiosk-border)] pt-8">
          <h2 className="font-heading text-xl font-semibold tracking-[-0.02em] text-[var(--kiosk-text)]">
            Who to contact
          </h2>
          <p className="mt-3 text-[15px] leading-[1.7] text-[var(--kiosk-text-muted)]">
            {KIOSK_PLATFORM_CONTACT.legalName}, {KIOSK_PLATFORM_CONTACT.postalAddress},{" "}
            {KIOSK_PLATFORM_CONTACT.postalCity}. Write to{" "}
            <a
              href={`mailto:${KIOSK_PLATFORM_CONTACT.email}`}
              className="inline-flex min-h-6 items-center font-medium text-[var(--kiosk-gold)] underline underline-offset-2"
            >
              {KIOSK_PLATFORM_CONTACT.email}
            </a>{" "}
            or call{" "}
            <a
              href={`tel:${KIOSK_PLATFORM_CONTACT.phoneTel}`}
              className="inline-flex min-h-6 items-center font-medium text-[var(--kiosk-gold)] underline underline-offset-2"
            >
              {KIOSK_PLATFORM_CONTACT.phoneDisplay}
            </a>
            .
          </p>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-heading text-xl font-semibold tracking-[-0.02em] text-[var(--kiosk-text)]">
        {heading}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-[1.7] text-[var(--kiosk-text-muted)]">
        {children}
      </div>
    </section>
  );
}
