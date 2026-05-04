"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Building2, Package, Receipt, ShoppingBag } from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardNotice,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { fetchWebOrders, type WebOrderSummary } from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function money(currency: string, n: number | string): string {
  const v = typeof n === "number" ? n : Number(n);
  return `${currency} ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function StorefrontWebOrdersPage() {
  const { me } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.StorefrontOrdersRead);

  const [rows, setRows] = useState<WebOrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setMessage("");
    setLoading(true);
    try {
      const data = await fetchWebOrders(0, 100);
      setRows(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    void load();
  }, [allowed, load]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Pickup orders (web)"
        description={
          <>
            You need permission{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.StorefrontOrdersRead}</code>.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-4">
          <DashboardPageHero
            icon={ShoppingBag}
            eyebrow="Storefront"
            title="Pickup orders (web)"
            description="Guest checkout requests from your online storefront (payment confirmation comes next)."
          />
          <DashboardQuickLinks
            links={[
              { href: APP_ROUTES.business, label: "Business", desc: "Storefront toggles", icon: Building2 },
              { href: APP_ROUTES.products, label: "Products", desc: "Catalog", icon: Package },
              { href: APP_ROUTES.salesQuick, label: "Quick sale", desc: "In-store POS", icon: Receipt },
            ]}
          />
        </div>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void load()} className="shrink-0">
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      {message ? <DashboardNotice text={message} /> : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Branch</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Total</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No web orders yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {formatWhen(row.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.customerName}</div>
                    <div className="text-xs text-muted-foreground">{row.customerPhone}</div>
                  </td>
                  <td className="px-3 py-2">{row.catalogBranchName}</td>
                  <td className="px-3 py-2">{row.status.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {money(row.currency, row.grandTotal)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`${APP_ROUTES.storefrontWebOrders}/${encodeURIComponent(row.id)}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
