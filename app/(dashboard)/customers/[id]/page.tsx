"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Users } from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchCustomerById,
  fetchCustomerCreditStatement,
  type CreditStatementRecord,
  type CustomerRecord,
} from "@/lib/api";

function fmtMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-KE", { style: "currency", currency: "KES" });
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params?.id?.trim() ?? "";
  const { loading, canViewCustomers } = useDashboard();

  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [statement, setStatement] = useState<CreditStatementRecord | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; kind: "error" } | null>(
    null,
  );

  useEffect(() => {
    if (loading || !canViewCustomers || !customerId) return;

    let cancelled = false;
    const run = async () => {
      setPageLoading(true);
      setMessage(null);
      try {
        const [cust, stmt] = await Promise.all([
          fetchCustomerById(customerId),
          fetchCustomerCreditStatement(customerId),
        ]);
        if (!cancelled) {
          setCustomer(cust);
          setStatement(stmt);
        }
      } catch (error) {
        if (!cancelled) {
          setCustomer(null);
          setStatement(null);
          setMessage({
            text:
              error instanceof Error
                ? error.message
                : "Failed to load customer.",
            kind: "error",
          });
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [loading, canViewCustomers, customerId]);

  if (loading) {
    return <DashboardLoading label="Loading session…" />;
  }

  if (!canViewCustomers) {
    return (
      <DashboardAccessDenied
        title="Credit customers"
        description="You do not have access to this area."
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={APP_ROUTES.customers}>
            <ArrowLeft className="mr-1.5 size-4" />
            All credit customers
          </Link>
        </Button>
      </div>

      <header className="space-y-4">
        <DashboardPageHero
          icon={Users}
          eyebrow="Credit account"
          title={customer?.name?.trim() || "Customer"}
          description={
            customer?.phones?.[0]?.phone
              ? `Primary phone ${customer.phones[0].phone}`
              : "Tab, wallet, and loyalty activity"
          }
        />
      </header>

      {message ? <DashboardFeedback kind={message.kind} text={message.text} /> : null}

      {pageLoading ? (
        <DashboardLoading label="Loading customer…" />
      ) : customer ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Owed on tab</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {fmtMoney(customer.credit.balanceOwed)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Wallet</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {fmtMoney(customer.credit.walletBalance)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Loyalty points</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {customer.credit.loyaltyPoints}
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold">Credit statement</h2>
              <p className="text-xs text-muted-foreground">
                Recent tab, wallet, and payment movements
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/20">
                  <tr>
                    <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">
                      When
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">
                      Type
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">
                      Debit
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">
                      Credit
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">
                      Memo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(statement?.lines ?? []).map((line, index) => (
                    <tr
                      key={`${line.at}-${line.kind}-${index}`}
                      className="border-b border-border/40 last:border-0"
                    >
                      <td className="px-4 py-3 text-muted-foreground sm:px-5">
                        {new Date(line.at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 sm:px-5">{line.kind}</td>
                      <td className="px-4 py-3 sm:px-5">{fmtMoney(line.debit)}</td>
                      <td className="px-4 py-3 sm:px-5">{fmtMoney(line.credit)}</td>
                      <td className="px-4 py-3 text-muted-foreground sm:px-5">
                        {line.memo || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!statement?.lines?.length ? (
              <p className="border-t border-border/60 px-5 py-8 text-center text-sm text-muted-foreground">
                No statement activity yet.
              </p>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
