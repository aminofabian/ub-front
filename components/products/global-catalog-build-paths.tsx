"use client";

import {
  ArrowRight,
  Package,
  PenLine,
  Search,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CatalogBuildPathId = "scratch" | "pack" | "browse";

type GlobalCatalogBuildPathsProps = {
  className?: string;
  compact?: boolean;
  suggestedPackName?: string | null;
  onScratch: () => void;
  onPack: () => void;
  onBrowse: () => void;
};

/**
 * Interactive chooser for how to stock shelves from the global catalog page.
 */
export function GlobalCatalogBuildPaths({
  className,
  compact = false,
  suggestedPackName,
  onScratch,
  onPack,
  onBrowse,
}: GlobalCatalogBuildPathsProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-2",
          className,
        )}
      >
        <Button size="sm" className="gap-1.5 shadow-sm" onClick={onScratch}>
          <PenLine className="size-3.5" />
          Add from scratch
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onPack}>
          <Package className="size-3.5" />
          {suggestedPackName ? `Open ${suggestedPackName}` : "Starter pack"}
        </Button>
        <Button size="sm" variant="ghost" className="gap-1.5" onClick={onBrowse}>
          <Search className="size-3.5" />
          Browse all
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-b from-muted/40 via-card to-card p-5 sm:p-7",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.12),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 size-48 rounded-full bg-[radial-gradient(circle_at_center,hsl(160_60%_40%/0.1),transparent_70%)]"
      />

      <div className="relative mb-5 text-center sm:mb-6">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl border border-primary/25 bg-background/80 shadow-sm">
          <Sparkles className="size-4 text-primary" />
        </div>
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">
          How do you want to stock the shelves?
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          Invent one SKU, import a starter pack, or hunt the full catalog —
          your call.
        </p>
      </div>

      <button
        type="button"
        onClick={onScratch}
        className={cn(
          "group relative mb-2.5 w-full overflow-hidden rounded-2xl border border-emerald-500/30 bg-background/90 p-4 text-left outline-none transition-all",
          "hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-md",
          "focus-visible:ring-2 focus-visible:ring-primary/40",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-400",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/12 via-transparent to-transparent"
        />
        <div className="relative flex items-start gap-3 sm:items-center">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 transition-transform group-hover:scale-105">
            <PenLine className="size-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">Create from scratch</p>
              <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                Fastest for one-offs
              </span>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Your name, price, and stock — no template required. Perfect when
              the catalog doesn’t have your local brand yet.
            </p>
          </div>
          <span className="mt-1 hidden shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-700 transition-all group-hover:gap-1.5 dark:text-emerald-400 sm:inline-flex">
            Start
            <ArrowRight className="size-3" />
          </span>
        </div>
      </button>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={onPack}
          style={{ animationDelay: "70ms" }}
          className={cn(
            "group relative overflow-hidden rounded-2xl border border-border/80 bg-background/80 p-4 text-left outline-none transition-all",
            "hover:-translate-y-0.5 hover:border-sky-500/40 hover:shadow-md",
            "focus-visible:ring-2 focus-visible:ring-primary/40",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-400",
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/12 via-transparent to-transparent opacity-90"
          />
          <div className="relative">
            <div className="mb-3 flex size-9 items-center justify-center rounded-xl border bg-background/90 transition-transform group-hover:scale-105">
              <Package className="size-4" />
            </div>
            <p className="text-sm font-semibold leading-snug">
              Import a starter pack
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {suggestedPackName
                ? `Jump into ${suggestedPackName} and tick what you sell.`
                : "Grab a curated bundle matched to your shop type."}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 transition-all group-hover:gap-1.5 dark:text-sky-400">
              Open pack
              <ArrowRight className="size-3" />
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onBrowse}
          style={{ animationDelay: "140ms" }}
          className={cn(
            "group relative overflow-hidden rounded-2xl border border-border/80 bg-background/80 p-4 text-left outline-none transition-all",
            "hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md",
            "focus-visible:ring-2 focus-visible:ring-primary/40",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-400",
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/12 via-transparent to-transparent opacity-90"
          />
          <div className="relative">
            <div className="mb-3 flex size-9 items-center justify-center rounded-xl border bg-background/90 transition-transform group-hover:scale-105">
              <Search className="size-4" />
            </div>
            <p className="text-sm font-semibold leading-snug">
              Hunt the full catalog
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Search by name, brand, or barcode across every template.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 transition-all group-hover:gap-1.5 dark:text-amber-400">
              Start searching
              <ArrowRight className="size-3" />
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
