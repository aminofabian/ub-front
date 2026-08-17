"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Signal } from "lucide-react";

import { ShopAirtimeFlow } from "@/components/storefront/shop-airtime-flow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchPublicAirtimeConfigBrowser,
  type PublicAirtimeConfig,
} from "@/lib/public-storefront-client";
import { cn } from "@/lib/utils";

/** Storefront routes where a floating pill would fight the primary action. */
const HIDDEN_ON: readonly string[] = [
  APP_ROUTES.shopCheckout,
  APP_ROUTES.shopCart,
  APP_ROUTES.shopAirtime,
];

/**
 * Always-reachable airtime entry point for the storefront.
 *
 * <p>Sits opposite the cart pill so a shopper can top up a line mid-browse
 * without losing their basket. Renders nothing when the shop has airtime off.
 */
export function ShopAirtimeLauncher({
  slug,
  accentHex,
}: {
  slug: string;
  accentHex?: string | null;
}) {
  const pathname = usePathname();
  const [config, setConfig] = useState<PublicAirtimeConfig | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let stopped = false;
    fetchPublicAirtimeConfigBrowser(slug).then((c) => {
      if (!stopped) setConfig(c);
    });
    return () => {
      stopped = true;
    };
  }, [slug]);

  if (!config?.available || HIDDEN_ON.includes(pathname)) {
    return null;
  }

  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim()) ? accentHex.trim() : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-4 z-[55] flex items-center gap-2 rounded-full border border-border/80 bg-background/95 py-2 pl-2 pr-4 shadow-lg shadow-black/10 ring-1 ring-black/[0.04] backdrop-blur-md transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]",
        )}
        aria-label="Buy airtime"
      >
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-full text-white shadow-md",
            !accent && "bg-primary",
          )}
          style={accent ? { backgroundColor: accent } : undefined}
        >
          <Signal className="size-4" aria-hidden />
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Instant
          </span>
          <span className="text-sm font-bold">Airtime</span>
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm gap-4 p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Signal className="size-4 text-muted-foreground" aria-hidden />
              Buy airtime
            </DialogTitle>
            <DialogDescription>
              Any Kenyan network, delivered in seconds. Pay with M-Pesa.
            </DialogDescription>
          </DialogHeader>
          <ShopAirtimeFlow slug={slug} accentHex={accentHex} initialConfig={config} />
        </DialogContent>
      </Dialog>
    </>
  );
}
