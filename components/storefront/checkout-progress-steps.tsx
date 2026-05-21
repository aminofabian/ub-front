import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Details" },
  { id: 2, label: "Review" },
  { id: 3, label: "Confirm" },
] as const;

type Props = {
  /** 1-based index of the active step during checkout (1–3). Ignored when `complete` is true. */
  activeStep?: 1 | 2 | 3;
  /** When true, all steps show as completed (order placed). */
  complete?: boolean;
  className?: string;
  /** Tighter stepper for mobile checkout */
  compact?: boolean;
};

export function CheckoutProgressSteps({
  activeStep = 1,
  complete = false,
  className,
  compact = false,
}: Props) {
  return (
    <ol
      className={cn(
        "flex w-full min-w-0 items-center",
        compact ? "max-w-full gap-0" : "max-w-xl",
        className,
      )}
      aria-label="Checkout progress"
    >
      {STEPS.map((step, i) => {
        const stepNum = step.id;
        const isDone = complete || stepNum < activeStep;
        const isCurrent = !complete && stepNum === activeStep;
        const connectorAfterDone = complete || activeStep > stepNum;

        return (
          <li key={step.id} className="flex flex-1 items-center last:flex-none">
            <div
              className={cn(
                "flex items-center",
                compact ? "gap-1" : "flex-col gap-2 sm:flex-row sm:gap-2.5",
              )}
            >
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full font-semibold transition-colors",
                  compact ? "size-6 text-[10px]" : "size-9 text-sm",
                  complete &&
                    isDone &&
                    (compact
                      ? "bg-emerald-600 text-white dark:bg-emerald-500"
                      : "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/25 dark:bg-emerald-500 dark:ring-emerald-400/30"),
                  !complete &&
                    isDone &&
                    "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500",
                  isCurrent &&
                    !isDone &&
                    (compact
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/20"
                      : "bg-primary text-primary-foreground shadow-md ring-4 ring-primary/15"),
                  !isDone &&
                    !isCurrent &&
                    (compact
                      ? "border border-border bg-muted/50 text-muted-foreground"
                      : "border-2 border-border bg-muted/50 text-muted-foreground"),
                )}
              >
                {isDone ? (
                  <Check
                    className={compact ? "size-3 stroke-[3]" : "size-4 stroke-[3]"}
                    aria-hidden
                  />
                ) : (
                  <span>{stepNum}</span>
                )}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap font-semibold",
                  compact
                    ? "text-[10px] leading-none"
                    : "text-center text-xs sm:text-sm",
                  complete &&
                    isDone &&
                    "text-emerald-700 dark:text-emerald-400",
                  !complete && isCurrent && "text-foreground",
                  !complete &&
                    isDone &&
                    "text-emerald-700 dark:text-emerald-400",
                  !isDone && !isCurrent && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "min-h-px flex-1 rounded-full",
                  compact ? "mx-0.5 min-w-2" : "mx-1 min-w-[0.75rem] sm:mx-2",
                  complete && connectorAfterDone
                    ? compact
                      ? "h-px bg-emerald-500"
                      : "h-0.5 bg-emerald-500"
                    : connectorAfterDone
                      ? "h-px bg-emerald-500/70"
                      : "h-px bg-border",
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
