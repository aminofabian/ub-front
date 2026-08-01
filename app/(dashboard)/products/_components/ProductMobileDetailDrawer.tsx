"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import {
  Camera,
  ChevronLeft,
  CircleDollarSign,
  Loader2,
  Package,
  PencilLine,
} from "lucide-react";
import { Dialog } from "radix-ui";

import { cn } from "@/lib/utils";
import type { FormDrawerProps } from "@/components/form-drawer";
import type { ProductDetailApi } from "../_hooks/useProductDetail";
import { ProductDetailPanel } from "./ProductDetailPanel";
import { usesSharedPackageStock } from "../_utils";

type Props = {
  open: boolean;
  onClose: () => void;
  banner?: FormDrawerProps["banner"];
  detail: Pick<ProductDetailApi, "detail">;
  detailPanelProps: ComponentProps<typeof ProductDetailPanel>;
};

/**
 * Mobile product detail — slides in from the right over the catalog list,
 * with an explicit Catalog back control (push-navigation feel, sheet language).
 */
export function ProductMobileDetailDrawer({
  open,
  onClose,
  banner,
  detail,
  detailPanelProps,
}: Props) {
  const d = detail.detail;
  const canEdit = detailPanelProps.canCatalogWrite;
  const canStock = detailPanelProps.canInventoryWrite;
  const sharedStock = !!d && usesSharedPackageStock(d);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: 0 });
  }, [open, d?.id]);

  const focusCommerce = () => {
    requestAnimationFrame(() => {
      document
        .getElementById("product-commerce")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const metaLine =
    [d?.variantName?.trim(), d?.sku?.trim() ? `SKU ${d.sku.trim()}` : null]
      .filter(Boolean)
      .join(" · ") || "Product detail";

  const dockBtn = cn(
    "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5",
    "bg-background text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/70",
    "transition-colors active:bg-muted/70",
    "disabled:pointer-events-none disabled:opacity-35",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring/40",
  );

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/25 dark:bg-black/50",
            "supports-[backdrop-filter]:bg-black/15 supports-[backdrop-filter]:backdrop-blur-[2px]",
            "supports-[backdrop-filter]:dark:bg-black/35",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "duration-300 ease-out",
          )}
        />

        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-[calc(100%-0.75rem)] max-w-none flex-col outline-none",
            "border-l border-border bg-background",
            "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            "pr-[env(safe-area-inset-right)]",
            "shadow-[-12px_0_40px_-28px_rgba(0,0,0,0.35)] dark:shadow-[-12px_0_40px_-28px_rgba(0,0,0,0.7)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            "motion-reduce:duration-150 motion-reduce:transition-none",
          )}
          onOpenAutoFocus={(e) => {
            // Keep focus on the back control for clear navigation affordance.
            e.preventDefault();
            const back = document.getElementById("product-mobile-detail-back");
            back?.focus();
          }}
        >
          {/* Left edge rail — reads as sheet binder / stack depth */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-px bg-border"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-3 left-0 w-0.5 bg-foreground/25"
            aria-hidden
          />

          <header className="relative shrink-0 border-b border-border bg-muted/25">
            <div className="flex items-stretch">
              <button
                id="product-mobile-detail-back"
                type="button"
                onClick={onClose}
                className={cn(
                  "group flex shrink-0 items-center gap-0.5 border-r border-border px-2.5 py-2.5",
                  "text-[11px] font-semibold tracking-tight text-foreground/70",
                  "transition-colors hover:bg-muted/40 hover:text-foreground",
                  "active:bg-muted/60",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring/40",
                )}
              >
                <ChevronLeft
                  className="size-4 transition-transform duration-200 group-active:-translate-x-0.5"
                  aria-hidden
                />
                <span>Catalog</span>
              </button>

              <div className="min-w-0 flex-1 px-3 py-2">
                <Dialog.Title className="truncate text-[13px] font-semibold tracking-tight text-foreground">
                  {d?.name?.trim() || "Product"}
                </Dialog.Title>
                <Dialog.Description className="truncate font-mono text-[10px] tracking-tight text-foreground/45">
                  {metaLine}
                </Dialog.Description>
              </div>
            </div>
          </header>

          {banner ? (
            <div className="shrink-0 border-b border-border px-3 py-2">{banner}</div>
          ) : null}

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {d ? (
              <div
                className={cn(
                  "origin-top",
                  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2",
                  "motion-safe:duration-300 motion-safe:ease-out",
                )}
              >
                <ProductDetailPanel
                  {...detailPanelProps}
                  showMobileStickyActions={false}
                  mobileAppLayout
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-20">
                <Loader2
                  className="size-6 animate-spin text-foreground/35"
                  aria-hidden
                />
                <p className="text-[12px] font-medium tracking-tight text-foreground/45">
                  Loading product…
                </p>
              </div>
            )}
          </div>

          {d ? (
            <footer className="shrink-0 border-t border-border bg-background">
              <div className="grid grid-cols-4 gap-px bg-border pb-[max(0px,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  className={dockBtn}
                  disabled={!canEdit}
                  onClick={() => {
                    detailPanelProps.openQuickEdit("bundlePrice");
                    focusCommerce();
                  }}
                >
                  <CircleDollarSign className="size-4" aria-hidden />
                  Price
                </button>
                <button
                  type="button"
                  className={dockBtn}
                  disabled={
                    sharedStock
                      ? !canStock || !detailPanelProps.onOpenBaseStock
                      : !canStock
                  }
                  onClick={() => {
                    if (sharedStock && detailPanelProps.onOpenBaseStock) {
                      detailPanelProps.onOpenBaseStock();
                      return;
                    }
                    detailPanelProps.openQuickEdit("stock");
                    focusCommerce();
                  }}
                >
                  <Package className="size-4" aria-hidden />
                  Stock
                </button>
                <button
                  type="button"
                  className={dockBtn}
                  disabled={!canEdit}
                  onClick={() =>
                    detailPanelProps.setActiveDrawer("edit-product")
                  }
                >
                  <PencilLine className="size-4" aria-hidden />
                  Edit
                </button>
                <button
                  type="button"
                  className={dockBtn}
                  disabled={!canEdit}
                  onClick={() => detailPanelProps.setActiveDrawer("photos")}
                >
                  <Camera className="size-4" aria-hidden />
                  Photo
                </button>
              </div>
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
