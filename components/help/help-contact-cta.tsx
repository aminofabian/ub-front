import Link from "next/link";

import {
  ghostCtaClass,
  goldCtaClass,
} from "@/components/tenant-console/landing/landing-styles";

const SUPPORT_EMAIL = "support@kiosk.ke";

type HelpContactCtaProps = {
  variant?: "merchant" | "shopper" | "general";
};

export function HelpContactCta({ variant = "general" }: HelpContactCtaProps) {
  const copy =
    variant === "shopper"
      ? {
          title: "Still need help with an order?",
          body: "For delivery, refunds, or missing items, contact the shop you ordered from first. For platform account issues, email Kiosk support.",
        }
      : variant === "merchant"
        ? {
            title: "Still stuck setting up?",
            body: "Email support with your business name and subdomain — we will help you get the till selling.",
          }
        : {
            title: "Still need help?",
            body: "Shoppers: contact the merchant for order issues. Merchants: email us about account or till setup.",
          };

  return (
    <section className="mt-14 rounded-2xl border border-[var(--kiosk-border)] bg-[color-mix(in_srgb,var(--kiosk-panel)_70%,var(--kiosk-bg))] px-5 py-8 sm:px-8 sm:py-10">
      <h2 className="font-heading text-[clamp(22px,4vw,32px)] tracking-[-0.02em] text-[var(--kiosk-text)]">
        {copy.title}
      </h2>
      <p className="mt-3 max-w-xl text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)]">
        {copy.body}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Kiosk%20Help`}
          className={goldCtaClass}
        >
          Email {SUPPORT_EMAIL}
        </a>
        <Link href="/#pricing" className={ghostCtaClass}>
          Start selling on Kiosk
        </Link>
      </div>
    </section>
  );
}
