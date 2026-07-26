"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalMessageShops,
  fetchSupplierPortalMessages,
  markSupplierPortalMessageRead,
  sendSupplierPortalMessage,
  type SupplierPortalMessageRow,
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

export default function SupplierPortalMessagesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SupplierPortalMessageRow[]>([]);
  const [shops, setShops] = useState<Array<{ localSupplierId: string; shopName: string }>>([]);
  const [localSupplierId, setLocalSupplierId] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [messages, nextShops] = await Promise.all([
      fetchSupplierPortalMessages(),
      fetchSupplierPortalMessageShops(),
    ]);
    setRows(messages);
    setShops(nextShops);
    if (!localSupplierId && nextShops[0]) {
      setLocalSupplierId(nextShops[0].localSupplierId);
    }
  };

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void reload().catch((err) =>
      setError(err instanceof Error ? err.message : "Could not load messages"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const ordered = useMemo(
    () => [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [rows],
  );

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localSupplierId || body.trim().length < 2) {
      setError("Choose a shop and write a short message");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await sendSupplierPortalMessage({ localSupplierId, body: body.trim() });
      setBody("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SupplierPortalShell>
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight">Messages</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Notes between you and connected shops — including hub complaints.
          </p>
        </header>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <form className="space-y-3 rounded-xl border p-4" onSubmit={onSend}>
          <label className="block text-sm font-medium">
            Shop
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={localSupplierId}
              onChange={(ev) => setLocalSupplierId(ev.target.value)}
            >
              {shops.map((shop) => (
                <option key={shop.localSupplierId} value={shop.localSupplierId}>
                  {shop.shopName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Message
            <textarea
              className="mt-1 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={body}
              onChange={(ev) => setBody(ev.target.value)}
              placeholder="Ask about a payment, delivery, or supply…"
              required
            />
          </label>
          <Button type="submit" disabled={busy || shops.length === 0}>
            {busy ? "Sending…" : "Send to shop"}
          </Button>
        </form>

        <ul className="divide-y rounded-xl border">
          {ordered.map((row) => {
            const unread = row.direction === "from_shop" && !row.readAt;
            return (
              <li
                key={row.id}
                className={cn("px-4 py-3", unread ? "bg-muted/30" : undefined)}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {row.direction === "from_shop" ? "From shop" : "You"} · {row.shopName}
                    </p>
                    <p className="mt-1 text-sm">{row.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.authorName} · {fmtDate(row.createdAt)}
                    </p>
                  </div>
                  {unread ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void markSupplierPortalMessageRead(row.id)
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
              </li>
            );
          })}
        </ul>
        {ordered.length === 0 && !error ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : null}
      </div>
    </SupplierPortalShell>
  );
}
