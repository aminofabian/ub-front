"use client";

import { Mail, MapPin, Phone } from "lucide-react";

import { KIOSK_PLATFORM_CONTACT } from "@/lib/platform-contact";

import { ghostCtaClass } from "./landing-styles";

type LandingSetupContactProps = {
  onTalkToUs?: () => void;
  /** When true, renders the section anchor used by footer `#contact` links. */
  asSection?: boolean;
  className?: string;
};

function ContactCell({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="landing-setup-contact-cell">
      <span className="landing-setup-contact-icon" aria-hidden>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="landing-setup-contact-label">{label}</p>
        <div className="landing-setup-contact-value">{children}</div>
      </div>
    </div>
  );
}

export function LandingSetupContact({
  onTalkToUs,
  asSection = false,
  className = "",
}: LandingSetupContactProps) {
  const panel = (
    <div className={`landing-setup-contact ${className}`.trim()}>
      <div className="landing-setup-contact-head">
        <div className="min-w-0 flex-1">
          <p className="landing-setup-contact-eyebrow">Setup &amp; installation</p>
          <h3 className="landing-setup-contact-title">
            Need help opening your till?
          </h3>
          <p className="landing-setup-contact-blurb">
            Our team handles POS installation, barcode setup, M-Pesa wiring, and
            staff onboarding — by phone or on-site in Nairobi.
          </p>
        </div>
        {onTalkToUs ? (
          <button
            type="button"
            onClick={onTalkToUs}
            className={`${ghostCtaClass} landing-setup-contact-cta shrink-0 justify-center border-[var(--kiosk-border-strong)] bg-[var(--kiosk-elevated)] !px-5 !py-2.5 !text-[13px]`}
          >
            Send a message
          </button>
        ) : null}
      </div>

      <div aria-hidden className="landing-plan-dash my-6" />

      <div className="landing-setup-contact-grid">
        <ContactCell icon={Phone} label="Phone">
          <a
            href={`tel:${KIOSK_PLATFORM_CONTACT.phoneTel}`}
            className="landing-setup-contact-link tabular-nums"
          >
            {KIOSK_PLATFORM_CONTACT.phoneDisplay}
          </a>
        </ContactCell>

        <ContactCell icon={Mail} label="Email">
          <a
            href={`mailto:${KIOSK_PLATFORM_CONTACT.email}`}
            className="landing-setup-contact-link"
          >
            {KIOSK_PLATFORM_CONTACT.email}
          </a>
        </ContactCell>

        <ContactCell icon={MapPin} label="Postal">
          <p className="leading-snug">
            <span className="tabular-nums">{KIOSK_PLATFORM_CONTACT.postalAddress}</span>
            <span className="mt-0.5 block text-[12px] font-normal text-[var(--kiosk-text-dim)]">
              {KIOSK_PLATFORM_CONTACT.postalCity}
            </span>
          </p>
        </ContactCell>
      </div>
    </div>
  );

  if (asSection) {
    return (
      <section
        id="contact"
        aria-labelledby="setup-contact-heading"
        className="section-reveal"
      >
        <h2 id="setup-contact-heading" className="sr-only">
          POS installation and setup contact
        </h2>
        {panel}
      </section>
    );
  }

  return panel;
}
