"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { cn } from "@/lib/utils";

export type ReceiptPrinterStage = "processing" | "printing" | "complete";
export type ReceiptFeedMotion = "smooth" | "stepped";

export type ReceiptPrinterRootProps = Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> & {
  /** Disables all stage transitions when false. */
  animate?: boolean;
  children: ReactNode;
  /** Controls whether the paper feeds continuously or one line at a time. */
  feedMotion?: ReceiptFeedMotion;
  /** Current state of the printer. */
  stage: ReceiptPrinterStage;
};

export type ReceiptPrinterMachineProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterHeaderProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterScreenProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterOutputProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterPaperProps = ComponentPropsWithoutRef<"article">;

export type ReceiptPrinterStatusProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  /** Custom status content. Defaults to a label derived from the current stage. */
  children?: ReactNode;
};

type ReceiptPrinterContextValue = {
  animate: boolean;
  feedMotion: ReceiptFeedMotion;
  shouldMove: boolean;
  stage: ReceiptPrinterStage;
};

const ReceiptPrinterContext = createContext<ReceiptPrinterContextValue | null>(
  null,
);

const receiptToothCount = 40;
const receiptToothDepth = 4;
const receiptToothPoints = Array.from(
  { length: receiptToothCount * 2 },
  (_, index) => {
    const x = 100 - ((index + 1) * 100) / (receiptToothCount * 2);
    const y = index % 2 === 0 ? "100%" : `calc(100% - ${receiptToothDepth}px)`;

    return `${x}% ${y}`;
  },
).join(", ");
const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${receiptToothDepth}px), ${receiptToothPoints})`;

const statusLabels: Record<ReceiptPrinterStage, ReactNode> = {
  processing: "Recording your sale",
  printing: "Printing your receipt",
  complete: "Sale complete",
};

const machineClassName =
  "relative isolate w-full overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,var(--background))] p-3 pb-7 shadow-[0_12px_28px_-18px_color-mix(in_srgb,var(--pos-ink,#1c1915)_35%,transparent),inset_0_1px_0_color-mix(in_srgb,white_55%,transparent)] [--printer-inner-radius:0px] [--printer-inset:0.75rem] before:pointer-events-none before:absolute before:inset-0 before:z-0 before:bg-[url('/textures/plastic-noise.svg')] before:bg-[length:180px_180px] before:bg-repeat before:opacity-25 before:mix-blend-multiply before:content-[''] print:hidden dark:border-border/50 dark:bg-muted/40 dark:before:opacity-15 dark:before:mix-blend-soft-light";

function useReceiptPrinter(component: string) {
  const context = useContext(ReceiptPrinterContext);

  if (!context) {
    throw new Error(`${component} must be used inside ReceiptPrinter.Root.`);
  }

  return context;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return reduced;
}

function ReceiptPrinterRoot({
  "aria-label": ariaLabel = "Receipt printer",
  animate = true,
  children,
  className,
  feedMotion = "stepped",
  stage,
  ...props
}: ReceiptPrinterRootProps) {
  const shouldReduceMotion = usePrefersReducedMotion();
  const context = {
    animate,
    feedMotion,
    shouldMove: animate && !shouldReduceMotion,
    stage,
  };

  return (
    <ReceiptPrinterContext.Provider value={context}>
      <section
        aria-label={ariaLabel}
        className={cn(
          "receipt-printer relative isolate flex w-full max-w-sm flex-col items-center",
          className,
        )}
        data-animate={context.shouldMove ? "true" : "false"}
        data-feed={feedMotion}
        data-stage={stage}
        {...props}
      >
        {children}
      </section>
    </ReceiptPrinterContext.Provider>
  );
}

function ReceiptPrinterMachine({
  children,
  className,
  ...props
}: ReceiptPrinterMachineProps) {
  return (
    <div className={cn(machineClassName, className)} {...props}>
      {children}
      <div
        aria-hidden="true"
        className="absolute inset-x-5 bottom-3 z-40 h-1.5 rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_55%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_78%,#000)] shadow-inner dark:border-border dark:bg-foreground/80"
      />
    </div>
  );
}

function ReceiptPrinterHeader({
  children,
  className,
  ...props
}: ReceiptPrinterHeaderProps) {
  return (
    <div
      className={cn(
        "relative z-10 flex h-10 items-start justify-between",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function ReceiptPrinterScreen({
  children,
  className,
  ...props
}: ReceiptPrinterScreenProps) {
  return (
    <div
      className={cn(
        "relative z-10 isolate overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_45%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_88%,#000)] p-3 text-[color-mix(in_srgb,white_88%,transparent)] shadow-inner after:pointer-events-none after:absolute after:inset-0 after:z-20 after:shadow-[inset_0_0_20px_4px_rgba(0,0,0,0.45)] after:content-[''] dark:border-border dark:bg-zinc-950",
        className,
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function StatusIndicator({
  animate,
  stage,
}: {
  animate: boolean;
  stage: ReceiptPrinterStage;
}) {
  const isComplete = stage === "complete";

  return (
    <span
      aria-hidden="true"
      className="relative grid size-5 shrink-0 place-items-center"
    >
      {isComplete ? (
        <CheckCircle2
          className={cn(
            "size-[18px] text-[var(--pos-primary,#0f766e)]",
            animate && "receipt-printer-status-pop",
          )}
          strokeWidth={2.25}
        />
      ) : (
        <Loader2
          className={cn(
            "size-[18px] text-white/70",
            animate && "animate-spin motion-reduce:animate-none",
          )}
          strokeWidth={2.5}
        />
      )}
    </span>
  );
}

function ReceiptPrinterStatus({
  children,
  className,
  ...props
}: ReceiptPrinterStatusProps) {
  const { animate, stage } = useReceiptPrinter("ReceiptPrinter.Status");

  return (
    <div
      className={cn("flex min-w-0 items-center gap-2", className)}
      {...props}
    >
      <StatusIndicator animate={animate} stage={stage} />
      <div
        aria-live="polite"
        className="grid min-w-0 flex-1 items-center"
        role="status"
      >
        <div
          className={cn(
            "truncate font-medium text-[11px] leading-none text-white/80",
            animate && "receipt-printer-status-label",
          )}
          key={stage}
        >
          {children ?? statusLabels[stage]}
        </div>
      </div>
    </div>
  );
}

function ReceiptPrinterPaper({
  children,
  className,
  style,
  ...props
}: ReceiptPrinterPaperProps) {
  return (
    <article
      className={cn(
        "relative z-10 min-h-80 bg-[#f7f4ee] bg-[url('/textures/receipt-paper.svg')] bg-cover px-4 pt-5 pb-7 font-mono text-[11px] leading-snug text-black bg-blend-soft-light print:min-h-0 print:bg-white print:bg-none print:px-0 print:py-0 print:pb-0 print:pt-0",
        className,
      )}
      style={{ clipPath: receiptClipPath, ...style }}
      {...props}
    >
      {children}
    </article>
  );
}

function ReceiptPrinterOutput({
  children,
  className,
  ...props
}: ReceiptPrinterOutputProps) {
  const { stage } = useReceiptPrinter("ReceiptPrinter.Output");
  const isReceiptVisible = stage !== "processing";

  return (
    <div
      className={cn(
        "receipt-printer-output relative z-50 -mt-3 w-[calc(80%+2.5rem)] max-w-full px-4",
        stage === "complete"
          ? "h-auto overflow-visible"
          : "h-[min(28rem,70vh)] overflow-hidden",
        className,
      )}
      {...props}
    >
      {isReceiptVisible ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 -top-1 z-20 h-2 bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_55%,transparent)] blur-[6px] print:hidden"
        />
      ) : null}

      <div
        aria-hidden={stage !== "complete"}
        className={cn(
          "receipt-printer-feed relative isolate",
          "before:pointer-events-none before:absolute before:inset-x-2 before:top-2 before:bottom-3 before:z-0 before:shadow-[0_8px_24px_color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] before:content-['']",
          "after:pointer-events-none after:absolute after:right-[8%] after:bottom-0 after:left-[8%] after:z-0 after:h-3 after:translate-y-1.5 after:rounded-full after:bg-black/10 after:blur-lg after:content-[''] print:before:hidden print:after:hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export const ReceiptPrinter = {
  Header: ReceiptPrinterHeader,
  Machine: ReceiptPrinterMachine,
  Output: ReceiptPrinterOutput,
  Paper: ReceiptPrinterPaper,
  Root: ReceiptPrinterRoot,
  Screen: ReceiptPrinterScreen,
  Status: ReceiptPrinterStatus,
};
