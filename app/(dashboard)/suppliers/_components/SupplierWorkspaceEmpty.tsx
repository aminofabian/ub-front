"use client";

import Link from "next/link";
import {
  BookUser,
  Link2,
  PackagePlus,
  Plus,
  Search,
  Truck,
} from "lucide-react";

import type { SupplierRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { statusBadgeClass, statusDotClass } from "./supplier-ui-tokens";

const STEPS = [
  {
    n: 1,
    title: "Pick a vendor",
    body: "Search or tap a name in the directory.",
  },
  {
    n: 2,
    title: "Review the record",
    body: "Check contacts, payment details, and purchase history.",
  },
  {
    n: 3,
    title: "Link & receive",
    body: "Attach products, then post supply on the receive till.",
  },
] as const;

export function SupplierWorkspaceEmpty({
  canWrite,
  canOpenNewSupply,
  canReadCatalog,
  totalCount,
  suggestions,
  onSelectSupplier,
  onNewSupplier,
  onNewSupply,
  compact = false,
  className,
}: {
  canWrite: boolean;
  canOpenNewSupply: boolean;
  canReadCatalog: boolean;
  totalCount: number;
  suggestions: SupplierRecord[];
  onSelectSupplier: (id: string) => void;
  onNewSupplier: () => void;
  onNewSupply: () => void;
  /** Tighter layout for stacking under the directory on small screens. */
  compact?: boolean;
  className?: string;
}) {
  const picks = suggestions.slice(0, compact ? 4 : 6);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain",
        "bg-[color-mix(in_srgb,var(--muted)_35%,var(--card))]",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-2xl flex-col gap-4",
          compact ? "p-3 sm:p-4" : "p-4 sm:p-6 lg:p-8",
        )}
      >
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Workspace
          </p>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {totalCount > 0 ? "Select a supplier" : "Start with a supplier"}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {totalCount > 0
              ? "Choose a vendor from the directory to open profile, contacts, catalog links, and purchase history in one place."
              : "Add your first vendor to track purchases, link products, and receive stock."}
          </p>
        </div>

        <div
          className={cn(
            "grid gap-2",
            compact ? "grid-cols-1 sm:grid-cols-2" : "sm:grid-cols-2",
          )}
        >
          {canWrite ? (
            <Button
              type="button"
              className="h-10 justify-start gap-2 rounded-none px-3 font-semibold"
              onClick={onNewSupplier}
            >
              <Plus className="size-3.5" aria-hidden />
              New supplier
            </Button>
          ) : null}
          {canOpenNewSupply ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 justify-start gap-2 rounded-none px-3 font-medium"
              onClick={onNewSupply}
            >
              <PackagePlus className="size-3.5" aria-hidden />
              New supply
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-10 justify-start gap-2 rounded-none px-3 font-medium"
            onClick={() =>
              document.getElementById("supplier-directory-search")?.focus()
            }
          >
            <Search className="size-3.5" aria-hidden />
            Search directory
            <kbd className="ml-auto hidden rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
              /
            </kbd>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 justify-start gap-2 rounded-none px-3 font-medium"
            asChild
          >
            <Link href={APP_ROUTES.supplierDirectory}>
              <Truck className="size-3.5" aria-hidden />
              Receive till
            </Link>
          </Button>
        </div>

        {picks.length > 0 ? (
          <section className="overflow-hidden border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-[#e8eef5] px-2.5 py-1.5 dark:bg-muted/40">
              <div className="flex items-center gap-1.5">
                <BookUser
                  className="size-3.5 text-muted-foreground"
                  aria-hidden
                />
                <h3 className="text-xs font-semibold tracking-tight text-foreground">
                  Jump to a vendor
                </h3>
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {totalCount.toLocaleString()} total
              </span>
            </div>
            <ul className="divide-y divide-border/70">
              {picks.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSupplier(row.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors",
                      "hover:bg-[#e8f0fe] dark:hover:bg-muted/30",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        statusDotClass(row.status),
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {row.name}
                    </span>
                    {row.code ? (
                      <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:inline">
                        {row.code}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "shrink-0 rounded-none px-1.5 py-0.5 text-[10px] font-medium capitalize",
                        statusBadgeClass(row.status),
                      )}
                    >
                      {row.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <ol
          className={cn(
            "grid gap-2",
            compact ? "grid-cols-1" : "sm:grid-cols-3",
          )}
        >
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="border border-border bg-card px-2.5 py-2.5"
            >
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <span className="flex size-4 items-center justify-center bg-primary text-[9px] font-bold text-primary-foreground">
                  {step.n}
                </span>
                {step.title}
              </p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        {canReadCatalog ? (
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
            <Link2 className="mt-0.5 size-3 shrink-0 opacity-70" aria-hidden />
            After you select a supplier, use Catalog to link products and set
            primary vendors.
          </p>
        ) : null}
      </div>
    </div>
  );
}
