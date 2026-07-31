"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleDashed,
  CreditCard,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  createDomainOrder,
  fetchMyDomainOrders,
  payDomainOrder,
  searchDomainQuotes,
  syncDomainOrder,
  type DomainOrder,
  type DomainQuote,
} from "@/lib/api";

function formatPrice(cents: number | null | undefined, currency: string | null | undefined): string {
  if (cents == null) return "—";
  const amount = cents / 100;
  const cur = (currency || "KES").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${cur} ${amount.toLocaleString()}`;
  }
}

type StepKey = "pay" | "register" | "dns" | "ns" | "ssl";

function resolveStep(order: DomainOrder): { current: StepKey; failed: boolean; live: boolean } {
  const s = order.status.toLowerCase();
  if (s === "failed") return { current: "register", failed: true, live: false };
  if (s === "live") return { current: "ssl", failed: false, live: true };
  if (s === "awaiting_payment" || s === "quoted") return { current: "pay", failed: false, live: false };
  if (s === "registering") return { current: "register", failed: false, live: false };
  if (s === "owned") return { current: "dns", failed: false, live: false };
  if (s === "provisioning") {
    if (!order.vercelZoneReady) return { current: "dns", failed: false, live: false };
    if ((order.nsStatus || "").toLowerCase() !== "active") return { current: "ns", failed: false, live: false };
    return { current: "ssl", failed: false, live: false };
  }
  return { current: "register", failed: false, live: false };
}

const STEPS: { key: StepKey; label: string }[] = [
  { key: "pay", label: "Pay" },
  { key: "register", label: "Register" },
  { key: "dns", label: "DNS" },
  { key: "ns", label: "NS" },
  { key: "ssl", label: "SSL" },
];

function stepIndex(key: StepKey): number {
  return STEPS.findIndex((s) => s.key === key);
}

function ProvisioningStepper({ order }: { order: DomainOrder }) {
  const { current, failed, live } = resolveStep(order);
  const currentIdx = stepIndex(current);

  return (
    <ol className="flex items-center gap-0" aria-label="Provisioning progress">
      {STEPS.map((step, idx) => {
        const done = live || (!failed && idx < currentIdx);
        const active = !live && !failed && idx === currentIdx;
        const isFail = failed && idx === currentIdx;
        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 flex-col items-center gap-1">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                  done && "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                  active && "border-primary/40 bg-primary/10 text-primary",
                  isFail && "border-destructive/40 bg-destructive/10 text-destructive",
                  !done && !active && !isFail && "border-border/70 bg-muted/40 text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3" aria-hidden /> : null}
                {active ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
                {!done && !active ? idx + 1 : null}
              </span>
              <span className="truncate text-[10px] font-medium text-muted-foreground">{step.label}</span>
            </div>
            {idx < STEPS.length - 1 ? (
              <div
                className={cn(
                  "mx-0.5 mb-4 h-px min-w-[0.4rem] flex-1",
                  idx < currentIdx && !failed ? "bg-emerald-500/40" : "bg-border/70",
                )}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function orderBadge(order: DomainOrder): { text: string; variant: "success" | "warning" | "destructive" | "secondary" | "default" } {
  if (order.paymentSkippedByStub) return { text: "Test mode", variant: "warning" };
  const s = order.status.toLowerCase();
  if (s === "live") return { text: "Live", variant: "success" };
  if (s === "failed") return { text: "Failed", variant: "destructive" };
  if (s === "awaiting_payment" || s === "quoted") return { text: "Awaiting payment", variant: "warning" };
  if (s === "registering") return { text: "Registering", variant: "warning" };
  if (s === "owned" || s === "provisioning") return { text: "Provisioning", variant: "default" };
  return { text: order.status, variant: "secondary" };
}

function merchantSafeMessage(order: DomainOrder): string {
  if (order.merchantMessage?.trim()) return order.merchantMessage.trim();
  const { current, failed, live } = resolveStep(order);
  if (live) return "Your shop is live on this domain.";
  if (failed) return "Something went wrong. Contact support if it persists.";
  if (current === "pay") {
    return order.paymentAvailable
      ? "Pay with M-Pesa to continue."
      : "Platform M-Pesa isn’t configured yet.";
  }
  if (current === "register") return "Registering your domain…";
  if (current === "dns") return "Creating DNS…";
  if (current === "ns") return "Finishing nameservers…";
  return "Verifying SSL…";
}

function canBuyQuote(q: DomainQuote): boolean {
  return !!q.available && q.priceCents != null && q.priceCents > 0;
}

function normalizeFqdn(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function pickPrimaryQuote(quotes: DomainQuote[], rawQuery: string): DomainQuote | null {
  if (!quotes.length) return null;
  const q = normalizeFqdn(rawQuery);
  const exact = quotes.find((x) => x.domain === q);
  if (exact) return exact;
  if (!q.includes(".")) {
    const coKe = quotes.find((x) => x.domain === `${q}.co.ke`);
    if (coKe) return coKe;
  }
  return quotes[0] ?? null;
}

function PayDomainModal({
  order,
  open,
  onOpenChange,
  onPaid,
}: {
  order: DomainOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: (order: DomainOrder) => void;
}) {
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (open && order) {
      setPhone(order.payerPhone || "");
    }
  }, [open, order]);

  if (!order) return null;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next = phone.trim();
    if (!next) {
      toast.error("Enter the M-Pesa phone number to charge.");
      return;
    }
    setPaying(true);
    try {
      const result = await payDomainOrder(order.id, next);
      onPaid(result.order);
      if (result.accepted) {
        toast.success(result.message || "Check your phone to complete M-Pesa payment.");
        onOpenChange(false);
      } else {
        toast.error(result.message || "Payment request declined.");
      }
    } catch (e) {
      toast.error(e instanceof Error && e.message.trim() ? e.message : "Could not start M-Pesa payment.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="center" className="max-w-md gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
              <CreditCard className="size-4 text-foreground" aria-hidden />
            </span>
            Pay for domain
          </DialogTitle>
          <DialogDescription>
            Send an M-Pesa STK prompt for{" "}
            <span className="font-mono font-medium text-foreground">{order.fqdn}</span>
            {order.priceCents != null ? (
              <>
                {" "}
                · <span className="font-medium text-foreground">{formatPrice(order.priceCents, order.currency)}</span>
              </>
            ) : null}
            . Payment goes to Palmart’s platform till.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-1.5">
            <label htmlFor="domain-pay-phone" className="text-sm font-medium">
              M-Pesa phone number
            </label>
            <div className="relative">
              <Phone
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                id="domain-pay-phone"
                className={dashboardInputClass(false, "h-11 pl-10")}
                placeholder="07xx or 2547…"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <p className={dashboardHintClass()}>The phone that should receive the STK prompt.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={paying} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={paying || !phone.trim()} className="gap-1.5">
              {paying ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <CreditCard className="size-3.5" aria-hidden />}
              {order.lastStkStatus?.toLowerCase() === "pending" ? "Resend STK" : "Send STK prompt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BuyKenyanDomainWizard({
  onLive,
  embedded = false,
}: {
  onLive: () => void;
  /** Hide outer section chrome when used inside a tab panel. */
  embedded?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<DomainQuote[]>([]);
  const [currency, setCurrency] = useState("KES");
  const [orders, setOrders] = useState<DomainOrder[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [payOrder, setPayOrder] = useState<DomainOrder | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const reloadOrders = useCallback(async () => {
    try {
      const list = await fetchMyDomainOrders();
      setOrders(list);
      setUnavailable(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (
        msg.toLowerCase().includes("hostafrica") ||
        msg.toLowerCase().includes("503") ||
        msg.toLowerCase().includes("not configured")
      ) {
        setUnavailable(true);
      }
    }
  }, []);

  useEffect(() => {
    void reloadOrders();
  }, [reloadOrders]);

  useEffect(() => {
    const open = orders.some((o) => {
      const s = o.status.toLowerCase();
      return (
        s === "registering" ||
        s === "owned" ||
        s === "provisioning" ||
        (s === "awaiting_payment" && o.lastStkStatus?.toLowerCase() === "pending")
      );
    });
    if (!open) return;
    const id = window.setInterval(() => {
      void (async () => {
        for (const o of orders) {
          const s = o.status.toLowerCase();
          if (
            s === "registering" ||
            s === "owned" ||
            s === "provisioning" ||
            ((s === "awaiting_payment" || s === "quoted") && o.lastStkStatus?.toLowerCase() === "pending")
          ) {
            try {
              await syncDomainOrder(o.id);
            } catch {
              /* keep polling */
            }
          }
        }
        await reloadOrders();
        onLive();
      })();
    }, 15000);
    return () => window.clearInterval(id);
  }, [orders, reloadOrders, onLive]);

  const runSearch = async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setQuery(q);
    setSearching(true);
    setHasSearched(true);
    try {
      const result = await searchDomainQuotes(q);
      setQuotes(result.results || []);
      setCurrency(result.currency || "KES");
      setSearchedQuery(q);
      setUnavailable(false);
      if ((result.results || []).length === 0) {
        toast.error("No Kenyan TLD matches. Try another name.");
      }
    } catch (e) {
      const msg = e instanceof Error && e.message.trim() ? e.message : "Search failed.";
      if (msg.toLowerCase().includes("not configured") || msg.toLowerCase().includes("unavailable")) {
        setUnavailable(true);
      }
      toast.error(msg);
      setQuotes([]);
    } finally {
      setSearching(false);
    }
  };

  const primaryQuote = useMemo(
    () => pickPrimaryQuote(quotes, searchedQuery || query),
    [quotes, searchedQuery, query],
  );
  const buyableQuotes = useMemo(() => quotes.filter(canBuyQuote), [quotes]);
  const primaryTaken = !!primaryQuote && !canBuyQuote(primaryQuote);
  const alternativeQuotes = useMemo(() => {
    if (!primaryQuote) return buyableQuotes;
    return buyableQuotes.filter((q) => q.domain !== primaryQuote.domain);
  }, [buyableQuotes, primaryQuote]);

  const onBuy = async (domain: string) => {
    setBuying(domain);
    try {
      const order = await createDomainOrder(domain);
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      const st = order.status.toLowerCase();
      if (st === "awaiting_payment" || st === "quoted") {
        if (order.paymentAvailable) {
          toast.success(`Order placed for ${domain}. Complete payment to continue.`);
          setPayOrder(order);
          setPayOpen(true);
        } else {
          toast.error("Platform M-Pesa isn’t configured yet — ask Super Admin under Platform → Domains.");
        }
      } else if (order.paymentSkippedByStub) {
        toast.error(
          `Test mode: ${domain} skipped M-Pesa (billing stub is on). Turn the stub off for real STK.`,
        );
      } else {
        toast.success(`Order started for ${domain}.`);
        try {
          const synced = await syncDomainOrder(order.id);
          setOrders((prev) => prev.map((o) => (o.id === synced.id ? synced : o)));
          if (synced.status.toLowerCase() === "live") {
            toast.success(`${synced.fqdn} is live.`);
            onLive();
          }
        } catch {
          /* pending */
        }
      }
      await reloadOrders();
    } catch (e) {
      toast.error(e instanceof Error && e.message.trim() ? e.message : "Could not start purchase.");
    } finally {
      setBuying(null);
    }
  };

  const onSync = async (order: DomainOrder) => {
    setSyncing(order.id);
    try {
      const synced = await syncDomainOrder(order.id);
      setOrders((prev) => prev.map((o) => (o.id === synced.id ? synced : o)));
      if (synced.status.toLowerCase() === "live") {
        toast.success(`${synced.fqdn} is live.`);
        onLive();
      } else {
        toast.message(merchantSafeMessage(synced));
      }
    } catch (e) {
      toast.error(e instanceof Error && e.message.trim() ? e.message : "Could not refresh status.");
      await reloadOrders();
    } finally {
      setSyncing(null);
    }
  };

  if (unavailable) {
    return (
      <div className={cn(!embedded && DASHBOARD_SECTION_SURFACE, "rounded-2xl border border-dashed border-border/70 bg-muted/15 p-5")}>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-muted-foreground">
            <WifiOff className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Kenyan domain purchase isn’t ready</h2>
            <p className={cn(dashboardHintClass(), "mt-1.5")}>
              Ask a platform admin to finish setup under Platform → Domains. You can still connect a domain you already
              own.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const showResults = hasSearched && !searching;
  const openOrders = orders.filter((o) => {
    const s = o.status.toLowerCase();
    return s !== "live" && s !== "failed";
  });

  return (
    <div className="space-y-6">
      <div className={cn(!embedded && DASHBOARD_SECTION_SURFACE, embedded && "space-y-0")}>
        {!embedded ? (
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 max-w-xl">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Buy a Kenyan domain
              </p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight">Find your .ke name</h2>
              <p className={cn(dashboardHintClass(), "mt-2")}>
                Search, pay with M-Pesa, and we register it and bring your shop live.
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground sm:inline-flex">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              .co.ke · .or.ke · .me.ke · .ke
            </div>
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch(query);
          }}
        >
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                id="domain-search"
                className={dashboardInputClass(false, "h-12 pl-10 text-[15px]")}
                placeholder="Try mama-njeri or mama-njeri.co.ke"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={searching || !query.trim()} className="h-12 shrink-0 gap-2 px-6">
              {searching ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>
        </form>

        {searching ? (
          <div className="mt-6 space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-border/50 bg-muted/30" />
            ))}
          </div>
        ) : null}

        {showResults && quotes.length > 0 ? (
          <div className="mt-6 space-y-4">
            {primaryTaken && primaryQuote ? (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-background/80 text-amber-800 dark:text-amber-200">
                  <CircleDashed className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold tracking-tight text-amber-950 dark:text-amber-50">
                    Oops — you were a little late
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-amber-950/80 dark:text-amber-100/80">
                    <span className="font-mono font-medium">{primaryQuote.domain}</span> is already taken and in use.
                    {alternativeQuotes.length > 0
                      ? " These alternatives are still free."
                      : " Try a different name."}
                  </p>
                </div>
              </div>
            ) : null}

            {primaryQuote && canBuyQuote(primaryQuote) ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800/80 dark:text-emerald-300/90">
                    Available
                  </p>
                  <p className="mt-0.5 font-mono text-base font-semibold">{primaryQuote.domain}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground/85">
                      {formatPrice(primaryQuote.priceCents, primaryQuote.currency || currency)}
                    </span>
                    {" · first year"}
                  </p>
                </div>
                <Button
                  disabled={buying === primaryQuote.domain}
                  className="shrink-0 gap-1.5"
                  onClick={() => void onBuy(primaryQuote.domain)}
                >
                  {buying === primaryQuote.domain ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                  Get this domain
                </Button>
              </div>
            ) : null}

            {alternativeQuotes.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-border/70 shadow-sm">
                <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
                  <Sparkles className="size-3.5 text-primary" aria-hidden />
                  <p className="text-sm font-semibold">
                    {primaryTaken ? "Great alternatives" : "Other Kenyan options"}
                  </p>
                </div>
                <ul className="divide-y divide-border/60">
                  {alternativeQuotes.map((q) => (
                    <li
                      key={q.domain}
                      className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-muted/25 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-mono text-sm font-semibold">{q.domain}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatPrice(q.priceCents, q.currency || currency)} · first year
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={buying === q.domain}
                        className="gap-1.5"
                        onClick={() => void onBuy(q.domain)}
                      >
                        {buying === q.domain ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                        Get this one
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {showResults && quotes.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
            <p className="text-sm font-medium">No Kenyan matches</p>
            <p className={cn(dashboardHintClass(), "mx-auto mt-1.5 max-w-sm")}>
              Try a shorter shop name, or include the TLD (e.g. mybrand.co.ke).
            </p>
          </div>
        ) : null}
      </div>

      {orders.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-2 px-0.5">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Purchases</h3>
              <p className={dashboardHintClass()}>
                {openOrders.length > 0
                  ? `${openOrders.length} in progress — we’ll keep working in the background.`
                  : "Recent domain orders"}
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <ul className="divide-y divide-border/50">
              {orders.map((order) => {
                const badge = orderBadge(order);
                const s = order.status.toLowerCase();
                const needsPay =
                  (s === "awaiting_payment" || s === "quoted") && !!order.paymentAvailable;
                const showRefresh = s !== "live" && s !== "failed";
                return (
                  <li key={order.id} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-sm font-semibold">{order.fqdn}</p>
                          <Badge variant={badge.variant}>{badge.text}</Badge>
                          {order.priceCents != null ? (
                            <span className="text-xs text-muted-foreground">
                              {formatPrice(order.priceCents, order.currency)}
                            </span>
                          ) : null}
                        </div>
                        <ProvisioningStepper order={order} />
                        <p className="text-sm text-muted-foreground">{merchantSafeMessage(order)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        {needsPay ? (
                          <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={() => {
                              setPayOrder(order);
                              setPayOpen(true);
                            }}
                          >
                            <CreditCard className="size-3.5" aria-hidden />
                            Pay
                          </Button>
                        ) : null}
                        {showRefresh ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={syncing === order.id}
                            onClick={() => void onSync(order)}
                          >
                            {syncing === order.id ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            ) : (
                              <RefreshCw className="size-3.5" aria-hidden />
                            )}
                            Refresh
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      <PayDomainModal
        order={payOrder}
        open={payOpen}
        onOpenChange={setPayOpen}
        onPaid={(updated) => {
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          void reloadOrders();
        }}
      />
    </div>
  );
}

/** Lightweight count for parent stats cards. */
export function useDomainOrderStats() {
  const [orders, setOrders] = useState<DomainOrder[]>([]);
  useEffect(() => {
    void fetchMyDomainOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, []);
  const open = orders.filter((o) => {
    const s = o.status.toLowerCase();
    return s !== "live" && s !== "failed";
  }).length;
  const awaitingPay = orders.filter((o) => {
    const s = o.status.toLowerCase();
    return s === "awaiting_payment" || s === "quoted";
  }).length;
  return { orders, open, awaitingPay, reload: () => fetchMyDomainOrders().then(setOrders) };
}
