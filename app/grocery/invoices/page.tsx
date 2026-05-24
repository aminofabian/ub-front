"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Receipt,
  Filter,
  Loader2,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/components/dashboard-provider";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { DASHBOARD_SECTION_SURFACE } from "@/components/dashboard-page-ui";
import { GroceryInvoicesList } from "@/components/grocery/grocery-invoices-list";
import {
  listGroceryInvoices,
  cancelGroceryInvoice,
  getGroceryInvoice,
  GroceryApiError,
  type GroceryInvoiceSummaryResponse,
  type GroceryInvoiceStatus,
  type GroceryInvoiceResponse,
} from "@/lib/grocery-api";

const STATUS_TABS: Array<{ label: string; value: GroceryInvoiceStatus | "all" }> =
  [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending_payment" },
    { label: "Paid", value: "paid" },
    { label: "Cancelled", value: "cancelled" },
    { label: "Expired", value: "expired" },
  ];

export default function GroceryInvoicesPage() {
  const router = useRouter();
  const { branchId, business } = useDashboard();
  const online = useOnlineStatus();
  const currency = business?.currency?.trim() || "KES";

  const [invoices, setInvoices] = useState<GroceryInvoiceSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GroceryInvoiceStatus | "all">(
    "all",
  );
  const [viewingInvoice, setViewingInvoice] =
    useState<GroceryInvoiceResponse | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const status = activeTab === "all" ? undefined : activeTab;
      const result = await listGroceryInvoices(branchId, status);
      setInvoices(result.invoices ?? []);
    } catch (e) {
      const msg =
        e instanceof GroceryApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load invoices";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [branchId, activeTab]);

  useEffect(() => {
    if (branchId) {
      void fetchInvoices();
    }
  }, [branchId, fetchInvoices]);

  const onViewInvoice = useCallback(async (id: string) => {
    setViewLoading(true);
    try {
      const invoice = await getGroceryInvoice(id);
      setViewingInvoice(invoice);
    } catch (e) {
      const msg =
        e instanceof GroceryApiError
          ? e.message
          : "Failed to load invoice";
      toast.error(msg);
    } finally {
      setViewLoading(false);
    }
  }, []);

  const onCancelInvoice = useCallback(
    async (id: string) => {
      if (!confirm("Cancel this invoice? This cannot be undone.")) return;
      try {
        await cancelGroceryInvoice(id, {
          reason: "Cancelled by staff from dashboard",
        });
        toast.success("Invoice cancelled");
        void fetchInvoices();
      } catch (e) {
        const msg =
          e instanceof GroceryApiError
            ? e.message
            : "Failed to cancel invoice";
        toast.error(msg);
      }
    },
    [fetchInvoices],
  );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col gap-6 px-4 pb-16 sm:px-6">
      {/* Header */}
      <section className={cn(DASHBOARD_SECTION_SURFACE)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/grocery">
                <Button variant="ghost" size="icon-sm" className="-ml-1">
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  Grocery Invoices
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  All invoices for the current branch
                </p>
              </div>
            </div>
          </div>
          {!online && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="size-3" />
              Offline
            </span>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border/50 bg-card p-1 shadow-sm">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "flex-1 shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchInvoices()}
            className="ml-auto text-xs"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Invoices list */}
      <section className={cn(DASHBOARD_SECTION_SURFACE, "flex-1")}>
        <GroceryInvoicesList
          invoices={invoices}
          onViewInvoice={onViewInvoice}
          onCancelInvoice={onCancelInvoice}
          loading={loading}
          currency={currency}
        />
      </section>

      {/* View invoice detail modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-card shadow-2xl ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-card/95 px-5 py-4 backdrop-blur-sm">
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Invoice Detail
              </h3>
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="flex size-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              {viewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Barcode
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold tracking-wider text-foreground">
                      {viewingInvoice.barcodeCode}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-semibold capitalize">
                        {viewingInvoice.status.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {new Date(viewingInvoice.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created by</p>
                      <p className="font-medium">
                        {viewingInvoice.createdByName || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expires</p>
                      <p className="font-medium">
                        {new Date(viewingInvoice.expiresAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-border/40 pt-4">
                    <h4 className="mb-2 text-sm font-semibold text-foreground">
                      Items
                    </h4>
                    <ul className="divide-y divide-border/30">
                      {viewingInvoice.lines.map((line) => (
                        <li
                          key={line.id}
                          className="flex items-center justify-between py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">{line.itemName}</p>
                            <p className="text-xs text-muted-foreground">
                              {line.quantity} × {currency}{" "}
                              {line.unitPrice.toFixed(2)}
                            </p>
                          </div>
                          <span className="font-semibold tabular-nums">
                            {currency} {line.lineTotal.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/40 pt-3">
                    <span className="text-base font-bold">Total</span>
                    <span className="text-xl font-bold tabular-nums">
                      {currency} {viewingInvoice.grandTotal.toFixed(2)}
                    </span>
                  </div>
                  {viewingInvoice.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p className="text-sm">{viewingInvoice.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick filter summary */}
      {!loading && !error && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Filter className="size-3.5" />
          <span>
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
            {activeTab !== "all" ? ` · ${activeTab.replace(/_/g, " ")}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
