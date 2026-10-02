"use client";

import {
  CreditCard,
  MapPin,
  ShoppingBag,
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
      message: "Check your bag and delivery — payment comes on the next step.",
      icon: ShoppingBag,
    };
  }
  if (activeStep === 3) {
    return {
      message: "Placing your order sends the M-Pesa prompt — or switch to pay on delivery.",
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
    <p
      className={cn(
        "flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground",
        className,
      )}
      aria-live="polite"
    >
      <Icon className="mt-0.5 size-3 shrink-0 text-primary/70" aria-hidden />
      <span className="min-w-0">{message}</span>
    </p>
  );
}
