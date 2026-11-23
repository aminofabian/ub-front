"use client";

import { useEffect, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  fetchSupplierPortalVisibility,
  updateSupplierPortalVisibility,
  type SupplierPortalVisibilityPatch,
  type SupplierPortalVisibilityRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type FlagKey = keyof SupplierPortalVisibilityPatch;

const ROWS: ReadonlyArray<{
  key: FlagKey;
  label: string;
  hint: string;
}> = [
  {
    key: "canViewPurchaseHistory",
    label: "Purchase history",
    hint: "Orders, invoices, payments and statements for your shop",
  },
  {
    key: "canViewStockLevels",
    label: "Stock levels",
    hint: "How much of a linked product you hold",
  },
  {
    key: "canViewSalesVelocity",
    label: "Sales velocity",
    hint: "How fast a linked product sells at your till",
  },
];

/**
 * The shop's side of a supplier connection: what this supplier may see of the shop's records.
 *
 * <p>Rendered only when the local supplier is connected to a marketplace passport (the GET answers
 * `connected = false` otherwise). The flags that no portal surface reads yet are deliberately not shown;
 * the API accepts them, and this panel gains a row when the surface lands.
 */
export function SupplierPortalVisibilityPanel({
  supplierId,
  canWrite,
}: {
  supplierId: string;
  canWrite: boolean;
}) {
  const [state, setState] = useState<SupplierPortalVisibilityRecord | null>(null);
  const [saving, setSaving] = useState<FlagKey | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setError("");
    fetchSupplierPortalVisibility(supplierId)
      .then((row) => {
        if (!cancelled) setState(row);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load supplier visibility");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  if (error) {
    return (
      <p className="border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-4 py-3 text-[11px] text-muted-foreground">
        {error}
      </p>
    );
  }
  if (!state?.connected) {
    return null;
  }

  const toggle = async (key: FlagKey) => {
    if (!canWrite || saving) return;
    const next = !state[key];
    setSaving(key);
    try {
      const row = await updateSupplierPortalVisibility(supplierId, { [key]: next });
      setState(row);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save supplier visibility");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section
      aria-label="Supplier portal visibility"
      className="border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white px-4 py-3"
    >
      <div className="flex items-center gap-1.5">
        <Eye className="size-3.5 text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]" aria-hidden />
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
          What this supplier can see
        </h3>
      </div>
      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
        {state.status === "active"
          ? "Applies when they sign in to the supplier portal."
          : "Applies when this connection becomes active."}
      </p>
      <ul className="mt-2 space-y-2">
        {ROWS.map((row) => {
          const checked = Boolean(state[row.key]);
          const busy = saving === row.key;
          return (
            <li key={row.key} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-medium leading-tight text-[color-mix(in_srgb,var(--order-ink,#15231f)_88%,transparent)]">
                  {row.label}
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{row.hint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={`${row.label} — ${checked ? "shared" : "hidden"}`}
                disabled={!canWrite || busy}
                onClick={() => void toggle(row.key)}
                className={cn(
                  "mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
                  checked
                    ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)]"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_20%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]",
                  (!canWrite || busy) && "cursor-not-allowed opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full bg-white shadow-sm transition-transform",
                    checked ? "translate-x-[18px]" : "translate-x-[2px]",
                  )}
                >
                  {busy ? (
                    <Loader2 className="size-2.5 animate-spin text-muted-foreground" aria-hidden />
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!canWrite ? (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Only an owner or admin can change what a supplier sees.
        </p>
      ) : null}
    </section>
  );
}
