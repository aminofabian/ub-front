"use client";

import {
  CreditCard,
  MapPin,
  Package,
  Sparkles,
  User,
} from "lucide-react";

import type { CheckoutProgressStep } from "@/components/storefront/checkout-progress-steps";
import { cn } from "@/lib/utils";

type Props = {
  activeStep: CheckoutProgressStep;
  detailsSubStep?: "contact" | "delivery";
  hasSavedDetails?: boolean;
  className?: string;
};

function stepHint(
  activeStep: CheckoutProgressStep,
  detailsSubStep: "contact" | "delivery",
  hasSavedDetails: boolean,
): { message: string; icon: typeof User } {
  if (activeStep === 1) {
    if (hasSavedDetails) {
      return {
        message: "Saved details loaded — tap Continue or Edit if something changed.",
        icon: Sparkles,
      };
    }
    if (detailsSubStep === "contact") {
      return {
        message: "Start with email and phone so we can confirm your order.",
        icon: User,
      };
    }
    return {
      message: "Pick your area, then add street details for the rider.",
      icon: MapPin,
    };
  }
  if (activeStep === 2) {
    return {
      message: "Check items and total, then continue to payment.",
      icon: Package,
    };
  }
  if (activeStep === 3) {
    return {
      message: "M-Pesa is recommended — or choose pay on delivery.",
      icon: CreditCard,
    };
  }
  return {
    message: "Choose payment and place your order.",
    icon: CreditCard,
  };
}

/** Contextual helper for the active checkout step. */
export function CheckoutStepHint({
  activeStep,
  detailsSubStep = "contact",
  hasSavedDetails = false,
  className,
}: Props) {
  const { message, icon: Icon } = stepHint(
    activeStep,
    detailsSubStep,
    hasSavedDetails,
  );

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border/50 bg-muted/25 px-2.5 py-2",
        className,
      )}
      aria-live="polite"
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-3" aria-hidden />
      </span>
      <p className="min-w-0 text-[11px] leading-snug text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
