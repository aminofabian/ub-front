"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, Plus } from "lucide-react";

import { DashboardFeedback } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
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
import {
  aggregatePromoStats,
  matchesStatusTab,
  sortCampaigns,
  type PromoSortKey,
  type PromoStatusTab,
} from "@/lib/promotions-campaign-utils";
import { cn } from "@/lib/utils";

import {
  PromoCampaignCard,
  PromoCampaignCardSkeleton,
} from "./promo-campaign-card";
import {
  PromoCreateDrawer,
  type PromoFormState,
} from "./promo-create-drawer";
import { PromoDetailDrawer } from "./promo-detail-drawer";
import { PromoEmptyCreateButton, PromoEmptyState } from "./promo-empty-state";
import { PromoStatsStrip, PromoStatsStripSkeleton } from "./promo-stats-strip";
import { PromoWorkspaceToolbar } from "./promo-workspace-toolbar";
import { PromotionsPageHeader } from "./PromotionsPageHeader";
import {
  promoMobileFab,
  supMotionIn,
  supPageRoot,
  supWorkspaceInner,
  supWorkspaceShell,
} from "./promotions-ui-tokens";

const EMPTY_FORM: PromoFormState = {
  name: "",
  campaignType: "FLASH_SALE",
  title: "",
  body: "",
  actionUrl: "/shop",
  recipientScope: "ALL_BUYERS",
  catalogBranchId: "",
  scheduledAtLocal: "",
};

function campaignToForm(row: NotificationCampaign): PromoFormState {
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

const EMPTY_COPY: Record<PromoStatusTab, { title: string; body: string }> = {
  all: {
    title: "No promotions yet",
    body: "Create your first flash sale or weekly deals alert. Shoppers see a short, friendly message in their shop account — you control who receives it and when it sends.",
  },
  active: {
    title: "Nothing sending right now",
    body: "When you launch a promotion, it appears here while delivery is in progress. Draft and scheduled campaigns live in their own tabs.",
  },
  scheduled: {
    title: "No scheduled promotions",
    body: "Pick a future date when creating a promotion to queue an automatic send. You can cancel or edit before the send time.",
  },
  drafts: {
    title: "No drafts saved",
    body: "Save a promotion as a draft when you are not ready to send. Come back anytime to review, edit, and launch.",
  },
  past: {
    title: "No past promotions",
    body: "Completed and cancelled campaigns appear here so you can review reach and delivery for past sends.",
  },
};

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
  const [form, setForm] = useState<PromoFormState>(EMPTY_FORM);
  const [usingExample, setUsingExample] = useState(false);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  const [detailRow, setDetailRow] = useState<NotificationCampaign | null>(null);

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

  const hasActiveFilters =
    search.trim().length > 0 || typeFilter !== "" || statusTab !== "all";

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setStatusTab("all");
    setSortKey("newest");
  };

  const openCreate = (prefill?: PromoFormState) => {
    setForm(prefill ?? EMPTY_FORM);
    setUsingExample(false);
    setCreateError(null);
    setFeedback(null);
    setCreateOpen(true);
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
    const scopeNeedsBranch = form.recipientScope === "BRANCH_ACTIVE_BUYERS_90D";
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
      setCreateError(built.error);
      return;
    }
    setBusy(true);
    setCreateError(null);
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
      setCreateError(e instanceof Error ? e.message : "Could not save promotion.");
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
      setFeedback({ kind: "success", text: "Scheduled promotion paused — moved to your history." });
    } catch (e) {
      setFeedback({
        kind: "error",
        text: e instanceof Error ? e.message : "Could not pause promotion.",
      });
    } finally {
      setBusy(false);
    }
  };

  const showCreateCta =
    (statusTab === "all" || statusTab === "drafts") && !search && !typeFilter;

  return (
    <div className={cn(supPageRoot, supMotionIn)}>
      <div className="flex min-h-0 flex-1 flex-col gap-4 sm:gap-5 pb-20 sm:pb-16">
        <PromotionsPageHeader
          loading={loading}
          onRefresh={() => void load()}
          onCreate={() => openCreate()}
        />

        {feedback ? <DashboardFeedback kind={feedback.kind} text={feedback.text} /> : null}

        {loading ? (
          <PromoStatsStripSkeleton />
        ) : (
          <PromoStatsStrip stats={stats} totalCampaigns={rows.length} />
        )}

        <section className={supWorkspaceShell}>
          <div className={supWorkspaceInner}>
            <PromoWorkspaceToolbar
              statusTab={statusTab}
              onStatusTab={setStatusTab}
              tabCounts={tabCounts}
              search={search}
              onSearch={setSearch}
              typeFilter={typeFilter}
              onTypeFilter={setTypeFilter}
              sortKey={sortKey}
              onSortKey={setSortKey}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              shownCount={filteredRows.length}
              totalCount={rows.length}
            />

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <PromoCampaignCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredRows.length === 0 ? (
              <PromoEmptyState
                icon={Megaphone}
                title={emptyCopyForTab(statusTab, search, typeFilter).title}
                description={emptyCopyForTab(statusTab, search, typeFilter).body}
                action={
                  showCreateCta ? (
                    <PromoEmptyCreateButton onClick={() => openCreate()} />
                  ) : hasActiveFilters ? (
                    <Button type="button" variant="outline" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredRows.map((row, i) => (
                  <PromoCampaignCard
                    key={row.id}
                    row={row}
                    scopeLabel={scopeLabel(row.recipientScope, row.catalogBranchId)}
                    onOpen={() => setDetailRow(row)}
                    busy={busy}
                    style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <Button
        type="button"
        className={promoMobileFab}
        onClick={() => openCreate()}
        aria-label="Create new promotion"
      >
        <Plus className="size-4" aria-hidden />
        New
      </Button>

      <PromoCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={form}
        setForm={setForm}
        usingExample={usingExample}
        setUsingExample={setUsingExample}
        branches={branches}
        busy={busy}
        errorText={createError}
        onSaveDraft={() => void onCreate(false)}
        onSchedule={() => void onCreate(true)}
      />

      <PromoDetailDrawer
        row={detailRow}
        open={detailRow != null}
        onOpenChange={(open) => !open && setDetailRow(null)}
        scopeLabel={
          detailRow
            ? scopeLabel(detailRow.recipientScope, detailRow.catalogBranchId)
            : ""
        }
        busy={busy}
        onSendNow={(id) => void runCampaign(id)}
        onCancelSchedule={(id) => void cancelCampaign(id)}
        onDuplicateEdit={(row) => {
          setDetailRow(null);
          setForm(campaignToForm(row));
          setUsingExample(false);
          setCreateError(null);
          setCreateOpen(true);
        }}
      />
    </div>
  );
}

function emptyCopyForTab(
  statusTab: PromoStatusTab,
  search: string,
  typeFilter: string,
): { title: string; body: string } {
  if (search || typeFilter) {
    return {
      title: "No matches",
      body: "Try a different search term or clear your filters to see more promotions.",
    };
  }
  return EMPTY_COPY[statusTab];
}
