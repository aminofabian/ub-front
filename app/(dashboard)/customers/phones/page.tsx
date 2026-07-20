"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Phone, Users } from "lucide-react";

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
import { fetchAllCustomers, type CustomerRecord } from "@/lib/api";
import { normalizeCustomerPhone } from "@/lib/customer-phone";

type PhoneRow = {
  key: string;
  phone: string;
  primary: boolean;
  customerId: string;
  customerName: string;
};

function flattenPhones(customers: CustomerRecord[]): PhoneRow[] {
  const rows: PhoneRow[] = [];
  for (const customer of customers) {
    for (const p of customer.phones) {
      const phone = p.phone?.trim();
      if (!phone) continue;
      rows.push({
        key: `${customer.id}:${p.id ?? phone}`,
        phone,
        primary: p.primary === true,
        customerId: customer.id,
        customerName: customer.name,
      });
    }
  }
  rows.sort((a, b) => a.phone.localeCompare(b.phone, undefined, { numeric: true }));
  return rows;
}

export default function CustomerPhonesPage() {
  const { loading, canViewCustomers } = useDashboard();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState<{
    text: string;
    kind: "error" | "success";
  } | null>(null);

  useEffect(() => {
    if (loading || !canViewCustomers) {
      return;
    }
    let cancelled = false;
    const run = async () => {
      setListLoading(true);
      setMessage(null);
      try {
        const data = await fetchAllCustomers();
        if (!cancelled) {
          setCustomers(data);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage({
            text:
              error instanceof Error
                ? error.message
                : "Failed to load phone numbers.",
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
  }, [loading, canViewCustomers]);

  const phoneRows = useMemo(() => flattenPhones(customers), [customers]);

  const visibleRows = useMemo(() => {
    const q = normalizeCustomerPhone(filter);
    if (!q) return phoneRows;
    return phoneRows.filter((row) =>
      normalizeCustomerPhone(row.phone).includes(q),
    );
  }, [phoneRows, filter]);

  if (loading) {
    return <DashboardLoading label="Loading session…" />;
  }

  if (!canViewCustomers) {
    return (
      <DashboardAccessDenied
        title="Customer phones"
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
          icon={Phone}
          eyebrow="Credit & tabs"
          title="Customer phones"
          description="Every number on file — including numbers captured from M-Pesa prompts at the till."
        />
        <DashboardQuickLinks
          links={[
            {
              href: APP_ROUTES.customers,
              label: "Credit customers",
              desc: "Full directory",
              icon: Users,
            },
          ]}
        />
      </header>

      {message ? (
        <DashboardFeedback kind={message.kind} text={message.text} />
      ) : null}

      <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">Find a number</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {listLoading
            ? "Loading…"
            : `${phoneRows.length} number${phoneRows.length === 1 ? "" : "s"} on file`}
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 sm:max-w-sm">
            <span className={dashboardLabelClass()}>Phone filter</span>
            <input
              className={dashboardInputClass()}
              placeholder="e.g. 712 or 2547…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter phone numbers"
            />
          </label>
          {filter.trim() ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFilter("")}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold">Numbers</h2>
          <p className="text-xs text-muted-foreground">
            {visibleRows.length} shown
            {filter.trim() ? ` · filtered from ${phoneRows.length}` : ""}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/20">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">
                  Phone
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">
                  Customer
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">
                  Primary
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="px-4 py-3 font-mono tabular-nums sm:px-5">
                    {row.phone}
                  </td>
                  <td className="px-4 py-3 sm:px-5">
                    <Link
                      className="font-medium text-primary hover:underline"
                      href={`${APP_ROUTES.customers}/${encodeURIComponent(row.customerId)}`}
                    >
                      {row.customerName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground sm:px-5">
                    {row.primary ? "Yes" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!listLoading && visibleRows.length === 0 ? (
          <p className="border-t border-border/60 px-5 py-8 text-center text-sm text-muted-foreground">
            {filter.trim()
              ? "No numbers match this filter."
              : "No customer phone numbers yet. Numbers appear here after M-Pesa till payments or when you add customers."}
          </p>
        ) : null}
      </section>
    </div>
  );
}
