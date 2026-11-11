"use client";

import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fetchSaleReceiptPdf } from "@/lib/api";
import {
  printPosReceipt,
  type LocalReceiptPrinterTarget,
} from "@/lib/desktop-print";
import { cn } from "@/lib/utils";

export type SaleReceiptActionsProps = {
  saleId: string;
  /** Shown in the downloaded PDF filename, e.g. receipt number. */
  receiptLabel?: string;
  receiptPrinter?: LocalReceiptPrinterTarget | null;
  /** Hide PDF when the surface already has another download control. */
  showPdf?: boolean;
  className?: string;
  buttonClassName?: string;
  size?: "sm" | "default";
};

function saveReceiptPdf(blob: Blob, label: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${label || "sale"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Thermal print (+ optional PDF) for a completed walk-in sale. */
export function SaleReceiptActions({
  saleId,
  receiptLabel,
  receiptPrinter,
  showPdf = true,
  className,
  buttonClassName,
  size = "sm",
}: SaleReceiptActionsProps) {
  const [printing, setPrinting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const id = saleId.trim();
  if (!id) return null;

  const label = (receiptLabel ?? id.slice(-8)).trim() || id.slice(-8);
  const btn = cn(
    size === "sm"
      ? "h-7 gap-1 rounded-none px-2 text-[11px] text-muted-foreground hover:text-foreground sm:h-8 sm:rounded-lg sm:px-2.5 sm:text-[12px] sm:font-semibold"
      : undefined,
    buttonClassName,
  );

  const onPrint = async () => {
    setPrinting(true);
    try {
      await printPosReceipt(id, 80, receiptPrinter ?? null);
    } catch {
      // printPosReceipt already toasts
    } finally {
      setPrinting(false);
    }
  };

  const onPdf = async () => {
    setPdfLoading(true);
    try {
      const blob = await fetchSaleReceiptPdf(id);
      saveReceiptPdf(blob, label);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not download the receipt PDF.",
      );
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btn}
        disabled={printing}
        onClick={() => void onPrint()}
        aria-label={`Print receipt ${label}`}
      >
        {printing ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Printer className="size-3.5" aria-hidden />
        )}
        {printing ? "Printing…" : "Print"}
      </Button>
      {showPdf ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={btn}
          disabled={pdfLoading}
          onClick={() => void onPdf()}
          aria-label={`Download PDF for receipt ${label}`}
        >
          {pdfLoading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="size-3.5" aria-hidden />
          )}
          {pdfLoading ? "PDF…" : "PDF"}
        </Button>
      ) : null}
    </div>
  );
}

/** Parse a typed query into a receipt number when the user is clearly looking one up. */
export function parseReceiptSearchQuery(query: string): number | null {
  const raw = query.trim();
  if (!raw) return null;
  const stripped = raw.replace(/^#+/, "").replace(/[\s,]/g, "");
  if (!/^\d{1,12}$/.test(stripped)) return null;
  const n = Number(stripped);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
