"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Copy, Images, Loader2, Share2, X } from "lucide-react";
import { toast } from "sonner";

import { useOptionalTenant } from "@/components/providers/tenant-provider";
import {
  copyProductShareMessage,
  shareProductPhotos,
  shareProductToFacebook,
  shareProductToInstagram,
  shareProductToTwitter,
  shareProductToWhatsApp,
  type ShareProductResult,
} from "@/lib/product-share-carousel";
import {
  formatSharePrice,
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

type BusyKind =
  | "wa"
  | "facebook"
  | "twitter"
  | "instagram"
  | "photos"
  | "copy";

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const FB_ICON = (
  <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const X_ICON = (
  <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const IG_ICON = (
  <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

function resultToast(result: ShareProductResult) {
  if (result === "aborted") return;
  switch (result) {
    case "opened-whatsapp":
      toast.success("Opening WhatsApp…");
      break;
    case "opened-facebook":
      toast.success("Opening Facebook…");
      break;
    case "opened-twitter":
      toast.success("Opening X…");
      break;
    case "opened-instagram":
      toast.success("Caption copied — pick Instagram in the share sheet");
      break;
    case "shared-carousel":
      toast.success("Photos ready — pick an app in the share sheet");
      break;
    case "shared-link":
      toast.success("Shared");
      break;
    case "copied":
      toast.success("Copied — paste into your post");
      break;
  }
}

/**
 * Social share control — WhatsApp hero + Facebook / X / Instagram constellation,
 * plus photo album and caption copy.
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
  const [busy, setBusy] = useState<BusyKind | null>(null);

  const carouselCount = productShareCarouselUrls(item).length;
  const heading = productShareHeading(item);
  const priceLabel =
    item.price != null && Number.isFinite(item.price)
      ? formatSharePrice(item.currency, item.price)
      : null;
  const shopLabel =
    tenant?.branding?.displayName?.trim() ||
    tenant?.tenantName?.trim() ||
    null;
  const heroThumb = item.images[0]?.url?.trim() || null;

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
    async (kind: BusyKind) => {
      if (busy) return;
      setBusy(kind);
      try {
        const url = productUrl();
        const origin = window.location.origin;

        if (kind === "wa") {
          resultToast(
            await shareProductToWhatsApp({
              item,
              productUrl: url,
              contact,
              shopLabel,
            }),
          );
          setOpen(false);
          return;
        }
        if (kind === "facebook") {
          resultToast(await shareProductToFacebook({ productUrl: url }));
          setOpen(false);
          return;
        }
        if (kind === "twitter") {
          resultToast(
            await shareProductToTwitter({
              item,
              productUrl: url,
              shopLabel,
            }),
          );
          setOpen(false);
          return;
        }
        if (kind === "instagram") {
          const result = await shareProductToInstagram({
            item,
            productUrl: url,
            origin,
            slug,
            shopLabel,
            contact,
          });
          resultToast(result);
          if (result !== "aborted") setOpen(false);
          return;
        }
        if (kind === "photos") {
          const result = await shareProductPhotos({
            item,
            productUrl: url,
            origin,
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
          "group inline-flex h-11 items-center gap-2 rounded-full px-3.5 text-sm font-semibold tracking-tight",
          "bg-[#0f1c17] text-white shadow-[0_12px_32px_rgba(8,20,14,0.35)]",
          "ring-1 ring-white/10",
          "transition-[transform,box-shadow] duration-200 ease-out",
          "hover:shadow-[0_16px_40px_rgba(8,20,14,0.45)]",
          "active:scale-[0.97]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/50 focus-visible:ring-offset-2",
        )}
      >
        <span className="flex -space-x-1.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-[#25D366] text-[#053b1f] ring-2 ring-[#0f1c17]">
            {WA_ICON}
          </span>
          <span className="flex size-6 items-center justify-center rounded-full bg-[#1877F2] text-white ring-2 ring-[#0f1c17]">
            <span className="scale-75">{FB_ICON}</span>
          </span>
          <span className="flex size-6 items-center justify-center rounded-full bg-black text-white ring-2 ring-[#0f1c17]">
            <span className="scale-75">{X_ICON}</span>
          </span>
        </span>
        <span>Share deal</span>
        <Share2 className="size-3.5 opacity-55 transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Share product"
          className={cn(
            "absolute right-0 top-[calc(100%+10px)] z-50 w-[min(22rem,calc(100vw-1.5rem))] origin-top-right",
            "overflow-hidden rounded-[1.35rem] border border-white/10",
            "bg-[#0b1612] text-white shadow-[0_28px_70px_rgba(4,12,8,0.55)]",
          )}
        >
          {/* Deal preview strip */}
          <div className="relative overflow-hidden border-b border-white/8 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(37,211,102,0.22),transparent_55%),linear-gradient(160deg,#12261e_0%,#0b1612_70%)] px-3.5 pb-3 pt-3.5">
            <div className="flex items-start gap-3">
              {heroThumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- tiny share preview
                <img
                  src={heroThumb}
                  alt=""
                  className="size-14 shrink-0 rounded-xl object-cover ring-1 ring-white/15"
                />
              ) : (
                <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/8 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Deal
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7dceb0]">
                  Blast this deal
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-white/95">
                  {heading}
                </p>
                {priceLabel ? (
                  <p className="mt-1.5 inline-flex rounded-full bg-[#FFE566] px-2.5 py-0.5 text-[11px] font-extrabold tracking-tight text-[#0b1a12]">
                    ONLY {priceLabel}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-2">
            {/* WhatsApp hero */}
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void run("wa")}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-left",
                "bg-[#25D366] text-[#053b1f]",
                "shadow-[0_10px_28px_rgba(37,211,102,0.28)]",
                "transition-[transform,background-color] duration-150 ease-out",
                "hover:bg-[#1fbe5a] active:scale-[0.985]",
                "disabled:opacity-70",
              )}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/25">
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
                  Price, COD & order link — fastest sell
                </span>
              </span>
            </button>

            {/* Social constellation */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={busy != null}
                onClick={() => void run("facebook")}
                className={cn(
                  "group/tile relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl px-2 py-3.5",
                  "bg-[#1877F2] text-white",
                  "transition-[transform,filter] duration-150 ease-out",
                  "hover:brightness-110 active:scale-[0.97]",
                  "disabled:opacity-70",
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-4 -top-4 size-16 rounded-full bg-white/15 blur-md transition-transform duration-300 group-hover/tile:scale-125"
                />
                <span className="relative flex size-10 items-center justify-center rounded-full bg-white/20">
                  {busy === "facebook" ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    FB_ICON
                  )}
                </span>
                <span className="relative text-center">
                  <span className="block text-[12px] font-bold leading-none">
                    Facebook
                  </span>
                  <span className="mt-1 block text-[9px] font-medium opacity-75">
                    Link preview
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={busy != null}
                onClick={() => void run("twitter")}
                className={cn(
                  "group/tile relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl px-2 py-3.5",
                  "bg-[#111111] text-white ring-1 ring-white/12",
                  "transition-[transform,filter] duration-150 ease-out",
                  "hover:brightness-125 active:scale-[0.97]",
                  "disabled:opacity-70",
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/10 to-transparent"
                />
                <span className="relative flex size-10 items-center justify-center rounded-full bg-white/10">
                  {busy === "twitter" ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    X_ICON
                  )}
                </span>
                <span className="relative text-center">
                  <span className="block text-[12px] font-bold leading-none">
                    X
                  </span>
                  <span className="mt-1 block text-[9px] font-medium opacity-75">
                    Hot take + card
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={busy != null}
                onClick={() => void run("instagram")}
                className={cn(
                  "group/tile relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl px-2 py-3.5",
                  "text-white",
                  "transition-[transform,filter] duration-150 ease-out",
                  "hover:brightness-110 active:scale-[0.97]",
                  "disabled:opacity-70",
                )}
                style={{
                  background:
                    "linear-gradient(145deg, #f58529 0%, #dd2a7b 48%, #8134af 78%, #515bd4 100%)",
                }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -left-3 top-0 size-14 rounded-full bg-white/20 blur-lg transition-transform duration-300 group-hover/tile:translate-x-2"
                />
                <span className="relative flex size-10 items-center justify-center rounded-full bg-white/20">
                  {busy === "instagram" ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    IG_ICON
                  )}
                </span>
                <span className="relative text-center">
                  <span className="block text-[12px] font-bold leading-none">
                    Instagram
                  </span>
                  <span className="mt-1 block text-[9px] font-medium opacity-80">
                    Stories / post
                  </span>
                </span>
              </button>
            </div>

            {/* Secondary tools */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                disabled={busy != null}
                onClick={() => void run("photos")}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left",
                  "bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.99]",
                  "transition-[transform,background-color] duration-150",
                  "disabled:opacity-70",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFE566]/15 text-[#FFE566]">
                  {busy === "photos" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : carouselCount > 1 ? (
                    <Images className="size-4" />
                  ) : (
                    <Share2 className="size-4" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold leading-tight text-white">
                    {carouselCount > 1
                      ? `Album (${carouselCount + 1})`
                      : "Poster + photo"}
                  </span>
                  <span className="mt-0.5 block text-[9px] text-white/45">
                    Any app
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={busy != null}
                onClick={() => void run("copy")}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left",
                  "bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.99]",
                  "transition-[transform,background-color] duration-150",
                  "disabled:opacity-70",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80">
                  {busy === "copy" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold leading-tight text-white">
                    Copy caption
                  </span>
                  <span className="mt-0.5 block text-[9px] text-white/45">
                    Paste anywhere
                  </span>
                </span>
              </button>
            </div>
          </div>

          <p className="flex items-center gap-1.5 px-4 pb-3 text-[10px] text-white/35">
            <Check className="size-3 text-[#3DDC84]" aria-hidden />
            Promo poster rides with the link on FB &amp; X
          </p>
        </div>
      ) : null}
    </div>
  );
}
