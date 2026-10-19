"use client";

import Link from "next/link";
import { PackagePlus, Plus, Search, Truck } from "lucide-react";

import type { SupplierRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function SupplierWorkspaceEmpty({
  canWrite,
  canOpenNewSupply,
  canReadCatalog: _canReadCatalog,
  totalCount,
  suggestions: _suggestions,
  onSelectSupplier: _onSelectSupplier,
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
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [scrollbar-width:thin]",
        "bg-[var(--op-surface)]",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto my-auto flex w-full max-w-[28rem] flex-col gap-6",
          compact ? "p-4 sm:p-5" : "p-5 sm:p-8",
        )}
      >
        <div className="space-y-2">
          <h2
            className="text-[2rem] font-normal leading-[1.05] tracking-[-0.02em] text-[var(--op-ink)]"
            style={{
              fontFamily:
                'var(--font-cormorant), Georgia, "Times New Roman", serif',
            }}
          >
            {totalCount > 0 ? "Select a supplier" : "Start with a supplier"}
          </h2>
          <p className="max-w-[36ch] text-[13px] leading-relaxed text-[var(--op-muted)]">
            {totalCount > 0
              ? "Pick a name in the directory — profile, contacts, payment, and history open here."
              : "Add who you buy from. A name is enough; payment details make paying them one tap later."}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {canWrite ? (
            <Button
              type="button"
              className="h-11 justify-start gap-2 rounded-[2px] bg-[var(--op-accent)] px-3 font-semibold text-[var(--op-surface)] hover:bg-[color-mix(in_srgb,var(--op-accent)_84%,black)]"
              onClick={onNewSupplier}
            >
              <Plus className="size-3.5" aria-hidden />
              New supplier
            </Button>
          ) : null}
          <div
            className={cn(
              "grid gap-2",
              canOpenNewSupply ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
            )}
          >
            {canOpenNewSupply ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 justify-start gap-2 rounded-[2px] border-[var(--op-rule)] px-3 font-medium"
                onClick={onNewSupply}
              >
                <PackagePlus className="size-3.5" aria-hidden />
                New supply
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-10 justify-start gap-2 rounded-[2px] border-[var(--op-rule)] px-3 font-medium"
              onClick={() =>
                document.getElementById("supplier-directory-search")?.focus()
              }
            >
              <Search className="size-3.5" aria-hidden />
              Search directory
              <kbd className="ml-auto hidden rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--op-muted)] sm:inline">
                /
              </kbd>
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            asChild
            className="h-10 justify-start gap-2 rounded-[2px] border-[var(--op-rule)] px-3 font-medium"
          >
            <Link href={APP_ROUTES.supplierDirectory}>
              <Truck className="size-3.5" aria-hidden />
              Receive till
            </Link>
          </Button>
        </div>

        {totalCount > 0 ? (
          <p className="text-[11px] leading-snug text-[var(--op-muted)]">
            {totalCount.toLocaleString()} vendors in the directory.
          </p>
        ) : null}
      </div>
    </div>
  );
}
