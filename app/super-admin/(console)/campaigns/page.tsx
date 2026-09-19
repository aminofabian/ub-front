"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, RefreshCw } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
  dashboardHintClass,
} from "@/components/dashboard-page-ui";
import {
  mapApiStatus,
  typeFromSegment,
} from "@/components/super-admin/campaigns/campaigns-model";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSaEmailCampaigns,
  type SaEmailCampaignSummary,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  CampaignsTheatre,
  type StatusFilter,
} from "./_components/campaigns-theatre";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PRIMARY_BTN =
  "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3.5 text-white shadow-none hover:bg-[#0d6b63]";

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SuperAdminCampaignsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SaEmailCampaignSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<SaEmailCampaignSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const result = await fetchSaEmailCampaigns(0, 80);
      setRows(result.rows);
      setTotal(result.total);
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Could not load campaigns.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const apply = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash.startsWith("campaign-")) return;
      const id = hash.slice("campaign-".length);
      const row = rows.find((r) => r.id === id);
      if (row) setSelected(row);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [rows]);

  const activeCount = useMemo(
    () =>
      rows.filter((r) => {
        const s = mapApiStatus(r.status);
        return s === "sending" || s === "scheduled";
      }).length,
    [rows],
  );
  const scheduledCount = useMemo(
    () => rows.filter((r) => mapApiStatus(r.status) === "scheduled").length,
    [rows],
  );
  const sentCount = useMemo(
    () => rows.filter((r) => mapApiStatus(r.status) === "sent").length,
    [rows],
  );

  const onCreate = () => {
    router.push(APP_ROUTES.superAdminCampaignNew);
  };

  const onOpen = (id: string) => {
    router.push(`${APP_ROUTES.superAdminCampaigns}/${id}`);
  };

  const onReuse = (row: SaEmailCampaignSummary) => {
    router.push(
      `${APP_ROUTES.superAdminCampaignNew}?reuse=${encodeURIComponent(row.id)}`,
    );
  };

  const drawerBody = selected ? (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-[15px] font-semibold tracking-[-0.02em]">
          {selected.name}
        </p>
        <p className={dashboardHintClass()}>
          {selected.subject || "No subject"}
        </p>
      </div>

      <dl className="grid gap-2 text-[12px]">
        <div
          className={cn(
            "flex justify-between gap-3 border px-3 py-2",
            HAIRLINE,
          )}
        >
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-medium capitalize">
            {mapApiStatus(selected.status)}
          </dd>
        </div>
        <div
          className={cn(
            "flex justify-between gap-3 border px-3 py-2",
            HAIRLINE,
          )}
        >
          <dt className="text-muted-foreground">Type</dt>
          <dd className="font-medium capitalize">
            {typeFromSegment(selected.segmentKey)}
          </dd>
        </div>
        <div
          className={cn(
            "flex justify-between gap-3 border px-3 py-2",
            HAIRLINE,
          )}
        >
          <dt className="text-muted-foreground">Targeted</dt>
          <dd className="font-medium tabular-nums">
            {selected.recipientsTargeted.toLocaleString()}
          </dd>
        </div>
        <div
          className={cn(
            "flex justify-between gap-3 border px-3 py-2",
            HAIRLINE,
          )}
        >
          <dt className="text-muted-foreground">Sent / failed / skipped</dt>
          <dd className="font-medium tabular-nums">
            {selected.recipientsSent.toLocaleString()}
            {" / "}
            {selected.recipientsFailed.toLocaleString()}
            {" / "}
            {selected.recipientsSkipped.toLocaleString()}
          </dd>
        </div>
        <div
          className={cn(
            "flex justify-between gap-3 border px-3 py-2",
            HAIRLINE,
          )}
        >
          <dt className="text-muted-foreground">Created</dt>
          <dd className="text-right font-medium">
            {formatWhen(selected.createdAt)}
          </dd>
        </div>
        {selected.completedAt ? (
          <div
            className={cn(
              "flex justify-between gap-3 border px-3 py-2",
              HAIRLINE,
            )}
          >
            <dt className="text-muted-foreground">Completed</dt>
            <dd className="text-right font-medium">
              {formatWhen(selected.completedAt)}
            </dd>
          </div>
        ) : null}
      </dl>

      <p className={dashboardHintClass()}>
        Open analytics for recipient rows. Reuse starts a new draft from this
        campaign&apos;s copy.
      </p>
    </div>
  ) : null;

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={Megaphone}
        eyebrow="Platform"
        title="Campaigns"
        description="Reach Kiosk merchants with the right message — drafts, scheduled sends, and history."
      >
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-none border bg-white text-[#666666]",
            HAIRLINE,
            "transition-colors hover:border-[#0f766e] hover:text-[#0f766e]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label="Refresh campaigns"
        >
          <RefreshCw
            className={cn("size-3.5", loading && "animate-spin")}
            aria-hidden
          />
        </button>
        <Button
          type="button"
          size="sm"
          className={PRIMARY_BTN}
          onClick={onCreate}
        >
          Create campaign
        </Button>
      </DashboardPageHero>

      {loadError ? <DashboardFeedback kind="error" text={loadError} /> : null}

      <CampaignsTheatre
        rows={rows}
        total={total}
        activeCount={activeCount}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
        loading={loading}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        selected={selected}
        onSelect={setSelected}
        onClearSelection={() => setSelected(null)}
        onCreate={onCreate}
        drawerBody={drawerBody}
        drawerFooter={
          selected ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className={PRIMARY_BTN}
                onClick={() => onOpen(selected.id)}
              >
                Open
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-none"
                onClick={() => onReuse(selected)}
              >
                Reuse
              </Button>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
