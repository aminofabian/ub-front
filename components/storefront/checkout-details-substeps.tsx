"use client";

import { Check, MapPin, User } from "lucide-react";

import { cn } from "@/lib/utils";

type SubStep = "contact" | "delivery";

type Props = {
  active: SubStep;
  contactComplete: boolean;
  deliveryComplete: boolean;
  onSelect?: (step: SubStep) => void;
  className?: string;
};

const STEPS: { id: SubStep; label: string; icon: typeof User }[] = [
  { id: "contact", label: "Contact", icon: User },
  { id: "delivery", label: "Delivery", icon: MapPin },
];

/** Mini navigator inside checkout step 1 (contact → delivery). */
export function CheckoutDetailsSubSteps({
  active,
  contactComplete,
  deliveryComplete,
  onSelect,
  className,
}: Props) {
  const doneFor = (id: SubStep) =>
    id === "contact" ? contactComplete : deliveryComplete;

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1",
        className,
      )}
      role="tablist"
      aria-label="Checkout details"
    >
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = active === step.id;
        const isDone = doneFor(step.id);
        const canSelect =
          onSelect &&
          (step.id === "contact" || (step.id === "delivery" && contactComplete));

        return (
          <div key={step.id} className="flex min-w-0 flex-1 items-center gap-1">
            {index > 0 ? (
              <div
                className={cn(
                  "mx-0.5 h-px w-3 shrink-0 rounded-full sm:w-4",
                  contactComplete ? "bg-primary/50" : "bg-border",
                )}
                aria-hidden
              />
            ) : null}
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={!canSelect}
              onClick={() => canSelect && onSelect?.(step.id)}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors",
                isActive &&
                  "bg-background text-foreground shadow-sm ring-1 ring-border/50",
                !isActive && isDone && "text-primary",
                !isActive && !isDone && "text-muted-foreground",
                canSelect && !isActive && "hover:bg-background/70",
                !canSelect && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full",
                  isActive && "bg-primary/10 text-primary",
                  !isActive && isDone && "bg-primary text-white",
                  !isActive && !isDone && "bg-muted text-muted-foreground",
                )}
              >
                {isDone && !isActive ? (
                  <Check className="size-3 stroke-[3]" aria-hidden />
                ) : (
                  <Icon className="size-3" aria-hidden />
                )}
              </span>
              <span className="truncate">{step.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
