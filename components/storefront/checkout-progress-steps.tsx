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
};

export function CheckoutProgressSteps({
  activeStep = 1,
  complete = false,
}: Props) {
  return (
    <ol
      className="flex w-full max-w-xl items-center"
      aria-label="Checkout progress"
    >
      {STEPS.map((step, i) => {
        const stepNum = step.id;
        const isDone = complete || stepNum < activeStep;
        const isCurrent = !complete && stepNum === activeStep;
        const connectorAfterDone = complete || activeStep > stepNum;

        return (
          <li key={step.id} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-2.5">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  complete &&
                    isDone &&
                    "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/25 dark:bg-emerald-500 dark:ring-emerald-400/30",
                  !complete &&
                    isDone &&
                    "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500",
                  isCurrent &&
                    !isDone &&
                    "bg-primary text-primary-foreground shadow-md ring-4 ring-primary/15",
                  !isDone &&
                    !isCurrent &&
                    "border-2 border-border bg-muted/50 text-muted-foreground",
                )}
              >
                {isDone ? (
                  <Check className="size-4 stroke-[3]" aria-hidden />
                ) : (
                  <span>{stepNum}</span>
                )}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-center text-xs font-semibold sm:text-sm",
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
                  "mx-1 min-h-px min-w-[0.75rem] flex-1 rounded-full sm:mx-2",
                  complete && connectorAfterDone
                    ? "h-0.5 bg-emerald-500"
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
