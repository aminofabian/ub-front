"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, MessageSquare, Search, Users, Download } from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { CustomerBulkSmsDrawer } from "@/components/credits/customer-bulk-sms-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useFormatMoney } from "@/hooks/use-format-money";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  fetchCustomersByProduct,
  fetchItemsPage,
  type CustomerProductSegmentRow,
  type ItemSummaryRecord,
} from "@/lib/api";
import {
  formatDateRangeLabel,
  presetRange,
  type DatePreset,
} from "@/lib/analytics-date-range";

type SegmentDatePreset = Extract<
  DatePreset,
  "last7" | "last30" | "thisMonth" | "lastMonth"
>;

const DATE_OPTIONS: { id: SegmentDatePreset; label: string }[] = [
  { id: "last7", label: "7 days" },
  { id: "last30", label: "30 days" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
];

export default function CustomerSegmentsPage() {
  const { loading, canViewAnalytics, canManageCustomers } = useDashboard();
  const { formatMoneyCompact: formatKes } = useFormatMoney();

  const [productQuery, setProductQuery] = useState("");
  const [productHits, setProductHits] = useState<ItemSummaryRecord[]>([]);
  const [productSearchBusy, setProductSearchBusy] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemSummaryRecord | null>(
    null,
  );
  const [datePreset, setDatePreset] = useState<SegmentDatePreset>("last30");
  const [rows, setRows] = useState<CustomerProductSegmentRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [smsOpen, setSmsOpen] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    kind: "error" | "success";
  } | null>(null);

  const dateRange = useMemo(
    () => presetRange(datePreset) ?? presetRange("last30")!,
    [datePreset],
  );
  const periodLabel = formatDateRangeLabel(dateRange.from, dateRange.to);

  const onSearchProducts = useCallback(async () => {
    const q = productQuery.trim();
    if (!q) {
      setProductHits([]);
      return;
    }
    setProductSearchBusy(true);
    try {
      const page = await fetchItemsPage(q, { size: 12 });
      setProductHits(page.content ?? []);
    } catch {
      setProductHits([]);
    } finally {
      setProductSearchBusy(false);
    }
  }, [productQuery]);

  const loadSegment = useCallback(async () => {
    if (!selectedItem) return;
    setListLoading(true);
    setMessage(null);
    setSelectedIds(new Set());
    try {
      const data = await fetchCustomersByProduct({
        itemId: selectedItem.id,
        from: dateRange.from,
        to: dateRange.to,
      });
      setRows(data);
    } catch (e) {
      setRows([]);
      setMessage({
        kind: "error",
        text:
          e instanceof Error ? e.message : "Could not load customer segment.",
      });
    } finally {
      setListLoading(false);
    }
  }, [selectedItem, dateRange.from, dateRange.to]);

  useEffect(() => {
    if (!selectedItem) return;
    void loadSegment();
  }, [selectedItem, loadSegment]);

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.customerId)));
    }
  };

  const exportCsv = () => {
    if (rows.length === 0) return;
    const header = [
      "customer_no",
      "name",
      "phone",
      "purchase_count",
      "spend_on_item",
      "last_purchase_at",
      "customer_id",
    ];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = rows.map((row) =>
      [
        row.customerNo != null ? `C-${row.customerNo}` : "",
        row.name,
        row.primaryPhone ?? "",
        String(row.purchaseCount),
        String(row.spendOnItem),
        new Date(row.lastPurchaseAt).toISOString(),
        row.customerId,
      ]
        .map((cell) => escape(String(cell)))
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const slug = selectedItem?.sku?.trim() || selectedItem?.name?.trim() || "segment";
    anchor.href = url;
    anchor.download = `customers-${slug.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <DashboardLoading label="Loading session…" />;
  }

  if (!canViewAnalytics) {
    return (
      <DashboardAccessDenied
        title="Customer segments"
        description="You need sales reports access to filter shoppers by product."
        backHref={APP_ROUTES.business}
        backLabel="Business home"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        icon={Filter}
        eyebrow="Customers"
        title="Segments"
        description="Find shoppers who bought a product, then message them by SMS."
      />

      {message ? <DashboardFeedback kind={message.kind} text={message.text} /> : null}

      <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold">Product</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className={cn(dashboardInputClass(), "h-11 min-w-0 flex-1")}
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onSearchProducts();
                }
              }}
              placeholder="Search product name or SKU…"
            />
            <Button
              type="button"
              variant="secondary"
              className="h-11 rounded-xl"
              disabled={productSearchBusy || !productQuery.trim()}
              onClick={() => void onSearchProducts()}
            >
              <Search className="mr-1.5 size-4" />
              {productSearchBusy ? "Searching…" : "Find product"}
            </Button>
          </div>
          {productHits.length > 0 ? (
            <ul className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-2">
              {productHits.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/50"
                    onClick={() => {
                      setSelectedItem(item);
                      setProductHits([]);
                      setProductQuery(item.name);
                    }}
                  >
                    {item.name}
                    {item.sku ? (
                      <span className="ml-2 text-muted-foreground">
                        {item.sku}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {selectedItem ? (
            <p className="text-sm text-muted-foreground">
              Showing buyers of{" "}
              <span className="font-medium text-foreground">
                {selectedItem.name}
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {DATE_OPTIONS.map((opt) => (
            <Button
              key={opt.id}
              type="button"
              size="sm"
              variant={datePreset === opt.id ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setDatePreset(opt.id)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </section>

      {selectedItem ? (
        <section className="mt-4 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold">
                {rows.length} customer{rows.length === 1 ? "" : "s"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Linked sales only — walk-ins without a customer record are not
                included
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={rows.length === 0}
                onClick={exportCsv}
              >
                <Download className="mr-1.5 size-4" />
                Export CSV
              </Button>
              {canManageCustomers ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={selectedIds.size === 0}
                  onClick={() => setSmsOpen(true)}
                >
                  <MessageSquare className="mr-1.5 size-4" />
                  Message selected ({selectedIds.size})
                </Button>
              ) : null}
            </div>
          </div>

          {listLoading ? (
            <DashboardLoading label="Loading segment…" />
          ) : rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No customers bought this product in the selected period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/20">
                  <tr>
                    {canManageCustomers ? (
                      <th className="px-4 py-3 sm:px-5">
                        <input
                          type="checkbox"
                          checked={
                            rows.length > 0 && selectedIds.size === rows.length
                          }
                          onChange={toggleAll}
                          aria-label="Select all"
                        />
                      </th>
                    ) : null}
                    <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">
                      Customer
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">
                      Phone
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">
                      Purchases
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">
                      Spend on product
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">
                      Last bought
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.customerId}
                      className="border-b border-border/40 last:border-0"
                    >
                      {canManageCustomers ? (
                        <td className="px-4 py-3 sm:px-5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.customerId)}
                            onChange={() => toggleRow(row.customerId)}
                            aria-label={`Select ${row.name}`}
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-3 sm:px-5">
                        <Link
                          href={APP_ROUTES.customer(row.customerId)}
                          className="font-medium hover:underline"
                        >
                          {row.customerNo != null
                            ? `C-${row.customerNo} · `
                            : ""}
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground sm:px-5">
                        {row.primaryPhone || "—"}
                      </td>
                      <td className="px-4 py-3 sm:px-5">{row.purchaseCount}</td>
                      <td className="px-4 py-3 sm:px-5">
                        {formatKes(row.spendOnItem)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground sm:px-5">
                        {new Date(row.lastPurchaseAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <div className="mt-8 flex flex-col items-center gap-2 text-center text-muted-foreground">
          <Users className="size-8 opacity-40" />
          <p className="text-sm">Pick a product to see who bought it.</p>
        </div>
      )}

      <CustomerBulkSmsDrawer
        open={smsOpen}
        onOpenChange={setSmsOpen}
        customerIds={Array.from(selectedIds)}
        recipientLabel={`${selectedIds.size} selected`}
        onSent={(text, kind = "success") => setMessage({ kind, text })}
      />
    </div>
  );
}
