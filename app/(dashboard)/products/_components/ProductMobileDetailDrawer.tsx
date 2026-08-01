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

/** Custom back glyph — shaft + head; animates “send sheet right” on dismiss. */
function CatalogBackGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden
      className={cn("size-5", className)}
    >
      {/* Trail that stretches on exit — implies the sheet leaving right */}
      <path
        className="catalog-mobile-back-shaft stroke-current"
        d="M8 14H20"
        strokeWidth="1.75"
        strokeLinecap="square"
        opacity="0.55"
      />
      <path
        className="catalog-mobile-back-arrow stroke-current"
        d="M12.5 8.5 7 14l5.5 5.5"
        strokeWidth="1.75"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {/* Tiny right tick — the direction the panel will leave */}
      <path
        d="M21 11v6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        opacity="0.35"
      />
    </svg>
  );
}

/**
 * Mobile product detail — slides in from the right; back arrow dismisses
 * by sliding the sheet back out to the right.
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

  /** When parent closes while still showing (e.g. breakpoint), reset exit. */
  useEffect(() => {
    if (open) setExiting(false);
  }, [open]);

  const finishExit = useCallback(() => {
    setExiting(false);
    onClose();
  }, [onClose]);

  const beginExit = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    if (exitTimer.current != null) window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(finishExit, EXIT_MS);
  }, [exiting, finishExit]);

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
      open={portalOpen}
      onOpenChange={(next) => {
        if (!next) beginExit();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "catalog-mobile-detail-scrim fixed inset-0 z-50",
            "bg-black/30 dark:bg-black/55",
            "supports-[backdrop-filter]:bg-black/18 supports-[backdrop-filter]:backdrop-blur-[3px]",
            "supports-[backdrop-filter]:dark:bg-black/40",
            exiting && "is-exiting",
          )}
        />

        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "catalog-mobile-detail fixed inset-y-0 right-0 z-50 flex max-w-none flex-col outline-none",
            "w-[calc(100%-0.85rem)]",
            "border-l border-border bg-background",
            "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            "pr-[env(safe-area-inset-right)]",
            "shadow-[-18px_0_48px_-30px_rgba(0,0,0,0.4)] dark:shadow-[-18px_0_48px_-30px_rgba(0,0,0,0.75)]",
            exiting && "is-exiting",
          )}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            document.getElementById("product-mobile-detail-back")?.focus();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            beginExit();
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
            beginExit();
          }}
        >
          {/* Sheet binder edge */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-px bg-border"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-4 left-0 w-0.5 bg-foreground/20"
            aria-hidden
          />

          <header className="relative shrink-0 border-b border-border bg-muted/20">
            <div className="flex items-stretch gap-0">
              {/*
                Back control sits in the peek — press sends the sheet right.
              */}
              <button
                id="product-mobile-detail-back"
                type="button"
                onClick={beginExit}
                disabled={exiting}
                aria-label="Back to catalog"
                className={cn(
                  "catalog-mobile-back group relative -ml-0 flex shrink-0 items-center gap-1.5",
                  "border-r border-border bg-foreground px-2.5 py-2.5 text-background",
                  "transition-[background-color,transform] duration-200",
                  "hover:bg-foreground/90 active:scale-[0.97]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  "disabled:opacity-80",
                  exiting && "is-sending",
                )}
              >
                <span
                  className="pointer-events-none absolute inset-y-0 -left-1 w-1 bg-foreground"
                  aria-hidden
                />
                <CatalogBackGlyph />
                <span className="flex flex-col items-start leading-none">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-background/55">
                    Back
                  </span>
                  <span className="text-[11px] font-semibold tracking-tight">
                    Catalog
                  </span>
                </span>
              </button>

              <div className="min-w-0 flex-1 self-center px-3 py-2">
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
            <div className="shrink-0 border-b border-border px-3 py-2">
              {banner}
            </div>
          ) : null}

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {d ? (
              <ProductDetailPanel
                {...detailPanelProps}
                showMobileStickyActions={false}
                mobileAppLayout
              />
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
