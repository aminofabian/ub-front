"use client";

import Link from "next/link";
import { ImagePlus, Plus } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { ProductGuideDrawer } from "./ProductGuideDrawer";

type Props = {
  onCreateNew?: () => void;
  canCreateNew?: boolean;
  onAddFromCatalog?: () => void;
  canAddFromCatalog?: boolean;
};

export function CatalogEmptyShelf({
  onCreateNew,
  canCreateNew = false,
  onAddFromCatalog,
  canAddFromCatalog = false,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[26rem] flex-col items-center px-1 py-6 sm:py-10">
      <p className="text-center font-heading text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--catalog-ink,#15231f)]">
        Your shelf is empty
      </p>
      <p className="mt-1.5 max-w-[22rem] text-center text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_58%,transparent)]">
        Add one product. Name, buying price, selling price, how many you have.
        Then you can sell it.
      </p>

      {canCreateNew && onCreateNew ? (
        <button
          type="button"
          onClick={onCreateNew}
          className={cn(
            "group relative mt-7 w-full overflow-hidden text-left",
            "rounded-2xl border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] bg-white",
            "shadow-[0_18px_44px_-28px_color-mix(in_srgb,var(--catalog-ink,#15231f)_40%,transparent)]",
            "transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
            "hover:-translate-y-0.5",
            "active:translate-y-0 active:scale-[0.985]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_40%,transparent)]",
          )}
        >
          <span className="block p-4 pb-3.5">
            <span className="flex aspect-[16/9] w-full flex-col items-center justify-center rounded-xl border border-dashed border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_18%,transparent)] bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_88%,white)]">
              <ImagePlus
                className="size-6 text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_42%,transparent)]"
                aria-hidden
              />
              <span className="mt-1.5 text-[12px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_52%,transparent)]">
                Photo
              </span>
            </span>

            <span className="mt-3.5 block">
              <span className="block text-[11px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)]">
                Product name
              </span>
              <span className="mt-1 block h-10 rounded-xl bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_92%,white)] px-3 text-[14px] leading-10 text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_36%,transparent)]">
                e.g. Brookside 500ml
              </span>
            </span>

            <span className="mt-2.5 grid grid-cols-2 gap-2">
              <span>
                <span className="block text-[11px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)]">
                  Buying price
                </span>
                <span className="mt-1 block h-9 rounded-lg bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_92%,white)] px-2.5 text-[12px] leading-9 text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_36%,transparent)]">
                  What you paid
                </span>
              </span>
              <span>
                <span className="block text-[11px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)]">
                  Selling price
                </span>
                <span className="mt-1 block h-9 rounded-lg bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_92%,white)] px-2.5 text-[12px] leading-9 text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_36%,transparent)]">
                  What you charge
                </span>
              </span>
            </span>

            <span className="mt-2.5 grid grid-cols-2 gap-2">
              <span>
                <span className="block text-[11px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)]">
                  Barcode
                </span>
                <span className="mt-1 block h-9 rounded-lg bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_92%,white)] px-2.5 font-mono text-[11px] leading-9 text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_36%,transparent)]">
                  Scan or type
                </span>
              </span>
              <span>
                <span className="block text-[11px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)]">
                  Number of items
                </span>
                <span className="mt-1 block h-9 rounded-lg bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_92%,white)] px-2.5 text-[12px] leading-9 text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_36%,transparent)]">
                  On the shelf
                </span>
              </span>
            </span>
          </span>

          <span className="flex items-center justify-center gap-1.5 border-t border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_8%,transparent)] bg-[var(--catalog-ink,#15231f)] px-4 py-3 text-[14px] font-medium text-white">
            <Plus className="size-4" aria-hidden />
            Add your first product
          </span>
        </button>
      ) : !canAddFromCatalog ? (
        <p className="mt-6 text-center text-[13px] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_52%,transparent)]">
          Ask a manager for permission to add products.
        </p>
      ) : null}

      {canCreateNew && onCreateNew ? (
        <div
          aria-hidden
          className="-mt-px h-1.5 w-[calc(100%+1rem)] rounded-b-sm bg-[color-mix(in_srgb,var(--catalog-ink,#15231f)_16%,transparent)]"
        />
      ) : null}

      <p className="mt-5 text-center text-[12px] leading-relaxed text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_50%,transparent)]">
        Adding many at once?{" "}
        <Link
          href={APP_ROUTES.businessImport}
          className="font-medium text-[var(--catalog-ink,#15231f)] underline-offset-2 hover:underline"
        >
          Import a spreadsheet
        </Link>
        {canAddFromCatalog && onAddFromCatalog ? (
          <>
            {" or "}
            <button
              type="button"
              onClick={onAddFromCatalog}
              className="font-medium text-[var(--catalog-ink,#15231f)] underline-offset-2 hover:underline"
            >
              pick from the shared catalog
            </button>
          </>
        ) : null}
        .
      </p>
      <div className="mt-1.5 text-center text-[12px]">
        <ProductGuideDrawer
          trigger={
            <button
              type="button"
              className="font-medium text-[var(--catalog-ink,#15231f)] underline-offset-2 hover:underline"
            >
              Read the guide
            </button>
          }
        />
      </div>
    </div>
  );
}
