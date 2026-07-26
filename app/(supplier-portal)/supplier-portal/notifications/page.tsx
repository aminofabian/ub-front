"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalNotificationPrefs,
  fetchSupplierPortalNotifications,
  markAllSupplierPortalNotificationsRead,
  markSupplierPortalNotificationRead,
  patchSupplierPortalNotificationPrefs,
  type SupplierPortalNotificationPrefs,
  type SupplierPortalNotificationRow,
} from "@/lib/marketplace-api";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { cn } from "@/lib/utils";

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function SupplierPortalNotificationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SupplierPortalNotificationRow[]>([]);
  const [prefs, setPrefs] = useState<SupplierPortalNotificationPrefs | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [notes, nextPrefs] = await Promise.all([
      fetchSupplierPortalNotifications(),
      fetchSupplierPortalNotificationPrefs(),
    ]);
    setRows(notes);
    setPrefs(nextPrefs);
  };

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void reload().catch((err) =>
      setError(err instanceof Error ? err.message : "Could not load notifications"),
    );
  }, [router]);

  const onMarkAll = async () => {
    setBusy(true);
    try {
      await markAllSupplierPortalNotificationsRead();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark read");
    } finally {
      setBusy(false);
    }
  };

  const onTogglePref = async (key: keyof SupplierPortalNotificationPrefs, value: boolean) => {
    setBusy(true);
    try {
      const next = await patchSupplierPortalNotificationPrefs({ [key]: value });
      setPrefs(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preferences");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SupplierPortalShell>
      <div className="space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Notifications</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Alerts from connected shops — orders, payments, and deliveries.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void onMarkAll()}>
            Mark all read
          </Button>
        </header>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Inbox
          </h3>
          <ul className="divide-y rounded-xl border">
            {rows.map((row) => {
              const unread = !row.readAt;
              return (
                <li
                  key={row.id}
                  className={cn("px-4 py-3", unread ? "bg-muted/30" : undefined)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{row.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{row.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{fmtDate(row.createdAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      {row.actionUrl ? (
                        <Button asChild size="sm" variant="ghost">
                          <Link href={row.actionUrl}>Open</Link>
                        </Button>
                      ) : null}
                      {unread ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => {
                            void markSupplierPortalNotificationRead(row.id)
                              .then(reload)
                              .catch((err) =>
                                setError(err instanceof Error ? err.message : "Failed"),
                              );
                          }}
                        >
                          Mark read
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {rows.length === 0 && !error ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : null}
        </section>

        {prefs ? (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Preferences
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["notifyPoInApp", "New PO — in-app"],
                  ["notifyPoSms", "New PO — SMS"],
                  ["notifyPaymentInApp", "Payment — in-app"],
                  ["notifyPaymentSms", "Payment — SMS"],
                  ["notifyDeliveryInApp", "Delivery confirmed — in-app"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={prefs[key]}
                    disabled={busy}
                    onChange={(ev) => void onTogglePref(key, ev.target.checked)}
                  />
                </label>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </SupplierPortalShell>
  );
}
