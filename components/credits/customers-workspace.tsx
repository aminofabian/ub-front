"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Filter,
  GitMerge,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
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
import { CustomerMergeDialog } from "@/components/credits/customer-merge-dialog";
import { CustomerMessagingDrawer } from "@/components/credits/customer-messaging-drawer";
import { customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
import {
  DirectoryBackButton,
  DirectoryMobileTabs,
} from "@/components/credits/directory-workspace-ui";
import {
  salesPaper,
  salesSurface,
  salesHairDivide,
  SalesStage,
  salesToolBtnClass,
} from "@/components/sales/sales-surface";
import { LoyaltyCardPreview } from "@/components/credits/loyalty-card-preview";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { fetchCustomers, type CustomerRecord } from "@/lib/api";
import type { LoyaltyCardCustomerInput } from "@/lib/loyalty-card";
import {
  formatDateRangeLabel,
  presetRange,
  type DatePreset,
} from "@/lib/analytics-date-range";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type CustomerDatePreset =
  | Extract<
      DatePreset,
      "today" | "yesterday" | "last3" | "last7" | "last30" | "thisMonth"
    >
  | "all";

type MobilePane = "list" | "insights" | "contact";

const DATE_FILTER_OPTIONS: { id: CustomerDatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last3", label: "3 days" },
  { id: "last7", label: "1 week" },
  { id: "last30", label: "30 days" },
  { id: "thisMonth", label: "This month" },
  { id: "all", label: "All time" },
];

type Props = {
  initialCustomerId?: string | null;
};

export function CustomersWorkspace({ initialCustomerId = null }: Props) {
  const router = useRouter();
  const {
    loading,
    business,
    canViewCustomers,
    canManageCustomers,
    canManageCreditSettings,
    canReviewPaymentClaims,
    canViewAnalytics,
  } = useDashboard();
  const currency = business?.currency?.trim() || "KES";

  const [rows, setRows] = useState<CustomerRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [phoneFilter, setPhoneFilter] = useState("");
  const [activePhoneQuery, setActivePhoneQuery] = useState<
    string | undefined
  >();
  const [datePreset, setDatePreset] = useState<CustomerDatePreset>("all");
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [originFilter, setOriginFilter] = useState<
    "all" | "inferred" | "verified"
  >("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
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
  const [mergeOpen, setMergeOpen] = useState(false);
  const [cardCustomer, setCardCustomer] =
    useState<LoyaltyCardCustomerInput | null>(null);
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

  const loadCustomers = useCallback(async () => {
    setListLoading(true);
    setRefreshing(true);
    setMessage(null);
    try {
      const data = await fetchCustomers(activePhoneQuery, {
        flexible: true,
        createdFrom: dateRange?.from,
        createdTo: dateRange?.to,
      });
      setRows(data);
      setSelectedIds(new Set());
    } catch (error) {
      setMessage({
        text:
          error instanceof Error ? error.message : "Failed to load customers.",
        kind: "error",
      });
    } finally {
      setListLoading(false);
      setRefreshing(false);
    }
  }, [activePhoneQuery, dateRange]);

  useEffect(() => {
    if (loading || !canViewCustomers) return;
    void loadCustomers();
  }, [loading, canViewCustomers, loadCustomers, refreshKey]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (outstandingOnly && Number(row.credit.balanceOwed) <= 0) return false;
      const verified = row.phones.some(
        (p) => Boolean(p.verifiedAt) && Boolean(p.phone),
      );
      if (originFilter === "inferred" && row.origin !== "mpesa_inferred")
        return false;
      if (originFilter === "verified" && !verified) return false;
      return true;
    });
  }, [rows, outstandingOnly, originFilter]);

  const maxOwed = useMemo(
    () =>
      Math.max(...visibleRows.map((r) => Number(r.credit.balanceOwed ?? 0)), 1),
    [visibleRows],
  );

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

  const listProps = {
    rows: visibleRows,
    loading: listLoading,
    focusedId,
    selectedIds,
    canSelect: canManageCustomers,
    search: phoneFilter,
    onSearch: setPhoneFilter,
    dateOptions: DATE_FILTER_OPTIONS,
    datePreset,
    onDatePreset: (id: string) => setDatePreset(id as CustomerDatePreset),
    periodLabel,
    outstandingOnly,
    onOutstandingOnly: setOutstandingOnly,
    originFilter,
    onOriginFilter: setOriginFilter,
    onFocus,
    onToggleSelect: toggleRow,
    formatKes: (n: number | string) =>
      new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(Number(n)),
    maxOwed,
  };

  const contactProps = {
    customer: focusedCustomer,
    currency,
    canManage: canManageCustomers,
    onEdit: () => setEditOpen(true),
    onMessage: () => setSmsOpen(true),
    onLoyaltyCard: () => {
      if (!focusedCustomer) return;
      setCardCustomer({
        id: focusedCustomer.id,
        name: focusedCustomer.name,
        phone: customerPrimaryPhone(focusedCustomer.phones),
        loyaltyPoints: focusedCustomer.credit.loyaltyPoints,
      });
    },
    onFeedback: (kind: "error" | "success", text: string) =>
      setMessage({ kind, text }),
  };

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
    <div className={cn(DASHBOARD_MAX_WIDE, salesPaper, "flex flex-col")}>
      {message ? (
        <DashboardFeedback kind={message.kind} text={message.text} />
      ) : null}

      <DashboardPageHero
        icon={Users}
        title="Customers"
        description={
          <>
            {visibleRows.length.toLocaleString("en-KE")} in view
            {periodLabel ? ` · ${periodLabel}` : ""}
            {focusedCustomer ? ` · ${focusedCustomer.name}` : ""}
          </>
        }
      >
        <DashboardQuickLinks
          compact
          links={[
            ...(canViewAnalytics
              ? [
                  {
                    href: APP_ROUTES.analyticsCustomers,
                    label: "Shoppers",
                    desc: "Shoppers",
                    icon: Users,
                  },
                ]
              : []),
            {
              href: APP_ROUTES.customerSegments,
              label: "Segments",
              desc: "Segments",
              icon: Filter,
            },
            {
              href: APP_ROUTES.customerPhones,
              label: "Phones",
              desc: "Phones",
              icon: Phone,
            },
            ...(canReviewPaymentClaims
              ? [
                  {
                    href: APP_ROUTES.creditsPaymentClaims,
                    label: "Claims",
                    desc: "Claims",
                    icon: Mail,
                  },
                ]
              : []),
          ]}
        />
        <button
          type="button"
          className={salesToolBtnClass()}
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={refreshing}
          aria-label="Refresh"
        >
          <RefreshCw
            className={cn("size-3.5", refreshing && "animate-spin")}
            aria-hidden
          />
        </button>
        {canManageCustomers ? (
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1 rounded-xl bg-[var(--pos-primary,#0f766e)] text-xs text-white shadow-none hover:bg-[#0d6b63]"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-3.5" />
            New
          </Button>
        ) : null}
        <button
          type="button"
          className={cn(salesToolBtnClass(), "size-8 justify-center px-0")}
          onClick={() => setMessagingOpen(true)}
          aria-label="Messaging"
        >
          <MessageCircle className="size-3.5" />
        </button>
        {canManageCustomers && selectedIds.size > 0 ? (
          <button
            type="button"
            className={salesToolBtnClass()}
            onClick={() => setSmsOpen(true)}
          >
            <MessageSquare className="size-3.5" />
            {selectedIds.size}
          </button>
        ) : null}
        {canManageCustomers && selectedIds.size >= 2 ? (
          <button
            type="button"
            className={salesToolBtnClass()}
            onClick={() => setMergeOpen(true)}
          >
            <GitMerge className="size-3.5" />
            Fuse
          </button>
        ) : null}
        {canManageCustomers && selectedIds.size > 0 ? (
          <button
            type="button"
            className={salesToolBtnClass()}
            onClick={() => {
              const ids = Array.from(selectedIds).slice(0, 500);
              router.push(
                `${APP_ROUTES.customerEmailCampaignNew}?customerIds=${ids.map(encodeURIComponent).join(",")}`,
              );
            }}
          >
            <Mail className="size-3.5" />
            Email
          </button>
        ) : null}
      </DashboardPageHero>

      <div
        className={cn(
          salesSurface,
          "flex min-h-0 flex-col overflow-hidden lg:h-[min(80dvh,52rem)] lg:max-h-[calc(100dvh-10.5rem)]",
          refreshing && "opacity-90",
        )}
      >
        <div
          className={cn(
            "grid min-h-0 flex-1 divide-y lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(16rem,19rem)] lg:divide-x lg:divide-y-0",
            salesHairDivide,
          )}
        >
          {!isLg ? (
            <>
              {mobilePane === "list" ? (
                <SalesStage
                  className="min-h-0 rounded-none border-0 bg-[#f4f7f5] shadow-none ring-0 pb-[var(--shell-bottom-inset)]"
                  bodyClassName="min-h-0 flex-1 overflow-y-auto p-2"
                  title="Directory"
                  hint="Search and pick"
                  action={
                    <span className="rounded-lg bg-white px-1.5 py-0.5 text-[10px] font-medium tabular-nums ring-1 ring-black/[0.05]">
                      {visibleRows.length}
                    </span>
                  }
                >
                  <CustomerListColumn {...listProps} />
                </SalesStage>
              ) : null}
              {mobilePane === "insights" ? (
                <SalesStage
                  className="min-h-0 rounded-none border-0 shadow-none ring-0"
                  bodyClassName="min-h-0 flex-1 overflow-y-auto p-2"
                  title="Purchases"
                  hint={focusedCustomer?.name}
                >
                  <DirectoryBackButton
                    label="Directory"
                    onClick={() => setMobilePane("list")}
                  />
                  <CustomerInsightsColumn
                    customer={focusedCustomer}
                    currency={currency}
                    canViewAnalytics={canViewAnalytics}
                  />
                </SalesStage>
              ) : null}
              {mobilePane === "contact" ? (
                <SalesStage
                  className="min-h-0 rounded-none border-0 shadow-none ring-0"
                  bodyClassName="min-h-0 flex-1 overflow-y-auto p-2"
                  title="Contact"
                  hint={focusedCustomer?.name}
                >
                  <DirectoryBackButton
                    label="Directory"
                    onClick={() => setMobilePane("list")}
                  />
                  <CustomerContactColumn {...contactProps} />
                </SalesStage>
              ) : null}
            </>
          ) : (
            <>
              <SalesStage
                className="min-h-0 rounded-none border-0 bg-[#f4f7f5] shadow-none ring-0"
                bodyClassName="min-h-0 flex-1 overflow-y-auto p-2"
                title="Directory"
                hint="Who shops with you"
                action={
                  <span className="rounded-lg bg-white px-1.5 py-0.5 text-[10px] font-medium tabular-nums ring-1 ring-black/[0.05]">
                    {visibleRows.length}
                  </span>
                }
              >
                <CustomerListColumn {...listProps} />
              </SalesStage>
              <SalesStage
                className="min-h-0 rounded-none border-0 shadow-none ring-0"
                bodyClassName="min-h-0 flex-1 overflow-y-auto p-2"
                title="Purchases"
                hint={focusedCustomer?.name ?? "Select someone"}
              >
                <CustomerInsightsColumn
                  customer={focusedCustomer}
                  currency={currency}
                  canViewAnalytics={canViewAnalytics}
                />
              </SalesStage>
              <SalesStage
                className="min-h-0 rounded-none border-0 shadow-none ring-0"
                bodyClassName="min-h-0 flex-1 overflow-y-auto p-2"
                title="Contact"
                hint={focusedCustomer ? "Balance & reach" : "—"}
              >
                <CustomerContactColumn {...contactProps} />
              </SalesStage>
            </>
          )}
        </div>
      </div>

      {!isLg && focusedCustomer && mobilePane === "list" ? (
        <DirectoryMobileTabs
          tabs={[
            {
              id: "insights",
              label: "Purchases",
              onClick: () => setMobilePane("insights"),
            },
            {
              id: "contact",
              label: "Contact",
              onClick: () => setMobilePane("contact"),
            },
          ]}
        />
      ) : null}

      <CustomerCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => setRefreshKey((k) => k + 1)}
        onFeedback={(kind, text) => setMessage({ kind, text })}
      />

      <CustomerMergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        customers={rows.filter((r) => selectedIds.has(r.id))}
        onMerged={(keep) => {
          setFocusedId(keep.id);
          setSelectedIds(new Set());
          setRefreshKey((k) => k + 1);
        }}
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
            : (focusedCustomer?.name ?? "customer")
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
