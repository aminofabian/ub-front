"use client";

import { useState, useMemo } from "react";
import { ScanLine, ShoppingCart } from "lucide-react";
import { QuickSaleWorkspace } from "@/components/cashier/quick-sale-workspace";
import { CashierInvoicePayment } from "@/components/cashier/cashier-invoice-payment";
import { cn } from "@/lib/utils";

type CashierTab = "pos" | "invoice";

export default function CashierHomePage() {
  const [tab, setTab] = useState<CashierTab>("pos");

  return (
    <div className="flex min-h-full flex-col">
      {/* Tab switcher — touch-friendly pill tabs */}
      <div className="mx-auto mb-3 flex w-fit gap-1 rounded-xl bg-muted/60 p-1">
        <button
          type="button"
          onClick={() => setTab("pos")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "pos"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShoppingCart className="size-4" />
          Quick Sale
        </button>
        <button
          type="button"
          onClick={() => setTab("invoice")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "invoice"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ScanLine className="size-4" />
          Invoice Payment
        </button>
      </div>

      {tab === "pos" ? (
        <QuickSaleWorkspace variant="cashier" />
      ) : (
        <CashierInvoicePayment variant="embedded" />
      )}
    </div>
  );
}
