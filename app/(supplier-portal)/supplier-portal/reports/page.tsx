"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { downloadSupplierPortalReport } from "@/lib/marketplace-api";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";

const REPORTS = [
  {
    type: "outstanding" as const,
    title: "Outstanding balances",
    description: "Open balances by connected shop.",
  },
  {
    type: "payments" as const,
    title: "Payments",
    description: "Payment history across shops.",
  },
  {
    type: "deliveries" as const,
    title: "Deliveries",
    description: "Ship and goods-received history.",
  },
];

export default function SupplierPortalReportsPage() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
    }
  }, [router]);

  const onDownload = async (type: (typeof REPORTS)[number]["type"]) => {
    setBusy(type);
    setError("");
    try {
      await downloadSupplierPortalReport(type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <SupplierPortalShell>
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight">Reports</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Download CSV exports for balances, payments, and deliveries.
          </p>
        </header>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((report) => (
            <li key={report.type} className="rounded-xl border p-4">
              <h3 className="font-medium">{report.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
              <Button
                type="button"
                className="mt-4"
                size="sm"
                disabled={busy != null}
                onClick={() => void onDownload(report.type)}
              >
                {busy === report.type ? "Preparing…" : "Download CSV"}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </SupplierPortalShell>
  );
}
