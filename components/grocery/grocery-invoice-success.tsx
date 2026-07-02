"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Printer,
  PlusCircle,
  X,
  Clock,
  ShoppingBasket,
  Loader2,
} from "lucide-react";
import type { GroceryInvoiceResponse } from "@/lib/grocery-api";
import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";
import { useOptionalRealtime } from "@/components/realtime-provider";

type GroceryInvoiceSuccessProps = {
  invoice: GroceryInvoiceResponse;
  onNewInvoice: () => void;
  onClose: () => void;
  currency?: string;
};

// ── Simple SVG Code-128–style barcode renderer ────────────────────

function renderBarcodeSvg(code: string): string {
  const bars: number[] = [];
  let seed = 0;
  for (let i = 0; i < code.length; i++) {
    seed = (seed * 31 + code.charCodeAt(i)) & 0x7fffffff;
  }

  const targetBars = 70;
  let currentSeed = seed;
  for (let i = 0; i < targetBars; i++) {
    currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
    const pos = i / targetBars;
    if (pos < 0.03 || pos > 0.97) {
      bars.push(2);
    } else {
      bars.push((Math.abs(currentSeed) % 3) + 1);
    }
  }

  const barWidth = 2.5;
  const height = 80;
  let x = 4;
  const rects: string[] = [];
  let isBlack = true;

  for (const w of bars) {
    if (isBlack) {
      rects.push(
        `<rect x="${x.toFixed(1)}" y="0" width="${(w * barWidth).toFixed(1)}" height="${height}" fill="#111" rx="0.5" />`,
      );
    }
    x += w * barWidth;
    isBlack = !isBlack;
  }

  const totalWidth = x + 4;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(0)} ${height}" width="${totalWidth.toFixed(0)}" height="${height}" role="img" aria-label="Barcode ${code}">
    <rect x="0" y="0" width="${totalWidth.toFixed(0)}" height="${height}" fill="#fff" rx="2" />
    ${rects.join("\n    ")}
  </svg>`;
}

function formatExpiry(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type InvoiceLifecycle = "created" | "locked" | "paid" | "cancelled" | "expired";

function matchesInvoice(frame: RealtimeFrame, invoice: GroceryInvoiceResponse) {
  const d = frame.data as Record<string, unknown>;
  return (
    d.invoiceId === invoice.id || d.barcodeCode === invoice.barcodeCode
  );
}

export function GroceryInvoiceSuccess({
  invoice,
  onNewInvoice,
  onClose,
  currency = "KES",
}: GroceryInvoiceSuccessProps) {
  const barcodeSvg = useMemo(
    () => renderBarcodeSvg(invoice.barcodeCode),
    [invoice.barcodeCode],
  );

  const realtime = useOptionalRealtime();
  const [lifecycle, setLifecycle] = useState<InvoiceLifecycle>(
    invoice.status === "pending_payment" ? "created" : invoice.status,
  );

  useEffect(() => {
    const client = getRealtimeClient();
    const unregister = client.registerListener("grocery-invoice-success", {
      channels: ["grocery"],
      onGroceryInvoiceLocked: (frame) => {
        if (matchesInvoice(frame, invoice)) setLifecycle("locked");
      },
      onGroceryInvoicePaid: (frame) => {
        if (matchesInvoice(frame, invoice)) setLifecycle("paid");
      },
      onGroceryInvoiceCancelled: (frame) => {
        if (matchesInvoice(frame, invoice)) setLifecycle("cancelled");
      },
      onGroceryInvoiceExpired: (frame) => {
        if (matchesInvoice(frame, invoice)) setLifecycle("expired");
      },
    });
    return unregister;
  }, [invoice]);

  const itemCount = invoice.lines.reduce((sum, l) => sum + l.quantity, 0);

  const statusConfig: Record<
    InvoiceLifecycle,
    { text: string; icon: ReactNode; tone: string }
  > = {
    created: {
      text:
        realtime?.connectionState === "connected"
          ? "Cashier notified — keep this barcode ready"
          : "Show this barcode at the cashier to complete checkout",
      icon: null,
      tone: "text-muted-foreground",
    },
    locked: {
      text: "Cashier is processing this invoice…",
      icon: <Loader2 className="size-3.5 animate-spin" />,
      tone: "text-primary",
    },
    paid: {
      text: "Paid ✓",
      icon: <CheckCircle2 className="size-3.5" />,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    cancelled: {
      text: "Invoice cancelled",
      icon: <X className="size-3.5" />,
      tone: "text-red-600 dark:text-red-400",
    },
    expired: {
      text: "Invoice expired",
      icon: <Clock className="size-3.5" />,
      tone: "text-amber-700 dark:text-amber-400",
    },
  };

  const status = statusConfig[lifecycle];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-[0_28px_80px_rgba(0,0,0,0.28),0_0_0_1px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] dark:bg-card dark:ring-white/[0.06] animate-in zoom-in-95 fade-in duration-300">
        {/* Top accent gradient */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(80%_120%_at_50%_0%,hsl(142_70%_92%/0.9),transparent_70%)] dark:bg-[radial-gradient(80%_120%_at_50%_0%,hsl(142_70%_22%/0.5),transparent_70%)]"
        />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-2xl bg-white/80 text-muted-foreground backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200 hover:bg-white hover:text-foreground active:scale-90 dark:bg-white/10 dark:hover:bg-white/20"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="relative flex flex-col items-center px-6 pb-7 pt-12 text-center sm:px-8 sm:pt-14">
          {/* Success icon */}
          <div className="relative mb-5">
            <div className="absolute inset-0 -m-3 rounded-[2.5rem] bg-emerald-400/20 blur-2xl dark:bg-emerald-400/15" />
            <div className="relative flex size-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_12px_32px_-6px_rgba(16,185,129,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]">
              <CheckCircle2 className="size-11 text-white" strokeWidth={2.25} />
            </div>
          </div>

          <h2 className="text-[24px] font-bold tracking-tight text-foreground">
            Invoice Ready
          </h2>
          <p
            className={`mt-2 inline-flex max-w-[18rem] items-center justify-center gap-1.5 text-[13.5px] leading-relaxed ${status.tone}`}
          >
            {status.icon}
            {status.text}
          </p>

          {/* Barcode */}
          <div className="mt-6 w-full rounded-2xl border border-border/60 bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_2px_8px_rgba(0,0,0,0.04)] dark:bg-white">
            <div
              className="mx-auto flex max-w-[280px] justify-center"
              dangerouslySetInnerHTML={{ __html: barcodeSvg }}
            />
            <p className="mt-3.5 text-center font-mono text-[15px] font-bold tracking-[0.2em] text-gray-900">
              {invoice.barcodeCode}
            </p>
          </div>

          {/* Invoice summary */}
          <div className="mt-5 w-full space-y-2.5 rounded-2xl border border-border/[0.08] bg-muted/[0.1] p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                <ShoppingBasket className="size-3.5" />
                Items
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-foreground">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border/[0.08] pt-2.5">
              <span className="text-[13px] font-medium text-muted-foreground">
                Total
              </span>
              <span className="text-[22px] font-bold tabular-nums tracking-tight text-foreground">
                {currency} {invoice.grandTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border/[0.08] pt-2 text-[12px]">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-3.5" />
                Expires
              </span>
              <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                {formatExpiry(invoice.expiresAt)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex w-full gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-border/60 bg-white px-4 text-[13.5px] font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.6)] transition-all duration-200 hover:bg-muted/50 hover:shadow-md active:scale-[0.97] touch-manipulation dark:bg-white/[0.02]"
            >
              <Printer className="size-4" />
              Print
            </button>
            <button
              type="button"
              onClick={onNewInvoice}
              className="group relative flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary))_0%,color-mix(in_oklch,hsl(var(--primary))_88%,#fff)_50%,hsl(var(--primary))_100%)] px-4 text-[13.5px] font-bold text-white shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.45),inset_0_1px_0_hsl(0_0%_100%/0.2)] transition-all duration-200 hover:shadow-[0_12px_32px_-6px_hsl(var(--primary)/0.55)] active:scale-[0.97] touch-manipulation"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
              />
              <PlusCircle className="size-4 transition-transform duration-200 group-hover:rotate-90" />
              New Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
