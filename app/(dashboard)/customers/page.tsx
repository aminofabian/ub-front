"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, LayoutGrid, Package, Phone, Receipt, Users } from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { CreditSaleReminderSettings } from "@/components/credits/credit-sale-reminder-settings";
import { WhatsAppTestPanel } from "@/components/credits/whatsapp-test-panel";
import { createCustomer, fetchCustomers, type CustomerRecord } from "@/lib/api";

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
  const [activePhoneQuery, setActivePhoneQuery] = useState<string | undefined>(undefined);
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState<{ text: string; kind: "error" | "success" } | null>(null);

  useEffect(() => {
    if (loading || !canViewCustomers) {
      return;
    }
    let cancelled = false;
    const run = async () => {
      setListLoading(true);
      setMessage(null);
      try {
        const data = await fetchCustomers(activePhoneQuery);
        if (!cancelled) {
          setRows(data);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage({
            text: error instanceof Error ? error.message : "Failed to load customers.",
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
  }, [loading, canViewCustomers, activePhoneQuery, refreshKey]);

  const applyFilter = () => {
    const next = phoneFilter.trim();
    setActivePhoneQuery(next.length > 0 ? next : undefined);
  };

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

  return (
    <div className={DASHBOARD_MAX}>
      <header className="space-y-4">
        <DashboardPageHero
          icon={Users}
          eyebrow="Credit & tabs"
          title="Credit customers"
          description="Everyone on tab, prepaid wallet, or loyalty. See who owes what and open a customer for their full statement."
        />
        <DashboardQuickLinks
          links={[
            {
              href: APP_ROUTES.customerPhones,
              label: "Customer phones",
              desc: "All numbers",
              icon: Phone,
            },
            ...(canReviewPaymentClaims
              ? [
                  {
                    href: APP_ROUTES.creditsPaymentClaims,
                    label: "Payment claims",
                    desc: "Review submissions",
                    icon: Receipt,
                  },
                ]
              : []),
            { href: APP_ROUTES.products, label: "Products", desc: "Catalog", icon: Package },
            { href: APP_ROUTES.categories, label: "Categories", desc: "Aisles", icon: LayoutGrid },
            { href: APP_ROUTES.business, label: "Business", desc: "Workspace", icon: Building2 },
          ]}
        />
      </header>

      {message ? <DashboardFeedback kind={message.kind} text={message.text} /> : null}

      {canViewCustomers ? (
        <CreditSaleReminderSettings canEdit={canManageCreditSettings} />
      ) : null}

      {canViewCustomers ? (
        <WhatsAppTestPanel canSend={canManageCreditSettings} />
      ) : null}

      <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">Find customers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter by phone, or show only customers who still owe on tab.
          {rows.length > 0 ? (
            <span className="ml-1 font-medium text-foreground">
              Total outstanding: {totalOwed.toLocaleString("en-KE", { style: "currency", currency: "KES" })}
            </span>
          ) : null}
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 sm:max-w-xs">
            <span className={dashboardLabelClass()}>Phone filter</span>
            <input
              className={dashboardInputClass()}
              placeholder="Digits only…"
              value={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.value)}
              aria-label="Filter customers by phone"
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={outstandingOnly}
              onChange={(e) => setOutstandingOnly(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Outstanding tab only
          </label>
          <Button type="button" variant="secondary" onClick={() => applyFilter()} disabled={listLoading}>
            {listLoading ? "Loading…" : "Apply filter"}
          </Button>
        </div>
      </section>

      {canManageCustomers ? (
        <section className="rounded-2xl border border-border/80 bg-gradient-to-b from-primary/[0.04] to-card p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight">New customer</h2>
          <p className="mt-1 text-sm text-muted-foreground">Name and primary phone are required.</p>
          <form
            className="mt-4 grid max-w-3xl grid-cols-1 gap-3 md:grid-cols-12"
            onSubmit={(e) => void onCreate(e)}
          >
            <input
              className={cn(dashboardInputClass(), "md:col-span-4")}
              placeholder="Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-label="Customer name"
            />
            <input
              className={cn(dashboardInputClass(), "md:col-span-4")}
              placeholder="Phone *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              aria-label="Primary phone"
            />
            <input
              className={cn(dashboardInputClass(), "md:col-span-4")}
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email"
            />
            <div className="md:col-span-12">
              <Button type="submit">Create customer</Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold">Directory</h2>
          <p className="text-xs text-muted-foreground">{visibleRows.length} in this view</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/20">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">Phones</th>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">Owed</th>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">Wallet</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const phoneLabel =
                  row.phones.length > 0
                    ? row.phones
                        .map((p) => `${p.phone}${p.primary ? " ★" : ""}`)
                        .join(", ")
                    : "—";
                return (
                  <tr key={row.id} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-3 sm:px-5">
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={`${APP_ROUTES.customers}/${encodeURIComponent(row.id)}`}
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground sm:px-5">{phoneLabel}</td>
                    <td className="px-4 py-3 sm:px-5">{String(row.credit.balanceOwed)}</td>
                    <td className="px-4 py-3 sm:px-5">{String(row.credit.walletBalance)}</td>
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
              : "No customers match this view."}
          </p>
        ) : null}
      </section>
    </div>
  );
}
