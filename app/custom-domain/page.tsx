import type { Metadata } from "next";
import { Suspense } from "react";

import { CustomDomainOfferPage } from "@/components/domain-offer/custom-domain-offer-page";

export const metadata: Metadata = {
  title: "Your shop, at its own address · Kiosk",
  description:
    "Custom domain and storefront theme setup for KES 1,000. M-Pesa Express, handed over within 24 hours.",
  robots: { index: false, follow: false },
};

export default function CustomDomainOfferRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F4F1EA] px-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#556159]">Opening your offer…</p>
        </div>
      }
    >
      <CustomDomainOfferPage />
    </Suspense>
  );
}
