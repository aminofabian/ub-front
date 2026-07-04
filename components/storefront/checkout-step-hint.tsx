"use client";

import type { CheckoutProgressStep } from "@/components/storefront/checkout-progress-steps";
import { cn } from "@/lib/utils";

type Props = {
  activeStep: CheckoutProgressStep;
  detailsSubStep?: "contact" | "delivery";
  /** Saved delivery summary is shown instead of the full form */
  hasSavedDetails?: boolean;
  className?: string;
};

function stepHint(
  activeStep: CheckoutProgressStep,
  detailsSubStep: "contact" | "delivery",
  hasSavedDetails: boolean,
): string {
  if (activeStep === 1) {
    if (hasSavedDetails) {
      return "Your saved details are ready. Tap Continue, or Edit to change something.";
    }
    if (detailsSubStep === "contact") {
      return "Enter your contact details, then tap Continue.";
    }
    return "Add your delivery address, then tap Continue to review.";
  }
  if (activeStep === 2) {
    return "Review your cart, then tap Continue to payment below.";
  }
  return "Choose how to pay, then place your order.";
}

/** One-line helper for the active checkout step only. */
export function CheckoutStepHint({
  activeStep,
  detailsSubStep = "contact",
  hasSavedDetails = false,
  className,
}: Props) {
  return (
    <p
      className={cn("text-[11px] leading-snug text-muted-foreground", className)}
      aria-live="polite"
    >
      {stepHint(activeStep, detailsSubStep, hasSavedDetails)}
    </p>
  );
}
