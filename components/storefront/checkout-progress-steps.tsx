import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Details" },
  { id: 2, label: "Review" },
  { id: 3, label: "Confirm" },
] as const;

export type CheckoutProgressStep = (typeof STEPS)[number]["id"];

type Props = {
  /** 1-based index of the active step during checkout (1–3). Ignored when `complete` is true. */
  activeStep?: CheckoutProgressStep;
  /** When true, all steps show as completed (order placed). */
  complete?: boolean;
  /** Show only the current step (wizard mode) instead of the full 3-step rail. */
  focused?: boolean;
  className?: string;
  /** Tighter stepper for mobile checkout */
  compact?: boolean;
  /** Checkout header: smaller circles; hide inactive labels on narrow screens */
  dense?: boolean;
};

export function CheckoutProgressSteps({
  activeStep = 1,
  complete = false,
  focused = false,
  className,
  compact = false,
  dense = false,
}: Props) {
  if (focused && !complete) {
    const step = STEPS.find((s) => s.id === activeStep) ?? STEPS[0];
    const pct = Math.round((activeStep / STEPS.length) * 100);
    return (
      <div
        className={cn("min-w-0", className)}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={activeStep}
        aria-label={`Checkout step ${activeStep} of ${STEPS.length}: ${step.label}`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-semibold text-foreground">
            Step {activeStep} of {STEPS.length}
            <span className="font-normal text-muted-foreground">
              {" "}
              · {step.label}
            </span>
          </p>
          <span className="shrink-0 text-[10px] font-bold tabular-nums text-primary/80">
            {pct}%
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full bg-linear-to-r from-primary/80 to-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  const tight = compact || dense;
  return (
    <ol
      className={cn(
        "flex w-full min-w-0 items-center",
        tight ? "max-w-full gap-0" : "max-w-xl",
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
                tight ? (dense ? "gap-0.5" : "gap-1") : "flex-col gap-2 sm:flex-row sm:gap-2.5",
              )}
            >
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full font-semibold transition-colors",
                  dense ? "size-5 text-[9px]" : tight ? "size-5 text-[10px]" : "size-9 text-sm",
                  isDone &&
                    (tight
                      ? "bg-primary text-white ring-1 ring-primary/25"
                      : "bg-primary text-white shadow-sm ring-2 ring-primary/20"),
                  isCurrent &&
                    !isDone &&
                    (tight
                      ? "bg-primary text-white ring-1 ring-primary/25"
                      : "bg-primary text-white shadow-md ring-4 ring-primary/15"),
                  !isDone &&
                    !isCurrent &&
                    (tight
                      ? "border border-border/60 bg-background text-muted-foreground"
                      : "border-2 border-border bg-muted/50 text-muted-foreground"),
                )}
              >
                {isDone ? (
                  <Check
                    className={
                      dense ? "size-2.5 stroke-[3]" : tight ? "size-3 stroke-[3]" : "size-4 stroke-[3]"
                    }
                    aria-hidden
                  />
                ) : (
                  <span>{stepNum}</span>
                )}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap font-semibold",
                  tight
                    ? "text-[10px] leading-none"
                    : "text-center text-xs sm:text-sm",
                  dense && !isCurrent && !isDone && "max-sm:hidden",
                  dense && isDone && "max-sm:hidden",
                  isDone && "text-primary",
                  !isDone && isCurrent && "text-foreground",
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
                  tight ? "mx-0.5 min-w-1.5" : "mx-1 min-w-[0.75rem] sm:mx-2",
                  connectorAfterDone
                    ? tight
                      ? "h-px bg-primary/80"
                      : "h-0.5 bg-primary"
                    : "h-0.5 bg-border/80",
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
