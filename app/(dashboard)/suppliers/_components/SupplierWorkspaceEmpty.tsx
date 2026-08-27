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
  compact?: boolean;
  className?: string;
}) {
  const picks = suggestions.slice(0, compact ? 4 : 6);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [scrollbar-width:thin]",
        "bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_45%,transparent)]",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-2xl flex-col gap-5",
          compact ? "p-4 sm:p-5" : "p-5 sm:p-8",
        )}
      >
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
            Workspace
          </p>
          <h2 className="font-heading text-xl font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)] sm:text-2xl">
            {totalCount > 0 ? "Select a supplier" : "Start with a supplier"}
          </h2>
          <p className="max-w-md text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
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
              className="h-10 justify-start gap-2 rounded-lg bg-[var(--pos-primary,#0f766e)] px-3 font-semibold hover:bg-[#0d6b63]"
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
              className="h-10 justify-start gap-2 rounded-lg border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 font-medium"
              onClick={onNewSupply}
            >
              <PackagePlus className="size-3.5" aria-hidden />
              New supply
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-10 justify-start gap-2 rounded-lg border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 font-medium"
            onClick={() =>
              document.getElementById("supplier-directory-search")?.focus()
            }
          >
            <Search className="size-3.5" aria-hidden />
            Search directory
            <kbd className="ml-auto hidden rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_50%,transparent)] px-1.5 py-0.5 font-mono text-[10px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)] sm:inline">
              /
            </kbd>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 justify-start gap-2 rounded-lg border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 font-medium"
            asChild
          >
            <Link href={APP_ROUTES.supplierDirectory}>
              <Truck className="size-3.5" aria-hidden />
              Receive till
            </Link>
          </Button>
        </div>

        {picks.length > 0 ? (
          <section className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_55%,transparent)] px-3 py-2">
              <div className="flex items-center gap-1.5">
                <BookUser
                  className="size-3.5 text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]"
                  aria-hidden
                />
                <h3 className="text-xs font-semibold tracking-tight text-[var(--order-ink,#15231f)]">
                  Jump to a vendor
                </h3>
              </div>
              <span className="text-[10px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                {totalCount.toLocaleString()} total
              </span>
            </div>
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)]">
              {picks.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSupplier(row.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors",
                      "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,transparent)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)]",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        statusDotClass(row.status),
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--order-ink,#15231f)]">
                      {row.name}
                    </span>
                    {row.code ? (
                      <span className="hidden shrink-0 font-mono text-[10px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)] sm:inline">
                        {row.code}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
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
              className="rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white px-3 py-3 shadow-sm"
            >
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
                <span className="flex size-5 items-center justify-center rounded-full bg-[var(--order-ink,#15231f)] text-[9px] font-bold text-white">
                  {step.n}
                </span>
                {step.title}
              </p>
              <p className="mt-1.5 text-xs leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        {canReadCatalog ? (
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
            <Link2 className="mt-0.5 size-3 shrink-0 opacity-70" aria-hidden />
            After you select a supplier, use Catalog to link products and set
            primary vendors.
          </p>
        ) : null}
      </div>
    </div>
  );
}
