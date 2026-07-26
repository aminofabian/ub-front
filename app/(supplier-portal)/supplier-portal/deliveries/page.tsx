"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalDeliveries,
  type SupplierPortalDeliveryRow,
} from "@/lib/marketplace-api";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtQty(v: number | string): string {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en", { maximumFractionDigits: 2 });
}

function labelStatus(status: string): string {
  if (status === "in_transit") return "In transit";
  if (status === "delivered") return "Delivered";
  if (status === "not_shipped") return "Not shipped";
  return status;
}

export default function SupplierPortalDeliveriesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SupplierPortalDeliveryRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void fetchSupplierPortalDeliveries()
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load deliveries"));
  }, [router]);

  return (
    <SupplierPortalShell>
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight">Deliveries</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Shipments and goods received across connected shops.
          </p>
        </header>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Updated</th>
                <th className="px-3 py-2 font-medium">Shop</th>
                <th className="px-3 py-2 font-medium">PO</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Ordered</th>
                <th className="px-3 py-2 font-medium">Received</th>
                <th className="px-3 py-2 font-medium">Expected</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.purchaseOrderId} className="border-b last:border-0">
                  <td className="px-3 py-2">{fmtDate(row.updatedAt)}</td>
                  <td className="px-3 py-2 font-medium">{row.businessName}</td>
                  <td className="px-3 py-2">{row.poNumber}</td>
                  <td className="px-3 py-2">{labelStatus(row.deliveryStatus)}</td>
                  <td className="px-3 py-2">{fmtQty(row.qtyOrdered)}</td>
                  <td className="px-3 py-2">{fmtQty(row.qtyReceived)}</td>
                  <td className="px-3 py-2">{fmtDate(row.expectedDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !error ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No deliveries yet. Ship an order to see it here.
            </p>
          ) : null}
        </div>
      </div>
    </SupplierPortalShell>
  );
}
