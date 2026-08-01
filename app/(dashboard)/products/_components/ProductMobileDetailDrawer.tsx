"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  Camera,
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

const EXIT_MS = 400;

/**
 * Clean back mark: chevron with a hairline return track that lengthens on exit.
 */
function CatalogBackMark() {
  return (
    <span className="relative flex size-5 items-center justify-center">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-[18px]">
        <path
          className="catalog-mobile-back-shaft"
          d="M10 12h9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
          opacity="0.4"
        />
        <path
          className="catalog-mobile-back-arrow"
          d="M11 6.5 5.5 12 11 17.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    </span>
  );
}

/**
 * Full-screen mobile product detail — slides in from the right; back control
 * slides it back out (single exit pass, no reopen flicker).
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
  const exitTimer = useRef<number | null>(null);
  /** Blocks Radix onOpenChange(false) from starting a second exit while we close. */
  const exitLockRef = useRef(false);
  const [exiting, setExiting] = useState(false);

  const portalOpen = open || exiting;

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: 0 });
  }, [open, d?.id]);

  useEffect(() => {
    return () => {
      if (exitTimer.current != null) window.clearTimeout(exitTimer.current);
    };
  }, []);

  /** Parent re-opened us — clear any stale exit state. */
  useEffect(() => {
    if (!open) return;
    exitLockRef.current = false;
    setExiting(false);
  }, [open]);

  const finishExit = useCallback(() => {
    onClose();
    setExiting(false);
    /* Keep the lock through the commit that sets open=false so Radix's
       onOpenChange(false) cannot call beginExit again and re-mount the sheet. */
    window.setTimeout(() => {
      exitLockRef.current = false;
    }, 0);
  }, [onClose]);

  const beginExit = useCallback(() => {
    if (exitLockRef.current || exiting || !open) return;
    exitLockRef.current = true;
    setExiting(true);
    if (exitTimer.current != null) window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(finishExit, EXIT_MS);
  }, [exiting, open, finishExit]);

  const focusCommerce = () => {
    requestAnimationFrame(() => {
      document
        .getElementById("product-commerce")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const metaLine =
    [d?.variantName?.trim(), d?.sku?.trim() ? d.sku.trim() : null]
      .filter(Boolean)
      .join(" · ") || "Product";

  const dockBtn = cn(
    "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-1",
    "bg-background text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground/65",
    "transition-colors active:bg-muted/60",
    "disabled:pointer-events-none disabled:opacity-35",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring/40",
  );

  return (
    <Dialog.Root
      open={portalOpen}
      onOpenChange={(next) => {
        if (next) return;
        /* Ignore the synthetic close Radix emits when we set open=false after exit. */
        if (exitLockRef.current || exiting) return;
        beginExit();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "catalog-mobile-detail-scrim fixed inset-0 z-50 bg-background",
            exiting && "is-exiting",
          )}
        />

        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "catalog-mobile-detail fixed inset-0 z-50 flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col bg-background outline-none",
            "pt-[env(safe-area-inset-top)]",
            exiting && "is-exiting",
          )}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            document.getElementById("product-mobile-detail-back")?.focus();
          }}
          onCloseAutoFocus={(e) => {
            /* Prevent focus returning to the list row from re-triggering open. */
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            beginExit();
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault();
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          <header className="relative shrink-0 border-b border-border">
            <div className="flex items-center gap-3 px-3 py-3">
              <button
                id="product-mobile-detail-back"
                type="button"
                onClick={beginExit}
                disabled={exiting}
                aria-label="Back to catalog"
                className={cn(
                  "catalog-mobile-back group relative flex size-11 shrink-0 items-center justify-center",
                  "rounded-none border border-border bg-background text-foreground",
                  "transition-[border-color,background-color,transform] duration-200",
                  "hover:border-foreground/35 hover:bg-muted/40",
                  "active:scale-[0.96] active:bg-muted/60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
                  "disabled:opacity-70",
                  exiting && "is-sending border-foreground/40 bg-muted/50",
                )}
              >
                <span
                  className="pointer-events-none absolute left-1 top-1 size-1.5 border-l border-t border-foreground/35"
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute bottom-1 right-1 size-1.5 border-b border-r border-foreground/35"
                  aria-hidden
                />
                <CatalogBackMark />
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/40">
                  Catalog
                </p>
                <Dialog.Title className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                  {d?.name?.trim() || "Product"}
                </Dialog.Title>
                <Dialog.Description className="truncate font-mono text-[11px] tracking-tight text-foreground/45">
                  {metaLine}
                </Dialog.Description>
              </div>
            </div>
          </header>

          {banner ? (
            <div className="shrink-0 border-b border-border px-4 py-2.5">
              {banner}
            </div>
          ) : null}

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {d ? (
              <div className="mx-auto w-full max-w-lg px-4 pb-8 pt-4">
                <ProductDetailPanel
                  {...detailPanelProps}
                  showMobileStickyActions={false}
                  mobileAppLayout
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-24">
                <Loader2
                  className="size-6 animate-spin text-foreground/35"
                  aria-hidden
                />
                <p className="text-[13px] font-medium tracking-tight text-foreground/45">
                  Loading product…
                </p>
              </div>
            )}
          </div>

          {d ? (
            <footer className="shrink-0 border-t border-border bg-background">
              <div
                className={cn(
                  "grid grid-cols-4 gap-px bg-border",
                  "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
                )}
              >
                <button
                  type="button"
                  className={dockBtn}
                  disabled={!canEdit || exiting}
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
                    exiting ||
                    (sharedStock
                      ? !canStock || !detailPanelProps.onOpenBaseStock
                      : !canStock)
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
                  disabled={!canEdit || exiting}
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
                  disabled={!canEdit || exiting}
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
