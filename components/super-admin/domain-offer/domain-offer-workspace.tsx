"use client";

import {
  ArrowUpRight,
  Check,
  Clock3,
  Copy,
  Globe2,
  Loader2,
  Mail,
  Pause,
  Play,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Store,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import {
  showThemedConfirmToast,
  showThemedErrorToast,
  showThemedSuccessToast,
} from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  assignSaDomainOfferOrder,
  cancelSaDomainOfferOrder,
  connectSaDomainOfferDomain,
  createSaDomainOfferRegistration,
  deliverSaDomainOfferOrder,
  fetchSaDomainOfferCampaign,
  fetchSaDomainOfferOrders,
  markSaDomainOfferOrderPaid,
  pauseSaDomainOfferCampaign,
  refundSaDomainOfferOrder,
  resendSaDomainOfferLink,
  startSaDomainOfferCampaign,
  testSaDomainOfferEmail,
  type SaDomainOfferCampaign,
  type SaDomainOfferOrder,
  type SaDomainOfferStats,
  type SaDomainOfferTouch,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const HAIRLINE = "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const MUTED = "text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]";
const INK = "text-[var(--order-ink,#15231f)]";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "INVITED", label: "Invited" },
  { value: "AWAITING_PAYMENT", label: "Awaiting" },
  { value: "PAID", label: "Paid" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
] as const;

function formatKes(cents: number | null | undefined): string {
  const amount = Math.round((cents ?? 0) / 100);
  return `KES ${new Intl.NumberFormat("en-KE").format(amount)}`;
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Nairobi",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusBadge(status: SaDomainOfferOrder["status"]) {
  const map: Record<SaDomainOfferOrder["status"], string> = {
    INVITED: "border-[var(--order-ink,#15231f)]/20 bg-transparent text-foreground",
    AWAITING_PAYMENT: "border-amber-700/30 bg-amber-500/10 text-amber-900",
    PAID: "border-[var(--pos-primary,#1D4B3B)]/35 bg-[var(--pos-primary,#1D4B3B)]/10 text-[var(--pos-primary,#1D4B3B)]",
    IN_PROGRESS: "border-sky-700/30 bg-sky-500/10 text-sky-900",
    DELIVERED: "border-emerald-700/30 bg-emerald-500/10 text-emerald-900",
    CANCELLED: "border-border bg-muted text-muted-foreground",
    EXPIRED: "border-border bg-muted text-muted-foreground",
    REFUNDED: "border-rose-700/30 bg-rose-500/10 text-rose-900",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em]",
        map[status],
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function Metric({
  label,
  value,
  hint,
  critical = false,
}: {
  label: string;
  value: string;
  hint?: string;
  critical?: boolean;
}) {
  return (
    <div className={cn("border bg-white px-3 py-2.5", HAIRLINE)}>
      <p className={cn("font-mono text-[9px] uppercase tracking-[0.14em]", MUTED)}>{label}</p>
      <p
        className={cn(
          "mt-1 text-[1.15rem] font-semibold tabular-nums tracking-[-0.03em]",
          critical ? "text-[#9a2e16]" : INK,
        )}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
      {hint ? <p className={cn("mt-0.5 text-[10px]", MUTED)}>{hint}</p> : null}
    </div>
  );
}

export function DomainOfferWorkspace() {
  const [campaign, setCampaign] = useState<SaDomainOfferCampaign | null>(null);
  const [orders, setOrders] = useState<SaDomainOfferOrder[]>([]);
  const [stats, setStats] = useState<SaDomainOfferStats | null>(null);
  const [tab, setTab] = useState<"campaign" | "orders">("campaign");
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [selected, setSelected] = useState<SaDomainOfferOrder | null>(null);
  const [drawerBusy, setDrawerBusy] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState("");
  const [assignee, setAssignee] = useState("");
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverDomain, setDeliverDomain] = useState("");
  const [deliverNotes, setDeliverNotes] = useState("");
  const [deliverConnect, setDeliverConnect] = useState(true);
  const [cancelReason, setCancelReason] = useState("");

  const loadCampaign = useCallback(async () => {
    try {
      const next = await fetchSaDomainOfferCampaign();
      setCampaign(next);
      setStats(next.stats);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the campaign.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const next = await fetchSaDomainOfferOrders({
        status: statusFilter || undefined,
        q: query || undefined,
        limit: 200,
      });
      setOrders(next.rows);
      setStats(next.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the orders.");
    } finally {
      setOrdersLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  useEffect(() => {
    if (tab === "orders") {
      void loadOrders();
    }
  }, [loadOrders, tab]);

  useEffect(() => {
    if (!selected) return;
    setAssignee(selected.assignedTo ?? "");
    setDeliverDomain(selected.deliveredDomain || selected.requestedDomain || selected.suggestedDomain || "");
    setDeliverNotes(selected.fulfilmentNotes ?? "");
    setDeliverConnect(true);
    setDeliverOpen(false);
    setCancelReason("");
    setDrawerError("");
  }, [selected]);

  async function runDrawerAction(
    key: string,
    label: string,
    fn: () => Promise<SaDomainOfferOrder>,
  ) {
    setDrawerBusy(key);
    setDrawerError("");
    try {
      const next = await fn();
      setSelected(next);
      showThemedSuccessToast(`${label} · ${next.reference}`);
      setDeliverOpen(false);
      await Promise.all([loadCampaign(), loadOrders()]);
    } catch (e) {
      setDrawerError(e instanceof Error ? e.message : `${label} failed.`);
    } finally {
      setDrawerBusy(null);
    }
  }

  function startCampaign() {
    if (!campaign) return;
    const resuming = campaign.status === "PAUSED";
    showThemedConfirmToast({
      id: "domain-offer-start",
      title: resuming ? "Resume the offer?" : "Start the KES 1,000 domain + theme offer?",
      description: resuming
        ? "The scheduler resumes sending the next due touch for each shop."
        : `Every eligible shop gets a unique pay link: touch 1 now, touch 2 in ${campaign.intervalDays} days, touch 3 in ${campaign.intervalDays * 2} days. Sending stops when a shop pays.`,
      confirmLabel: resuming ? "Resume" : "Start sending",
      confirmVariant: "default",
      onConfirm: () => {
        void (async () => {
          setBusy("start");
          setError("");
          setSuccess("");
          try {
            const next = await startSaDomainOfferCampaign(campaign.name);
            setCampaign(next);
            setStats(next.stats);
            setSuccess(
              resuming
                ? "Offer resumed. The next due touch will send within a minute."
                : `Offer started for ${next.recipientsTargeted} shop${next.recipientsTargeted === 1 ? "" : "s"}. Touch 1 is queued.`,
            );
            await loadOrders();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not start the offer.");
          } finally {
            setBusy(null);
          }
        })();
      },
    });
  }

  async function pauseCampaign() {
    showThemedConfirmToast({
      id: "domain-offer-pause",
      title: "Pause the offer?",
      description: "No new touches will send. Shops can still pay from links they already have.",
      confirmLabel: "Pause",
      confirmVariant: "destructive",
      onConfirm: () => {
        void (async () => {
          setBusy("pause");
          setError("");
          setSuccess("");
          try {
            const next = await pauseSaDomainOfferCampaign();
            setCampaign(next);
            setStats(next.stats);
            setSuccess("Offer paused. Existing pay links still work.");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not pause the offer.");
          } finally {
            setBusy(null);
          }
        })();
      },
    });
  }

  async function sendTest() {
    if (!testEmail.trim()) return;
    setBusy("test");
    setError("");
    setSuccess("");
    try {
      const result = await testSaDomainOfferEmail(testEmail.trim());
      if (result.emailSent) {
        showThemedSuccessToast(`Test email sent to ${testEmail.trim()}`);
      } else {
        showThemedErrorToast(result.error || "The test email could not be sent.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the test email.");
    } finally {
      setBusy(null);
    }
  }

  async function copyLink(order: SaDomainOfferOrder) {
    if (!order.payLink) return;
    try {
      await navigator.clipboard.writeText(order.payLink);
      showThemedSuccessToast("Pay link copied");
    } catch {
      showThemedErrorToast("Could not copy the link");
    }
  }

  const runs = useMemo(() => {
    const s = stats ?? campaign?.stats;
    return {
      eligible: s?.eligible ?? 0,
      paidLike: (s?.paid ?? 0) + (s?.inProgress ?? 0) + (s?.delivered ?? 0),
      revenue: s?.revenueCents ?? 0,
      conversion: s?.conversionPct ?? 0,
      overdue: s?.overdue ?? 0,
      dueNow: s?.dueNow ?? 0,
    };
  }, [campaign?.stats, stats]);

  if (loading) {
    return (
      <div className={DASHBOARD_MAX_WIDE}>
        <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading the domain offer…
        </div>
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-2")}>
      <DashboardPageHero
        icon={Globe2}
        title="Domain offer"
        description="KES 1,000 · custom domain + theme · three touches over six days · 24-hour handover"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-none"
          onClick={() => {
            void loadCampaign();
            if (tab === "orders") void loadOrders();
          }}
        >
          <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
          Reload
        </Button>
      </DashboardPageHero>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {success ? <DashboardFeedback kind="success" text={success} /> : null}

      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Audience" value={String(runs.eligible)} hint="Eligible when launched" />
        <Metric
          label="Paid"
          value={String(runs.paidLike)}
          hint={`${runs.conversion}% · incl. in flight + delivered`}
        />
        <Metric label="Collected" value={formatKes(runs.revenue)} hint="KES 1,000 each" />
        <Metric label="Due now" value={String(runs.dueNow)} hint="Touches queued" />
        <Metric label="Overdue" value={String(runs.overdue)} hint="Past the 24-hour promise" critical={runs.overdue > 0} />
        <Metric
          label="Delivered"
          value={String(stats?.delivered ?? 0)}
          hint="Domain + theme handed over"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] pb-1">
        {[
          { id: "campaign" as const, label: "Campaign" },
          { id: "orders" as const, label: "Orders" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "border-b-2 px-3 py-2 text-[12px] font-semibold transition-colors",
              tab === item.id
                ? "border-[var(--pos-primary,#1D4B3B)] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "campaign" ? (
        <CampaignPanel
          campaign={campaign}
          stats={stats}
          busy={busy}
          testEmail={testEmail}
          setTestEmail={setTestEmail}
          onStart={startCampaign}
          onPause={pauseCampaign}
          onTest={sendTest}
        />
      ) : (
        <OrdersPanel
          orders={orders}
          loading={ordersLoading}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          query={query}
          setQuery={setQuery}
          onReload={loadOrders}
          onSelect={setSelected}
          onCopy={copyLink}
        />
      )}

      <FormDrawer
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected ? `${selected.reference} · ${selected.businessName ?? "Shop"}` : "Order"}
        description={
          selected
            ? `${selected.businessSlug ? `${selected.businessSlug}.kiosk.ke` : ""} → ${selected.deliveredDomain || selected.requestedDomain || selected.suggestedDomain || "domain not chosen"}`
            : undefined
        }
        contextLabel="Domain + theme"
        icon={<Globe2 className="size-4" aria-hidden />}
        width="wide"
        banner={
          drawerError ? (
            <div className="border border-destructive/40 bg-destructive/[0.04] px-3 py-2 text-[12px] text-destructive">
              {drawerError}
            </div>
          ) : null
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {selected?.payLink ? (
                <Button type="button" variant="outline" size="sm" className="rounded-none" onClick={() => void copyLink(selected)}>
                  <Copy className="mr-1.5 size-3.5" aria-hidden />
                  Copy pay link
                </Button>
              ) : null}
              {selected?.payLink ? (
                <Button asChild type="button" variant="outline" size="sm" className="rounded-none">
                  <a href={selected.payLink} target="_blank" rel="noreferrer">
                    <ArrowUpRight className="mr-1.5 size-3.5" aria-hidden />
                    Open page
                  </a>
                </Button>
              ) : null}
            </div>
            <Button type="button" variant="ghost" size="sm" className="rounded-none" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selected ? (
          <OrderDetail
            order={selected}
            busy={drawerBusy}
            assignee={assignee}
            setAssignee={setAssignee}
            deliverOpen={deliverOpen}
            setDeliverOpen={setDeliverOpen}
            deliverDomain={deliverDomain}
            setDeliverDomain={setDeliverDomain}
            deliverNotes={deliverNotes}
            setDeliverNotes={setDeliverNotes}
            deliverConnect={deliverConnect}
            setDeliverConnect={setDeliverConnect}
            cancelReason={cancelReason}
            setCancelReason={setCancelReason}
            onMarkPaid={() =>
              void runDrawerAction("mark-paid", "Marked paid", () => markSaDomainOfferOrderPaid(selected.id))
            }
            onAssign={() =>
              void runDrawerAction("assign", "Assigned", () => assignSaDomainOfferOrder(selected.id, assignee))
            }
            onConnect={() =>
              void runDrawerAction("connect", "Domain checked", () => connectSaDomainOfferDomain(selected.id))
            }
            onDeliver={() =>
              void runDrawerAction("deliver", "Delivered", () =>
                deliverSaDomainOfferOrder(selected.id, {
                  domain: deliverDomain,
                  notes: deliverNotes.trim() || undefined,
                  connectDomain: deliverConnect,
                }),
              )
            }
            onResend={() =>
              void runDrawerAction("resend", "Pay link resent", () => resendSaDomainOfferLink(selected.id))
            }
            onRegistration={() =>
              void runDrawerAction("registration", "Registration order created", () =>
                createSaDomainOfferRegistration(selected.id),
              )
            }
            onCancel={() =>
              void runDrawerAction("cancel", "Order cancelled", () =>
                cancelSaDomainOfferOrder(selected.id, cancelReason.trim() || undefined),
              )
            }
            onRefund={() =>
              void runDrawerAction("refund", "Marked refunded", () =>
                refundSaDomainOfferOrder(selected.id, "Refund recorded by Super Admin"),
              )
            }
          />
        ) : null}
      </FormDrawer>
    </div>
  );
}


function CampaignPanel({
  campaign,
  stats,
  busy,
  testEmail,
  setTestEmail,
  onStart,
  onPause,
  onTest,
}: {
  campaign: SaDomainOfferCampaign | null;
  stats: SaDomainOfferStats | null;
  busy: string | null;
  testEmail: string;
  setTestEmail: (value: string) => void;
  onStart: () => void;
  onPause: () => void;
  onTest: () => void;
}) {
  const running = campaign?.status === "RUNNING";
  const paused = campaign?.status === "PAUSED";
  const completed = campaign?.status === "COMPLETED";
  const canStart = (stats?.eligible ?? 0) > 0 || paused || completed;
  const touches = campaign?.touches ?? [];

  return (
    <div className="grid gap-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
      <div className="space-y-2">
        <section className={cn("border bg-white", HAIRLINE)}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b px-3 py-2.5 sm:px-4">
            <div>
              <h2 className="text-[13px] font-semibold tracking-[-0.015em] text-foreground">
                Three touches, six days
              </h2>
              <p className={cn("mt-0.5 text-[11px]", MUTED)}>
                Email and in-app. Each shop gets its own cadence; payment stops the sequence.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-mono text-[9px] font-semibold uppercase tracking-[0.12em]",
                  running ? "text-[var(--pos-primary,#1D4B3B)]" : MUTED,
                )}
              >
                {campaign?.status ?? "DRAFT"}
              </span>
              {running || paused || completed ? (
                <span className={cn("font-mono text-[10px]", MUTED)}>
                  {campaign?.recipientsTargeted ?? 0} targeted
                </span>
              ) : null}
            </div>
          </div>
          <div className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
            {(touches.length ? touches : []).map((touch) => (
              <TouchRow key={touch.index} touch={touch} />
            ))}
            {touches.length === 0 ? (
              <p className="px-4 py-8 text-[12px] text-muted-foreground">The sequence has not loaded yet.</p>
            ) : null}
          </div>
        </section>

        <section className={cn("border bg-white p-3 sm:p-4", HAIRLINE)}>
          <h2 className="text-[13px] font-semibold tracking-[-0.015em] text-foreground">Audience rules</h2>
          <div className="mt-2 grid gap-3 text-[11.5px] leading-relaxed sm:grid-cols-3">
            <p className={MUTED}>
              <span className="font-semibold text-foreground">Who.</span> Live shops with no custom domain.
              Shops already offered this in the last 60 days are skipped.
            </p>
            <p className={MUTED}>
              <span className="font-semibold text-foreground">Contact.</span> The oldest owner, else the oldest
              admin. The in-app note is business-wide, so shops without email still see it.
            </p>
            <p className={MUTED}>
              <span className="font-semibold text-foreground">Stop.</span> Payment, cancellation, or a completed
              third touch. Fine to pause; links already sent keep working.
            </p>
          </div>
        </section>
      </div>

      <aside className="space-y-2">
        <section className={cn("border bg-white p-3 sm:p-4", HAIRLINE)}>
          <div className="flex items-baseline justify-between gap-3">
            <span className={cn("font-mono text-[9px] uppercase tracking-[0.14em]", MUTED)}>Price</span>
            <span className="font-heading text-[1.7rem] leading-none text-foreground">
              {formatKes(campaign?.priceCents ?? 100_000)}
            </span>
          </div>
          <dl className="mt-3 divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] border-y text-[11.5px]">
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className={MUTED}>Interval</dt>
              <dd className="font-mono text-[11px]">{campaign?.intervalDays ?? 3} days</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className={MUTED}>Touches</dt>
              <dd className="font-mono text-[11px]">{campaign?.maxTouches ?? 3}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className={MUTED}>Channels</dt>
              <dd className="font-mono text-[10px] uppercase tracking-[0.08em]">
                {campaign?.emailEnabled === false ? "In-app" : "Email · in-app"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className={MUTED}>Handover</dt>
              <dd className="font-mono text-[11px]">24 hours</dd>
            </div>
          </dl>

          <div className="mt-3 space-y-2">
            {running ? (
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full rounded-none"
                disabled={busy === "pause"}
                onClick={onPause}
              >
                {busy === "pause" ? <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden /> : <Pause className="mr-1.5 size-3.5" aria-hidden />}
                Pause sends
              </Button>
            ) : (
              <Button
                type="button"
                className="h-9 w-full rounded-none bg-[var(--pos-primary,#1D4B3B)] text-white hover:bg-[#163B2E]"
                disabled={!canStart || busy === "start"}
                onClick={onStart}
              >
                {busy === "start" ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Play className="mr-1.5 size-3.5" aria-hidden />
                )}
                {paused ? "Resume" : completed ? "Start a new round" : "Start sending"}
              </Button>
            )}
            <p className={cn("text-[10.5px] leading-relaxed", MUTED)}>
              {running
                ? "The scheduler sends the next due touch within a minute. Paid shops are skipped."
                : paused
                  ? "Paused. No new touches send; existing links still take payment."
                  : completed
                    ? "This round is done. A new round re-enrols shops not offered this in the last 60 days."
                    : stats?.eligible
                      ? `${stats.eligible} shop${stats.eligible === 1 ? "" : "s"} eligible right now.`
                      : "No eligible shops. Every live shop has a custom domain or was offered this recently."}
            </p>
          </div>
        </section>

        <section className={cn("border bg-white p-3 sm:p-4", HAIRLINE)}>
          <h2 className="text-[13px] font-semibold tracking-[-0.015em] text-foreground">Test the email</h2>
          <p className={cn("mt-1 text-[11px] leading-relaxed", MUTED)}>
            Sends touch 1 with the Powermart example. Safe to run before launch.
          </p>
          <div className="mt-2 flex gap-2">
            <Input
              type="email"
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
              placeholder="you@kiosk.ke"
              className={dashboardInputClass()}
              aria-label="Test email address"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 rounded-none"
              disabled={!testEmail.trim() || busy === "test"}
              onClick={onTest}
            >
              {busy === "test" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Send className="size-3.5" aria-hidden />
              )}
            </Button>
          </div>
        </section>

        <section className={cn("border bg-white p-3 sm:p-4", HAIRLINE)}>
          <h2 className="flex items-center gap-1.5 text-[12px] font-semibold tracking-[-0.015em] text-foreground">
            <Sparkles className="size-3.5 text-[var(--pos-primary,#1D4B3B)]" aria-hidden />
            How the link works
          </h2>
          <p className={cn("mt-1 text-[11px] leading-relaxed", MUTED)}>
            Each shop gets a unique <span className="font-mono text-[10px]">/custom-domain?t=…</span> link. The
            token exposes only the shop&apos;s public identity, the address, and payment state. Forwarding it is
            safe; it cannot sign anyone in.
          </p>
        </section>
      </aside>
    </div>
  );
}

function sampleCopy(text: string): string {
  return text
    .replaceAll("{{name}}", "Amina")
    .replaceAll("{{businessName}}", "Powermart")
    .replaceAll("{{currentHost}}", "powermart.kiosk.ke")
    .replaceAll("{{suggestedDomain}}", "powermart.co.ke")
    .replaceAll("{{price}}", "KES 1,000")
    .replaceAll("{{payUrl}}", "pay link")
    .replaceAll("{{reference}}", "DTO-8K2M4Q")
    .replaceAll("{{slaDue}}", "tomorrow, 14:00")
    .replaceAll("{{themeDirection}}", "Warm market");
}

function TouchRow({ touch }: { touch: SaDomainOfferTouch }) {
  return (
    <details className="group px-3 py-3 sm:px-4">
      <summary className="flex cursor-pointer list-none items-start gap-3 outline-none [&::-webkit-details-marker]:hidden">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] font-mono text-[10px] font-semibold text-foreground">
          {touch.dayOffset === 0 ? "D0" : `D+${touch.dayOffset}`}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[12px] font-semibold text-foreground">{touch.label}</span>
            <span className={cn("font-mono text-[9px] uppercase tracking-[0.1em]", MUTED)}>
              {touch.cta}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
            {sampleCopy(touch.subject)}
          </span>
        </span>
        <span className={cn("mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em]", MUTED)}>Preview</span>
      </summary>
      <div className="mt-3 grid gap-3 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] pt-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div>
          <p className={cn("font-mono text-[9px] uppercase tracking-[0.12em]", MUTED)}>Email</p>
          <p className="mt-1 text-[11px] font-medium text-foreground">{sampleCopy(touch.subject)}</p>
          <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
            {sampleCopy(touch.bodyMarkdown)}
          </p>
        </div>
        <div className="space-y-2">
          <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[var(--order-ink,#15231f)]/[0.02] p-2.5">
            <p className={cn("font-mono text-[9px] uppercase tracking-[0.12em]", MUTED)}>In-app</p>
            <p className="mt-1 text-[11px] font-semibold text-foreground">{sampleCopy(touch.inAppTitle)}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {sampleCopy(touch.inAppBody)}
            </p>
          </div>
          <p className={cn("text-[10.5px] leading-relaxed", MUTED)}>{sampleCopy(touch.preview)}</p>
        </div>
      </div>
    </details>
  );
}

function OrdersPanel({
  orders,
  loading,
  statusFilter,
  setStatusFilter,
  query,
  setQuery,
  onReload,
  onSelect,
  onCopy,
}: {
  orders: SaDomainOfferOrder[];
  loading: boolean;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  query: string;
  setQuery: (value: string) => void;
  onReload: () => void;
  onSelect: (order: SaDomainOfferOrder) => void;
  onCopy: (order: SaDomainOfferOrder) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 border bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] transition-colors",
                statusFilter === filter.value
                  ? "border-[var(--pos-primary,#1D4B3B)] bg-[var(--pos-primary,#1D4B3B)] text-white"
                  : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground hover:text-foreground",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-56">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onReload();
              }}
              placeholder="Reference, domain, email"
              className={cn(dashboardInputClass(), "pl-7")}
              aria-label="Search orders"
            />
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-none" onClick={onReload}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-[12px]">
            <thead className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Shop</th>
                <th className="px-3 py-2 font-medium">Address</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Touches</th>
                <th className="px-3 py-2 font-medium">Money</th>
                <th className="px-3 py-2 font-medium">SLA</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-4 animate-spin" aria-hidden />
                  </td>
                </tr>
              ) : null}
              {!loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                    No orders match this filter. Start the campaign to enrol shops.
                  </td>
                </tr>
              ) : null}
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)] align-top transition-colors last:border-0 hover:bg-[var(--order-ink,#15231f)]/[0.02]"
                >
                  <td className="px-3 py-2.5">
                    <button type="button" className="text-left" onClick={() => onSelect(order)}>
                      <span className="block font-medium text-foreground">{order.businessName ?? "Shop"}</span>
                      <span className={cn("mt-0.5 block font-mono text-[10px]", MUTED)}>{order.reference}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block font-mono text-[11px] text-foreground">
                      {order.deliveredDomain || order.requestedDomain || order.suggestedDomain || "—"}
                    </span>
                    <span className={cn("mt-0.5 block font-mono text-[10px]", MUTED)}>
                      {order.domainMode === "NEEDS_REGISTRATION" ? "needs registration" : "merchant owns"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">{statusBadge(order.status)}</td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[11px]">{order.touchCount}/3</span>
                    <span className={cn("mt-0.5 block text-[10px]", MUTED)}>
                      {order.lastTouchAt ? formatWhen(order.lastTouchAt) : "not sent"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[11px]">{formatKes(order.amountCents)}</span>
                    <span className={cn("mt-0.5 block font-mono text-[10px]", MUTED)}>
                      {order.mpesaReceipt || order.lastStkStatus || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {order.overdue ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9a2e16]">
                        <TriangleAlert className="size-3" aria-hidden />
                        Overdue
                      </span>
                    ) : order.slaDueAt ? (
                      <span className="font-mono text-[10px]">{formatWhen(order.slaDueAt)}</span>
                    ) : (
                      <span className={cn("font-mono text-[10px]", MUTED)}>—</span>
                    )}
                    {order.assignedTo ? (
                      <span className={cn("mt-0.5 block text-[10px]", MUTED)}>{order.assignedTo}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {order.payLink && !order.paidAt ? (
                        <button
                          type="button"
                          onClick={() => onCopy(order)}
                          className="inline-flex size-7 items-center justify-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="Copy pay link"
                          title="Copy pay link"
                        >
                          <Copy className="size-3.5" aria-hidden />
                        </button>
                      ) : null}
                      <Button type="button" variant="outline" size="sm" className="h-7 rounded-none px-2" onClick={() => onSelect(order)}>
                        Open
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OrderDetail({
  order,
  busy,
  assignee,
  setAssignee,
  deliverOpen,
  setDeliverOpen,
  deliverDomain,
  setDeliverDomain,
  deliverNotes,
  setDeliverNotes,
  deliverConnect,
  setDeliverConnect,
  cancelReason,
  setCancelReason,
  onMarkPaid,
  onAssign,
  onConnect,
  onDeliver,
  onResend,
  onRegistration,
  onCancel,
  onRefund,
}: {
  order: SaDomainOfferOrder;
  busy: string | null;
  assignee: string;
  setAssignee: (value: string) => void;
  deliverOpen: boolean;
  setDeliverOpen: (value: boolean) => void;
  deliverDomain: string;
  setDeliverDomain: (value: string) => void;
  deliverNotes: string;
  setDeliverNotes: (value: string) => void;
  deliverConnect: boolean;
  setDeliverConnect: (value: boolean) => void;
  cancelReason: string;
  setCancelReason: (value: string) => void;
  onMarkPaid: () => void;
  onAssign: () => void;
  onConnect: () => void;
  onDeliver: () => void;
  onResend: () => void;
  onRegistration: () => void;
  onCancel: () => void;
  onRefund: () => void;
}) {
  const paid = ["PAID", "IN_PROGRESS", "DELIVERED"].includes(order.status);
  const terminal = ["DELIVERED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(order.status);
  const themeLabel = order.themeDirection?.replace(/_/g, " ").toLowerCase() ?? "designer's pick";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {statusBadge(order.status)}
        {order.overdue ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#9a2e16]/30 bg-[#9a2e16]/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#9a2e16]">
            <TriangleAlert className="size-3" aria-hidden />
            Overdue
          </span>
        ) : null}
        {order.registrationStatus ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
            registration · {order.registrationStatus.replace(/_/g, " ").toLowerCase()}
          </span>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <InfoBlock
          title="Payment"
          rows={[
            ["Amount", formatKes(order.amountCents)],
            ["M-Pesa", order.mpesaReceipt || order.lastStkStatus || "not paid"],
            ["Phone", order.payerPhone || order.contactPhone || "—"],
            ["Paid", formatWhen(order.paidAt)],
            ["Due", formatWhen(order.slaDueAt)],
          ]}
        />
        <InfoBlock
          title="Job"
          rows={[
            ["Address", order.deliveredDomain || order.requestedDomain || order.suggestedDomain || "—"],
            ["Domain", order.domainMode === "NEEDS_REGISTRATION" ? "registration included" : "merchant owns"],
            ["Theme", `${order.themeKey || "mart"} · ${themeLabel}`],
            ["Contact", order.contactName || order.contactEmail || "—"],
            ["Assigned", order.assignedTo || "unassigned"],
          ]}
        />
      </div>

      {order.themeNotes ? (
        <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            Designer notes from the merchant
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">{order.themeNotes}</p>
        </div>
      ) : null}

      <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white">
        <div className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3 py-2">
          <p className="text-[12px] font-semibold tracking-[-0.01em]">Sequence</p>
        </div>
        <div className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)] text-[11px]">
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-muted-foreground">Touches sent</span>
            <span className="font-mono">{order.touchCount}/3</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-muted-foreground">Email / in-app</span>
            <span className="font-mono">{order.emailSentCount} / {order.inAppSentCount}</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-muted-foreground">Next touch</span>
            <span className="font-mono">{formatWhen(order.nextTouchAt)}</span>
          </div>
          {order.lastEmailError ? (
            <div className="px-3 py-2 text-[11px] text-[#9a2e16]">Email: {order.lastEmailError}</div>
          ) : null}
          {order.lastError ? (
            <div className="px-3 py-2 text-[11px] text-[#9a2e16]">{order.lastError}</div>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white p-3">
        <p className="text-[12px] font-semibold tracking-[-0.01em]">Ops actions</p>

        {!paid && !terminal ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="h-8 rounded-none" disabled={!!busy} onClick={onMarkPaid}>
              {busy === "mark-paid" ? <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden /> : <Check className="mr-1.5 size-3.5" aria-hidden />}
              Mark paid
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-none" disabled={!!busy} onClick={onResend}>
              <Mail className="mr-1.5 size-3.5" aria-hidden />
              Resend link
            </Button>
          </div>
        ) : null}

        {paid && !terminal ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1">
                <Label className={dashboardLabelClass()}>Assign to</Label>
                <Input
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                  placeholder="Name or email"
                  className={dashboardInputClass()}
                />
              </div>
              <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 rounded-none" disabled={!!busy} onClick={onAssign}>
                <Clock3 className="mr-1.5 size-3.5" aria-hidden />
                Start / assign
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-none" disabled={!!busy} onClick={onConnect}>
                {busy === "connect" ? <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden /> : <Globe2 className="mr-1.5 size-3.5" aria-hidden />}
                Connect domain
              </Button>
              {order.domainMode === "NEEDS_REGISTRATION" && !order.domainOrderId ? (
                <Button type="button" variant="outline" size="sm" className="h-8 rounded-none" disabled={!!busy} onClick={onRegistration}>
                  {busy === "registration" ? <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden /> : <Store className="mr-1.5 size-3.5" aria-hidden />}
                  Start included registration
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-none bg-[var(--pos-primary,#1D4B3B)] text-white hover:bg-[#163B2E]"
                disabled={!!busy}
                onClick={() => setDeliverOpen(!deliverOpen)}
              >
                <Check className="mr-1.5 size-3.5" aria-hidden />
                Mark delivered
              </Button>
            </div>

            {deliverOpen ? (
              <div className="space-y-2 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[var(--order-ink,#15231f)]/[0.015] p-3">
                <div className="space-y-1">
                  <Label className={dashboardLabelClass()}>Live domain</Label>
                  <Input
                    value={deliverDomain}
                    onChange={(event) => setDeliverDomain(event.target.value)}
                    className={dashboardInputClass()}
                    placeholder="powermart.co.ke"
                  />
                </div>
                <div className="space-y-1">
                  <Label className={dashboardLabelClass()}>Handover notes</Label>
                  <Textarea
                    value={deliverNotes}
                    onChange={(event) => setDeliverNotes(event.target.value)}
                    rows={2}
                    className={dashboardTextareaClass()}
                    placeholder="What changed, what the merchant should check."
                  />
                </div>
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={deliverConnect}
                    onChange={(event) => setDeliverConnect(event.target.checked)}
                    className="size-3.5 accent-[var(--pos-primary,#1D4B3B)]"
                  />
                  Also add/verify the domain mapping now
                </label>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-none bg-[var(--pos-primary,#1D4B3B)] text-white hover:bg-[#163B2E]"
                  disabled={!!busy || !deliverDomain.trim()}
                  onClick={onDeliver}
                >
                  {busy === "deliver" ? <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden /> : <Check className="mr-1.5 size-3.5" aria-hidden />}
                  Confirm handover
                </Button>
              </div>
            ) : null}
          </>
        ) : null}

        {!terminal ? (
          <div className="flex flex-col gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] pt-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1">
              <Label className={dashboardLabelClass()}>Cancel reason</Label>
              <Input
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Why is this closing?"
                className={dashboardInputClass()}
              />
            </div>
            <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 rounded-none" disabled={!!busy} onClick={onCancel}>
              <X className="mr-1.5 size-3.5" aria-hidden />
              Cancel order
            </Button>
          </div>
        ) : null}

        {paid ? (
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-none" disabled={!!busy} onClick={onRefund}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            Mark refunded
          </Button>
        ) : null}
      </div>

      {order.fulfilmentNotes ? (
        <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Handover notes</p>
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">{order.fulfilmentNotes}</p>
        </div>
      ) : null}
    </div>
  );
}

function InfoBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white">
      <div className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3 py-2">
        <p className="text-[12px] font-semibold tracking-[-0.01em]">{title}</p>
      </div>
      <dl className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)] text-[11px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3 px-3 py-1.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="max-w-[62%] break-all text-right font-mono text-[10.5px] text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
