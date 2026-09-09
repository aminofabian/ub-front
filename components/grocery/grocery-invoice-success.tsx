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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white dark:bg-card animate-in zoom-in-95 fade-in duration-300">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)] transition-colors hover:text-[var(--order-ink,#15231f)]"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="relative flex flex-col items-center px-6 pb-7 pt-10 text-center sm:px-8">
          <div className="mb-5 flex size-16 items-center justify-center rounded-none border border-[var(--pos-primary,#0f766e)] bg-white">
            <CheckCircle2 className="size-8 text-[var(--pos-primary,#0f766e)]" strokeWidth={2.25} />
          </div>

          <h2 className="font-heading text-[22px] font-semibold tracking-[-0.03em] text-[var(--order-ink,#15231f)]">
            Invoice ready
          </h2>
          <p
            className={`mt-2 inline-flex max-w-[18rem] items-center justify-center gap-1.5 text-[13.5px] leading-relaxed ${status.tone}`}
          >
            {status.icon}
            {status.text}
          </p>

          {/* Barcode */}
          <div className="mt-6 w-full rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-5 dark:bg-white">
            <div
              className="mx-auto flex max-w-[280px] justify-center"
              dangerouslySetInnerHTML={{ __html: barcodeSvg }}
            />
            <p className="mt-3.5 text-center font-mono text-[15px] font-bold tracking-[0.2em] text-gray-900">
              {invoice.barcodeCode}
            </p>
          </div>

          {/* Invoice summary */}
          <div className="mt-5 w-full space-y-2.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-4 text-left">
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
              <span className="font-heading text-[22px] font-semibold tabular-nums tracking-[-0.03em] text-[var(--order-ink,#15231f)]">
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
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-4 text-[13px] font-semibold text-[var(--order-ink,#15231f)] transition-colors hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_26%,transparent)] active:scale-[0.97] touch-manipulation"
            >
              <Printer className="size-4" />
              Print
            </button>
            <button
              type="button"
              onClick={onNewInvoice}
              className="group relative flex h-11 flex-1 items-center justify-center gap-2 overflow-hidden rounded-none bg-[var(--pos-primary,#0f766e)] px-4 text-[13px] font-semibold text-[var(--pos-primary-ink,#fff)] transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_88%,#000)] active:scale-[0.97] touch-manipulation"
            >
              <PlusCircle className="size-4 transition-transform duration-200 group-hover:rotate-90" />
              New Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
