"use client";

import { useEffect, useRef, useState } from "react";
import { IdCard, Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDashboard } from "@/components/dashboard-provider";
import { useSessionBranch } from "@/hooks/use-session-scope";
import { resolveReceiptWebsite } from "@/lib/branch-receipt";
import {
  buildLoyaltyCardMarkup,
  buildLoyaltyCardModel,
  buildLoyaltyCardPrintDocument,
  LOYALTY_CARD_CSS,
  loyaltyCardAccountUrl,
  loyaltyCardQrDataUrl,
  type LoyaltyCardCustomerInput,
  type LoyaltyCardModel,
} from "@/lib/loyalty-card";
import { cn } from "@/lib/utils";

type LoyaltyCardPreviewProps = {
  customer: LoyaltyCardCustomerInput | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function printLoyaltyDocument(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!frameWindow || !doc) {
    iframe.remove();
    return;
  }

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 500);
  };
  frameWindow.addEventListener("afterprint", cleanup);

  doc.open();
  doc.write(html);
  doc.close();

  const run = () => {
    frameWindow.focus();
    frameWindow.print();
  };

  const images = Array.from(doc.images);
  if (images.length === 0) {
    run();
    return;
  }
  let remaining = images.length;
  const done = () => {
    remaining -= 1;
    if (remaining <= 0) run();
  };
  for (const img of images) {
    if (img.complete) done();
    else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }
  }
}

export function LoyaltyCardPreview({
  customer,
  open,
  onOpenChange,
}: LoyaltyCardPreviewProps) {
  const { business } = useDashboard();
  const { branchId, branches } = useSessionBranch();
  const [model, setModel] = useState<LoyaltyCardModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const shopDisplayName =
    business?.branding?.displayName?.trim() ||
    business?.name?.trim() ||
    "palmart";
  const branch = branches.find((b) => b.id === branchId) ?? branches[0];
  const landing = business?.storefront?.landingContent;
  const shopAddress = branch?.address?.trim() || landing?.address?.trim() || null;
  const shopPhone = branch?.receipt?.phone?.trim() || landing?.phone?.trim() || null;
  const shopWebsite = resolveReceiptWebsite(
    branch?.receipt?.website,
    business?.primaryDomain,
  );

  const customerId = customer?.id ?? "";
  const customerName = customer?.name ?? "";
  const customerPhone = customer?.phone ?? null;
  const customerPoints = customer?.loyaltyPoints ?? null;

  useEffect(() => {
    if (!open || !customerId) {
      setModel(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const origin = window.location.origin;
    const accountUrl = loyaltyCardAccountUrl(customerPhone, origin);
    void (async () => {
      try {
        const qrDataUrl = await loyaltyCardQrDataUrl(accountUrl);
        if (cancelled) return;
        setModel(
          buildLoyaltyCardModel(
            {
              id: customerId,
              name: customerName,
              phone: customerPhone,
              loyaltyPoints: customerPoints,
            },
            {
              displayName: shopDisplayName,
              address: shopAddress,
              phone: shopPhone,
              website: shopWebsite,
            },
            { origin, qrDataUrl },
          ),
        );
      } catch (err) {
        if (!cancelled) {
          setModel(null);
          setError(
            err instanceof Error
              ? err.message
              : "Could not prepare the loyalty card.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    customerId,
    customerName,
    customerPhone,
    customerPoints,
    shopDisplayName,
    shopAddress,
    shopPhone,
    shopWebsite,
  ]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / 540));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [model]);

  const markup = model ? buildLoyaltyCardMarkup(model) : "";
  const sheetHeight = 820;

  const onPrint = () => {
    if (!model) return;
    setPrinting(true);
    try {
      printLoyaltyDocument(buildLoyaltyCardPrintDocument(model));
    } finally {
      window.setTimeout(() => setPrinting(false), 400);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92dvh,52rem)] w-[min(96vw,40rem)] max-w-[40rem] gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b border-border/60 bg-[#faf8f3] px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <IdCard className="size-4 text-[#0b4a36]" aria-hidden />
            Print loyalty card
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-[#5b6b63]">
            {customer?.name?.trim()
              ? `Front and back for ${customer.name.trim()}. Print, then cut along the rounded rectangle.`
              : "Preview the rewards card, then print."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#eef0ec] px-4 py-5 sm:px-6">
          <style>{LOYALTY_CARD_CSS}</style>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#5b6b63]">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Preparing card…
            </div>
          ) : error ? (
            <p className="py-12 text-center text-sm text-destructive">{error}</p>
          ) : model ? (
            <div ref={hostRef} className="mx-auto w-full max-w-[540px]">
              <div style={{ height: sheetHeight * scale }}>
                <div
                  className="origin-top-left"
                  style={{
                    width: 540,
                    transform: `scale(${scale})`,
                  }}
                  dangerouslySetInnerHTML={{ __html: markup }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 flex-row items-center justify-between gap-2 border-t border-border/60 bg-background px-5 py-3 sm:justify-between">
          <p className="hidden text-[11px] leading-snug text-muted-foreground sm:block">
            Two-sided print: front, then back.
          </p>
          <div className="flex w-full justify-end gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onPrint}
              disabled={!model || printing}
              className="bg-[#0b4a36] text-white hover:bg-[#083a2a]"
            >
              {printing ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Printer className="size-3.5" aria-hidden />
              )}
              Print
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type LoyaltyCardLinkProps = {
  onClick: () => void;
  className?: string;
  label?: string;
};

export function LoyaltyCardLink({
  onClick,
  className,
  label = "Print card",
}: LoyaltyCardLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline",
        className,
      )}
    >
      <IdCard className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}
