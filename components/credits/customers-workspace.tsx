"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Filter,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { CustomerBulkSmsDrawer } from "@/components/credits/customer-bulk-sms-drawer";
import { CustomerContactColumn } from "@/components/credits/customer-contact-column";
import { CustomerCreateDialog } from "@/components/credits/customer-create-dialog";
import { CustomerDetailDrawer } from "@/components/credits/customer-detail-drawer";
import { CustomerInsightsColumn } from "@/components/credits/customer-insights-column";
import { CustomerListColumn } from "@/components/credits/customer-list-column";
import { CustomerMessagingDrawer } from "@/components/credits/customer-messaging-drawer";
import {
  CRM_GRID,
  CRM_PANEL,
  CRM_WORKSPACE_SHELL,
} from "@/components/credits/customer-crm-ui";
import { customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
import { LoyaltyCardPreview } from "@/components/credits/loyalty-card-preview";
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

type MobilePane = "list" | "insights" | "contact";

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
  const [datePreset, setDatePreset] = useState<CustomerDatePreset>("all");
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [originFilter, setOriginFilter] = useState<"all" | "inferred" | "verified">("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState<{
    text: string;
    kind: "error" | "success";
  } | null>(null);

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [cardCustomer, setCardCustomer] = useState<LoyaltyCardCustomerInput | null>(null);
  const [isLg, setIsLg] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>("list");

  const dateRange = useMemo(() => {
    if (datePreset === "all") return null;
    return presetRange(datePreset);
  }, [datePreset]);

  const periodLabel = useMemo(() => {
    if (!dateRange) return "All time";
    return formatDateRangeLabel(dateRange.from, dateRange.to);
  }, [dateRange]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLg(mq.matches);
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

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (outstandingOnly && Number(row.credit.balanceOwed) <= 0) return false;
      const verified = row.phones.some((p) => Boolean(p.verifiedAt) && Boolean(p.phone));
      if (originFilter === "inferred" && row.origin !== "mpesa_inferred") return false;
      if (originFilter === "verified" && !verified) return false;
      return true;
    });
  }, [rows, outstandingOnly, originFilter]);

  useEffect(() => {
    if (initialCustomerId) {
      setFocusedId(initialCustomerId);
      if (!isLg) setMobilePane("insights");
      return;
    }
    if (!focusedId && visibleRows.length > 0 && isLg) {
      setFocusedId(visibleRows[0]!.id);
    }
  }, [initialCustomerId, visibleRows, focusedId, isLg]);

  const focusedCustomer = useMemo(
    () =>
      visibleRows.find((r) => r.id === focusedId) ??
      rows.find((r) => r.id === focusedId) ??
      null,
    [visibleRows, rows, focusedId],
  );

  const syncUrl = useCallback(
    (id: string | null) => {
      if (id) router.replace(APP_ROUTES.customer(id), { scroll: false });
      else router.replace(APP_ROUTES.customers, { scroll: false });
    },
    [router],
  );

  const onFocus = (id: string) => {
    setFocusedId(id);
    syncUrl(id);
    if (!isLg) setMobilePane("insights");
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onCustomerUpdated = (next: CustomerRecord) => {
    setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)));
  };

  const smsTargets = useMemo(() => {
    if (selectedIds.size > 0) return Array.from(selectedIds);
    if (focusedId) return [focusedId];
    return [];
  }, [selectedIds, focusedId]);

  const quickLinks = [
    ...(canViewAnalytics
      ? [
          { href: APP_ROUTES.customerSegments, label: "Segments", desc: "", icon: Filter },
          { href: APP_ROUTES.analyticsCustomers, label: "Shoppers", desc: "", icon: TrendingUp },
        ]
      : []),
    { href: APP_ROUTES.customerPhones, label: "Phones", desc: "", icon: Phone },
    { href: APP_ROUTES.creditsOnTab, label: "On tab", desc: "", icon: Receipt },
    ...(canReviewPaymentClaims
      ? [{ href: APP_ROUTES.creditsPaymentClaims, label: "Claims", desc: "", icon: Receipt }]
      : []),
  ];

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
    <div className={cn(DASHBOARD_MAX_WIDE, "!space-y-4 pb-24 lg:pb-4")}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <DashboardPageHero
          compact
          icon={Users}
          eyebrow="Customers"
          title="Directory"
          description="List · purchase intelligence · contact — three columns, one glance."
        />
        <div className="flex flex-col items-end gap-2">
          {quickLinks.length > 0 ? (
            <DashboardQuickLinks compact links={quickLinks} />
          ) : null}
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
            {canManageCustomers && selectedIds.size > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => setSmsOpen(true)}
              >
                <MessageSquare className="size-3.5" />
                {selectedIds.size}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {message ? <DashboardFeedback kind={message.kind} text={message.text} /> : null}

      <div className={cn(CRM_WORKSPACE_SHELL, CRM_PANEL)}>
        <div className={CRM_GRID}>
          {!isLg ? (
            <>
              {mobilePane === "list" ? (
                <CustomerListColumn
                  rows={visibleRows}
                  loading={listLoading}
                  focusedId={focusedId}
                  selectedIds={selectedIds}
                  canSelect={canManageCustomers}
                  search={phoneFilter}
                  onSearch={setPhoneFilter}
                  dateOptions={DATE_FILTER_OPTIONS}
                  datePreset={datePreset}
                  onDatePreset={(id) => setDatePreset(id as CustomerDatePreset)}
                  periodLabel={periodLabel}
                  outstandingOnly={outstandingOnly}
                  onOutstandingOnly={setOutstandingOnly}
                  originFilter={originFilter}
                  onOriginFilter={setOriginFilter}
                  onFocus={onFocus}
                  onToggleSelect={toggleRow}
                  formatKes={formatKes}
                />
              ) : null}
              {mobilePane === "insights" ? (
                <div className="flex min-h-0 flex-col lg:contents">
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-2 border-b border-border/50 px-3 py-2 text-sm font-medium text-muted-foreground"
                    onClick={() => setMobilePane("list")}
                  >
                    <ArrowLeft className="size-4" />
                    Back to list
                  </button>
                  <CustomerInsightsColumn
                    customer={focusedCustomer}
                    formatKes={formatKes}
                    canViewAnalytics={canViewAnalytics}
                  />
                </div>
              ) : null}
              {mobilePane === "contact" ? (
                <div className="flex min-h-0 flex-col lg:contents">
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-2 border-b border-border/50 px-3 py-2 text-sm font-medium text-muted-foreground"
                    onClick={() => setMobilePane("list")}
                  >
                    <ArrowLeft className="size-4" />
                    Back to list
                  </button>
                  <CustomerContactColumn
                    customer={focusedCustomer}
                    formatKes={formatKes}
                    canManage={canManageCustomers}
                    onEdit={() => setEditOpen(true)}
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
                    onFeedback={(kind, text) => setMessage({ kind, text })}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <>
              <CustomerListColumn
                rows={visibleRows}
                loading={listLoading}
                focusedId={focusedId}
                selectedIds={selectedIds}
                canSelect={canManageCustomers}
                search={phoneFilter}
                onSearch={setPhoneFilter}
                dateOptions={DATE_FILTER_OPTIONS}
                datePreset={datePreset}
                onDatePreset={(id) => setDatePreset(id as CustomerDatePreset)}
                periodLabel={periodLabel}
                outstandingOnly={outstandingOnly}
                onOutstandingOnly={setOutstandingOnly}
                originFilter={originFilter}
                onOriginFilter={setOriginFilter}
                onFocus={onFocus}
                onToggleSelect={toggleRow}
                formatKes={formatKes}
              />
              <CustomerInsightsColumn
                customer={focusedCustomer}
                formatKes={formatKes}
                canViewAnalytics={canViewAnalytics}
              />
              <CustomerContactColumn
                customer={focusedCustomer}
                formatKes={formatKes}
                canManage={canManageCustomers}
                onEdit={() => setEditOpen(true)}
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
                onFeedback={(kind, text) => setMessage({ kind, text })}
              />
            </>
          )}
        </div>
      </div>

      {!isLg && focusedCustomer && mobilePane === "list" ? (
        <div className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border/80 bg-card/95 backdrop-blur-md lg:hidden">
          {(
            [
              ["insights", "Purchases"],
              ["contact", "Contact"],
            ] as const
          ).map(([pane, label]) => (
            <button
              key={pane}
              type="button"
              className="flex-1 py-3 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobilePane(pane)}
            >
              {label}
            </button>
          ))}
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
        open={editOpen}
        onOpenChange={setEditOpen}
        customerId={focusedId}
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
