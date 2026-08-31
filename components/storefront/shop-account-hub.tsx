"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  ChevronDown,
  LogOut,
  Package,
  Store,
} from "lucide-react";

import { ShopAccountPhone } from "@/components/storefront/shop-account-phone";
import styles from "@/components/storefront/shop-account.module.css";
import { ShopNotificationPreferences } from "@/components/storefront/shop-notification-preferences";
import { ShopNotificationsPanel } from "@/components/storefront/shop-notifications-panel";
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
  type ShopperTillPurchase,
} from "@/lib/api";
import { isBuyerAccount, isShopperPhoneEmail } from "@/lib/buyer-role";
import { APP_ROUTES } from "@/lib/config";
import { formatLoyaltyMemberId, loyaltyCardTierLabel } from "@/lib/loyalty-card";
import { cn } from "@/lib/utils";

/** Tenant storefront catalog lives at `/` on mapped hosts such as palmart.co.ke. */
export const SHOP_FLOOR_HREF = "/";

type HubProps = {
  me: MeResponse;
};

type HistoryFilter = "all" | "online" | "till";

type HistoryItem =
  | { kind: "online"; at: number; id: string; order: ShopperPickupOrderRow }
  | { kind: "till"; at: number; id: string; sale: ShopperTillPurchase };

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

function firstName(full: string): string {
  const part = full.trim().split(/\s+/)[0];
  return part || full;
}

function humanizeStatus(status?: string): string {
  const raw = (status ?? "Placed").replace(/[_-]+/g, " ").trim();
  if (!raw) return "Placed";
  return raw.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function ledgerBadge(kind: string | undefined): { label: string; className: string } {
  const k = (kind ?? "").toLowerCase();
  if (k.startsWith("wallet")) {
    return { label: "Store credit", className: styles.chip };
  }
  if (k.startsWith("credit")) {
    return { label: "Tab", className: styles.chip };
  }
  if (k.startsWith("loyalty")) {
    return { label: "Points", className: styles.chip };
  }
  return { label: kind ?? "Till", className: styles.chip };
}

function statusClass(status: string | undefined): string {
  const s = (status ?? "").toUpperCase();
  if (s.includes("CANCEL") || s.includes("FAIL")) {
    return styles.statusWarn;
  }
  if (s.includes("READY") || s.includes("COMPLETE") || s.includes("PAID")) {
    return styles.status;
  }
  return styles.statusMute;
}

export function ShopAccountHub({ me }: HubProps) {
  const shopper = isBuyerAccount(me);
  const [biz, setBiz] = useState<BusinessRecord | null>(null);
  const [data, setData] = useState<ShopperAccountOverview | null>(null);
  const [page, setPage] = useState(0);
  const [hubError, setHubError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [openTill, setOpenTill] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ShopperPickupOrderDetail | null>(null);

  const currency = biz?.currency?.trim() || "USD";
  const hello = greeting();
  const tier = loyaltyCardTierLabel(data?.balances?.loyaltyPoints);

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
            tillPurchases: prev.tillPurchases ?? overview.tillPurchases,
          };
        });
        setPage(nextPage);
      } catch (e) {
        setHubError(e instanceof Error ? e.message : "Couldn't load your account.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadPage(0, false);
  }, [loadPage]);

  const kesPerPt = useMemo(() => {
    const n = toNum(data?.loyaltyKesPerPoint);
    return Number.isFinite(n) && n > 0 ? n : 0.01;
  }, [data?.loyaltyKesPerPoint]);

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

  const history = useMemo((): HistoryItem[] => {
    const rows: HistoryItem[] = [];
    for (const order of data?.pickupOrders ?? []) {
      rows.push({
        kind: "online",
        id: order.id,
        at: Date.parse(order.createdAt ?? "") || 0,
        order,
      });
    }
    for (const sale of data?.tillPurchases ?? []) {
      rows.push({
        kind: "till",
        id: sale.saleId,
        at: Date.parse(sale.soldAt ?? "") || 0,
        sale,
      });
    }
    rows.sort((a, b) => b.at - a.at);
    if (filter === "online") return rows.filter((r) => r.kind === "online");
    if (filter === "till") return rows.filter((r) => r.kind === "till");
    return rows;
  }, [data, filter]);

  const displayName = data?.customerDirectoryName?.trim() || me.name;
  const linkedPhone = data?.tabPhone?.trim() || "";
  const tabOwed = toNum(data?.balances?.balanceOwed);
  const memberId = formatLoyaltyMemberId(linkedPhone || me.id);
  const identityLine = isShopperPhoneEmail(me.email) ? null : me.email;

  return (
    <div className={styles.page}>
      {hubError ? (
        <div className={styles.alert} role="alert">
          {hubError}
        </div>
      ) : null}

      <article className={styles.passbook}>
        <div className={styles.passHead}>
          <h1 className={styles.hello}>
            {hello}, {firstName(displayName)}
          </h1>
          {identityLine ? <p className={styles.email}>{identityLine}</p> : null}
          <p className={styles.memberIdOnGreen}>
            {tier} · {memberId}
          </p>
        </div>
        <div className={styles.passTop}>
          <ShopAccountPhone
            linkedPhone={linkedPhone || null}
            accountPhone={me.phone}
            onLinked={(overview) => {
              setData(overview);
              setPage(0);
            }}
          />
        </div>

        {loading || !data ? (
          <div className={styles.skel} aria-hidden />
        ) : (
          <dl className={styles.strip}>
            <div className={styles.cell}>
              <dt>Store credit</dt>
              <dd>
                {fmtMoney(data.balances?.walletBalance, currency)}
                <span className={styles.cellHint}>Ready to spend here</span>
              </dd>
            </div>
            <div className={styles.cell}>
              <dt>Points</dt>
              <dd>
                {(data.balances?.loyaltyPoints ?? 0).toLocaleString()}
                <span className={styles.cellHint}>
                  About {fmtMoney(toNum(data.balances?.loyaltyPoints) * kesPerPt, currency)}
                </span>
              </dd>
            </div>
            <div className={cn(styles.cell, tabOwed > 0 && styles.warn)}>
              <dt>Tab</dt>
              <dd>
                {fmtMoney(data.balances?.balanceOwed, currency)}
                <span className={styles.cellHint}>
                  {tabOwed > 0
                    ? "Owed at the till"
                    : data.linkedStorefrontProfile
                      ? "Nothing owed"
                      : "Add your number"}
                </span>
              </dd>
            </div>
          </dl>
        )}

        <div className={styles.actions}>
          <Link href={SHOP_FLOOR_HREF} className={styles.cta}>
            <ArrowLeft className="size-4" aria-hidden />
            Back to the shop
          </Link>
          <Link href={APP_ROUTES.shopCart} className={styles.ghost}>
            Cart
          </Link>
          {!shopper ? (
            <Link href={APP_ROUTES.business} className={styles.ghost}>
              Workspace
            </Link>
          ) : null}
          <button
            type="button"
            className={styles.quiet}
            onClick={() => void logoutRemote().then(() => window.location.reload())}
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      </article>

      {loading || !data ? null : (
        <>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <h2>Your orders</h2>
                <p>Online and in-store, newest first.</p>
              </div>
              <div className={styles.tabs} role="tablist" aria-label="Purchase source">
                {(
                  [
                    ["all", "All"],
                    ["online", "Online"],
                    ["till", "In store"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={filter === id}
                    className={styles.tab}
                    onClick={() => setFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {history.length === 0 ? (
              <div className={styles.empty}>
                <h3>No orders yet</h3>
                <p>
                  {filter === "till" && !data.linkedStorefrontProfile
                    ? "Add your Kenyan mobile so till receipts from this shop can find you."
                    : "Checkout online or pay at the till. The slip lands here."}
                </p>
                <Link href={SHOP_FLOOR_HREF} className={styles.ctaAccent}>
                  Shop now
                </Link>
              </div>
            ) : (
              <ul className={styles.tape}>
                {history.map((row) =>
                  row.kind === "online" ? (
                    <li key={`online-${row.id}`}>
                      <button
                        type="button"
                        onClick={() => void onOpenDetail(row.order.id)}
                        className={styles.row}
                      >
                        <span className={styles.mark}>
                          <Package className="size-4" aria-hidden />
                        </span>
                        <span className={styles.body}>
                          <span className={styles.title}>
                            #{row.order.id.slice(-8).toUpperCase()}
                            <span className={styles.chip}>Online</span>
                            <span className={statusClass(row.order.status)}>
                              {humanizeStatus(row.order.status)}
                            </span>
                          </span>
                          <span className={styles.when}>
                            {formatWhen(row.order.createdAt)}
                            {row.order.catalogBranchName ? ` · ${row.order.catalogBranchName}` : ""}
                          </span>
                        </span>
                        <span className={styles.amt}>
                          <strong>{fmtMoney(row.order.grandTotal, row.order.currency || currency)}</strong>
                          <span>
                            Receipt
                            <ChevronDown className="size-3 -rotate-90" aria-hidden />
                          </span>
                        </span>
                      </button>
                    </li>
                  ) : (
                    <li key={`till-${row.id}`} className={styles.till}>
                      <TillPurchaseRow
                        sale={row.sale}
                        currency={currency}
                        open={openTill === row.sale.saleId}
                        onToggle={() =>
                          setOpenTill((id) => (id === row.sale.saleId ? null : row.sale.saleId))
                        }
                      />
                    </li>
                  ),
                )}
              </ul>
            )}

            {hasMoreOrders && filter !== "till" ? (
              <button
                type="button"
                className={cn(styles.ghost, styles.more)}
                disabled={loadingMore}
                onClick={() => void loadPage(page + 1, true)}
              >
                {loadingMore ? "Loading…" : "Load older online orders"}
              </button>
            ) : null}
          </section>

          {data.linkedStorefrontProfile ? (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>Store credit and tab</h2>
                  <p>
                    {(data.ledgerLinesTotal ?? 0).toLocaleString()} movement
                    {(data.ledgerLinesTotal ?? 0) === 1 ? "" : "s"}
                    {data.ledgerTruncated ? ", latest shown" : ""}
                  </p>
                </div>
              </div>
              {(data.recentLedgerLines ?? []).length ? (
                <ul className={styles.ledger}>
                  {data.recentLedgerLines.map((line, i) => (
                    <li key={`${line.occurredAt}-${i}-${line.kind ?? ""}`}>
                      <LedgerLineRow currency={currency} row={line} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.empty}>
                  <p>No store-credit or tab lines yet. The next till sale leaves the first one.</p>
                </div>
              )}
            </section>
          ) : null}
        </>
      )}

      {shopper ? (
        <details className={styles.notes}>
          <summary className={styles.notesSummary}>Order updates</summary>
          <ShopNotificationsPanel />
          <div className={styles.notesPrefs}>
            <ShopNotificationPreferences />
          </div>
        </details>
      ) : null}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[min(540px,calc(100vh-6rem))] overflow-y-auto" side="center">
          <DialogHeader className="pr-8">
            <DialogTitle>{detailLoading ? "Opening receipt…" : "Online order"}</DialogTitle>
            <DialogDescription>
              {detail
                ? `#${detail.id.slice(-8).toUpperCase()} · ${detail.catalogBranchName ?? "Branch"}`
                : "Pickup order from this shop."}
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
                <span className={styles.chip}>{humanizeStatus(detail.status)}</span>
                <span className={styles.chip}>{formatWhen(detail.createdAt)}</span>
              </div>
              <div>
                <p className={styles.hello} style={{ fontSize: 36 }}>
                  {fmtMoney(detail.grandTotal, detail.currency || currency)}
                </p>
                <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className={styles.cellHint} style={{ marginTop: 0 }}>
                      Pickup
                    </dt>
                    <dd>{detail.catalogBranchName}</dd>
                  </div>
                  <div>
                    <dt className={styles.cellHint} style={{ marginTop: 0 }}>
                      Name
                    </dt>
                    <dd>{detail.customerName}</dd>
                  </div>
                  {detail.customerPhone ? (
                    <div>
                      <dt className={styles.cellHint} style={{ marginTop: 0 }}>
                        Phone
                      </dt>
                      <dd>{detail.customerPhone}</dd>
                    </div>
                  ) : null}
                  {detail.notes ? (
                    <div className="sm:col-span-2">
                      <dt className={styles.cellHint} style={{ marginTop: 0 }}>
                        Notes
                      </dt>
                      <dd>{detail.notes}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
              {(detail.lines ?? []).length ? (
                <ul className={styles.lines} style={{ paddingLeft: 0 }}>
                  {(detail.lines ?? []).map((l, idx) => (
                    <li key={`${l.itemId}-${idx}-${l.lineIndex ?? idx}`} className={styles.line}>
                      <span>
                        {l.itemName}
                        {l.variantName ? <span className={styles.lineSmall}>{l.variantName}</span> : null}
                        <span className={styles.lineSmall}>
                          qty {fmtQty(l.quantity)} · ea {fmtMoney(l.unitPrice, detail.currency || currency)}
                        </span>
                      </span>
                      <span>{fmtMoney(l.lineTotal, detail.currency || currency)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className={styles.err}>Couldn&apos;t load this receipt.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TillPurchaseRow({
  sale,
  currency,
  open,
  onToggle,
}: {
  sale: ShopperTillPurchase;
  currency: string;
  open: boolean;
  onToggle: () => void;
}) {
  const lines = sale.lines ?? [];
  const receipt =
    sale.receiptNo != null ? `Receipt ${sale.receiptNo}` : `#${sale.saleId.slice(-8).toUpperCase()}`;
  const onTab = toNum(sale.creditAmount) > 0;
  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={open} className={styles.row}>
        <span className={styles.mark}>
          <Store className="size-4" aria-hidden />
        </span>
        <span className={styles.body}>
          <span className={styles.title}>
            {receipt}
            <span className={styles.chip}>In store</span>
            {onTab ? <span className={styles.statusWarn}>On tab</span> : null}
          </span>
          <span className={styles.when}>
            {formatWhen(sale.soldAt)}
            {lines[0]?.itemName
              ? ` · ${lines[0].itemName}${lines.length > 1 ? ` +${lines.length - 1}` : ""}`
              : ""}
          </span>
        </span>
        <span className={styles.amt}>
          <strong>{fmtMoney(sale.grandTotal, currency)}</strong>
          <span>
            {open ? "Hide items" : "Items"}
            <ChevronDown className={cn("size-3 transition", open && "rotate-180")} aria-hidden />
          </span>
        </span>
      </button>
      {open && lines.length ? (
        <ul className={styles.lines}>
          {lines.map((line, idx) => (
            <li key={`${sale.saleId}-${idx}`} className={styles.line}>
              <span>
                {line.itemName}
                <span className={styles.lineSmall}>
                  {fmtQty(line.quantity)} × {fmtMoney(line.unitPrice, currency)}
                </span>
              </span>
              <span>{fmtMoney(line.lineTotal, currency)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LedgerLineRow({ currency, row }: { currency: string; row: ShopperLedgerRow }) {
  const b = ledgerBadge(row.kind);
  const hasDr = toNum(row.debit) !== 0;
  const hasCr = toNum(row.credit) !== 0;
  return (
    <div className={styles.ledgerItem}>
      <div>
        <div className={styles.stampMeta} style={{ marginTop: 0 }}>
          <span className={b.className}>{b.label}</span>
          <span>{formatWhen(row.occurredAt)}</span>
        </div>
        <p style={{ margin: "8px 0 0", fontWeight: 600 }}>{humanizeLedger(row.kind, row.memo)}</p>
        <div className={styles.stampMeta}>
          {hasDr ? <span style={{ color: "var(--sa-accent, #e8412c)" }}>− {fmtMoney(row.debit, currency)}</span> : null}
          {hasCr ? <span>+ {fmtMoney(row.credit, currency)}</span> : null}
        </div>
      </div>
    </div>
  );
}

function humanizeLedger(kind?: string, memo?: string): string {
  const raw = `${memo || ""} ${kind || ""}`.toUpperCase();
  if (/DEBIT_SALE|SALE/.test(raw) && /WALLET|DEBIT/.test(raw)) return "Paid at the till";
  if (/CREDIT_MPESA|MPESA_STK/.test(raw)) return "M-Pesa into wallet";
  if (/COUNTER_TOPUP|TOPUP/.test(raw)) return "Cash at the till";
  if (/OVERPAY|CHANGE/.test(raw)) return "Change to wallet";
  if (/REFUND/.test(raw)) return "Refund";
  if (/CREDIT_/.test(raw) && /DEBT|SALE/.test(raw)) return "Put on the tab";
  if (/LOYALTY/.test(raw) && /:/.test(memo ?? "")) {
    const pts = (memo ?? "").split(":")[1];
    return pts ? `${pts} loyalty points` : "Loyalty";
  }
  const cleaned = (memo || kind || "Till movement")
    .replace(/^(wallet|credit|loyalty)_/i, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatWhen(iso?: string): string {
  const s = iso?.trim();
  if (!s) return "";
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
