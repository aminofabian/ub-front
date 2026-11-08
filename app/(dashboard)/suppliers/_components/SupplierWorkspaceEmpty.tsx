"use client";

import { Plus } from "lucide-react";

import type { SupplierRecord } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * The right-hand pane before a supplier is picked. The directory, the header
 * actions, and this pane each say one thing — this one just points at the
 * directory and offers the single next step.
 */
export function SupplierWorkspaceEmpty({
  canWrite,
  canOpenNewSupply: _canOpenNewSupply,
  canReadCatalog: _canReadCatalog,
  totalCount,
  suggestions: _suggestions,
  onSelectSupplier: _onSelectSupplier,
  onNewSupplier,
  onNewSupply: _onNewSupply,
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
  const hasSuppliers = totalCount > 0;
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
          "mx-auto my-auto flex w-full max-w-[26rem] flex-col gap-5",
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
            {hasSuppliers ? "Select a supplier" : "Start with a supplier"}
          </h2>
          <p className="max-w-[38ch] text-[13px] leading-relaxed text-[var(--op-muted)]">
            {hasSuppliers
              ? "Pick a name in the directory — profile, products, payment, and history open here."
              : "Add who you buy from. A name is enough; payment details make paying them one tap later."}
          </p>
        </div>

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

        {hasSuppliers && !compact ? (
          <p className="flex items-center gap-1.5 text-[11px] leading-snug text-[var(--op-muted)]">
            <kbd className="rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--op-muted)]">
              /
            </kbd>
            searches the directory from anywhere on this page.
          </p>
        ) : null}
      </div>
    </div>
  );
}
