"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Globe,
  Loader2,
  MapPin,
  Palette,
  Plus,
  RefreshCw,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { branchReceiptDraft, branchReceiptPayload } from "@/lib/branch-receipt";
import {
  createBranch,
  fetchBranches,
  patchBranch,
  type BranchRecord,
} from "@/lib/api";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";

import { BranchesTheatre } from "./_components/branches-theatre";
import type { BranchEditRow } from "./_components/branch-detail-drawer";

type BranchDraft = {
  name: string;
  address: string;
};

const EMPTY_DRAFT: BranchDraft = { name: "", address: "" };

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function BranchesPage() {
  const { refreshSession, refreshBranches, canManageBusinessSettings } =
    useDashboard();
  const [rows, setRows] = useState<BranchRecord[]>([]);
  const [draft, setDraft] = useState<BranchDraft>(EMPTY_DRAFT);
  const [edits, setEdits] = useState<Record<string, BranchEditRow>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadPass, setLoadPass] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdBranchName, setCreatedBranchName] = useState<string | null>(
    null,
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const canManage = canManageBusinessSettings;

  useEffect(() => {
    if (!createdBranchName) {
      return;
    }
    const timer = window.setTimeout(() => setCreatedBranchName(null), 8000);
    return () => window.clearTimeout(timer);
  }, [createdBranchName]);

  const load = useCallback(() => {
    return fetchBranches()
      .then((list) => {
        setRows(list);
        const nextEdits: Record<string, BranchEditRow> = {};
        for (const b of list) {
          nextEdits[b.id] = {
            name: b.name,
            address: b.address ?? "",
            active: b.active,
            receipt: branchReceiptDraft(b.receipt),
          };
        }
        setEdits(nextEdits);
        setLoadFailed(false);
        setFeedback(null);
      })
      .catch((error) => {
        setLoadFailed(true);
        setFeedback({
          kind: "error",
          text:
            error instanceof Error ? error.message : "Could not load branches.",
        });
      })
      .finally(() => {
        setLoadPass((n) => n + 1);
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((b) => {
      if (filterActive === "active" && !b.active) return false;
      if (filterActive === "inactive" && b.active) return false;
      if (!q) return true;
      const name = b.name.toLowerCase();
      const addr = (b.address ?? "").toLowerCase();
      return (
        name.includes(q) || addr.includes(q) || b.id.toLowerCase().includes(q)
      );
    });
  }, [rows, search, filterActive]);

  const stats = useMemo(() => {
    const active = rows.filter((b) => b.active).length;
    return { total: rows.length, active, inactive: rows.length - active };
  }, [rows]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) + (filterActive !== "all" ? 1 : 0);

  const selectedBranch = useMemo(
    () => rows.find((b) => b.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setMobileShowDetail(false);
  }, []);

  const selectBranch = useCallback(
    (branch: BranchRecord) => {
      if (selectedId === branch.id) {
        clearSelection();
        return;
      }
      setSelectedId(branch.id);
      setMobileShowDetail(true);
    },
    [selectedId, clearSelection],
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterActive("all");
  }, []);

  const onCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setFeedback(null);
    const branchName = draft.name.trim();
    try {
      await createBranch({
        name: branchName,
        address: draft.address.trim() || undefined,
      });
      setDraft(EMPTY_DRAFT);
      setCreatedBranchName(branchName);
      setCreateOpen(false);
      await load();
      await refreshSession();
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Create failed.",
      });
    } finally {
      setCreating(false);
    }
  };

  const onSaveRow = async (branchId: string) => {
    const row = edits[branchId];
    if (!row?.name.trim()) {
      setFeedback({ kind: "error", text: "Branch name is required." });
      return;
    }
    setSavingId(branchId);
    setFeedback(null);
    try {
      await patchBranch(branchId, {
        name: row.name.trim(),
        address: row.address.trim() || undefined,
        active: row.active,
        receipt: branchReceiptPayload(row.receipt),
      });
      await load();
      await refreshBranches();
      setFeedback({ kind: "success", text: "Branch updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Update failed.",
      });
    } finally {
      setSavingId(null);
    }
  };

  const isInitialLoading = loadPass === 0;
  const showLoading = isInitialLoading && !loadFailed;

  if (showLoading) {
    return <DashboardLoading label="Loading branches…" />;
  }

  if (loadFailed && loadPass > 0 && rows.length === 0) {
    return (
      <DashboardLoadError
        title="Could not load branches"
        message={feedback?.text ?? "Unknown error."}
        onRetry={() => {
          setLoadFailed(false);
          setFeedback(null);
          void load();
        }}
      />
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-1.5")}>
      <DashboardPageHero
        icon={MapPin}
        eyebrow="Locations"
        title="Branches"
        description={
          <>
            Stores, warehouses, and counters. Editing requires{" "}
            <code className="font-mono text-[11px]">
              business.manage_settings
            </code>
            .
          </>
        }
      >
        <DashboardQuickLinks
          compact
          links={[
            {
              href: APP_ROUTES.business,
              label: "Business",
              desc: "Core settings",
              icon: Building2,
            },
            {
              href: APP_ROUTES.businessBranding,
              label: "Branding",
              desc: "Logo & colors",
              icon: Palette,
            },
            {
              href: APP_ROUTES.businessDomains,
              label: "Domains",
              desc: "Hostnames",
              icon: Globe,
            },
          ]}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-none"
          onClick={() => void load()}
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Refresh
        </Button>
        {canManage ? (
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 rounded-none bg-[var(--pos-primary,#0f766e)] text-white hover:bg-[#0d6b63]"
            data-onboarding-target={ONBOARDING_TARGETS.addBranch}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-3.5" aria-hidden />
            Add branch
          </Button>
        ) : null}
      </DashboardPageHero>

      {feedback ? (
        <DashboardFeedback kind={feedback.kind} text={feedback.text} />
      ) : null}

      {createdBranchName ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-start gap-3 rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-4 py-3.5 text-sm shadow-none",
            "text-[var(--order-ink,#15231f)]",
          )}
        >
          <CheckCircle2
            className="mt-0.5 size-5 shrink-0 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          <div className="min-w-0 space-y-0.5">
            <p className="font-semibold leading-snug">
              &ldquo;{createdBranchName}&rdquo; was added
            </p>
            <p
              className={cn(
                dashboardHintClass(),
                "text-[color-mix(in_srgb,var(--order-ink,#15231f)_72%,transparent)]",
              )}
            >
              Select it in the list to tune address, status, and receipt
              details in the dossier.
            </p>
          </div>
        </div>
      ) : null}

      {!canManage ? (
        <DashboardFeedback
          kind="warning"
          text="You can view branches but not edit them. Ask an admin for business.manage_settings to create or update locations."
        />
      ) : null}

      <BranchesTheatre
        rows={rows}
        filteredRows={filteredRows}
        edits={edits}
        onEditChange={(branchId, next) =>
          setEdits((previous) => ({ ...previous, [branchId]: next }))
        }
        search={search}
        onSearchChange={setSearch}
        filterActive={filterActive}
        onFilterActive={setFilterActive}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        stats={stats}
        canManage={canManage}
        selectedId={selectedId}
        selectedBranch={selectedBranch}
        onSelect={selectBranch}
        onClearSelection={clearSelection}
        mobileShowDetail={mobileShowDetail}
        savingId={savingId}
        onSave={(branchId) => void onSaveRow(branchId)}
        onAddBranch={canManage ? () => setCreateOpen(true) : undefined}
      />

      <FormDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add branch"
        description="Create a location, then refine address, activation, and receipt copy in the dossier."
        icon={<Plus className="size-5" aria-hidden />}
        width="default"
      >
        <form className="space-y-6" onSubmit={onCreate}>
          <FormDrawerFields
            legend="Location"
            hint="Name appears in branch pickers and on printed receipts when configured."
          >
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="branch-new-name">
                Branch name
              </label>
              <input
                id="branch-new-name"
                className={dashboardInputClass()}
                placeholder="e.g. Westlands store"
                value={draft.name}
                onChange={(event) => {
                  setCreatedBranchName(null);
                  setDraft((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }));
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="branch-new-address"
              >
                Address{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <input
                id="branch-new-address"
                className={dashboardInputClass()}
                placeholder="Street, city"
                value={draft.address}
                onChange={(event) => {
                  setCreatedBranchName(null);
                  setDraft((previous) => ({
                    ...previous,
                    address: event.target.value,
                  }));
                }}
              />
            </div>
          </FormDrawerFields>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={creating} className="gap-2">
              {creating ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="size-4" aria-hidden />
                  Create branch
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </FormDrawer>

      <p
        className={cn(
          dashboardHintClass(),
          "flex flex-wrap items-center gap-x-1 border-t border-border/40 pt-2",
        )}
      >
        <span className="font-mono text-[11px]">GET/PATCH …/branches</span>
        <span className="text-muted-foreground/50">·</span>
        <span>
          Session refreshes after creates so storefront picks up new locations.
        </span>
      </p>
    </div>
  );
}
