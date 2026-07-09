"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Package, User } from "lucide-react";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { APP_ROUTES } from "@/lib/config";
import { fetchSupplierPortalOrders, fetchSupplierPortalProfile } from "@/lib/marketplace-api";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";

export default function SupplierPortalOverviewPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
    }
  }, [router]);

  return (
    <SupplierPortalShell>
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep your catalogue current and respond to incoming purchase orders.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-3">
          <PortalCard
            href={APP_ROUTES.supplierPortalProfile}
            icon={User}
            title="Profile"
            description="Business details and delivery areas"
          />
          <PortalCard
            href={APP_ROUTES.supplierPortalCatalog}
            icon={Package}
            title="Catalogue"
            description="Products and prices"
          />
          <PortalCard
            href={APP_ROUTES.supplierPortalOrders}
            icon={ClipboardList}
            title="Orders"
            description="PO inbox and fulfilment"
          />
        </div>
        <PendingOrdersSummary />
      </div>
    </SupplierPortalShell>
  );
}

function PortalCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof User;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
    >
      <Icon className="size-5 text-primary" />
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

function PendingOrdersSummary() {
  const [summary, setSummary] = useState<{ name: string; pending: number } | null>(null);

  useEffect(() => {
    void Promise.all([fetchSupplierPortalProfile(), fetchSupplierPortalOrders()])
      .then(([profile, orders]) => {
        const pending = orders.filter((o) => !o.supplierResponseAt).length;
        setSummary({ name: profile.name, pending });
      })
      .catch(() => setSummary(null));
  }, []);

  if (!summary) return null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">Signed in as {summary.name}</p>
      <p className="mt-2 text-lg font-semibold">
        {summary.pending} order{summary.pending === 1 ? "" : "s"} awaiting response
      </p>
      {summary.pending > 0 ? (
        <Link
          href={APP_ROUTES.supplierPortalOrders}
          className="mt-2 inline-block text-sm font-medium text-primary underline underline-offset-2"
        >
          Open orders inbox
        </Link>
      ) : null}
    </div>
  );
}
