"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  Filter,
  MessageSquare,
  Search,
  Users,
  X,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { CustomerBulkSmsDrawer } from "@/components/credits/customer-bulk-sms-drawer";
import {
  CRM_GRID,
  CRM_MAIN,
  CRM_PANEL,
  CRM_PILL_ACTIVE,
  CRM_PILL_IDLE,
  CRM_RAIL,
  CRM_WORKSPACE_SHELL,
  customerTableCheckboxClass,
  customerTableRowClass,
} from "@/components/credits/customer-crm-ui";
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

export function CustomerSegmentsWorkspace() {
  const { loading, canViewAnalytics, canManageCustomers } = useDashboard();
  const { formatMoneyCompact: formatKes } = useFormatMoney();

  const [productQuery, setProductQuery] = useState("");
  const [productHits, setProductHits] = useState<ItemSummaryRecord[]>([]);
  const [productSearchBusy, setProductSearchBusy] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemSummaryRecord | null>(null);
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
        text: e instanceof Error ? e.message : "Could not load customer segment.",
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
    <div className={cn(DASHBOARD_MAX_WIDE, "!space-y-4 pb-16 lg:pb-4")}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <DashboardPageHero
          compact
          icon={Filter}
          eyebrow="Customers"
          title="Segments"
          description="Pick a product in the left column, read buyers in the center, message from the drawer."
        />
        <Link
          href={APP_ROUTES.customers}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted/40"
        >
          <ArrowLeft className="size-4" />
          Directory
        </Link>
      </header>

      {message ? <DashboardFeedback kind={message.kind} text={message.text} /> : null}

      <div className={cn(CRM_WORKSPACE_SHELL, CRM_PANEL)}>
        <div className={cn(CRM_GRID, "xl:grid-cols-[minmax(16rem,18rem)_minmax(0,1fr)]")}>
          <aside className={CRM_RAIL}>
            <div className="space-y-4 p-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Product
                </p>
                <div className="space-y-2">
                  <input
                    className={cn(dashboardInputClass(), "h-10 text-sm")}
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void onSearchProducts();
                      }
                    }}
                    placeholder="Name or SKU…"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 w-full rounded-xl"
                    disabled={productSearchBusy || !productQuery.trim()}
                    onClick={() => void onSearchProducts()}
                  >
                    <Search className="mr-1.5 size-4" />
                    {productSearchBusy ? "Searching…" : "Find product"}
                  </Button>
                </div>
                {productHits.length > 0 ? (
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-1.5">
                    {productHits.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted/50"
                          onClick={() => {
                            setSelectedItem(item);
                            setProductHits([]);
                            setProductQuery(item.name);
                          }}
                        >
                          {item.name}
                          {item.sku ? (
                            <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                              {item.sku}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {selectedItem ? (
                <div className="rounded-xl border border-[#8B6F3A]/20 bg-[#F9F6F0]/60 px-3 py-2.5 dark:bg-[#8B6F3A]/10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8B6F3A]">
                        Active segment
                      </p>
                      <p className="truncate text-sm font-semibold">{selectedItem.name}</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      onClick={() => {
                        setSelectedItem(null);
                        setRows([]);
                        setProductQuery("");
                      }}
                      aria-label="Clear product"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Period
                </p>
                <div className="flex flex-wrap gap-1">
                  {DATE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDatePreset(opt.id)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                        datePreset === opt.id ? CRM_PILL_ACTIVE : CRM_PILL_IDLE,
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{periodLabel}</p>
              </div>
            </div>
          </aside>

          <main className={cn(CRM_MAIN, "lg:max-h-none")}>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">
                  {selectedItem
                    ? `${rows.length} buyer${rows.length === 1 ? "" : "s"}`
                    : "Results"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Linked sales only — walk-ins without a customer record are excluded
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={rows.length === 0}
                  onClick={exportCsv}
                >
                  <Download className="mr-1.5 size-4" />
                  CSV
                </Button>
                {canManageCustomers ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={selectedIds.size === 0}
                    onClick={() => setSmsOpen(true)}
                  >
                    <MessageSquare className="mr-1.5 size-4" />
                    Message ({selectedIds.size})
                  </Button>
                ) : null}
              </div>
            </div>

            {!selectedItem ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center text-muted-foreground">
                <Users className="size-9 opacity-35" />
                <p className="text-sm font-medium text-foreground">Choose a product</p>
                <p className="max-w-xs text-xs leading-relaxed">
                  Search the catalog on the left to see who bought it in the selected period.
                </p>
              </div>
            ) : listLoading ? (
              <DashboardLoading label="Loading segment…" />
            ) : rows.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                No customers bought this product in the selected period.
              </p>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="sticky top-0 z-[1] border-b border-border/60 bg-card/95 backdrop-blur-sm">
                    <tr>
                      {canManageCustomers ? (
                        <th className="w-10 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={rows.length > 0 && selectedIds.size === rows.length}
                            onChange={toggleAll}
                            className={customerTableCheckboxClass()}
                            aria-label="Select all"
                          />
                        </th>
                      ) : null}
                      <th className="px-3 py-2 font-medium text-muted-foreground">Customer</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Phone</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Buys</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Spend</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Last</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const selected = selectedIds.has(row.customerId);
                      return (
                        <tr
                          key={row.customerId}
                          className={customerTableRowClass(selected)}
                        >
                          {canManageCustomers ? (
                            <td className="px-3 py-2.5">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleRow(row.customerId)}
                                className={customerTableCheckboxClass()}
                                aria-label={`Select ${row.name}`}
                              />
                            </td>
                          ) : null}
                          <td className="px-3 py-2.5">
                            <Link
                              href={APP_ROUTES.customer(row.customerId)}
                              className="font-medium hover:underline"
                            >
                              {row.customerNo != null ? `C-${row.customerNo} · ` : ""}
                              {row.name}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {row.primaryPhone || "—"}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">{row.purchaseCount}</td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {formatKes(row.spendOnItem)}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {new Date(row.lastPurchaseAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      </div>

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
