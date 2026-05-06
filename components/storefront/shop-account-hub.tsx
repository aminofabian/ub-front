"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { authThemeStyle } from "@/components/auth/auth-split-shell";
import { useOptionalTenant } from "@/components/providers/tenant-provider";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Coins,
  CreditCard,
  Gem,
  LogOut,
  Package,
  Shield,
  Sparkles,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchBusiness,
  fetchShopperAccountOverview,
  fetchShopperPickupOrderDetail,
  logoutRemote,
  type BusinessRecord,
  type MeResponse,
  type ShopperAccountOverview,
  type ShopperLedgerRow,
  type ShopperPickupOrderDetail,
  type ShopperPickupOrderRow,
} from "@/lib/api";
import { isBuyerAccount } from "@/lib/buyer-role";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type HubProps = {
  me: MeResponse;
};

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function fmtMoney(amount: unknown, currency: string, opts?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.length >= 3 ? currency : "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...opts,
    }).format(toNum(amount));
  } catch {
    return `${currency} ${toNum(amount).toFixed(2)}`;
  }
}

function statusGlow(status: string | undefined): string {
  const s = (status ?? "").toUpperCase();
  if (s.includes("READY")) {
    return "from-[color-mix(in_srgb,var(--auth-primary)_36%,transparent)] to-[color-mix(in_srgb,var(--auth-secondary)_12%,transparent)] text-foreground";
  }
  if (s.includes("PICK") || s.includes("PLACED")) {
    return "from-[color-mix(in_srgb,var(--auth-secondary)_34%,transparent)] to-[color-mix(in_srgb,var(--auth-primary)_10%,transparent)] text-foreground";
  }
  if (s.includes("CANCEL")) {
    return "from-destructive/25 to-destructive/5 text-foreground";
  }
  return "from-muted/45 to-muted/15 text-foreground";
}

function ledgerBadge(kind: string | undefined): { label: string; className: string } {
  const k = (kind ?? "").toLowerCase();
  if (k.startsWith("wallet")) {
    return {
      label: "Wallet",
      className:
        "border-[color-mix(in_srgb,var(--auth-primary)_42%,transparent)] bg-[color-mix(in_srgb,var(--auth-primary)_14%,transparent)] text-foreground",
    };
  }
  if (k.startsWith("credit")) {
    return {
      label: "Tab",
      className:
        "border-[color-mix(in_srgb,var(--auth-secondary)_42%,transparent)] bg-[color-mix(in_srgb,var(--auth-secondary)_12%,transparent)] text-foreground",
    };
  }
  if (k.startsWith("loyalty")) {
    return {
      label: "Loyalty",
      className:
        "border-[color-mix(in_srgb,var(--auth-primary)_26%,var(--auth-secondary)_26%)] bg-[color-mix(in_srgb,var(--auth-secondary)_16%,transparent)] text-foreground",
    };
  }
  return { label: kind ?? "Ledger", className: "border-border/60 bg-muted/40 text-foreground" };
}

export function ShopAccountHub({ me }: HubProps) {
  const tenant = useOptionalTenant();
  const themeStyle = useMemo((): CSSProperties => authThemeStyle(tenant), [tenant]);
  const shopper = isBuyerAccount(me);
  const [biz, setBiz] = useState<BusinessRecord | null>(null);
  const [data, setData] = useState<ShopperAccountOverview | null>(null);
  const [page, setPage] = useState(0);
  const [hubError, setHubError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ShopperPickupOrderDetail | null>(null);

  const currency = biz?.currency?.trim() || "USD";

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setHubError("");
      try {
        const [business, overview] = await Promise.all([
          fetchBusiness(),
          fetchShopperAccountOverview(nextPage, 12),
        ]);
        setBiz(business);
        setData((prev) => {
          if (!append || !prev) {
            return overview;
          }
          return {
            ...overview,
            pickupOrders: [...(prev.pickupOrders ?? []), ...(overview.pickupOrders ?? [])],
          };
        });
        setPage(nextPage);
      } catch (e) {
        setHubError(e instanceof Error ? e.message : "Couldn't load hub.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- storefront hub hydrate */
    void loadPage(0, false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadPage]);

  const kesPerPt = useMemo(() => {
    const k = data?.loyaltyKesPerPoint;
    const n = toNum(k);
    return Number.isFinite(n) && n > 0 ? n : 0.01;
  }, [data?.loyaltyKesPerPoint]);

  const loyaltyEquivalent = () => fmtMoney(toNum(data?.balances?.loyaltyPoints) * kesPerPt, currency);

  const onOpenDetail = async (orderId: string) => {
    setDetail(null);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const d = await fetchShopperPickupOrderDetail(orderId);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const hasMoreOrders =
    data &&
    typeof data.pickupOrdersTotalPages === "number" &&
    typeof page === "number" &&
    page + 1 < data.pickupOrdersTotalPages;

  return (
    <div
      className="relative mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:pb-28"
      style={themeStyle}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-28 h-[22rem] overflow-hidden opacity-[0.22] blur-3xl dark:opacity-28"
      >
        <div className="absolute left-[8%] top-24 h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--auth-primary)_72%,transparent)]" />
        <div className="absolute right-[10%] top-16 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--auth-secondary)_62%,transparent)]" />
        <div className="absolute bottom-16 left-[40%] h-52 w-52 rounded-full bg-[color-mix(in_srgb,var(--auth-primary)_35%,var(--auth-secondary)_35%)]" />
      </div>

      <header className="relative z-[1] flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground shadow-sm backdrop-blur-sm">
            <Gem className="size-3.5 text-[color:var(--auth-primary)]" aria-hidden />
            Welcome back
          </div>
          <h1 className="font-heading mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {me.name}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{me.email}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              asChild
              className="h-11 rounded-2xl shadow-md"
              style={{ backgroundColor: "var(--auth-accent)", color: "var(--auth-accent-ink)" }}
            >
              <Link href={APP_ROUTES.shop}>
                Shop again
                <ArrowRight className="ml-1.5 size-4 opacity-70" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-2xl border-2 border-[color-mix(in_srgb,var(--auth-primary)_38%,transparent)] hover:bg-[color-mix(in_srgb,var(--auth-primary)_12%,transparent)]"
            >
              <Link href={APP_ROUTES.shopCart}>Open cart</Link>
            </Button>
            {!shopper ? (
              <Button asChild variant="secondary" className="h-11 rounded-2xl">
                <Link href={APP_ROUTES.business}>
                  Workspace
                  <ChevronRight className="ml-1 size-4 opacity-70" aria-hidden />
                </Link>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-2xl gap-2 text-muted-foreground hover:text-destructive"
              onClick={() => void logoutRemote().then(() => window.location.reload())}
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </Button>
          </div>
        </div>

        <div className="relative isolate flex w-full max-w-md shrink-0 flex-col gap-3 rounded-[1.65rem] border border-black/[0.06] bg-gradient-to-br from-card via-background to-muted/30 p-[1px] shadow-lg dark:border-white/10 lg:sticky lg:top-24 dark:from-card dark:via-card dark:to-card/65">
          <div className="rounded-[1.55rem] bg-card/90 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--auth-primary)_14%,transparent)] text-[color:var(--auth-primary)]">
                <Shield className="size-8" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identity</p>
                <p className="font-heading text-lg font-bold text-foreground">
                  {shopper ? "Shopper mode" : "Staff browsing"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-snug text-muted-foreground">
              Pickup histories match the email you typed at checkout. Link this email in the store directory to reveal
              wallet, loyalty strokes, and house credit telemetry.
            </p>
          </div>
        </div>
      </header>

      {hubError ? (
        <div className="relative z-[1] mt-8 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {hubError}
        </div>
      ) : null}

      {loading || !data ? (
        <div className="relative z-[1] mt-12 grid animate-pulse gap-4 lg:grid-cols-12">
          <div className="h-52 rounded-[1.5rem] bg-muted lg:col-span-4" />
          <div className="h-52 rounded-[1.5rem] bg-muted lg:col-span-4" />
          <div className="h-52 rounded-[1.5rem] bg-muted lg:col-span-4" />
          <div className="h-72 rounded-[1.5rem] bg-muted lg:col-span-7" />
          <div className="h-72 rounded-[1.5rem] bg-muted lg:col-span-5" />
        </div>
      ) : (
        <>
          {/* Finance mosaic */}
          <section className="relative z-[1] mt-12 grid gap-4 lg:grid-cols-12">
            <article
              className={cn(
                "relative overflow-hidden rounded-[1.5rem] border border-[color-mix(in_srgb,var(--auth-primary)_28%,transparent)] p-7 shadow-xl lg:col-span-4",
                "bg-[radial-gradient(1200px_circle_at_-10%_-30%,color-mix(in_srgb,var(--auth-primary)_38%,transparent),transparent_52%),linear-gradient(135deg,color-mix(in_srgb,var(--auth-secondary)_16%,transparent),transparent)]",
              )}
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Store wallet</p>
                  <p className="font-heading mt-2 text-[2rem] font-black tracking-tight text-foreground">
                    {fmtMoney(data.balances?.walletBalance, currency)}
                  </p>
                </div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--auth-primary)_18%,transparent)] text-[color:var(--auth-primary)] backdrop-blur">
                  <Wallet className="size-6" aria-hidden />
                </div>
              </div>
              <p className="mt-4 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
                Prepaid sparkle for pickups — top-ups handled in-store ripple here automatically.
              </p>
              <Coins
                className="pointer-events-none absolute -bottom-10 -right-6 size-[9rem] text-[color-mix(in_srgb,var(--auth-primary)_32%,transparent)]"
                aria-hidden
              />
            </article>

            <article
              className={cn(
                "relative overflow-hidden rounded-[1.5rem] border border-[color-mix(in_srgb,var(--auth-secondary)_32%,transparent)] p-7 shadow-xl lg:col-span-4",
                "bg-[linear-gradient(160deg,color-mix(in_srgb,var(--auth-secondary)_42%,transparent),transparent_62%),linear-gradient(-30deg,color-mix(in_srgb,var(--auth-primary)_24%,transparent),transparent_55%)]",
              )}
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Loyalty nebula
                  </p>
                  <p className="font-heading mt-2 flex items-baseline gap-2">
                    <span className="text-[2rem] font-black tracking-tighter text-foreground">
                      {(data.balances?.loyaltyPoints ?? 0).toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold uppercase text-muted-foreground">pts</span>
                  </p>
                </div>
                <Sparkles className="mt-2 size-9 text-[color:var(--auth-secondary)]" aria-hidden />
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                <span className="rounded-full border border-[color-mix(in_srgb,var(--auth-secondary)_42%,transparent)] bg-[color-mix(in_srgb,var(--auth-primary)_08%,transparent)] px-3 py-1 text-foreground backdrop-blur">
                  ≈ {loyaltyEquivalent()} redemption hint
                </span>
              </div>
              <Sparkles
                className="pointer-events-none absolute -bottom-14 left-12 size-[10rem] text-[color-mix(in_srgb,var(--auth-secondary)_28%,transparent)]"
                aria-hidden
              />
            </article>

            <article
              className={cn(
                "relative overflow-hidden rounded-[1.5rem] border border-destructive/25 p-7 shadow-xl lg:col-span-4",
                "bg-[linear-gradient(200deg,hsl(var(--destructive)/_0.13),transparent_62%),linear-gradient(40deg,color-mix(in_srgb,var(--auth-primary)_22%,transparent),transparent_55%)]",
              )}
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Credit tab</p>
                  <p className="font-heading mt-2 text-[1.85rem] font-black tracking-tight text-destructive">
                    Owed{" "}
                    <span className="text-[1.5rem]">
                      {fmtMoney(data.balances?.balanceOwed, currency)}
                    </span>
                  </p>
                </div>
                <CreditCard className="mt-2 size-9 text-[color:var(--auth-primary)]" aria-hidden />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {data.balances?.creditLimit != null ? (
                  <span className="rounded-xl border border-[color-mix(in_srgb,var(--auth-primary)_36%,transparent)] bg-[color-mix(in_srgb,var(--auth-primary)_12%,transparent)] px-3 py-1.5 text-[11px] font-semibold text-foreground backdrop-blur">
                    Ceiling {fmtMoney(data.balances.creditLimit, currency)}
                  </span>
                ) : (
                  <span className="rounded-xl border border-border/55 bg-muted/40 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
                    No programmed limit in system
                  </span>
                )}
                {data.balances?.creditAvailable != null ? (
                  <span className="rounded-xl border border-[color-mix(in_srgb,var(--auth-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--auth-primary)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold text-foreground backdrop-blur">
                    Open line {fmtMoney(data.balances.creditAvailable, currency)}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                {data.linkedStorefrontProfile
                  ? "Linked customer profile ✓ cashier-settled edits surface here within minutes."
                  : "No directory match yet — balances stay zero until the store aligns your inbox with a ledger."}
              </p>
            </article>
          </section>

          <div className="relative z-[1] mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Orders ribbon */}
            <section className="lg:col-span-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">Pickup voyages</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fmtOrdersMeta(data.pickupOrdersTotal)}{" "}
                    {data.pickupOrdersTotal !== 1 ? "orbits logged" : "orbit logged"}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <Package className="size-3.5" aria-hidden /> Web kiosk
                </span>
              </div>

              <div className="relative mt-8 ms-6 border-s-2 border-dashed border-[color-mix(in_srgb,var(--auth-primary)_35%,transparent)] ps-8">
                {(data.pickupOrders ?? []).length ? (
                  (data.pickupOrders ?? []).map((row: ShopperPickupOrderRow) => (
                    <button
                      type="button"
                      key={row.id}
                      onClick={() => void onOpenDetail(row.id)}
                      className="group relative mb-10 block w-[calc(100%-0.75rem)] text-left outline-none last:mb-2"
                    >
                      <span className="absolute -start-[2.075rem] top-8 flex size-[1.375rem] items-center justify-center rounded-full bg-[color:var(--auth-primary)] shadow-md ring-[5px] ring-background transition group-hover:scale-[1.05]">
                        <span className="size-3 rounded-full bg-[color-mix(in_srgb,var(--auth-accent-ink)_88%,transparent)]" aria-hidden />
                      </span>
                      <div className="-ms-px overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md transition hover:-translate-y-[1px] hover:shadow-xl">
                        <div
                          className={cn(
                            "relative flex flex-col gap-3 bg-gradient-to-r px-5 py-4 sm:flex-row sm:items-start sm:justify-between",
                            statusGlow(row.status),
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-mono text-[11px] font-semibold text-foreground/80">
                                #{row.id.slice(0, 8).toUpperCase()}…
                              </p>
                              <span className="rounded-full border border-black/15 bg-black/10 px-2 py-0.5 text-[10px] font-bold uppercase backdrop-blur dark:border-white/20 dark:bg-white/10 dark:text-white">
                                {row.status ?? "PICKUP"}
                              </span>
                              <span className="text-[10px] font-semibold uppercase text-foreground/80">
                                {formatWhen(row.createdAt)}
                              </span>
                            </div>
                            <p className="mt-2 truncate text-[15px] font-semibold text-foreground">{row.customerName}</p>
                            <p className="text-xs text-foreground/80">{row.catalogBranchName}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <p className="font-heading text-2xl font-black text-foreground">
                              {fmtMoney(row.grandTotal, row.currency || currency)}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/90">
                              Peek receipt
                              <ChevronDown className="size-3.5 -rotate-90 opacity-65" aria-hidden />
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
                    <p className="text-sm font-semibold text-foreground">Quiet shelf</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      No pickups yet with this inbox — snag something scrumptious online and you&apos;ll see the trail light
                      up right here.
                    </p>
                    <Button
                      asChild
                      className="mt-6 h-11 rounded-xl shadow-md"
                      style={{ backgroundColor: "var(--auth-accent)", color: "var(--auth-accent-ink)" }}
                    >
                      <Link href={APP_ROUTES.shop}>Kick off browse</Link>
                    </Button>
                  </div>
                )}
              </div>

              {hasMoreOrders ? (
                <div className="ms-14 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-2xl border-2 px-8"
                    disabled={loadingMore}
                    onClick={() => void loadPage(page + 1, true)}
                  >
                    {loadingMore ? "Beaming archives…" : "Load elder receipts"}
                  </Button>
                </div>
              ) : null}
            </section>

            {/* Ledger stream */}
            <section className="lg:col-span-5">
              <div className="flex items-center gap-3">
                <UserRound className="size-6 text-muted-foreground" aria-hidden />
                <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">Ledger stream</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {fmtLedgerHint(data.linkedStorefrontProfile, data.ledgerLinesTotal ?? 0, data.ledgerTruncated)}
              </p>

              {!data.linkedStorefrontProfile ? (
                <div className="relative mt-6 overflow-hidden rounded-[1.4rem] border border-muted/55 bg-muted/15 p-[1px] shadow-inner dark:bg-muted/35">
                  <div className="rounded-[calc(1.4rem-1px)] bg-gradient-to-br from-card to-muted/20 p-6">
                    <Zap className="size-12 rounded-xl border border-muted/55 p-2 text-muted-foreground" aria-hidden />
                    <p className="font-heading mt-4 text-lg font-semibold text-foreground">Directory handshake missing</p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Bring this email ({data.email}) to the counter so they can tether your loyalty capsule + credit
                      profile.
                    </p>
                  </div>
                </div>
              ) : (data.recentLedgerLines ?? []).length ? (
                <ul className="mt-8 space-y-3">
                  {data.recentLedgerLines.map((line: ShopperLedgerRow, i: number) => (
                    <li key={`${line.occurredAt}-${i}-${line.kind ?? ""}-${line.memo ?? ""}`}>
                      <LedgerLineRow currency={currency} row={line} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-8 rounded-3xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
                  Ledger humming but empty — your next visit leaves the first swirl.
                </p>
              )}
            </section>
          </div>
        </>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[min(540px,calc(100vh-6rem))] overflow-y-auto" side="center">
          <DialogHeader className="pr-8">
            <DialogTitle>{detailLoading ? "Opening receipt…" : "Pickup dossier"}</DialogTitle>
            <DialogDescription>
              {detail
                ? `#${detail.id.slice(0, 8).toUpperCase()} · ${detail.catalogBranchName ?? "Branch"}`
                : "Loaded right from the mothership ledger."}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-3 py-8">
              <div className="h-4 w-44 animate-pulse rounded bg-muted" />
              <div className="h-20 animate-pulse rounded-xl bg-muted" />
            </div>
          ) : detail ? (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Chip>{detail.status ?? "PICKUP"}</Chip>
                <Chip tone="muted">{formatWhen(detail.createdAt)}</Chip>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Totals</p>
                <p className="font-heading mt-2 text-3xl font-black text-foreground">
                  {fmtMoney(detail.grandTotal, detail.currency || currency)}
                </p>
                <dl className="mt-5 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold uppercase text-[10px] text-muted-foreground/90">Fulfillment hive</dt>
                    <dd className="text-foreground">{detail.catalogBranchName}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase text-[10px] text-muted-foreground/90">Pickup name</dt>
                    <dd className="text-foreground">{detail.customerName}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase text-[10px] text-muted-foreground/90">Carrier wave</dt>
                    <dd className="font-mono text-foreground">{detail.customerPhone}</dd>
                  </div>
                  {detail.notes ? (
                    <div className="sm:col-span-2">
                      <dt className="font-semibold uppercase text-[10px] text-muted-foreground/90">Notes</dt>
                      <dd className="text-foreground">{detail.notes}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
              {(detail.lines ?? []).length ? (
                <ul className="space-y-2">
                  {(detail.lines ?? []).map((l, idx: number) => (
                    <li
                      key={`${l.itemId}-${idx}-${l.lineIndex ?? idx}`}
                      className="flex items-start justify-between gap-4 rounded-xl border border-border/50 bg-background/80 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold leading-snug">{l.itemName}</p>
                        {l.variantName ? (
                          <p className="text-xs text-muted-foreground">{l.variantName}</p>
                        ) : null}
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          qty {fmtQty(l.quantity)} · ea {fmtMoney(l.unitPrice, detail.currency || currency)}
                        </p>
                      </div>
                      <p className="shrink-0 font-heading text-[15px] font-bold">{fmtMoney(l.lineTotal, detail.currency || currency)}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="py-6 text-sm text-destructive">Couldn&apos;t hydrate this receipt.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function fmtOrdersMeta(total: number | undefined): string {
  if (typeof total === "number" && total >= 0) {
    return total.toLocaleString();
  }
  return "0";
}

function fmtLedgerHint(linked: boolean, ledgerTotal: number, truncated: boolean | undefined): string {
  if (!linked) {
    return "Ledger unlocks once the roster ties your shopper email.";
  }
  let s = `${ledgerTotal.toLocaleString()} stitch${ledgerTotal === 1 ? "" : "es"}`;
  if (truncated) {
    s += " · tail trimmed for serenity";
  }
  return s;
}

function LedgerLineRow({ currency, row }: { currency: string; row: ShopperLedgerRow }) {
  const b = ledgerBadge(row.kind);
  const hasDr = toNum(row.debit) !== 0;
  const hasCr = toNum(row.credit) !== 0;
  return (
    <div className="flex gap-3 rounded-2xl border border-border/55 bg-background/70 p-4 shadow-sm backdrop-blur-sm">
      <div className="mt-1 size-10 shrink-0 rounded-xl bg-muted/65" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", b.className)}>
            {b.label}
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground">{formatWhen(row.occurredAt)}</span>
        </div>
        <p className="mt-2 break-all text-[13px] font-medium leading-snug text-foreground">{row.memo}</p>
        <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px] font-semibold">
          {hasDr ? <span className="text-destructive">− {fmtMoney(row.debit, currency)}</span> : null}
          {hasCr ? (
            <span className="text-[color:var(--auth-secondary)]">+ {fmtMoney(row.credit, currency)}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Chip({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "muted" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase",
        tone === "muted"
          ? "border-border/60 bg-muted/40 text-muted-foreground"
          : "border-[color-mix(in_srgb,var(--auth-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--auth-primary)_12%,transparent)] text-[color:var(--auth-primary)]",
      )}
    >
      {children}
    </span>
  );
}

function formatWhen(iso?: string): string {
  const s = iso?.trim();
  if (!s) {
    return "";
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    return s.slice(0, 16).replace("T", " ");
  }
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function fmtQty(q: unknown): string {
  const n = toNum(q);
  if (!Number.isFinite(n)) {
    return String(q ?? "");
  }
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
