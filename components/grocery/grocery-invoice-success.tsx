"use client";

import { useMemo } from "react";
import { CheckCircle, Printer, PlusCircle, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GroceryInvoiceResponse } from "@/lib/grocery-api";

type GroceryInvoiceSuccessProps = {
  invoice: GroceryInvoiceResponse;
  onNewInvoice: () => void;
  onClose: () => void;
  currency?: string;
};

// ── Simple SVG Code-128–style barcode renderer ────────────────────

function renderBarcodeSvg(code: string): string {
  // Generate a deterministic set of bar widths from the code string
  const bars: number[] = [];
  let seed = 0;
  for (let i = 0; i < code.length; i++) {
    seed = (seed * 31 + code.charCodeAt(i)) & 0x7fffffff;
  }

  // Produce ~60-80 bars of varying widths
  const targetBars = 70;
  let currentSeed = seed;
  for (let i = 0; i < targetBars; i++) {
    currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
    // 1-3 width with some wider bars for start/stop
    const pos = i / targetBars;
    if (pos < 0.03 || pos > 0.97) {
      bars.push(2); // wider guard bars at edges
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

  const itemCount = invoice.lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-col items-center px-6 pb-6 pt-10 text-center">
          {/* Success icon */}
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle className="size-9 text-emerald-600 dark:text-emerald-400" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Invoice Generated!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Show this barcode at the cashier to complete checkout
          </p>

          {/* Barcode */}
          <div className="mt-5 w-full rounded-xl border border-border/60 bg-white p-4 dark:bg-white">
            <div
              className="mx-auto flex max-w-[280px] justify-center"
              dangerouslySetInnerHTML={{ __html: barcodeSvg }}
            />
            <p className="mt-3 text-center font-mono text-base font-bold tracking-[0.15em] text-gray-900">
              {invoice.barcodeCode}
            </p>
          </div>

          {/* Invoice summary */}
          <div className="mt-5 w-full space-y-2 rounded-xl border border-border/50 bg-muted/30 p-4 text-left">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Items</span>
              <span className="font-medium tabular-nums text-foreground">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-bold tabular-nums text-foreground">
                {currency} {invoice.grandTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3" />
                Expires
              </span>
              <span className="font-medium tabular-nums text-amber-700 dark:text-amber-400">
                {formatExpiry(invoice.expiresAt)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex w-full gap-3">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="flex-1 h-11 text-sm font-semibold gap-2"
            >
              <Printer className="size-4" />
              Print
            </Button>
            <Button
              onClick={onNewInvoice}
              className="flex-1 h-11 text-sm font-semibold gap-2"
            >
              <PlusCircle className="size-4" />
              New Invoice
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
