"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  Users,
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
import { CustomerCreateDialog } from "@/components/credits/customer-create-dialog";
import { CustomerCrmNavRail } from "@/components/credits/customer-crm-nav-rail";
import { CustomerDetailDrawer } from "@/components/credits/customer-detail-drawer";
import { CustomerInspectorPanel } from "@/components/credits/customer-inspector-panel";
import { CustomerMessagingDrawer } from "@/components/credits/customer-messaging-drawer";
import {
  CRM_GRID,
  CRM_MAIN,
  CRM_PANEL,
  CRM_WORKSPACE_SHELL,
  customerTableCheckboxClass,
  customerTableRowClass,
} from "@/components/credits/customer-crm-ui";
import { customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
import {
  LoyaltyCardPreview,
} from "@/components/credits/loyalty-card-preview";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useFormatMoney } from "@/hooks/use-format-money";
import { fetchCustomers, type CustomerRecord } from "@/lib/api";
import type { LoyaltyCardCustomerInput } from "@/lib/loyalty-card";
import {
  formatDateRangeLabel,
  presetRange,
  type DatePreset,
} from "@/lib/analytics-date-range";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type CustomerDatePreset = Extract<
  DatePreset,
  "today" | "yesterday" | "last3" | "last7" | "last30" | "thisMonth"
> | "all";

const DATE_FILTER_OPTIONS: { id: CustomerDatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last3", label: "3d" },
  { id: "last7", label: "1w" },
  { id: "last30", label: "30d" },
  { id: "thisMonth", label: "Mo" },
  { id: "all", label: "All" },
];

type Props = {
  initialCustomerId?: string | null;
};

export function CustomersWorkspace({ initialCustomerId = null }: Props) {
  const router = useRouter();
  const {
    loading,
    canViewCustomers,
    canManageCustomers,
    canManageCreditSettings,
    canReviewPaymentClaims,
    canViewAnalytics,
  } = useDashboard();
  const { formatMoneyCompact: formatKes } = useFormatMoney();

  const [rows, setRows] = useState<CustomerRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [phoneFilter, setPhoneFilter] = useState("");
  const [activePhoneQuery, setActivePhoneQuery] = useState<string | undefined>();
  const [datePreset, setDatePreset] = useState<CustomerDatePreset>("today");
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [originFilter, setOriginFilter] = useState<"all" | "inferred" | "verified">("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState<{
    text: string;
    kind: "error" | "success";
  } | null>(null);

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [cardCustomer, setCardCustomer] = useState<LoyaltyCardCustomerInput | null>(null);
  const [isXl, setIsXl] = useState(false);

  const dateRange = useMemo(() => {
    if (datePreset === "all") return null;
    return presetRange(datePreset);
  }, [datePreset]);

  const periodLabel = useMemo(() => {
    if (!dateRange) return "All time";
    return formatDateRangeLabel(dateRange.from, dateRange.to);
  }, [dateRange]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const sync = () => setIsXl(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const next = phoneFilter.trim();
    const id = window.setTimeout(() => {
      setActivePhoneQuery(next.length > 0 ? next : undefined);
    }, 280);
    return () => window.clearTimeout(id);
  }, [phoneFilter]);

  useEffect(() => {
    if (loading || !canViewCustomers) return;
    let cancelled = false;
    const run = async () => {
      setListLoading(true);
      setMessage(null);
      try {
        const data = await fetchCustomers(activePhoneQuery, {
          flexible: true,
          createdFrom: dateRange?.from,
          createdTo: dateRange?.to,
        });
        if (!cancelled) {
          setRows(data);
          setSelectedIds(new Set());
        }
      } catch (error) {
        if (!cancelled) {
          setMessage({
            text:
              error instanceof Error ? error.message : "Failed to load customers.",
            kind: "error",
          });
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [loading, canViewCustomers, activePhoneQuery, dateRange, refreshKey]);

  useEffect(() => {
    if (!initialCustomerId || loading || !canViewCustomers) return;
    setFocusedId(initialCustomerId);
    setDetailId(initialCustomerId);
    setDetailOpen(true);
  }, [initialCustomerId, loading, canViewCustomers]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (outstandingOnly && Number(row.credit.balanceOwed) <= 0) return false;
      const verified = row.phones.some((p) => Boolean(p.verifiedAt) && Boolean(p.phone));
      if (originFilter === "inferred" && row.origin !== "mpesa_inferred") return false;
      if (originFilter === "verified" && !verified) return false;
      return true;
    });
  }, [rows, outstandingOnly, originFilter]);

  const focusedCustomer = useMemo(
    () => visibleRows.find((r) => r.id === focusedId) ?? rows.find((r) => r.id === focusedId) ?? null,
    [visibleRows, rows, focusedId],
  );

  const totalOwed = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.credit.balanceOwed ?? 0), 0),
    [rows],
  );

  const openDetail = useCallback(
    (id: string) => {
      setDetailId(id);
      setDetailOpen(true);
      setFocusedId(id);
      router.replace(APP_ROUTES.customer(id), { scroll: false });
    },
    [router],
  );

  const closeDetail = useCallback(
    (open: boolean) => {
      setDetailOpen(open);
      if (!open) {
        setDetailId(null);
        router.replace(APP_ROUTES.customers, { scroll: false });
      }
    },
    [router],
  );

  const onRowActivate = (row: CustomerRecord) => {
    setFocusedId(row.id);
    if (!isXl) {
      openDetail(row.id);
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    if (selectedIds.size === visibleRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleRows.map((row) => row.id)));
    }
  };

  const onCustomerUpdated = (next: CustomerRecord) => {
    setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)));
  };

  const smsTargets = useMemo(() => {
    if (selectedIds.size > 0) return Array.from(selectedIds);
    if (focusedId) return [focusedId];
    return [];
  }, [selectedIds, focusedId]);

  if (loading) {
    return <DashboardLoading label="Loading session…" />;
  }

  if (!canViewCustomers) {
    return (
      <DashboardAccessDenied
        title="Customers"
        description="You do not have access to this area."
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "!space-y-4 pb-20 lg:pb-4")}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <DashboardPageHero
          compact
          icon={Users}
          eyebrow="Customers"
          title="Directory"
          description="Filter in the rail, scan the list, inspect on the right — expand when you need the full profile."
        />
        <div className="flex flex-wrap gap-2">
          {canManageCustomers ? (
            <Button
              type="button"
              size="sm"
              className="rounded-xl"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-3.5" />
              New
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() => setMessagingOpen(true)}
          >
            <MessageCircle className="size-3.5" />
            Messaging
          </Button>
        </div>
      </header>

      {message ? <DashboardFeedback kind={message.kind} text={message.text} /> : null}

      <div className={cn(CRM_WORKSPACE_SHELL, CRM_PANEL)}>
        <div className={CRM_GRID}>
          <CustomerCrmNavRail
            dateOptions={DATE_FILTER_OPTIONS}
            datePreset={datePreset}
            onDatePreset={(id) => setDatePreset(id as CustomerDatePreset)}
            periodLabel={periodLabel}
            outstandingOnly={outstandingOnly}
            onOutstandingOnly={setOutstandingOnly}
            originFilter={originFilter}
            onOriginFilter={setOriginFilter}
            stats={{ shown: visibleRows.length, totalOwed: formatKes(totalOwed) }}
            canViewAnalytics={canViewAnalytics}
            canReviewPaymentClaims={canReviewPaymentClaims}
          />

          <main className={CRM_MAIN}>
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2.5 sm:px-4">
              <div className="relative min-w-0 flex-1 sm:max-w-sm">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  className={cn(dashboardInputClass(), "h-9 pl-9 text-sm")}
                  placeholder="Search name, phone, C-12…"
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                  aria-label="Search customers"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {listLoading ? "Loading…" : `${visibleRows.length} in view`}
              </p>
              {canManageCustomers && selectedIds.size > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setSmsOpen(true)}
                >
                  <MessageSquare className="size-3.5" />
                  {selectedIds.size} selected
                </Button>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="sticky top-0 z-[1] border-b border-border/60 bg-card/95 backdrop-blur-sm">
                  <tr>
                    {canManageCustomers ? (
                      <th className="w-10 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={
                            visibleRows.length > 0 &&
                            selectedIds.size === visibleRows.length
                          }
                          onChange={toggleAllVisible}
                          className={customerTableCheckboxClass()}
                          aria-label="Select all"
                        />
                      </th>
                    ) : null}
                    <th className="px-3 py-2 font-medium text-muted-foreground">Customer</th>
                    <th className="hidden px-3 py-2 font-medium text-muted-foreground md:table-cell">
                      Phone
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      Owed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const owed = Number(row.credit.balanceOwed ?? 0);
                    const selected = selectedIds.has(row.id);
                    const focused = focusedId === row.id;
                    return (
                      <tr
                        key={row.id}
                        className={customerTableRowClass(selected, focused)}
                        onClick={() => onRowActivate(row)}
                        onDoubleClick={() => openDetail(row.id)}
                      >
                        {canManageCustomers ? (
                          <td
                            className="px-3 py-2.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleRow(row.id)}
                              className={customerTableCheckboxClass()}
                              aria-label={`Select ${row.name}`}
                            />
                          </td>
                        ) : null}
                        <td className="cursor-pointer px-3 py-2.5">
                          <p className="font-medium leading-snug">{row.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {row.customerNo != null ? `C-${row.customerNo}` : "—"}
                          </p>
                        </td>
                        <td className="hidden cursor-pointer px-3 py-2.5 text-muted-foreground md:table-cell">
                          {customerPrimaryPhone(row.phones) || "—"}
                        </td>
                        <td
                          className={cn(
                            "cursor-pointer px-3 py-2.5 text-right tabular-nums",
                            owed > 0 && "font-medium text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {formatKes(owed)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!listLoading && visibleRows.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                  No customers match this view.
                </p>
              ) : null}
            </div>
          </main>

          <CustomerInspectorPanel
            customer={focusedCustomer}
            formatKes={formatKes}
            canManage={canManageCustomers}
            onOpenFull={() => focusedId && openDetail(focusedId)}
            onMessage={() => setSmsOpen(true)}
            onLoyaltyCard={() => {
              if (!focusedCustomer) return;
              setCardCustomer({
                id: focusedCustomer.id,
                name: focusedCustomer.name,
                phone: customerPrimaryPhone(focusedCustomer.phones),
                loyaltyPoints: focusedCustomer.credit.loyaltyPoints,
              });
            }}
          />
        </div>
      </div>

      {!isXl && focusedCustomer && !detailOpen && selectedIds.size === 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-card/95 p-3 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{focusedCustomer.name}</p>
              <p className="text-xs text-muted-foreground">Tap expand for full profile</p>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 rounded-xl"
              onClick={() => openDetail(focusedCustomer.id)}
            >
              Open
            </Button>
          </div>
        </div>
      ) : null}

      {canManageCustomers && selectedIds.size > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-border/80 bg-card/95 px-4 py-3 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-md sm:block lg:bottom-0">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-sm font-medium">{selectedIds.size} selected</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-xl"
                onClick={() => setSmsOpen(true)}
              >
                <MessageSquare className="mr-1.5 size-4" />
                Message
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <CustomerCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => setRefreshKey((k) => k + 1)}
        onFeedback={(kind, text) => setMessage({ kind, text })}
      />

      <CustomerMessagingDrawer
        open={messagingOpen}
        onOpenChange={setMessagingOpen}
        canEdit={canManageCreditSettings}
      />

      <CustomerDetailDrawer
        open={detailOpen}
        onOpenChange={closeDetail}
        customerId={detailId}
        canEdit={canManageCustomers}
        canRemind={canManageCustomers}
        onCustomerUpdated={onCustomerUpdated}
      />

      <CustomerBulkSmsDrawer
        open={smsOpen}
        onOpenChange={setSmsOpen}
        customerIds={smsTargets}
        recipientLabel={
          selectedIds.size > 0
            ? `${selectedIds.size} selected`
            : focusedCustomer?.name ?? "customer"
        }
        onSent={(text, kind = "success") => setMessage({ kind, text })}
      />

      <LoyaltyCardPreview
        customer={cardCustomer}
        open={cardCustomer != null}
        onOpenChange={(next) => {
          if (!next) setCardCustomer(null);
        }}
      />
    </div>
  );
}
