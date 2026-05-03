"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { createCustomer, fetchCustomers, type CustomerRecord } from "@/lib/api";

export default function CustomersPage() {
  const { loading, canViewCustomers, canManageCustomers } = useDashboard();
  const [rows, setRows] = useState<CustomerRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [phoneFilter, setPhoneFilter] = useState("");
  const [activePhoneQuery, setActivePhoneQuery] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState<{ text: string; kind: "error" | "success" } | null>(
    null,
  );

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

  if (!loading && !canViewCustomers) {
    return (
      <div className="space-y-2 p-6">
        <h1 className="text-xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">You do not have access to this area.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Directory for credit, wallet, and loyalty (Phase 5). Search by phone for POS attach.
        </p>
      </div>

      {message ? (
        <p
          className={
            message.kind === "error" ? "text-sm text-destructive" : "text-sm text-green-700"
          }
        >
          {message.text}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Phone filter
          <input
            className="min-w-[12rem] rounded-md border bg-background px-3 py-2"
            placeholder="Digits only search…"
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value)}
            aria-label="Filter customers by phone"
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          onClick={() => applyFilter()}
          disabled={listLoading}
        >
          {listLoading ? "Loading…" : "Apply filter"}
        </Button>
      </div>

      {canManageCustomers ? (
        <form
          className="grid max-w-3xl grid-cols-1 gap-3 md:grid-cols-4"
          onSubmit={(e) => void onCreate(e)}
        >
          <h2 className="text-sm font-medium md:col-span-4">New customer</h2>
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
            placeholder="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-label="Customer name"
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-1"
            placeholder="Phone *"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            aria-label="Primary phone"
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-1"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
          />
          <div className="md:col-span-4">
            <Button type="submit">Create</Button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Phones</th>
              <th className="px-3 py-2 font-medium">Owed</th>
              <th className="px-3 py-2 font-medium">Wallet</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const phoneLabel =
                row.phones.length > 0
                  ? row.phones
                      .map((p) => `${p.phone}${p.primary ? " ★" : ""}`)
                      .join(", ")
                  : "—";
              return (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <Link className="hover:underline" href={`/customers/${encodeURIComponent(row.id)}`}>
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{phoneLabel}</td>
                  <td className="px-3 py-2">{String(row.credit.balanceOwed)}</td>
                  <td className="px-3 py-2">{String(row.credit.walletBalance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!listLoading && rows.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground">No customers match this view.</p>
        ) : null}
      </div>
    </div>
  );
}
