"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  Loader2,
  LogIn,
  MessageSquareWarning,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_ROUTES, PLATFORM_DOMAIN } from "@/lib/config";
import {
  fetchGlobalSupplierHub,
  fetchHubShopSupplies,
  shopPortalAbsoluteUrl,
  submitHubShopComplaint,
  type GlobalHubShopDetail,
  type GlobalSupplierHub,
  type GlobalSupplierHubShopCard,
} from "@/lib/global-supplier-hub";
import {
  formatMoneyCompact,
  resolveCurrencyCode,
} from "@/lib/money";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { cn } from "@/lib/utils";

type Props = {
  username: string;
};

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function fmtMoney(amount: unknown, currency: string): string {
  return formatMoneyCompact(toNum(amount), resolveCurrencyCode(currency));
}

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

function ShopDetailPanel({
  shop,
  currency,
}: {
  shop: GlobalSupplierHubShopCard;
  currency: string;
}) {
  const [detail, setDetail] = useState<GlobalHubShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchHubShopSupplies(shop.localSupplierId)
      .then((row) => {
        if (!cancelled) setDetail(row);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load supplies");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shop.localSupplierId]);

  const onSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (note.trim().length < 8) {
      toast.error("Write a short note (at least 8 characters)");
      return;
    }
    setSending(true);
    try {
      await submitHubShopComplaint(shop.localSupplierId, {
        message: note.trim(),
        phone: phone.trim() || undefined,
      });
      setNote("");
      toast.success("Note sent to the shop");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send note");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 border-t border-stone-200 px-4 py-3 text-sm text-stone-500">
        <Loader2 className="size-4 animate-spin" />
        Loading supply lines…
      </div>
    );
  }

  if (!detail) {
    return (
      <p className="border-t border-stone-200 px-4 py-3 text-sm text-stone-500">
        Could not load details for this shop.
      </p>
    );
  }

  return (
    <div className="space-y-4 border-t border-stone-200 bg-stone-50/80 px-4 py-4">
      <ul className="space-y-2">
        {detail.supplies.length === 0 ? (
          <li className="text-sm text-stone-500">No supplies yet at this shop.</li>
        ) : (
          detail.supplies.map((row) => (
            <li
              key={`${row.invoiceNumber}-${row.invoiceDate}`}
              className="border border-stone-200 bg-white px-3 py-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-stone-900">
                  {row.invoiceNumber} · {fmtDate(row.invoiceDate)}
                </p>
                <p className="text-sm tabular-nums text-stone-700">
                  {fmtMoney(row.grandTotal, currency)}
                  <span className="ml-2 text-xs uppercase text-stone-500">
                    {row.paymentStatus}
                  </span>
                </p>
              </div>
              {(row.lines ?? []).length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-stone-100 pt-2 text-xs text-stone-600">
                  {(row.lines ?? []).map((line, idx) => (
                    <li key={`${line.description}-${idx}`} className="flex justify-between gap-3">
                      <span>
                        {line.description} × {String(line.quantity)}
                      </span>
                      <span className="tabular-nums">
                        {fmtMoney(line.lineTotal, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))
        )}
      </ul>

      <form onSubmit={onSendNote} className="space-y-2 border border-stone-200 bg-white p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-stone-800">
          <MessageSquareWarning className="size-4" />
          Leave a note for {shop.shopName}
        </p>
        <Input
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <textarea
          className="min-h-20 w-full border border-stone-200 bg-background px-3 py-2 text-sm"
          placeholder="Delivery issue, missing items, payment question…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={sending}>
          {sending ? "Sending…" : "Send note"}
        </Button>
      </form>
    </div>
  );
}

export function GlobalSupplierHubView({ username }: Props) {
  const [hub, setHub] = useState<GlobalSupplierHub | null | undefined>(undefined);
  const [signedIn, setSignedIn] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refreshAuth = useCallback(() => {
    setSignedIn(Boolean(getSupplierPortalAccessToken()));
  }, []);

  useEffect(() => {
    refreshAuth();
    let cancelled = false;
    void fetchGlobalSupplierHub(username).then((row) => {
      if (!cancelled) setHub(row);
    });
    return () => {
      cancelled = true;
    };
  }, [username, refreshAuth]);

  if (hub === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-stone-500">
        <Loader2 className="size-5 animate-spin" />
        Loading passport…
      </div>
    );
  }

  if (hub === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-stone-500">
          {PLATFORM_DOMAIN}
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-stone-900">
          @{username}
        </h1>
        <p className="mt-2 text-stone-600">
          This global supplier passport has not been claimed yet.
        </p>
      </div>
    );
  }

  const currency = hub.currency || "KES";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f4ef_0%,#fafafa_40%,#ffffff_100%)]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <header className="border-b border-stone-300 pb-8">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
            {PLATFORM_DOMAIN} · supplier passport
          </p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-stone-950 sm:text-5xl">
            @{hub.username}
          </h1>
          <p className="mt-2 text-lg text-stone-700">{hub.displayName}</p>
          <p className="mt-1 text-sm text-stone-500">
            Supplies {hub.shopCount} shop{hub.shopCount === 1 ? "" : "s"} on Kiosk
          </p>
        </header>

        <section className="mt-8 grid grid-cols-3 gap-3 border border-stone-300 bg-white/70 p-4 sm:gap-6">
          {(
            [
              ["Owed", hub.totals.owed],
              ["Paid", hub.totals.paid],
              ["Pending", hub.totals.pending],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] uppercase tracking-wider text-stone-500">{label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-stone-900 sm:text-xl">
                {fmtMoney(value, currency)}
              </p>
            </div>
          ))}
        </section>

        {!signedIn ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-dashed border-stone-300 bg-white/50 px-4 py-3">
            <p className="text-sm text-stone-600">
              Sign in to see delivery lines &amp; leave notes
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href={APP_ROUTES.supplierPortalLogin}>
                <LogIn className="mr-2 size-4" />
                Sign in
              </Link>
            </Button>
          </div>
        ) : null}

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-600">
            <Store className="size-4" />
            Shops
          </h2>
          <ul className="mt-4 space-y-3">
            {hub.shops.length === 0 ? (
              <li className="border border-stone-200 bg-white px-4 py-6 text-sm text-stone-500">
                No shops linked yet. Claim local supplier identities from the
                supplier portal profile.
              </li>
            ) : (
              hub.shops.map((shop) => {
                const open = expandedId === shop.localSupplierId;
                return (
                  <li key={shop.localSupplierId} className="border border-stone-300 bg-white">
                    <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="font-medium text-stone-900">{shop.shopName}</p>
                        <p className="mt-0.5 text-xs text-stone-500">
                          Last supply {fmtDate(shop.lastSupplyAt)}
                          {shop.slugHost ? ` · ${shop.slugHost}` : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs tabular-nums text-stone-600">
                          <span>Owed {fmtMoney(shop.owed, currency)}</span>
                          <span>Paid {fmtMoney(shop.paid, currency)}</span>
                          <span>Pending {fmtMoney(shop.pending, currency)}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <a href={shopPortalAbsoluteUrl(shop)} target="_blank" rel="noreferrer">
                            Shop portal
                          </a>
                        </Button>
                        {signedIn ? (
                          <Button
                            size="sm"
                            variant={open ? "secondary" : "default"}
                            onClick={() =>
                              setExpandedId(open ? null : shop.localSupplierId)
                            }
                          >
                            {open ? "Hide lines" : "Supply lines"}
                            <ChevronDown
                              className={cn(
                                "ml-1 size-4 transition-transform",
                                open && "rotate-180",
                              )}
                            />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {open && signedIn ? (
                      <ShopDetailPanel shop={shop} currency={currency} />
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
