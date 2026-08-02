"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ChevronDown,
  Loader2,
  LogIn,
  MessageSquareWarning,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import { MarketplaceOrderWorkspace } from "@/app/marketplace/_components/marketplace-order-panel";
import { KioskLogo } from "@/components/brand/kiosk-logo";
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
import { fetchSupplierPortalProfile } from "@/lib/marketplace-api";
import {
  formatMoneyCompact,
  resolveCurrencyCode,
} from "@/lib/money";
import { marketplaceSupplierPath } from "@/lib/marketplace-url";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { cn } from "@/lib/utils";
import { SupplierActivityTabs } from "@/components/supplier-portal/supplier-activity-tabs";
import { PageSealGate } from "@/components/page-seal/page-seal-gate";
import {
  fetchSupplierPageSealStatus,
  type PageSealStatus,
} from "@/lib/page-seal";

type Props = {
  username: string;
};

const INK_BORDER =
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]";
const INK_BORDER_SOFT =
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]";
const PAPER =
  "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)]";

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
      <div
        className={cn(
          "flex items-center gap-2 border-t px-4 py-3 text-sm text-muted-foreground",
          INK_BORDER_SOFT,
          PAPER,
        )}
      >
        <Loader2 className="size-4 animate-spin" />
        Loading supply lines…
      </div>
    );
  }

  if (!detail) {
    return (
      <p
        className={cn(
          "border-t px-4 py-3 text-sm text-muted-foreground",
          INK_BORDER_SOFT,
          PAPER,
        )}
      >
        Could not load details for this shop.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3 border-t px-3 py-3 sm:px-4", INK_BORDER_SOFT, PAPER)}>
      <ul className={cn("-mx-3 overflow-hidden border-y bg-white/90 sm:mx-0 sm:border", INK_BORDER)}>
        {detail.supplies.length === 0 ? (
          <li className="px-3.5 py-4 text-sm text-muted-foreground">
            No supplies yet at this shop.
          </li>
        ) : (
          detail.supplies.map((row) => (
            <li
              key={`${row.invoiceNumber}-${row.invoiceDate}`}
              className={cn(
                "border-b px-3.5 py-3 last:border-b-0",
                "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)]",
              )}
            >
              <p className="text-[13px] font-medium leading-snug text-[var(--pos-ink,#1c1915)]">
                {row.invoiceNumber}
              </p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="min-w-0 space-y-0.5 text-[11px] leading-tight text-muted-foreground">
                  <p className="tabular-nums">{fmtDate(row.invoiceDate)}</p>
                  <p className="font-mono uppercase tracking-tight">
                    {row.paymentStatus}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-[14px] font-semibold tabular-nums tracking-tight text-[var(--pos-ink,#1c1915)]">
                  {fmtMoney(row.grandTotal, currency)}
                </p>
              </div>
              {(row.lines ?? []).length > 0 ? (
                <ul className="mt-2.5 space-y-2 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] pt-2.5">
                  {(row.lines ?? []).map((line, idx) => (
                    <li
                      key={`${line.description}-${idx}`}
                      className="flex items-start justify-between gap-3 text-[12px]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug text-[var(--pos-ink,#1c1915)]">
                          {line.description}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {toNum(line.quantity)} × {toNum(line.unitCost).toFixed(2)}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-[11px] font-semibold tabular-nums">
                        {fmtMoney(line.lineTotal, currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))
        )}
      </ul>

      <form
        onSubmit={onSendNote}
        className={cn("space-y-2 border bg-white/90 p-3", INK_BORDER)}
      >
        <p className="flex items-center gap-2 text-[12px] font-semibold text-[var(--pos-ink,#1c1915)]">
          <MessageSquareWarning className="size-3.5" />
          Leave a note for {shop.shopName}
        </p>
        <Input
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-none"
        />
        <textarea
          className={cn(
            "min-h-20 w-full border bg-background px-3 py-2 text-sm",
            "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
          )}
          placeholder="Delivery issue, missing items, payment question…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={sending} className="rounded-none">
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
    <section className="space-y-4">
      <div className={cn("relative overflow-hidden border bg-white/80", INK_BORDER)}>
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary,#0f766e)]"
        />
        <div className="px-3.5 py-3.5 pl-4 sm:px-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Supplier passport · @{hub.username}
          </p>
          <h2 className="mt-1 text-[1.25rem] font-semibold leading-none tracking-tight text-[var(--pos-ink,#1c1915)]">
            {hub.displayName}
          </h2>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            Supplies {hub.shopCount} shop{hub.shopCount === 1 ? "" : "s"} on Kiosk
          </p>
        </div>
        <div
          className={cn(
            "grid grid-cols-3 divide-x border-t",
            INK_BORDER_SOFT,
            "divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]",
          )}
        >
          {(
            [
              ["Owed", hub.totals.owed],
              ["Paid", hub.totals.paid],
              ["Partial", hub.totals.pending],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="px-3 py-3 sm:px-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-[1.05rem] font-semibold tabular-nums tracking-tight text-[var(--pos-ink,#1c1915)] sm:text-[1.2rem]">
                {fmtMoney(value, currency)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {!signedIn ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 border border-dashed px-3.5 py-3",
            "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)]",
          )}
        >
          <p className="text-[12px] text-muted-foreground">
            Sign in for live product pulse, shop ledgers &amp; notes
          </p>
          <Link
            href={APP_ROUTES.supplierPortalLogin}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 border px-3 text-[11px] font-semibold uppercase tracking-[0.1em]",
              "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_45%,transparent)]",
              "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)]",
              "text-[var(--pos-ink,#1c1915)]",
            )}
          >
            <LogIn className="size-3.5" />
            Sign in
          </Link>
        </div>
      ) : null}

      {hub.shops.length > 0 ? (
        <div>
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Store className="size-3.5" />
            Linked shops
          </h3>
          <ul className={cn("mt-2.5 overflow-hidden border bg-white/90", INK_BORDER)}>
            {hub.shops.map((shop) => {
              const open = expandedId === shop.localSupplierId;
              return (
                <li
                  key={shop.localSupplierId}
                  className={cn(
                    "border-b last:border-b-0",
                    "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)]",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 px-3.5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium leading-snug text-[var(--pos-ink,#1c1915)]">
                        {shop.shopName}
                      </p>
                      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                        <div className="space-y-0.5 text-[11px] leading-tight text-muted-foreground">
                          <p>
                            Last supply{" "}
                            <span className="tabular-nums">
                              {fmtDate(shop.lastSupplyAt)}
                            </span>
                          </p>
                          <p className="font-mono tabular-nums">
                            Owed {fmtMoney(shop.owed, currency)}
                            <span className="mx-1.5 text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_22%,transparent)]">
                              ·
                            </span>
                            Paid {fmtMoney(shop.paid, currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <a
                        href={shopPortalAbsoluteUrl(shop)}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          "inline-flex h-8 items-center border px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
                          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
                          "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]",
                        )}
                      >
                        Shop portal
                      </a>
                      {signedIn ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(open ? null : shop.localSupplierId)
                          }
                          className={cn(
                            "inline-flex h-8 items-center gap-1 border px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
                            open
                              ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] text-[var(--pos-ink,#1c1915)]"
                              : "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_45%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)] text-[var(--pos-ink,#1c1915)]",
                          )}
                        >
                          {open ? "Hide lines" : "Supply lines"}
                          <ChevronDown
                            className={cn(
                              "size-3.5 transition-transform",
                              open && "rotate-180",
                            )}
                          />
                        </button>
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
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
        @{username}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        No public catalogue matched this handle yet. Browse the marketplace or claim
        this passport if you are the supplier.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href={searchHref}
          className="inline-flex h-10 items-center border border-[var(--pos-ink,#1c1915)] bg-[var(--pos-ink,#1c1915)] px-4 text-sm font-semibold text-white"
        >
          Search marketplace
        </Link>
        <Link
          href={APP_ROUTES.supplierPortalClaim}
          className={cn(
            "inline-flex h-10 items-center border px-4 text-sm font-semibold",
            INK_BORDER,
            "text-[var(--pos-ink,#1c1915)]",
          )}
        >
          Claim passport
        </Link>
      </div>
    </div>
  );
}

function HubShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-dvh bg-[radial-gradient(120%_80%_at_50%_-10%,color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,#f7f4ef),#efeae2_42%,#e7e1d6)] text-[var(--pos-ink,#1c1915)]"
      style={{ ["--pos-primary" as string]: "#0f766e" }}
    >
      <header
        className={cn(
          "sticky top-0 z-30 border-b bg-[color-mix(in_srgb,#faf8f4_88%,transparent)] backdrop-blur-md",
          INK_BORDER_SOFT,
        )}
      >
        <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex items-center gap-3">
            <KioskLogo size="sm" href="/" />
            <Link
              href={APP_ROUTES.marketplace}
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-[var(--pos-ink,#1c1915)]"
            >
              Marketplace
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

export function GlobalSupplierHubView({ username }: Props) {
  const [storefront, setStorefront] = useState<GlobalSupplierStorefront | undefined>(
    undefined,
  );
  const [signedIn, setSignedIn] = useState(false);
  const [ownerUsername, setOwnerUsername] = useState<string | null | undefined>(
    undefined,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sealStatus, setSealStatus] = useState<PageSealStatus | null>(null);
  const [sealEpoch, setSealEpoch] = useState(0);

  const refreshAuth = useCallback(() => {
    const token = getSupplierPortalAccessToken();
    setSignedIn(Boolean(token));
    if (!token) {
      setOwnerUsername(null);
      return;
    }
    setOwnerUsername(undefined);
    void fetchSupplierPortalProfile()
      .then((profile) => setOwnerUsername(profile.username ?? null))
      .catch(() => setOwnerUsername(null));
  }, []);

  const reloadStorefront = useCallback(() => {
    void resolveGlobalSupplierStorefront(username).then((row) => {
      setStorefront(row);
    });
  }, [username]);

  useEffect(() => {
    refreshAuth();
    let cancelled = false;
    void resolveGlobalSupplierStorefront(username).then((row) => {
      if (!cancelled) setStorefront(row);
    });
    return () => {
      cancelled = true;
    };
  }, [username, refreshAuth, sealEpoch]);

  useEffect(() => {
    let cancelled = false;
    void fetchSupplierPageSealStatus(username)
      .then((row) => {
        if (!cancelled) setSealStatus(row);
      })
      .catch(() => {
        if (!cancelled) {
          setSealStatus({
            sealed: false,
            scope: "supplier_slug",
            subjectKey: username,
            displayName: null,
            phoneHint: null,
            unlockValid: true,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [username, sealEpoch]);

  if (storefront === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading supplier…
      </div>
    );
  }

  const { hub, detail } = storefront;

  if (!detail && !hub) {
    return (
      <HubShell>
        <EmptyGlobalFallback username={username} />
      </HubShell>
    );
  }

  const isOwner = Boolean(
    signedIn &&
      ownerUsername !== undefined &&
      ownerUsername &&
      ownerUsername.trim().toLowerCase() ===
        (hub?.username || username).trim().toLowerCase(),
  );
  const showPulse = Boolean(isOwner && hub);
  const sealedLocked = Boolean(sealStatus?.sealed && !sealStatus.unlockValid);

  return (
    <HubShell>
      <div className="mx-auto w-full max-w-[1400px] px-3 pb-10 pt-3 sm:px-5">
        <PageSealGate
          scope="supplier"
          subjectKey={username}
          status={sealStatus}
          canManage={isOwner}
          onUnlocked={() => {
            setSealEpoch((n) => n + 1);
            reloadStorefront();
          }}
          onSealedChange={() => setSealEpoch((n) => n + 1)}
        >
          {sealedLocked ? null : (
            <>
              {hub ? (
                <PassportStrip
                  hub={hub}
                  signedIn={signedIn}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                />
              ) : null}

              {showPulse ? <SupplierActivityTabs className="mt-5" /> : null}

              {detail ? (
                <div className={cn(hub || showPulse ? "mt-5" : "mt-0")}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
                      @{username}
                      {!hub ? (
                        <span className="font-sans text-muted-foreground/80">
                          {" "}
                          · marketplace listing
                        </span>
                      ) : (
                        <span className="font-sans font-bold uppercase tracking-[0.14em]">
                          {" "}
                          · Catalogue
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {!hub ? (
                        <Link
                          href={APP_ROUTES.supplierPortalClaim}
                          className={cn(
                            "inline-flex h-7 items-center border px-2 text-[10px] font-semibold uppercase tracking-[0.1em]",
                            "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
                            "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]",
                          )}
                        >
                          Claim passport
                        </Link>
                      ) : null}
                      {detail.slug ? (
                        <Link
                          href={marketplaceSupplierPath(detail)}
                          className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                        >
                          Full page
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <MarketplaceOrderWorkspace detail={detail} layout="shelf" />
                </div>
              ) : hub ? (
                <div className="mt-8 text-center text-sm text-muted-foreground">
                  Passport claimed, but no public catalogue is linked yet. Link a shop identity
                  from the supplier portal profile to show products here.
                </div>
              ) : null}
            </>
          )}
        </PageSealGate>
      </div>
    </HubShell>
  );
}
