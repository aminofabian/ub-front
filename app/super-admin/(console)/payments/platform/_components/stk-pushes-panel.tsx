"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  KeyRound,
  Radio,
  Search,
  Smartphone,
  X,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Badge } from "@/components/ui/badge";
import { APP_ROUTES } from "@/lib/config";
import type { GatewayStkPushOpsRecord } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import { money, shortId } from "./platform-payments-panels";
import styles from "./stk-pushes-panel.module.css";

type StatusFilter = "all" | "pending" | "success" | "failed";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "success", label: "Success" },
  { id: "failed", label: "Failed" },
];

type FlowPhase = 0 | 1 | 2 | 3;

const FLOW_STEPS: {
  label: string;
  copy: string;
  caption: string;
  body: string;
  meta: string;
  Icon: typeof Radio;
}[] = [
  {
    label: "Push",
    copy: "Kiosk asks Safaricom to prompt the phone.",
    caption: "1 · Push sent",
    body: "STK leaves the till and hits Daraja / KopoKopo.",
    meta: "CheckoutRequestID is minted. The row lands as pending.",
    Icon: Radio,
  },
  {
    label: "Phone",
    copy: "Customer sees Pay KES … on their handset.",
    caption: "2 · Prompt on phone",
    body: "Safaricom opens the M-Pesa PIN screen.",
    meta: "No money has moved yet — the phone is waiting.",
    Icon: Smartphone,
  },
  {
    label: "PIN",
    copy: "They unlock and enter their M-Pesa PIN.",
    caption: "3 · Waiting on PIN",
    body: "We poll until Safaricom confirms or times out.",
    meta: "Live pending rows keep this phase warm.",
    Icon: KeyRound,
  },
  {
    label: "Settled",
    copy: "Receipt lands. Sale / tab / top-up unlocks.",
    caption: "4 · Confirmed",
    body: "GatewayTransactionID becomes the M-Pesa receipt.",
    meta: "Success rows stamp green. Failures keep the reason.",
    Icon: Check,
  },
];

/**
 * Super-admin ledger of STK pushes — with a live “how it works” stage.
 */
export function StkPushesPanel({
  pushes,
  loading,
}: {
  pushes: GatewayStkPushOpsRecord[] | null;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [phase, setPhase] = useState<FlowPhase>(0);
  const [listKey, setListKey] = useState(0);

  const filtered = useMemo(() => {
    if (!pushes) return [];
    const q = query.trim().toLowerCase();
    return pushes.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (!q) return true;
      const hay = [
        p.businessName,
        p.businessSlug,
        p.businessId,
        p.phoneNumber,
        p.gatewayTransactionId,
        p.gatewayCheckoutId,
        p.merchantReference,
        p.contextType,
        p.gatewayType,
        p.failureReason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [pushes, query, status]);

  const counts = useMemo(() => {
    const base = { all: 0, pending: 0, success: 0, failed: 0 };
    if (!pushes) return base;
    base.all = pushes.length;
    for (const p of pushes) {
      if (p.status === "pending") base.pending++;
      else if (p.status === "success") base.success++;
      else if (p.status === "failed") base.failed++;
    }
    return base;
  }, [pushes]);

  const demoAmount = useMemo(() => {
    const hit = pushes?.find((p) => p.status === "pending" || p.status === "success");
    if (!hit) return 250;
    const n = typeof hit.amount === "number" ? hit.amount : Number(hit.amount);
    return Number.isFinite(n) && n > 0 ? n : 250;
  }, [pushes]);

  const demoReceipt = useMemo(() => {
    const hit = pushes?.find((p) => p.gatewayTransactionId);
    return hit?.gatewayTransactionId ?? "QKZ7X2M91A";
  }, [pushes]);

  // Cycle the explainer; dwell longer on PIN when real pending exists.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setPhase(counts.pending > 0 ? 2 : 3);
      return;
    }

    const dwell = (p: FlowPhase) => {
      if (p === 2 && counts.pending > 0) return 3200;
      if (p === 3) return 2400;
      return 1800;
    };

    let current: FlowPhase = 0;
    setPhase(0);
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      timer = setTimeout(() => {
        current = ((current + 1) % 4) as FlowPhase;
        setPhase(current);
        tick();
      }, dwell(current));
    };
    tick();

    return () => clearTimeout(timer);
  }, [counts.pending]);

  const onFilter = (id: StatusFilter) => {
    setStatus(id);
    setListKey((k) => k + 1);
  };

  if (pushes === null || loading) {
    return (
      <div className={styles.panel}>
        <p className={styles.loading}>
          <span className={styles.loadingPulse} aria-hidden />
          Listening for STK pushes…
        </p>
      </div>
    );
  }

  const active = FLOW_STEPS[phase];

  return (
    <div className={styles.panel}>
      <section className={styles.stage} aria-label="How STK push works">
        <div className={styles.stageEyebrow}>
          <p className={styles.stageEyebrowLabel}>How STK push works</p>
          <span className={styles.livePill}>
            <span className={styles.liveDot} aria-hidden />
            {counts.pending > 0 ? `${counts.pending} live` : "Rail idle"}
          </span>
        </div>
        <h3 className={styles.stageTitle}>Phone → PIN → receipt</h3>
        <p className={styles.stageHint}>
          Every row below is one prompt on a customer&apos;s handset. Watch the
          stages cycle — real pending pushes hold on PIN.
        </p>

        <ol className={styles.pipeline}>
          {FLOW_STEPS.map((step, i) => {
            const Icon = step.Icon;
            const done = i < phase;
            const isActive = i === phase;
            return (
              <li
                key={step.label}
                className={cn(
                  styles.step,
                  isActive && styles.stepActive,
                  done && styles.stepDone,
                )}
              >
                <span className={styles.stepIcon} aria-hidden>
                  <Icon className="size-3.5" />
                </span>
                <span className={styles.stepLabel}>{step.label}</span>
                <span className={styles.stepCopy}>{step.copy}</span>
              </li>
            );
          })}
        </ol>

        <div className={styles.phoneRail}>
          <div className={styles.phone} aria-hidden>
            <div className={styles.phoneEar} />
            <div className={styles.phoneScreen}>
              <p className={styles.phoneBrand}>M-Pesa</p>
              {(phase === 1 || phase === 2 || phase === 3) && (
                <p key={`amt-${phase}`} className={styles.phoneAmount}>
                  {money(demoAmount)}
                </p>
              )}
              {phase === 0 && (
                <p className={styles.phonePrompt}>Sending request…</p>
              )}
              {phase === 1 && (
                <p className={styles.phonePrompt}>
                  Pay {money(demoAmount)} to shop till
                </p>
              )}
              {phase === 2 && (
                <>
                  <p className={styles.phonePrompt}>Enter M-Pesa PIN</p>
                  <div className={styles.phoneDots}>
                    <span />
                    <span />
                    <span />
                  </div>
                </>
              )}
              {phase === 3 && (
                <p key={demoReceipt} className={styles.phoneReceipt}>
                  Confirmed · {demoReceipt}
                </p>
              )}
            </div>
            {(phase === 0 || phase === 1) && (
              <div className={styles.signalRings}>
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          <div key={phase} className={styles.captionCard}>
            <p className={styles.captionPhase}>{active.caption}</p>
            <p className={styles.captionBody}>{active.body}</p>
            <p className={styles.captionMeta}>{active.meta}</p>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCell}>
            <p className={styles.statLabel}>Success</p>
            <p
              key={`s-${counts.success}`}
              className={cn(styles.statValue, styles.statValueSuccess)}
            >
              {counts.success}
            </p>
          </div>
          <div className={styles.statCell}>
            <p className={styles.statLabel}>Pending</p>
            <p
              key={`p-${counts.pending}`}
              className={cn(styles.statValue, styles.statValuePending)}
            >
              {counts.pending}
            </p>
          </div>
          <div className={styles.statCell}>
            <p className={styles.statLabel}>Failed</p>
            <p
              key={`f-${counts.failed}`}
              className={cn(styles.statValue, styles.statValueFailed)}
            >
              {counts.failed}
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            className={cn(dashboardInputClass(), "h-9 pl-8 text-[13px]")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shop, phone, receipt…"
            aria-label="Search STK pushes"
          />
        </label>
        <p className={cn(dashboardHintClass(), "shrink-0 tabular-nums")}>
          {filtered.length} shown
        </p>
      </div>

      <div className={styles.filters} role="tablist" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => {
          const activeFilter = status === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={activeFilter}
              onClick={() => onFilter(f.id)}
              className={cn(
                styles.filterBtn,
                activeFilter && styles.filterActive,
              )}
            >
              {f.label}
              <span className={styles.filterCount}>{counts[f.id]}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>
          {pushes.length === 0
            ? "No STK pushes yet. Prompts from POS, storefront, Kiosk Pay, and onboarding tests appear here."
            : "No pushes match this filter."}
        </p>
      ) : (
        <ul key={listKey} className={styles.list}>
          {filtered.map((p) => (
            <StkPushRow key={p.id} push={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StkPushRow({ push: p }: { push: GatewayStkPushOpsRecord }) {
  const amount = typeof p.amount === "number" ? p.amount : Number(p.amount);
  const Icon =
    p.status === "success" ? Check : p.status === "failed" ? X : Smartphone;

  return (
    <li
      className={cn(
        styles.row,
        p.status === "pending" && styles.rowPending,
        p.status === "success" && styles.rowSuccess,
      )}
    >
      <div className={styles.rowInner}>
        <span
          className={cn(
            styles.icon,
            p.status === "success" && styles.iconSuccess,
            p.status === "failed" && styles.iconFailed,
            p.status === "pending" && styles.iconPending,
          )}
          aria-hidden
        >
          <Icon className="size-3.5" />
        </span>
        <div className={styles.body}>
          <div className={styles.head}>
            <p className={styles.shop}>
              {p.businessName?.trim() || shortId(p.businessId)}
            </p>
            <Badge
              variant={
                p.status === "success"
                  ? "success"
                  : p.status === "failed"
                    ? "destructive"
                    : "secondary"
              }
              className="rounded-none uppercase"
            >
              {p.status}
            </Badge>
          </div>
          <p className={styles.amount}>
            {money(Number.isFinite(amount) ? amount : 0)}
          </p>
          <p className={styles.meta}>
            {formatPhone(p.phoneNumber)}
            {p.contextType ? ` · ${formatContext(p.contextType)}` : ""}
            {p.gatewayType ? ` · ${p.gatewayType}` : ""}
          </p>
          {p.gatewayTransactionId ? (
            <p className={styles.receipt}>Receipt {p.gatewayTransactionId}</p>
          ) : (
            <p className={styles.checkout} title={p.gatewayCheckoutId}>
              Checkout {p.gatewayCheckoutId}
            </p>
          )}
          {p.failureReason ? (
            <p className={styles.fail} title={p.failureReason}>
              {p.failureReason}
            </p>
          ) : null}
          <div className={styles.footer}>
            <p className={styles.when}>{formatWhen(p.createdAt)}</p>
            <Link
              href={`${APP_ROUTES.superAdminBusinesses}/${p.businessId}`}
              className={styles.openLink}
            >
              Open tenant
              <ExternalLink className="size-3" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

function formatPhone(phone: string) {
  return phone || "—";
}

function formatContext(ctx: string) {
  return ctx
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
