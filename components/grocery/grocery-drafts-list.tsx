"use client";

import { useRouter } from "next/navigation";
import { ShoppingBasket, User, Clock, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GroceryDraftSummaryResponse } from "@/lib/grocery-draft-api";

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatCurrency(currency: string, n: number): string {
  if (!Number.isFinite(n)) return `${currency} 0.00`;
  return `${currency} ${n.toFixed(2)}`;
}

export type GroceryDraftsListProps = {
  drafts: GroceryDraftSummaryResponse[];
  currency: string;
  loading: boolean;
  onCancel?: (id: string) => void;
};

export function GroceryDraftsList({
  drafts,
  currency,
  loading,
  onCancel,
}: GroceryDraftsListProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="mb-3 size-8 animate-spin text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">Loading drafts…</p>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <ShoppingBasket className="mb-3 size-8 text-muted-foreground/50" strokeWidth={1.5} />
        <p className="text-sm font-medium text-foreground">No building drafts</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          In-progress carts appear here before an invoice is generated.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Counter #</th>
            <th className="px-4 py-3">Clerk</th>
            <th className="px-4 py-3">Items</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Last updated</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {drafts.map((d) => (
            <tr key={d.id} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <span className="font-semibold tabular-nums">
                  Counter #{d.counterNumber}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <User className="size-3.5 text-muted-foreground" />
                  <span>{d.createdByName ?? "Unknown"}</span>
                </div>
              </td>
              <td className="px-4 py-3 tabular-nums">{d.lineCount}</td>
              <td className="px-4 py-3 font-medium tabular-nums">
                {formatCurrency(d.currency || currency, d.grandTotal)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-3.5" />
                  <span>{formatDateTime(d.updatedAt)}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/grocery?resumeDraft=${d.id}`)}
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    Open
                  </button>
                  {onCancel && (
                    <button
                      type="button"
                      onClick={() => onCancel(d.id)}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-xs font-medium",
                        "border border-destructive/30 text-destructive hover:bg-destructive/5",
                      )}
                      aria-label="Cancel draft"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
