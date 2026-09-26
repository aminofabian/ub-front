"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Copy, Images, Loader2, Share2, X } from "lucide-react";
import { toast } from "sonner";

import { useOptionalTenant } from "@/components/providers/tenant-provider";
import {
  copyProductShareMessage,
  shareProductPhotos,
  shareProductToWhatsApp,
  type ShareProductResult,
} from "@/lib/product-share-carousel";
import {
  productShareCarouselUrls,
  productShareHeading,
  type ProductShareItem,
} from "@/lib/product-share-seo";
import { cn } from "@/lib/utils";

type Props = {
  item: ProductShareItem;
  /** Canonical path e.g. `/products/carrier-bag?variant=…` */
  productPath: string;
  /** Business slug for the branded `/og/product` poster. */
  slug: string;
  className?: string;
};

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function resultToast(result: ShareProductResult) {
  if (result === "aborted") return;
  if (result === "opened-whatsapp") {
    toast.success("Opening WhatsApp…");
    return;
  }
  if (result === "shared-carousel") {
    toast.success("Photos ready — pick WhatsApp in the share sheet");
    return;
  }
  if (result === "shared-link") {
    toast.success("Shared");
    return;
  }
  if (result === "copied") {
    toast.success("Caption copied — paste into WhatsApp");
  }
}

/**
 * WhatsApp-first product share control with a compact action sheet:
 * send caption, share photo album, or copy the promo text.
 */
export function ShopProductShareButton({
  item,
  productPath,
  slug,
  className,
}: Props) {
  const tenant = useOptionalTenant();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"wa" | "photos" | "copy" | null>(null);

  const carouselCount = productShareCarouselUrls(item).length;
  const heading = productShareHeading(item);
  const shopLabel =
    tenant?.branding?.displayName?.trim() ||
    tenant?.tenantName?.trim() ||
    null;

  const contact = useMemo(
    () => ({
      phone: tenant?.landingContent?.phone,
      whatsapp: tenant?.landingContent?.whatsapp,
    }),
    [tenant],
  );

  const productUrl = useCallback(() => {
    const origin = window.location.origin;
    return `${origin}${productPath.startsWith("/") ? productPath : `/${productPath}`}`;
  }, [productPath]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("touchstart", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  const run = useCallback(
    async (kind: "wa" | "photos" | "copy") => {
      if (busy) return;
      setBusy(kind);
      try {
        const url = productUrl();
        if (kind === "wa") {
          const result = await shareProductToWhatsApp({
            item,
            productUrl: url,
            contact,
            shopLabel,
          });
          resultToast(result);
          setOpen(false);
          return;
        }
        if (kind === "photos") {
          const result = await shareProductPhotos({
            item,
            productUrl: url,
            origin: window.location.origin,
            slug,
            contact,
            shopLabel,
          });
          resultToast(result);
          if (result !== "aborted") setOpen(false);
          return;
        }
        const copied = await copyProductShareMessage({
          item,
          productUrl: url,
          contact,
          shopLabel,
        });
        if (copied === "copied") {
          toast.success("Caption copied");
          setOpen(false);
        } else {
          toast.error("Couldn’t copy — try WhatsApp instead");
        }
      } finally {
        setBusy(null);
      }
    },
    [busy, contact, item, productUrl, shopLabel, slug],
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "group inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold tracking-tight",
          "bg-[#128C7E] text-white shadow-[0_10px_28px_rgba(18,140,126,0.35)]",
          "transition-[transform,box-shadow,background-color] duration-200 ease-out",
          "hover:bg-[#0f7a6e] hover:shadow-[0_14px_32px_rgba(18,140,126,0.42)]",
          "active:scale-[0.97]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128C7E]/40 focus-visible:ring-offset-2",
        )}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-white/15">
          {WA_ICON}
        </span>
        <span>Share deal</span>
        <Share2 className="size-3.5 opacity-70 transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Share product"
          className={cn(
            "absolute right-0 top-[calc(100%+10px)] z-50 w-[min(20.5rem,calc(100vw-1.5rem))] origin-top-right",
            "rounded-2xl border border-black/5 bg-[#0f1c17] p-2 text-white shadow-[0_24px_60px_rgba(8,20,14,0.45)]",
            "transition-[opacity,transform] duration-200 ease-out",
            "opacity-100 scale-100",
          )}
        >
          <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-2.5">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7dceb0]">
                Share this deal
              </p>
              <p className="mt-1 truncate text-[13px] font-semibold leading-snug text-white/95">
                {heading}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 p-1">
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void run("wa")}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                "bg-[#25D366] text-[#053b1f]",
                "hover:bg-[#1fbe5a] active:scale-[0.99]",
                "disabled:opacity-70",
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/25">
                {busy === "wa" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  WA_ICON
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold leading-tight">
                  WhatsApp
                </span>
                <span className="mt-0.5 block text-[11px] font-medium opacity-75">
                  Send price + order link
                </span>
              </span>
            </button>

            <button
              type="button"
              disabled={busy != null}
              onClick={() => void run("photos")}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                "bg-white/6 hover:bg-white/10 active:scale-[0.99]",
                "disabled:opacity-70",
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFE566]/15 text-[#FFE566]">
                {busy === "photos" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : carouselCount > 1 ? (
                  <Images className="size-5" />
                ) : (
                  <Share2 className="size-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold leading-tight text-white">
                  {carouselCount > 1
                    ? `Photo album (${carouselCount + 1})`
                    : "Share poster + photo"}
                </span>
                <span className="mt-0.5 block text-[11px] text-white/55">
                  Promo card then gallery — pick WhatsApp
                </span>
              </span>
            </button>

            <button
              type="button"
              disabled={busy != null}
              onClick={() => void run("copy")}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                "bg-white/6 hover:bg-white/10 active:scale-[0.99]",
                "disabled:opacity-70",
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80">
                {busy === "copy" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Copy className="size-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold leading-tight text-white">
                  Copy caption
                </span>
                <span className="mt-0.5 block text-[11px] text-white/55">
                  Paste into any chat
                </span>
              </span>
            </button>
          </div>

          <p className="flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-[10px] text-white/40">
            <Check className="size-3 text-[#3DDC84]" aria-hidden />
            Payment on delivery · ready to order
          </p>
        </div>
      ) : null}
    </div>
  );
}
