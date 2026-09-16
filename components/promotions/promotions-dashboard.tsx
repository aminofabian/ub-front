"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone } from "lucide-react";

import { PromotionsTheatre } from "@/app/(dashboard)/business/promotions/_components/promotions-theatre";
import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { useMediaLg } from "@/hooks/use-media-lg";
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
  PromoCreateDrawer,
  type PromoFormState,
} from "./promo-create-drawer";
import { PromoDetailDrawer } from "./promo-detail-drawer";

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

export function PromotionsDashboard() {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);

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
  const [detailOpen, setDetailOpen] = useState(false);

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

  const scopeLabelForRow = useCallback(
    (row: NotificationCampaign) =>
      scopeLabel(row.recipientScope, row.catalogBranchId),
    [scopeLabel],
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

  const clearDetail = () => {
    setDetailRow(null);
    setDetailOpen(false);
  };

  const openCreate = (prefill?: PromoFormState) => {
    clearDetail();
    setForm(prefill ?? EMPTY_FORM);
    setUsingExample(false);
    setCreateError(null);
    setFeedback(null);
    setCreateOpen(true);
  };

  const selectCampaign = (row: NotificationCampaign) => {
    setCreateOpen(false);
    setDetailRow(row);
    setDetailOpen(true);
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
      clearDetail();
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
      clearDetail();
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

  // Detail and create share the dock — only one docks at a time.
  const detailDocked = isLg && detailOpen && !createOpen;
  const createDocked = isLg && createOpen;

  return (
    <>
      <div className={cn(DASHBOARD_MAX_WIDE, "gap-1.5")}>
        <DashboardPageHero
          icon={Megaphone}
          eyebrow="Business"
          title="Promotions"
          description="Reach registered shoppers with flash sales and weekly deals — schedule, pause, and review delivery."
        />

        {feedback ? (
          <DashboardFeedback kind={feedback.kind} text={feedback.text} />
        ) : null}

        <PromotionsTheatre
          rows={rows}
          filtered={filteredRows}
          loading={loading}
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
          stats={stats}
          selectedRow={detailRow}
          detailOpen={detailOpen && !createOpen}
          createOpen={createOpen}
          onSelect={selectCampaign}
          onCreate={() => openCreate()}
          onReload={() => void load()}
          scopeLabel={scopeLabelForRow}
          dockRef={setDockRoot}
        />
      </div>

      <PromoCreateDrawer
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateError(null);
          }
        }}
        form={form}
        setForm={setForm}
        usingExample={usingExample}
        setUsingExample={setUsingExample}
        branches={branches}
        busy={busy}
        errorText={createError}
        onSaveDraft={() => void onCreate(false)}
        onSchedule={() => void onCreate(true)}
        docked={createDocked}
        dockRoot={createDocked ? dockRoot : null}
      />

      <PromoDetailDrawer
        row={detailRow}
        open={detailOpen && !!detailRow && !createOpen}
        onOpenChange={(open) => {
          if (!open) clearDetail();
          else setDetailOpen(true);
        }}
        scopeLabel={
          detailRow
            ? scopeLabel(detailRow.recipientScope, detailRow.catalogBranchId)
            : ""
        }
        busy={busy}
        onSendNow={(id) => void runCampaign(id)}
        onCancelSchedule={(id) => void cancelCampaign(id)}
        onDuplicateEdit={(row) => {
          clearDetail();
          setForm(campaignToForm(row));
          setUsingExample(false);
          setCreateError(null);
          setCreateOpen(true);
        }}
        docked={detailDocked}
        dockRoot={detailDocked ? dockRoot : null}
      />
    </>
  );
}
