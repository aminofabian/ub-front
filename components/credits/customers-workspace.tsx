"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  MessageCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
import { CustomerBulkSmsDrawer } from "@/components/credits/customer-bulk-sms-drawer";
import { CustomerContactColumn } from "@/components/credits/customer-contact-column";
import { CustomerCreateDialog } from "@/components/credits/customer-create-dialog";
import { CustomerDetailDrawer } from "@/components/credits/customer-detail-drawer";
import { CustomerInsightsColumn } from "@/components/credits/customer-insights-column";
import { CustomerListColumn } from "@/components/credits/customer-list-column";
import { CustomerMessagingDrawer } from "@/components/credits/customer-messaging-drawer";
import { customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
import {
  DirectoryBackButton,
  DirectoryColumn,
  DirectoryMobileTabs,
  DirectoryToolbar,
  directoryFrameClass,
} from "@/components/credits/directory-workspace-ui";
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

type CustomerDatePreset = Extract<
  DatePreset,
  "today" | "yesterday" | "last3" | "last7" | "last30" | "thisMonth"
> | "all";

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
  const [activePhoneQuery, setActivePhoneQuery] = useState<string | undefined>();
  const [datePreset, setDatePreset] = useState<CustomerDatePreset>("all");
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [originFilter, setOriginFilter] = useState<"all" | "inferred" | "verified">("all");
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
        text: error instanceof Error ? error.message : "Failed to load customers.",
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
      const verified = row.phones.some((p) => Boolean(p.verifiedAt) && Boolean(p.phone));
      if (originFilter === "inferred" && row.origin !== "mpesa_inferred") return false;
      if (originFilter === "verified" && !verified) return false;
      return true;
    });
  }, [rows, outstandingOnly, originFilter]);

  const maxOwed = useMemo(
    () => Math.max(...visibleRows.map((r) => Number(r.credit.balanceOwed ?? 0)), 1),
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
    onFeedback: (kind: "error" | "success", text: string) => setMessage({ kind, text }),
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
    <div className="mx-auto w-full max-w-[1320px] px-2 pb-14 pt-1 sm:px-3 sm:pt-2">
      {message ? (
        <div className="mb-2">
          <DashboardFeedback kind={message.kind} text={message.text} />
        </div>
      ) : null}

      <DirectoryToolbar
        icon={Users}
        eyebrow="Credits"
        title="Customers"
        meta={
          <>
            {visibleRows.length.toLocaleString("en-KE")} in view
            {periodLabel ? ` · ${periodLabel}` : ""}
            {focusedCustomer ? ` · ${focusedCustomer.name}` : ""}
          </>
        }
        links={[
          ...(canViewAnalytics
            ? [{ href: APP_ROUTES.analyticsCustomers, label: "Shoppers" }]
            : []),
          { href: APP_ROUTES.customerSegments, label: "Segments" },
          { href: APP_ROUTES.customerPhones, label: "Phones" },
          ...(canReviewPaymentClaims
            ? [{ href: APP_ROUTES.creditsPaymentClaims, label: "Claims" }]
            : []),
        ]}
        actions={
          <>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={refreshing}
              aria-label="Refresh"
            >
              <RefreshCw
                className={cn("size-3.5", refreshing && "animate-spin")}
                aria-hidden
              />
            </Button>
            {canManageCustomers ? (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1 text-xs"
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
              className="size-8 px-0"
              onClick={() => setMessagingOpen(true)}
              aria-label="Messaging"
            >
              <MessageCircle className="size-3.5" />
            </Button>
            {canManageCustomers && selectedIds.size > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-xs"
                onClick={() => setSmsOpen(true)}
              >
                <MessageSquare className="size-3.5" />
                {selectedIds.size}
              </Button>
            ) : null}
            {canManageCustomers && selectedIds.size > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-xs"
                onClick={() => {
                  const ids = Array.from(selectedIds).slice(0, 500);
                  router.push(
                    `${APP_ROUTES.customerEmailCampaignNew}?customerIds=${ids.map(encodeURIComponent).join(",")}`,
                  );
                }}
              >
                <Mail className="size-3.5" />
                Email
              </Button>
            ) : null}
          </>
        }
      />

      <div className={cn(directoryFrameClass, refreshing && "opacity-90")}>
        <div className="grid min-h-0 flex-1 divide-y lg:grid-cols-[13.5rem_minmax(0,1fr)_12.5rem] lg:divide-x lg:divide-y-0 divide-border/60">
          {!isLg ? (
            <>
              {mobilePane === "list" ? (
                <DirectoryColumn
                  title="Directory"
                  hint="Search and pick"
                  badge={visibleRows.length}
                >
                  <CustomerListColumn {...listProps} />
                </DirectoryColumn>
              ) : null}
              {mobilePane === "insights" ? (
                <DirectoryColumn title="Purchases" hint={focusedCustomer?.name}>
                  <DirectoryBackButton
                    label="Directory"
                    onClick={() => setMobilePane("list")}
                  />
                  <CustomerInsightsColumn
                    customer={focusedCustomer}
                    currency={currency}
                    canViewAnalytics={canViewAnalytics}
                  />
                </DirectoryColumn>
              ) : null}
              {mobilePane === "contact" ? (
                <DirectoryColumn title="Contact" hint={focusedCustomer?.name}>
                  <DirectoryBackButton
                    label="Directory"
                    onClick={() => setMobilePane("list")}
                  />
                  <CustomerContactColumn {...contactProps} />
                </DirectoryColumn>
              ) : null}
            </>
          ) : (
            <>
              <DirectoryColumn
                title="Directory"
                hint="Who shops with you"
                badge={visibleRows.length}
              >
                <CustomerListColumn {...listProps} />
              </DirectoryColumn>
              <DirectoryColumn
                title="Purchases"
                hint={focusedCustomer?.name ?? "Select someone"}
              >
                <CustomerInsightsColumn
                  customer={focusedCustomer}
                  currency={currency}
                  canViewAnalytics={canViewAnalytics}
                />
              </DirectoryColumn>
              <DirectoryColumn
                title="Contact"
                hint={focusedCustomer ? "Balance & reach" : "—"}
              >
                <CustomerContactColumn {...contactProps} />
              </DirectoryColumn>
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
