"use client";

import Link from "next/link";
import { Link2, Package, PackagePlus, Search } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type OrderCatalogSetupPanelProps = {
  supplierName: string;
  filterQuery?: string;
  hasLinks: boolean;
  canLink: boolean;
  canCreate: boolean;
  onLink: (seedQuery?: string) => void;
  onCreate: () => void;
};

const stepClass =
  "rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white/80 px-3 py-2.5 text-left";

export function OrderCatalogSetupPanel({
  supplierName,
  filterQuery = "",
  hasLinks,
  canLink,
  canCreate,
  onLink,
  onCreate,
}: OrderCatalogSetupPanelProps) {
  const trimmedFilter = filterQuery.trim();
  const isFilteredEmpty = hasLinks && trimmedFilter.length > 0;

  return (
    <div className="flex min-h-[14rem] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white/55 px-5 py-8 text-center sm:px-8">
      <div className="flex size-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)]">
        {isFilteredEmpty ? (
          <Search
            className="size-5 text-[var(--pos-primary,#0f766e)]"
            strokeWidth={1.5}
            aria-hidden
          />
        ) : (
          <Package
            className="size-5 text-[var(--pos-primary,#0f766e)]"
            strokeWidth={1.5}
            aria-hidden
          />
        )}
      </div>

      <div className="max-w-md space-y-1.5">
        <h3 className="font-heading text-[16px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
          {isFilteredEmpty
            ? `No match for “${trimmedFilter}”`
            : "Build this supplier’s shelf"}
        </h3>
        <p className="text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
          {isFilteredEmpty
            ? `Nothing on ${supplierName}’s shelf matches your search. Link it from your catalog, then tap to add it to this order.`
            : `${supplierName} has no products linked yet. Attach items from your catalog so you can order them here.`}
        </p>
      </div>

      {(canLink || canCreate) && (
        <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
          {canLink ? (
            <button
              type="button"
              onClick={() => onLink(trimmedFilter || undefined)}
              className={cn(
                "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition",
                "bg-[var(--pos-primary,#0f766e)] text-white hover:bg-[#0d6b63]",
              )}
            >
              <Link2 className="size-4" aria-hidden />
              {isFilteredEmpty ? "Link from catalog" : "Link products"}
            </button>
          ) : null}
          {canCreate ? (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-4 text-[13px] font-semibold text-[var(--order-ink,#15231f)] transition hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,transparent)]"
            >
              <PackagePlus className="size-4" aria-hidden />
              Create product
            </button>
          ) : null}
        </div>
      )}

      {!canLink && !canCreate ? (
        <p className="max-w-sm text-[12px] leading-relaxed text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
          You don’t have permission to link products here. Ask an admin to attach
          catalog items on the{" "}
          <Link
            href={APP_ROUTES.suppliers}
            className="font-semibold text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
          >
            Suppliers
          </Link>{" "}
          page.
        </p>
      ) : (
        <ol className="grid w-full max-w-lg gap-2 text-[11px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)] sm:grid-cols-3">
          <li className={stepClass}>
            <span className="font-bold text-[var(--order-ink,#15231f)]">1.</span>{" "}
            Link products to {supplierName}
          </li>
          <li className={stepClass}>
            <span className="font-bold text-[var(--order-ink,#15231f)]">2.</span>{" "}
            Tap items to add them to your order
          </li>
          <li className={stepClass}>
            <span className="font-bold text-[var(--order-ink,#15231f)]">3.</span>{" "}
            Save and send the purchase order
          </li>
        </ol>
      )}
    </div>
  );
}
