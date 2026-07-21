"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  MessageCircle,
  Phone,
  Plus,
  Receipt,
  Search,
  Users,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { CreditSaleReminderSettings } from "@/components/credits/credit-sale-reminder-settings";
import { WhatsAppTestPanel } from "@/components/credits/whatsapp-test-panel";
import { SmsTestPanel } from "@/components/credits/sms-test-panel";
import { createCustomer, fetchCustomers, type CustomerRecord } from "@/lib/api";
import {
  formatDateRangeLabel,
  presetRange,
  type DatePreset,
} from "@/lib/analytics-date-range";

type CustomerDatePreset = Extract<
  DatePreset,
  "today" | "yesterday" | "last3" | "last7" | "last30" | "thisMonth"
> | "all";

const DATE_FILTER_OPTIONS: { id: CustomerDatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last3", label: "3 days" },
  { id: "last7", label: "1 week" },
  { id: "last30", label: "30 days" },
  { id: "thisMonth", label: "Month" },
  { id: "all", label: "All" },
];

function formatKes(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return n.toLocaleString("en-KE", { style: "currency", currency: "KES" });
}

export default function CustomersPage() {
  const {
    loading,
    canViewCustomers,
    canManageCustomers,
    canManageCreditSettings,
    canReviewPaymentClaims,
  } = useDashboard();
  const [rows, setRows] = useState<CustomerRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [phoneFilter, setPhoneFilter] = useState("");
  const [activePhoneQuery, setActivePhoneQuery] = useState<string | undefined>(
    undefined,
  );
  const [datePreset, setDatePreset] = useState<CustomerDatePreset>("today");
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState<{
    text: string;
    kind: "error" | "success";
  } | null>(null);

  const dateRange = useMemo(() => {
    if (datePreset === "all") return null;
    return presetRange(datePreset);
  }, [datePreset]);

  const periodLabel = useMemo(() => {
    if (!dateRange) return "All time";
    return formatDateRangeLabel(dateRange.from, dateRange.to);
  }, [dateRange]);

  useEffect(() => {
    const next = phoneFilter.trim();
    const id = window.setTimeout(() => {
      setActivePhoneQuery(next.length > 0 ? next : undefined);
    }, 280);
    return () => window.clearTimeout(id);
  }, [phoneFilter]);

  useEffect(() => {
    if (loading || !canViewCustomers) {
      return;
    }
    let cancelled = false;
    const run = async () => {
      setListLoading(true);
      setMessage(null);
      try {
        const data = await fetchCustomers(activePhoneQuery, {
          createdFrom: dateRange?.from,
          createdTo: dateRange?.to,
        });
        if (!cancelled) {
          setRows(data);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage({
            text:
              error instanceof Error
                ? error.message
                : "Failed to load customers.",
            kind: "error",
          });
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [loading, canViewCustomers, activePhoneQuery, dateRange, refreshKey]);

  const visibleRows = useMemo(() => {
    if (!outstandingOnly) return rows;
    return rows.filter((row) => Number(row.credit.balanceOwed) > 0);
  }, [rows, outstandingOnly]);

  const totalOwed = useMemo(
    () =>
      rows.reduce((sum, row) => sum + Number(row.credit.balanceOwed ?? 0), 0),
    [rows],
  );

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone) {
      setMessage({ text: "Name and phone are required.", kind: "error" });
      return;
    }
    try {
      await createCustomer({
        name: trimmedName,
        email: email.trim() || undefined,
        phones: [{ phone: trimmedPhone, primary: true }],
      });
      setName("");
      setEmail("");
      setPhone("");
      setShowCreate(false);
      setMessage({ text: "Customer created.", kind: "success" });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Create failed.",
        kind: "error",
      });
    }
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

  const quickLinks = [
    {
      href: APP_ROUTES.creditsOnTab,
      label: "On tab",
      desc: "Credit sales",
      icon: Receipt,
    },
    {
      href: APP_ROUTES.customerPhones,
      label: "Phones",
      desc: "All numbers",
      icon: Phone,
    },
    ...(canReviewPaymentClaims
      ? [
          {
            href: APP_ROUTES.creditsPaymentClaims,
            label: "Claims",
            desc: "Review payments",
            icon: Receipt,
          },
        ]
      : []),
  ];

  return (
    <div className={cn(DASHBOARD_MAX, "space-y-5 pb-16")}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <DashboardPageHero
          compact
          icon={Users}
          eyebrow="Credit & tabs"
          title="Customers"
          description="Directory, balances, and reminders."
        />
        {quickLinks.length > 0 ? (
          <DashboardQuickLinks compact links={quickLinks} />
        ) : null}
      </header>

      {message ? (
        <DashboardFeedback kind={message.kind} text={message.text} />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/25 px-4 py-3 sm:px-5">
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Filter by when the customer was added"
          >
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">
              Added
            </span>
            {DATE_FILTER_OPTIONS.map(({ id, label }) => {
              const active = datePreset === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDatePreset(id)}
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                    active
                      ? "bg-[#F9F6F0] text-[#8B6F3A]"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
            <span className="ml-1 text-[11px] text-muted-foreground">
              {periodLabel}
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                className={cn(dashboardInputClass(), "pl-9")}
                placeholder="Search by phone…"
                value={phoneFilter}
                onChange={(e) => setPhoneFilter(e.target.value)}
                aria-label="Filter customers by phone"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={outstandingOnly}
                onChange={(e) => setOutstandingOnly(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Outstanding only
            </label>

            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
              <p className="mr-auto text-xs text-muted-foreground sm:mr-0">
                {listLoading
                  ? "Loading…"
                  : `${visibleRows.length} shown`}
                {!listLoading && rows.length > 0 ? (
                  <span className="text-foreground">
                    {" "}
                    · {formatKes(totalOwed)} owed
                  </span>
                ) : null}
              </p>

              {canManageCustomers ? (
                <Button
                  type="button"
                  size="sm"
                  variant={showCreate ? "secondary" : "default"}
                  onClick={() => setShowCreate((v) => !v)}
                >
                  <Plus className="size-3.5" aria-hidden />
                  {showCreate ? "Cancel" : "New"}
                </Button>
              ) : null}

              {canViewCustomers ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMessaging((v) => !v)}
                >
                  <MessageCircle className="size-3.5" aria-hidden />
                  Messaging
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      showMessaging && "rotate-180",
                    )}
                    aria-hidden
                  />
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {showCreate && canManageCustomers ? (
          <form
            className="grid gap-2 border-b border-border/60 bg-primary/[0.03] px-4 py-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:px-5"
            onSubmit={(e) => void onCreate(e)}
          >
            <input
              className={dashboardInputClass()}
              placeholder="Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-label="Customer name"
              autoFocus
            />
            <input
              className={dashboardInputClass()}
              placeholder="Phone *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              aria-label="Primary phone"
            />
            <input
              className={dashboardInputClass()}
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email"
            />
            <Button type="submit" size="sm" className="self-stretch sm:self-auto">
              Create
            </Button>
          </form>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/15">
              <tr>
                <th className="px-4 py-2.5 font-medium text-muted-foreground sm:px-5">
                  Name
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground sm:px-5">
                  Phones
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground sm:px-5">
                  Owed
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground sm:px-5">
                  Wallet
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const owed = Number(row.credit.balanceOwed ?? 0);
                const phoneLabel =
                  row.phones.length > 0
                    ? row.phones
                        .map((p) => `${p.phone}${p.primary ? " ★" : ""}`)
                        .join(", ")
                    : "—";
                return (
                  <tr
                    key={row.id}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-2.5 sm:px-5">
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={`${APP_ROUTES.customers}/${encodeURIComponent(row.id)}`}
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground sm:px-5">
                      {phoneLabel}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right tabular-nums sm:px-5",
                        owed > 0 && "font-medium text-amber-700 dark:text-amber-400",
                      )}
                    >
                      {formatKes(owed)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground sm:px-5">
                      {formatKes(row.credit.walletBalance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!listLoading && visibleRows.length === 0 ? (
          <p className="border-t border-border/60 px-5 py-8 text-center text-sm text-muted-foreground">
            {outstandingOnly
              ? "No customers with an outstanding tab balance."
              : datePreset === "all"
                ? "No customers match this view."
                : `No customers added in this period (${periodLabel}).`}
          </p>
        ) : null}
      </section>

      {showMessaging ? (
        <div className="space-y-4">
          <CreditSaleReminderSettings canEdit={canManageCreditSettings} />
          <WhatsAppTestPanel canSend={canManageCreditSettings} />
          <SmsTestPanel canSend={canManageCreditSettings} />
        </div>
      ) : null}
    </div>
  );
}
