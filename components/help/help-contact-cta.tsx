"use client";

import { useState } from "react";
import Link from "next/link";

import { TalkToUsModal } from "@/components/contact/talk-to-us-modal";
import {
  ghostCtaClass,
  goldCtaClass,
} from "@/components/tenant-console/landing/landing-styles";

type HelpContactCtaProps = {
  variant?: "merchant" | "shopper" | "general";
};

export function HelpContactCta({ variant = "general" }: HelpContactCtaProps) {
  const [talkOpen, setTalkOpen] = useState(false);
  const copy =
    variant === "shopper"
      ? {
          title: "Still need help with an order?",
          body: "For delivery, refunds, or missing items, contact the shop you ordered from first. For platform account issues, message Kiosk support.",
        }
      : variant === "merchant"
        ? {
            title: "Still stuck setting up?",
            body: "Send a message with your business name and subdomain — we will help you get the till selling.",
          }
        : {
            title: "Still need help?",
            body: "Shoppers: contact the merchant for order issues. Merchants: message us about account or till setup.",
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
        <button
          type="button"
          onClick={() => setTalkOpen(true)}
          className={goldCtaClass}
        >
          Talk to us
        </button>
        <Link href="/#pricing" className={ghostCtaClass}>
          Start selling on Kiosk
        </Link>
      </div>
      <TalkToUsModal
        open={talkOpen}
        onOpenChange={setTalkOpen}
        destination="platform"
        title="Talk to us"
        description="Send a message to Kiosk support."
      />
    </section>
  );
}
