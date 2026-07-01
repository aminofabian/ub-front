"use client";

import { useCallback, useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

import {
  GetTheAppPanel,
  GetTheAppPanelError,
  GetTheAppPanelLoading,
} from "@/components/mobile/get-the-app-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  fetchPublicMobileConfigBrowser,
  type PublicMobileConfig,
} from "@/lib/public-mobile-config";
import { cn } from "@/lib/utils";

type GetTheAppDialogProps = {
  slug: string;
  storeName?: string;
  triggerClassName?: string;
  /** Inline text link (utility bar) vs icon button (mobile header). */
  triggerVariant?: "link" | "icon";
};

export function GetTheAppDialog({
  slug,
  storeName,
  triggerClassName,
  triggerVariant = "link",
}: GetTheAppDialogProps) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<PublicMobileConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const payload = await fetchPublicMobileConfigBrowser(slug);
    if (!payload) {
      setConfig(null);
      setError("Could not load mobile app links for this store.");
    } else {
      setConfig(payload);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void load();
  }, [open, load]);

  const title = storeName?.trim() ? `Get the ${storeName.trim()} app` : "Get the app";

  const trigger =
    triggerVariant === "icon" ? (
      <button
        type="button"
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
          triggerClassName,
        )}
        aria-label="Get the mobile app"
      >
        <Smartphone className="size-4.5" aria-hidden />
      </button>
    ) : (
      <button
        type="button"
        className={cn(
          "rounded-md px-2 py-0.5 transition hover:bg-white/10",
          triggerClassName,
        )}
      >
        Get the app
      </button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent side="center" className="max-h-[min(90vh,720px)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Scan to open this store in the shopper app, or download from your app store when available.
          </DialogDescription>
        </DialogHeader>
        {loading ? <GetTheAppPanelLoading /> : null}
        {!loading && error ? <GetTheAppPanelError message={error} /> : null}
        {!loading && config ? (
          <GetTheAppPanel config={config} variant="storefront" />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
