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

import { MarketplaceOrderWorkspace } from "@/app/marketplace/_components/marketplace-order-panel";
import { MarketplacePageFrame } from "@/app/marketplace/_components/marketplace-page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchHubShopSupplies,
  resolveGlobalSupplierStorefront,
  shopPortalAbsoluteUrl,
  submitHubShopComplaint,
  usernameToSearchQuery,
  type GlobalHubShopDetail,
  type GlobalSupplierHub,
  type GlobalSupplierHubShopCard,
  type GlobalSupplierStorefront,
} from "@/lib/global-supplier-hub";
import {
  formatMoneyCompact,
  resolveCurrencyCode,
} from "@/lib/money";
import { marketplaceSupplierPath } from "@/lib/marketplace-url";
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
      <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading supply lines…
      </div>
    );
  }

  if (!detail) {
    return (
      <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
        Could not load details for this shop.
      </p>
    );
  }

  return (
    <div className="space-y-4 border-t border-border bg-muted/30 px-4 py-4">
      <ul className="space-y-2">
        {detail.supplies.length === 0 ? (
          <li className="text-sm text-muted-foreground">No supplies yet at this shop.</li>
        ) : (
          detail.supplies.map((row) => (
            <li
              key={`${row.invoiceNumber}-${row.invoiceDate}`}
              className="border border-border bg-background px-3 py-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                  {row.invoiceNumber} · {fmtDate(row.invoiceDate)}
                </p>
                <p className="text-sm tabular-nums">
                  {fmtMoney(row.grandTotal, currency)}
                  <span className="ml-2 text-xs uppercase text-muted-foreground">
                    {row.paymentStatus}
                  </span>
                </p>
              </div>
              {(row.lines ?? []).length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
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

      <form onSubmit={onSendNote} className="space-y-2 border border-border bg-background p-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <MessageSquareWarning className="size-4" />
          Leave a note for {shop.shopName}
        </p>
        <Input
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <textarea
          className="min-h-20 w-full border border-input bg-background px-3 py-2 text-sm"
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

function PassportStrip({
  hub,
  signedIn,
  expandedId,
  setExpandedId,
}: {
  hub: GlobalSupplierHub;
  signedIn: boolean;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}) {
  const currency = hub.currency || "KES";
  return (
    <section className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6">
      <div className="border border-border bg-background/80 p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Supplier passport · @{hub.username}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{hub.displayName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Supplies {hub.shopCount} shop{hub.shopCount === 1 ? "" : "s"} on Kiosk
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
          {(
            [
              ["Owed", hub.totals.owed],
              ["Paid", hub.totals.paid],
              ["Pending", hub.totals.pending],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-base font-semibold tabular-nums sm:text-lg">
                {fmtMoney(value, currency)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {!signedIn ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-dashed border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Sign in to expand shop ledgers &amp; leave notes
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href={APP_ROUTES.supplierPortalLogin}>
              <LogIn className="mr-2 size-4" />
              Sign in
            </Link>
          </Button>
        </div>
      ) : null}

      {hub.shops.length > 0 ? (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Store className="size-4" />
            Linked shops
          </h3>
          <ul className="mt-3 space-y-2">
            {hub.shops.map((shop) => {
              const open = expandedId === shop.localSupplierId;
              return (
                <li key={shop.localSupplierId} className="border border-border bg-background">
                  <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="font-medium">{shop.shopName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Last supply {fmtDate(shop.lastSupplyAt)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs tabular-nums text-muted-foreground">
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
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function EmptyGlobalFallback({ username }: { username: string }) {
  const q = usernameToSearchQuery(username);
  const searchHref = `${APP_ROUTES.marketplace}?q=${encodeURIComponent(q)}`;
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">@{username}</h1>
      <p className="mt-3 text-muted-foreground">
        No public catalogue matched this handle yet. Browse the marketplace or claim
        this passport if you are the supplier.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href={searchHref}>Search marketplace</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={APP_ROUTES.supplierPortalLogin}>Claim passport</Link>
        </Button>
      </div>
    </div>
  );
}

export function GlobalSupplierHubView({ username }: Props) {
  const [storefront, setStorefront] = useState<GlobalSupplierStorefront | undefined>(
    undefined,
  );
  const [signedIn, setSignedIn] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refreshAuth = useCallback(() => {
    setSignedIn(Boolean(getSupplierPortalAccessToken()));
  }, []);

  useEffect(() => {
    refreshAuth();
    let cancelled = false;
    void resolveGlobalSupplierStorefront(username).then((row) => {
      if (!cancelled) setStorefront(row);
    });
    return () => {
      cancelled = true;
    };
  }, [username, refreshAuth]);

  if (storefront === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading supplier…
      </div>
    );
  }

  const { hub, detail, source } = storefront;

  if (!detail && !hub) {
    return (
      <MarketplacePageFrame>
        <EmptyGlobalFallback username={username} />
      </MarketplacePageFrame>
    );
  }

  return (
    <MarketplacePageFrame>
      {hub ? (
        <PassportStrip
          hub={hub}
          signedIn={signedIn}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
        />
      ) : (
        <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-background/80 px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                @{username}
              </p>
              <p className="text-sm text-muted-foreground">
                Public marketplace listing
                {source === "directory" ? " · order below via WhatsApp / PDF" : ""}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={APP_ROUTES.supplierPortalLogin}>Claim this passport</Link>
            </Button>
          </div>
        </div>
      )}

      {detail ? (
        <div className="pb-10">
          {detail.slug ? (
            <div className="mx-auto max-w-[1400px] px-4 pb-2 sm:px-6">
              <Link
                href={marketplaceSupplierPath(detail)}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Open full marketplace page
              </Link>
            </div>
          ) : null}
          <MarketplaceOrderWorkspace detail={detail} />
        </div>
      ) : (
        <div className="mx-auto max-w-xl px-4 py-10 text-center text-sm text-muted-foreground">
          Passport claimed, but no public catalogue is linked yet. Link a shop identity
          from the supplier portal profile to show products here.
        </div>
      )}
    </MarketplacePageFrame>
  );
}
