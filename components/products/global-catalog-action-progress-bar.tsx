"use client";

import { Check, Loader2, PackagePlus, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GlobalCatalogAdoptProgress } from "@/lib/api";

export type CatalogActionPhase =
  | "loading"
  | "selecting"
  | "ready"
  | "reviewing"
  | "importing"
  | "done";

const STEPS = [
  { id: "select", label: "Select" },
  { id: "review", label: "Review" },
  { id: "import", label: "Import" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type GlobalCatalogActionProgressBarProps = {
  phase: CatalogActionPhase;
  selectedCount: number;
  totalCount: number;
  importProgress?: GlobalCatalogAdoptProgress | null;
  canImport: boolean;
  onReview: () => void;
  onClear: () => void;
  className?: string;
};

function activeStepId(phase: CatalogActionPhase): StepId {
  if (phase === "reviewing") return "review";
  if (phase === "importing" || phase === "done") return "import";
  return "select";
}

function stepState(
  stepId: StepId,
  phase: CatalogActionPhase,
): "done" | "active" | "upcoming" {
  const order: StepId[] = ["select", "review", "import"];
  const active = activeStepId(phase);
  const stepIndex = order.indexOf(stepId);
  const activeIndex = order.indexOf(active);

  if (phase === "done") return "done";
  if (stepIndex < activeIndex) return "done";
  if (stepIndex === activeIndex) return "active";
  return "upcoming";
}

function progressPercent(params: {
  phase: CatalogActionPhase;
  selectedCount: number;
  totalCount: number;
  importProgress?: GlobalCatalogAdoptProgress | null;
}): number {
  const { phase, selectedCount, totalCount, importProgress } = params;
  if (phase === "done") return 100;
  if (phase === "importing" && importProgress) {
    return Math.min(99, Math.max(68, 68 + importProgress.percent * 0.32));
  }
  if (phase === "reviewing") return 58;
  if (phase === "selecting" || phase === "ready" || phase === "loading") {
    const total = Math.max(totalCount, 1);
    const share = Math.min(1, selectedCount / total);
    return Math.round(8 + share * 40);
  }
  return 8;
}

function statusCopy(params: {
  phase: CatalogActionPhase;
  selectedCount: number;
  totalCount: number;
  importProgress?: GlobalCatalogAdoptProgress | null;
}): { title: string; detail: string } {
  const { phase, selectedCount, totalCount, importProgress } = params;

  if (phase === "done") {
    return {
      title: "Import complete",
      detail: "Products are ready in your catalog.",
    };
  }

  if (phase === "importing") {
    const processed = importProgress?.processed ?? 0;
    const total = importProgress?.total ?? Math.max(selectedCount, 1);
    return {
      title:
        importProgress?.phase === "finishing"
          ? "Finishing import…"
          : importProgress?.phase === "queued"
            ? "Queuing import…"
            : "Importing products…",
      detail: `${Math.min(processed, total)} of ${total} added to your shop`,
    };
  }

  if (phase === "reviewing") {
    return {
      title: "Review before import",
      detail: "Confirm prices in the dialog, then import to your shop.",
    };
  }

  if (phase === "selecting") {
    return {
      title: "Selecting products to sell…",
      detail: `${selectedCount} of ${Math.max(totalCount, selectedCount)} marked`,
    };
  }

  if (phase === "loading") {
    return {
      title: "Loading starter pack…",
      detail: "Getting products ready for you.",
    };
  }

  return {
    title:
      selectedCount > 0
        ? `${selectedCount} ready to sell`
        : "Select products to import",
    detail:
      selectedCount > 0
        ? "Uncheck anything you don't carry, then review & import."
        : "Pick a pack or tick products below.",
  };
}

export function GlobalCatalogActionProgressBar({
  phase,
  selectedCount,
  totalCount,
  importProgress = null,
  canImport,
  onReview,
  onClear,
  className,
}: GlobalCatalogActionProgressBarProps) {
  const percent = progressPercent({
    phase,
    selectedCount,
    totalCount,
    importProgress,
  });
  const copy = statusCopy({
    phase,
    selectedCount,
    totalCount,
    importProgress,
  });
  const busy =
    phase === "loading" || phase === "selecting" || phase === "importing";
  const showActions = phase === "ready" && selectedCount > 0;

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-xl overflow-hidden rounded-2xl border border-primary/30 bg-card/95 shadow-lg backdrop-blur-md",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        {STEPS.map((step, index) => {
          const state = stepState(step.id, phase);
          return (
            <div key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums transition-colors",
                    state === "done" &&
                      "bg-emerald-500 text-white",
                    state === "active" &&
                      "bg-primary text-primary-foreground",
                    state === "upcoming" &&
                      "bg-muted text-muted-foreground",
                  )}
                >
                  {state === "done" ? (
                    <Check className="size-3" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    "truncate text-[11px] font-medium",
                    state === "upcoming"
                      ? "text-muted-foreground"
                      : "text-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "h-px min-w-3 flex-1",
                    state === "done" ? "bg-emerald-500/50" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="px-3 pb-2.5 pt-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {busy ? (
                <Loader2
                  className="size-3.5 shrink-0 animate-spin text-primary"
                  aria-hidden
                />
              ) : phase === "done" ? (
                <Check
                  className="size-3.5 shrink-0 text-emerald-600"
                  aria-hidden
                />
              ) : (
                <ShoppingCart
                  className="size-3.5 shrink-0 text-primary"
                  aria-hidden
                />
              )}
              <span className="truncate">{copy.title}</span>
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {copy.detail}
            </p>
          </div>
          {showActions ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                size="sm"
                className="h-8 gap-1.5 rounded-full"
                disabled={!canImport}
                onClick={onReview}
              >
                <PackagePlus className="size-3.5" />
                Review &amp; import
                {selectedCount > 0 ? ` (${selectedCount})` : ""}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-full text-xs"
                onClick={onClear}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </div>

        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-foreground/5 ring-1 ring-inset ring-foreground/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Catalog import progress"
        >
          <div
            className={cn(
              "relative h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 transition-[width] duration-300 ease-out",
              busy && "after:animate-shimmer after:absolute after:inset-0",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
