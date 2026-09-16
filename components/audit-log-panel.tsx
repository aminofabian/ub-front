"use client";

import { useEffect, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  fetchAuditEvents,
  fetchAuditEventSummary,
  type AuditEventCategory,
  type AuditEventRecord,
  type AuditEventSeverity,
  type AuditEventSummary,
} from "@/lib/api";

import {
  LogsTheatre,
  PAGE_SIZE,
  type LogsDockMode,
  type LogsDraftFilters,
  type LogsPreset,
} from "@/app/(dashboard)/business/logs/_components/logs-theatre";

type AppliedFilters = {
  branchId?: string;
  category?: AuditEventCategory;
  eventType?: string;
  severity?: AuditEventSeverity;
  minSeverity?: AuditEventSeverity;
  from?: string;
  to?: string;
};

const DEFAULT_DRAFT: LogsDraftFilters = {
  failuresOnly: false,
  severity: "",
  category: "",
  eventType: "",
  branchId: "",
  preset: "today",
  customFrom: "",
  customTo: "",
};

function startOfLocalDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function applyPreset(draft: LogsDraftFilters): AppliedFilters {
  const now = new Date();
  let from: Date | undefined;
  let to: Date | undefined;
  if (draft.preset === "today") {
    from = startOfLocalDay();
  } else if (draft.preset === "24h") {
    from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (draft.preset === "7d") {
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (draft.preset === "30d") {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (draft.customFrom.trim()) {
    const parsed = new Date(draft.customFrom);
    from = Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (draft.preset === "custom" && draft.customTo.trim()) {
    const parsed = new Date(draft.customTo);
    to = Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const filters: AppliedFilters = {};
  if (draft.branchId.trim()) filters.branchId = draft.branchId.trim();
  if (draft.category) filters.category = draft.category;
  if (draft.eventType.trim()) filters.eventType = draft.eventType.trim();
  if (draft.failuresOnly) {
    filters.minSeverity = "WARN";
  } else if (draft.severity) {
    filters.severity = draft.severity;
  }
  if (from) filters.from = from.toISOString();
  if (to) filters.to = to.toISOString();
  return filters;
}

export function AuditLogPanel() {
  const { branches } = useDashboard();
  const [draft, setDraft] = useState<LogsDraftFilters>(DEFAULT_DRAFT);
  const [applied, setApplied] = useState<AppliedFilters>(() =>
    applyPreset(DEFAULT_DRAFT),
  );
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AuditEventRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [summary, setSummary] = useState<AuditEventSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dockMode, setDockMode] = useState<LogsDockMode>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    fetchAuditEventSummary(applied)
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch(() => {
        /* header cards are non-critical */
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applied]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAuditEvents({ ...applied, page, size: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setRows(result.content);
        setTotal(result.totalElements);
        setTotalPages(result.totalPages);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not load the activity log.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applied, page, retry]);

  const clearSelection = () => {
    setSelectedId(null);
    setDockMode(null);
    setMobileDetailOpen(false);
  };

  const commitDraft = (next: LogsDraftFilters) => {
    setDraft(next);
    setApplied(applyPreset(next));
    setPage(0);
    clearSelection();
  };

  const apply = () => {
    setApplied(applyPreset(draft));
    setPage(0);
    clearSelection();
  };

  const reset = () => {
    commitDraft(DEFAULT_DRAFT);
  };

  const onPresetChange = (preset: LogsPreset) => {
    const next = { ...draft, preset };
    if (preset !== "custom") {
      commitDraft(next);
      return;
    }
    setDraft(next);
  };

  const onFailuresOnlyChange = (value: boolean) => {
    commitDraft({
      ...draft,
      failuresOnly: value,
      severity: value ? "" : draft.severity,
    });
  };

  const onSeverityChip = (severity: AuditEventSeverity | "") => {
    commitDraft({
      ...draft,
      failuresOnly: false,
      severity,
    });
  };

  const onCategoryChip = (category: AuditEventCategory | "") => {
    commitDraft({ ...draft, category });
  };

  const onSelectEvent = (event: AuditEventRecord) => {
    if (dockMode === "event" && selectedId === event.id) {
      clearSelection();
      return;
    }
    setSelectedId(event.id);
    setDockMode("event");
    setMobileDetailOpen(true);
  };

  const onOpenDiagnostics = () => {
    if (dockMode === "diagnostics") {
      clearSelection();
      return;
    }
    setSelectedId(null);
    setDockMode("diagnostics");
    setMobileDetailOpen(true);
  };

  const selectedEvent =
    dockMode === "event"
      ? (rows.find((r) => r.id === selectedId) ?? null)
      : null;

  return (
    <LogsTheatre
      branches={branches}
      draft={draft}
      onDraftChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
      onApply={apply}
      onReset={reset}
      onPresetChange={onPresetChange}
      onFailuresOnlyChange={onFailuresOnlyChange}
      onSeverityChip={onSeverityChip}
      onCategoryChip={onCategoryChip}
      rows={rows}
      total={total}
      totalPages={totalPages}
      page={page}
      onPageChange={(p) => {
        setPage(p);
        clearSelection();
      }}
      loading={loading}
      error={error}
      onRetry={() => setRetry((r) => r + 1)}
      summary={summary}
      summaryLoading={summaryLoading}
      selectedId={selectedId}
      dockMode={dockMode}
      selectedEvent={selectedEvent}
      onSelectEvent={onSelectEvent}
      onOpenDiagnostics={onOpenDiagnostics}
      onClearSelection={clearSelection}
      mobileDetailOpen={mobileDetailOpen}
      search={search}
      onSearchChange={setSearch}
    />
  );
}
