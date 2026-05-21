"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  ChevronRight,
  Megaphone,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DashboardFeedback,
  DashboardPageHero,
  dashboardFilterFieldLabelClass,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields, FormDrawerMessageBanner } from "@/components/form-drawer";
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
import { Label } from "@/components/ui/label";
import {
  createNotificationCampaign,
  cancelNotificationCampaign,
  fetchBranches,
  fetchNotificationCampaigns,
  runNotificationCampaign,
  type BranchRecord,
  type NotificationCampaign,
  type NotificationCampaignRecipientScope,
} from "@/lib/api";
import { getNotificationPresentation } from "@/lib/notification-display";
import {
  EXAMPLE_FLASH_SALE,
  EXAMPLE_WEEKLY_DEALS,
  type PromoCampaignFormSample,
} from "@/lib/promo-campaign-samples";
import {
  aggregatePromoStats,
  campaignStatusMeta,
  campaignTypeLabel,
  campaignWhenLabel,
  deliveryRate,
  matchesStatusTab,
  sortCampaigns,
  type PromoSortKey,
  type PromoStatusTab,
} from "@/lib/promotions-campaign-utils";
import { cn } from "@/lib/utils";

const STATUS_TABS: { id: PromoStatusTab; label: string; hint?: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active", hint: "Currently sending" },
  { id: "scheduled", label: "Scheduled" },
  { id: "drafts", label: "Drafts" },
  { id: "past", label: "Past", hint: "Completed or cancelled" },
];

type FormState = {
  name: string;
  campaignType: "FLASH_SALE" | "WEEKLY_DEALS";
  title: string;
  body: string;
  actionUrl: string;
  recipientScope: NotificationCampaignRecipientScope;
  catalogBranchId: string;
  scheduledAtLocal: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  campaignType: "FLASH_SALE",
  title: "",
  body: "",
  actionUrl: "/shop",
  recipientScope: "ALL_BUYERS",
  catalogBranchId: "",
  scheduledAtLocal: "",
};

function applySampleToForm(sample: PromoCampaignFormSample): FormState {
  return {
    name: sample.name,
    campaignType: sample.campaignType,
    title: sample.title,
    body: sample.body,
    actionUrl: sample.actionUrl,
    recipientScope: sample.recipientScope,
    catalogBranchId: "",
    scheduledAtLocal: "",
  };
}

function campaignToForm(row: NotificationCampaign): FormState {
  let scheduledAtLocal = "";
  if (row.scheduledAt) {
    const d = new Date(row.scheduledAt);
    if (!Number.isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      scheduledAtLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }
  return {
    name: row.name,
    campaignType: row.campaignType === "WEEKLY_DEALS" ? "WEEKLY_DEALS" : "FLASH_SALE",
    title: row.title,
    body: row.body,
    actionUrl: row.actionUrl?.trim() || "/shop",
    recipientScope: (row.recipientScope as NotificationCampaignRecipientScope) || "ALL_BUYERS",
    catalogBranchId: row.catalogBranchId ?? "",
    scheduledAtLocal,
  };
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Megaphone;
  accent?: "primary" | "amber" | "emerald" | "muted";
}) {
  const accentClass =
    accent === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : accent === "emerald"
        ? "text-emerald-600 dark:text-emerald-400"
        : accent === "primary"
          ? "text-primary"
          : "text-muted-foreground";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm",
        "transition-all duration-200 hover:border-border hover:shadow-md",
        "ring-1 ring-black/[0.02] dark:ring-white/[0.04]",
      )}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-primary/[0.04] blur-2xl transition-opacity group-hover:opacity-100 dark:bg-primary/[0.08]"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40",
            accentClass,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-[104px] animate-pulse rounded-xl border border-border/50 bg-muted/30"
        />
      ))}
    </div>
  );
}

function CampaignCardSkeleton() {
  return (
    <div className="h-[220px] animate-pulse rounded-xl border border-border/50 bg-muted/25" />
  );
}

function PromoCampaignCard({
  row,
  scopeLabel,
  onOpen,
  busy,
}: {
  row: NotificationCampaign;
  scopeLabel: string;
  onOpen: () => void;
  busy: boolean;
}) {
  const meta = campaignStatusMeta(row.status);
  const rate = deliveryRate(row);
  const isFlash = row.campaignType === "FLASH_SALE";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm",
        "ring-1 ring-black/[0.02] transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-border hover:shadow-md",
        "dark:ring-white/[0.04]",
        busy && "pointer-events-none opacity-70",
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          isFlash
            ? "bg-gradient-to-b from-amber-400 via-orange-500 to-amber-600/80"
            : "bg-gradient-to-b from-sky-400 via-indigo-500 to-violet-500/80",
        )}
        aria-hidden
      />
      <div className="flex flex-1 flex-col p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={meta.badge}>{meta.label}</Badge>
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {campaignTypeLabel(row.campaignType)}
              </span>
            </div>
            <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground">
              {row.title}
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.name}</p>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent",
              "text-muted-foreground transition-colors",
              "hover:border-border hover:bg-muted/60 hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            )}
            aria-label={`View ${row.name}`}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </button>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {row.body}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border/40 pt-4">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Reach
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
              {row.recipientsTargeted.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Delivered
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
              {row.recipientsSent.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Delivery rate
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
              {rate != null ? `${rate}%` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Timing
            </dt>
            <dd className="mt-0.5 text-xs font-medium leading-snug text-foreground">
              {campaignWhenLabel(row)}
            </dd>
          </div>
        </dl>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{scopeLabel}</span>
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/40 bg-muted/20 px-4 py-3 pl-5 sm:px-5 sm:pl-6">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 text-xs font-semibold text-foreground transition-colors hover:text-primary"
        >
          View details
          <ChevronRight className="size-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </article>
  );
}

function ShopperPreview({
  notificationType,
  title,
  body,
  actionUrl,
}: {
  notificationType: string;
  title: string;
  body: string;
  actionUrl: string;
}) {
  const preview = getNotificationPresentation({
    notificationType,
    type: notificationType,
    title: title.trim(),
    body: body.trim(),
    payload: { title: title.trim(), body: body.trim(), actionUrl },
  });

  if (!title.trim() && !body.trim()) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <Bell className="size-8 text-muted-foreground/50" aria-hidden />
        <p className="mt-3 text-sm text-muted-foreground">
          Add a headline and message to preview how shoppers will see this alert.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[260px]">
      <div className="rounded-[1.75rem] border-[3px] border-foreground/12 bg-muted/30 p-2 shadow-lg">
        <div className="rounded-[1.35rem] bg-background px-3 pb-4 pt-6">
          <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Shop account
          </p>
          <div
            className={cn(
              "mt-4 rounded-xl px-3 py-3",
              "bg-[color-mix(in_srgb,var(--auth-primary)_10%,transparent)]",
            )}
          >
            <div className="flex items-start gap-2">
              <Bell
                className="mt-0.5 size-4 shrink-0 text-[color:var(--auth-primary)]"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-snug text-foreground">
                  {preview.title}
                </p>
                {preview.body ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {preview.body}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-[10px] text-muted-foreground">Preview only</p>
        </div>
      </div>
    </div>
  );
}

export function PromotionsDashboard() {
  const [rows, setRows] = useState<NotificationCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const [statusTab, setStatusTab] = useState<PromoStatusTab>("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "FLASH_SALE" | "WEEKLY_DEALS">("");
  const [sortKey, setSortKey] = useState<PromoSortKey>("newest");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [usingExample, setUsingExample] = useState(false);
  const [branches, setBranches] = useState<BranchRecord[]>([]);

  const [detailRow, setDetailRow] = useState<NotificationCampaign | null>(null);

  const scopeNeedsBranch = form.recipientScope === "BRANCH_ACTIVE_BUYERS_90D";
  const notificationType =
    form.campaignType === "WEEKLY_DEALS" ? "promo.weekly_deals" : "promo.flash_sale";

  const branchName = useCallback(
    (id: string | null | undefined) => branches.find((b) => b.id === id)?.name ?? id ?? "—",
    [branches],
  );

  const scopeLabel = useCallback(
    (scope: string, branchId?: string | null) => {
      switch (scope) {
        case "ACTIVE_BUYERS_90D":
          return "Ordered in last 90 days";
        case "INACTIVE_BUYERS_30D":
          return "No order in 30+ days";
        case "BRANCH_ACTIVE_BUYERS_90D":
          return `Branch: ${branchName(branchId)} (90d)`;
        default:
          return "All registered shoppers";
      }
    },
    [branchName],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchNotificationCampaigns());
    } catch (e) {
      setFeedback({
        kind: "error",
        text: e instanceof Error ? e.message : "Failed to load promotions.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [load]);

  const stats = useMemo(() => aggregatePromoStats(rows), [rows]);

  const tabCounts = useMemo(() => {
    const counts: Record<PromoStatusTab, number> = {
      all: rows.length,
      active: 0,
      scheduled: 0,
      drafts: 0,
      past: 0,
    };
    for (const row of rows) {
      if (row.status === "RUNNING") counts.active += 1;
      if (row.status === "SCHEDULED") counts.scheduled += 1;
      if (row.status === "DRAFT") counts.drafts += 1;
      if (row.status === "COMPLETED" || row.status === "CANCELLED") counts.past += 1;
    }
    return counts;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter((r) => matchesStatusTab(r, statusTab));
    if (typeFilter) {
      list = list.filter((r) => r.campaignType === typeFilter);
    }
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.body.toLowerCase().includes(q),
      );
    }
    return sortCampaigns(list, sortKey);
  }, [rows, statusTab, search, typeFilter, sortKey]);

  const openCreate = (prefill?: FormState) => {
    setForm(prefill ?? EMPTY_FORM);
    setUsingExample(false);
    setFeedback(null);
    setCreateOpen(true);
  };

  const loadExample = (sample: PromoCampaignFormSample) => {
    setForm(applySampleToForm(sample));
    setUsingExample(true);
    setFeedback(null);
  };

  const buildPayload = (
    schedule: boolean,
  ):
    | { error: string }
    | {
        payload: {
          name: string;
          campaignType: "FLASH_SALE" | "WEEKLY_DEALS";
          title: string;
          body: string;
          actionUrl: string;
          recipientScope: NotificationCampaignRecipientScope;
          catalogBranchId?: string;
          scheduledAt?: string;
        };
      } => {
    if (!form.name.trim() || !form.title.trim() || !form.body.trim()) {
      return { error: "Give your promotion a name, headline, and short message." };
    }
    if (scopeNeedsBranch && !form.catalogBranchId) {
      return { error: "Choose a branch for branch-targeted promotions." };
    }
    let scheduledAt: string | undefined;
    if (schedule) {
      if (!form.scheduledAtLocal) {
        return { error: "Pick a date and time for the scheduled send." };
      }
      const when = new Date(form.scheduledAtLocal);
      if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
        return { error: "Scheduled time must be in the future." };
      }
      scheduledAt = when.toISOString();
    }
    return {
      payload: {
        name: form.name.trim(),
        campaignType: form.campaignType,
        title: form.title.trim(),
        body: form.body.trim(),
        actionUrl: form.actionUrl.trim() || "/shop",
        recipientScope: form.recipientScope,
        ...(scopeNeedsBranch ? { catalogBranchId: form.catalogBranchId } : {}),
        ...(scheduledAt ? { scheduledAt } : {}),
      },
    };
  };

  const onCreate = async (schedule: boolean) => {
    const built = buildPayload(schedule);
    if ("error" in built) {
      setFeedback({ kind: "error", text: built.error });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      await createNotificationCampaign(built.payload);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setUsingExample(false);
      await load();
      setFeedback({
        kind: "success",
        text: schedule
          ? "Promotion scheduled — it will send automatically at the chosen time."
          : "Draft saved — open it from your list when you are ready to send.",
      });
    } catch (e) {
      setFeedback({
        kind: "error",
        text: e instanceof Error ? e.message : "Could not save promotion.",
      });
    } finally {
      setBusy(false);
    }
  };

  const runCampaign = async (id: string) => {
    setBusy(true);
    try {
      await runNotificationCampaign(id);
      await load();
      setDetailRow(null);
      setFeedback({ kind: "success", text: "Promotion is sending to your shoppers now." });
    } catch (e) {
      setFeedback({
        kind: "error",
        text: e instanceof Error ? e.message : "Send failed.",
      });
    } finally {
      setBusy(false);
    }
  };

  const cancelCampaign = async (id: string) => {
    setBusy(true);
    try {
      await cancelNotificationCampaign(id);
      await load();
      setDetailRow(null);
      setFeedback({ kind: "success", text: "Scheduled promotion cancelled." });
    } catch (e) {
      setFeedback({
        kind: "error",
        text: e instanceof Error ? e.message : "Cancel failed.",
      });
    } finally {
      setBusy(false);
    }
  };

  const emptyCopy: Record<PromoStatusTab, { title: string; body: string }> = {
    all: {
      title: "No promotions yet",
      body: "Create your first flash sale or weekly deals alert to reach registered shoppers in their shop account.",
    },
    active: {
      title: "Nothing sending right now",
      body: "When you send a promotion, it appears here while delivery is in progress.",
    },
    scheduled: {
      title: "No scheduled promotions",
      body: "Pick a future date when creating a promotion to queue an automatic send.",
    },
    drafts: {
      title: "No drafts",
      body: "Save a promotion as a draft when you are not ready to send — come back and launch when you are.",
    },
    past: {
      title: "No past promotions",
      body: "Completed and cancelled campaigns will show here for your records.",
    },
  };

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <div className="space-y-8 pb-16">
        <div className="flex flex-col gap-6 border-b border-border/50 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <DashboardPageHero
            compact
            icon={Megaphone}
            eyebrow="Business"
            title="Promotions"
            description="Reach registered shoppers with flash sales and weekly deals. Quiet hours and daily limits still apply."
          />
          <div className="flex flex-wrap gap-2 lg:shrink-0">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="gap-2 shadow-sm"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden />
              Refresh
            </Button>
            <Button
              type="button"
              size="lg"
              className="gap-2 shadow-md"
              onClick={() => openCreate()}
            >
              <Plus className="size-4" aria-hidden />
              New promotion
            </Button>
          </div>
        </div>

        {feedback ? <DashboardFeedback kind={feedback.kind} text={feedback.text} /> : null}

        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total campaigns"
              value={String(rows.length)}
              hint={`${stats.drafts} draft · ${stats.scheduled} scheduled`}
              icon={Megaphone}
            />
            <StatCard
              label="Shoppers reached"
              value={stats.totalReach.toLocaleString()}
              hint={
                stats.totalTargeted > 0
                  ? `${Math.round((stats.totalReach / stats.totalTargeted) * 100)}% delivery across sends`
                  : "Delivered notifications"
              }
              icon={Target}
              accent="primary"
            />
            <StatCard
              label="Scheduled"
              value={String(stats.scheduled)}
              hint={stats.active > 0 ? `${stats.active} sending now` : "Queued for later"}
              icon={CalendarClock}
              accent="amber"
            />
            <StatCard
              label="Completed"
              value={String(stats.completed)}
              hint="Finished sends in your history"
              icon={TrendingUp}
              accent="emerald"
            />
          </div>
        )}

        <section className={DASHBOARD_SECTION_SURFACE}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Your promotions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Filter, sort, and manage campaigns without cluttering the page.
              </p>
            </div>
          </div>

          <div
            className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-border/50 bg-muted/25 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Promotion status"
          >
            {STATUS_TABS.map((tab) => {
              const active = statusTab === tab.id;
              const count = tabCounts[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusTab(tab.id)}
                  className={cn(
                    "relative shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "ml-1.5 tabular-nums",
                      active ? "text-muted-foreground" : "text-muted-foreground/70",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                placeholder="Search by name or message…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(dashboardInputClass(), "pl-9")}
                aria-label="Search promotions"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as "" | "FLASH_SALE" | "WEEKLY_DEALS")
              }
              className={dashboardSelectClass()}
              aria-label="Filter by type"
            >
              <option value="">All types</option>
              <option value="FLASH_SALE">Flash sale</option>
              <option value="WEEKLY_DEALS">Weekly deals</option>
            </select>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as PromoSortKey)}
              className={dashboardSelectClass()}
              aria-label="Sort promotions"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="reach">Largest audience</option>
            </select>
          </div>

          {loading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CampaignCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed border-border/70 bg-muted/15 px-6 py-14 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-sm">
                <Megaphone className="size-7 text-muted-foreground" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
                {emptyCopy[statusTab].title}
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {emptyCopy[statusTab].body}
              </p>
              {(statusTab === "all" || statusTab === "drafts") && !search && !typeFilter ? (
                <Button type="button" className="mt-6 gap-2" onClick={() => openCreate()}>
                  <Plus className="size-4" aria-hidden />
                  Create promotion
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredRows.map((row) => (
                <PromoCampaignCard
                  key={row.id}
                  row={row}
                  scopeLabel={scopeLabel(row.recipientScope, row.catalogBranchId)}
                  onOpen={() => setDetailRow(row)}
                  busy={busy}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <FormDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        width="wide"
        contextLabel="Promotions"
        title="Create promotion"
        description="Shoppers see a short alert in their account — like a gentle nudge back to your shop."
        icon={<Megaphone className="size-5" aria-hidden />}
        banner={feedback?.kind === "error" && createOpen ? <FormDrawerMessageBanner text={feedback.text} /> : null}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void onCreate(false)}
              >
                {busy ? "Saving…" : "Save as draft"}
              </Button>
              <Button
                type="button"
                disabled={busy || !form.scheduledAtLocal}
                onClick={() => void onCreate(true)}
              >
                {busy ? "Scheduling…" : "Schedule send"}
              </Button>
            </div>
          </div>
        }
      >
        {!form.name && !form.title && !usingExample ? (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Need inspiration?</span> Start from a
              proven template and edit the copy.
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => loadExample(EXAMPLE_FLASH_SALE)}
              >
                <Sparkles className="size-3.5" aria-hidden />
                Flash sale example
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => loadExample(EXAMPLE_WEEKLY_DEALS)}
              >
                Weekly deals
              </Button>
            </div>
          </div>
        ) : null}

        {usingExample ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
            <span className="text-amber-900 dark:text-amber-100">
              Example loaded — tweak anything, then save as your own.
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => {
                setForm(EMPTY_FORM);
                setUsingExample(false);
              }}
            >
              <X className="size-3" aria-hidden />
              Clear
            </button>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(220px,260px)]">
          <div className="space-y-5">
            <FormDrawerFields
              legend="Campaign setup"
              hint="Only you see the internal name — shoppers see the headline and message."
            >
              <div className="space-y-2">
                <Label htmlFor="promo-name" className={dashboardLabelClass()}>
                  Internal name
                </Label>
                <input
                  id="promo-name"
                  className={dashboardInputClass()}
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    setUsingExample(false);
                  }}
                  placeholder="March weekend push"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="promo-type" className={dashboardLabelClass()}>
                    Style
                  </Label>
                  <select
                    id="promo-type"
                    className={dashboardSelectClass()}
                    value={form.campaignType}
                    onChange={(e) => {
                      setForm((f) => ({
                        ...f,
                        campaignType: e.target.value as "FLASH_SALE" | "WEEKLY_DEALS",
                      }));
                      setUsingExample(false);
                    }}
                  >
                    <option value="FLASH_SALE">Flash sale — urgent, limited time</option>
                    <option value="WEEKLY_DEALS">Weekly deals — regular digest</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promo-scope" className={dashboardLabelClass()}>
                    Who receives it
                  </Label>
                  <select
                    id="promo-scope"
                    className={dashboardSelectClass()}
                    value={form.recipientScope}
                    onChange={(e) => {
                      const scope = e.target.value as NotificationCampaignRecipientScope;
                      setForm((f) => ({
                        ...f,
                        recipientScope: scope,
                        catalogBranchId:
                          scope === "BRANCH_ACTIVE_BUYERS_90D" ? f.catalogBranchId : "",
                      }));
                      setUsingExample(false);
                    }}
                  >
                    <option value="ALL_BUYERS">All registered shoppers</option>
                    <option value="ACTIVE_BUYERS_90D">Ordered in the last 90 days</option>
                    <option value="INACTIVE_BUYERS_30D">No order in 30+ days (win-back)</option>
                    <option value="BRANCH_ACTIVE_BUYERS_90D">
                      Ordered at a branch (90 days)
                    </option>
                  </select>
                </div>
              </div>
              {scopeNeedsBranch ? (
                <div className="space-y-2">
                  <Label htmlFor="promo-branch" className={dashboardLabelClass()}>
                    Branch
                  </Label>
                  <select
                    id="promo-branch"
                    className={dashboardSelectClass()}
                    value={form.catalogBranchId}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, catalogBranchId: e.target.value }));
                      setUsingExample(false);
                    }}
                  >
                    <option value="">Select a branch…</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="promo-schedule" className={dashboardLabelClass()}>
                  Schedule send (optional)
                </Label>
                <input
                  id="promo-schedule"
                  type="datetime-local"
                  className={dashboardInputClass()}
                  value={form.scheduledAtLocal}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, scheduledAtLocal: e.target.value }));
                    setUsingExample(false);
                  }}
                />
                <p className={dashboardHintClass()}>
                  Leave empty to save a draft. Set a future time, then use Schedule send.
                </p>
              </div>
            </FormDrawerFields>

            <FormDrawerFields legend="Shopper message">
              <div className="space-y-2">
                <Label htmlFor="promo-title" className={dashboardLabelClass()}>
                  Headline
                </Label>
                <input
                  id="promo-title"
                  className={dashboardInputClass()}
                  value={form.title}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, title: e.target.value }));
                    setUsingExample(false);
                  }}
                  placeholder="20% off this weekend"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-body" className={dashboardLabelClass()}>
                  Short message
                </Label>
                <textarea
                  id="promo-body"
                  rows={3}
                  className={dashboardTextareaClass()}
                  value={form.body}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, body: e.target.value }));
                    setUsingExample(false);
                  }}
                  placeholder="A sentence or two — warm, clear, no jargon."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-url" className={dashboardLabelClass()}>
                  Link when tapped
                </Label>
                <input
                  id="promo-url"
                  className={dashboardInputClass()}
                  value={form.actionUrl}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, actionUrl: e.target.value }));
                    setUsingExample(false);
                  }}
                  placeholder="/shop"
                />
              </div>
            </FormDrawerFields>
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start">
            <p className={cn(dashboardFilterFieldLabelClass(), "mb-3")}>Live preview</p>
            <ShopperPreview
              notificationType={notificationType}
              title={form.title}
              body={form.body}
              actionUrl={form.actionUrl}
            />
          </div>
        </div>
      </FormDrawer>

      <Dialog open={detailRow != null} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0" side="center">
          {detailRow ? (
            <>
              <div
                className={cn(
                  "h-1.5 w-full",
                  detailRow.campaignType === "FLASH_SALE"
                    ? "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500"
                    : "bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500",
                )}
                aria-hidden
              />
              <div className="space-y-5 p-6">
                <DialogHeader>
                  <div className="flex flex-wrap items-center gap-2 pr-6">
                    <Badge variant={campaignStatusMeta(detailRow.status).badge}>
                      {campaignStatusMeta(detailRow.status).label}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      {campaignTypeLabel(detailRow.campaignType)}
                    </span>
                  </div>
                  <DialogTitle className="text-xl">{detailRow.title}</DialogTitle>
                  <DialogDescription className="text-left">
                    <span className="font-medium text-foreground">{detailRow.name}</span>
                    <span className="mx-1.5 text-border">·</span>
                    {scopeLabel(detailRow.recipientScope, detailRow.catalogBranchId)}
                  </DialogDescription>
                </DialogHeader>

                <p className="text-sm leading-relaxed text-muted-foreground">{detailRow.body}</p>

                <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border/50 bg-muted/20 p-4">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Reach
                    </dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums">
                      {detailRow.recipientsTargeted.toLocaleString()}
                    </dd>
                    <dd className="text-xs text-muted-foreground">shoppers targeted</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Delivered
                    </dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums">
                      {detailRow.recipientsSent.toLocaleString()}
                    </dd>
                    <dd className="text-xs text-muted-foreground">
                      {deliveryRate(detailRow) != null
                        ? `${deliveryRate(detailRow)}% delivery rate`
                        : "not sent yet"}
                    </dd>
                  </div>
                  <div className="col-span-2 border-t border-border/40 pt-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Revenue impact
                    </dt>
                    <dd className="mt-1 text-sm text-muted-foreground">
                      Track orders after sends in{" "}
                      <span className="font-medium text-foreground">Analytics</span> — direct
                      attribution coming soon.
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Timing
                    </dt>
                    <dd className="mt-1 text-sm font-medium">{campaignWhenLabel(detailRow)}</dd>
                  </div>
                </dl>

                <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
                  {(detailRow.status === "DRAFT" || detailRow.status === "SCHEDULED") && (
                    <Button
                      type="button"
                      className="w-full gap-2"
                      disabled={busy}
                      onClick={() => void runCampaign(detailRow.id)}
                    >
                      <Send className="size-4" aria-hidden />
                      Send now
                    </Button>
                  )}
                  {detailRow.status === "SCHEDULED" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={busy}
                      onClick={() => void cancelCampaign(detailRow.id)}
                    >
                      Cancel schedule
                    </Button>
                  )}
                  {detailRow.status === "DRAFT" && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full gap-2"
                      disabled={busy}
                      onClick={() => {
                        setDetailRow(null);
                        setForm(campaignToForm(detailRow));
                        setUsingExample(false);
                        setCreateOpen(true);
                      }}
                    >
                      <Zap className="size-4" aria-hidden />
                      Duplicate & edit
                    </Button>
                  )}
                </DialogFooter>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
