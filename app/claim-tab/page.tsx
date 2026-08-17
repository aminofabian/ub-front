import type { Metadata } from "next";

import { PayerClaimForm } from "@/components/credits/payer-claim-form";

export const metadata: Metadata = {
  title: "Verify your M-Pesa number",
  robots: { index: false, follow: false },
};

export default function ClaimTabPage() {
  return (
    <main className="min-h-[100dvh] bg-background">
      <PayerClaimForm />
    </main>
  );
}
