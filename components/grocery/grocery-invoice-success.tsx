"use client";

import { useMemo } from "react";
import { CheckCircle, Printer, PlusCircle, X, Clock } from "lucide-react";
import type { GroceryInvoiceResponse } from "@/lib/grocery-api";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.25)] ring-1 ring-black/[0.04] dark:bg-card dark:ring-white/[0.06] animate-in zoom-in-95 duration-300">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground backdrop-blur-sm transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-90"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-col items-center px-6 pb-7 pt-12 text-center">
          {/* Success icon */}
          <div className="mb-5 flex size-[4.5rem] items-center justify-center rounded-[1.75rem] bg-emerald-100 shadow-[0_8px_24px_rgba(16,185,129,0.2)] dark:bg-emerald-900/30">
            <CheckCircle className="size-10 text-emerald-600 dark:text-emerald-400" />
          </div>

          <h2 className="text-[22px] font-bold tracking-tight text-foreground">
            Invoice Ready
          </h2>
          <p className="mt-2 max-w-[16rem] text-[14px] leading-relaxed text-muted-foreground">
            Show this barcode at the cashier to complete checkout
          </p>

          {/* Barcode */}
          <div className="mt-6 w-full rounded-2xl border border-border/60 bg-white p-5 shadow-sm dark:bg-white">
            <div
              className="mx-auto flex max-w-[280px] justify-center"
              dangerouslySetInnerHTML={{ __html: barcodeSvg }}
            />
            <p className="mt-3.5 text-center font-mono text-[15px] font-bold tracking-[0.18em] text-gray-900">
              {invoice.barcodeCode}
            </p>
          </div>

          {/* Invoice summary */}
          <div className="mt-6 w-full space-y-2.5 rounded-2xl border border-border/[0.08] bg-muted/[0.08] p-4.5 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Items</span>
              <span className="text-[13px] font-semibold tabular-nums text-foreground">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border/[0.06] pt-2.5">
              <span className="text-[13px] font-medium text-muted-foreground">
                Total
              </span>
              <span className="text-[20px] font-bold tabular-nums tracking-tight text-foreground">
                {currency} {invoice.grandTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
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
          <div className="mt-7 flex w-full gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border/60 bg-white px-4 py-3 text-[13px] font-semibold text-foreground shadow-sm transition-all duration-200 hover:bg-muted/50 hover:shadow-md active:scale-[0.97] dark:bg-white/[0.02]"
            >
              <Printer className="size-4" />
              Print
            </button>
            <button
              type="button"
              onClick={onNewInvoice}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary/90 px-4 py-3 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)] active:scale-[0.97]"
            >
              <PlusCircle className="size-4" />
              New Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
