"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Plus,
  RefreshCw,
} from "lucide-react";

import {
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  createAisle,
  fetchAisles,
  fetchUnassignedAisleCount,
  updateAisle,
  type AisleRecord,
} from "@/lib/api";
import { labelToAisleCode } from "@/lib/aisle-suggestions";
import { cn } from "@/lib/utils";

import { AisleCreateDrawer } from "./aisle-create-drawer";
import { AisleDetailColumn } from "./aisle-detail-column";
import { AisleEditDrawer } from "./aisle-edit-drawer";
import { AisleListColumn } from "./aisle-list-column";
import { AisleStatusDialog } from "./aisle-status-dialog";

type Feedback = { kind: "success" | "error"; text: string } | null;
type FilterMode = "all" | "active" | "inactive";

function useIsLg() {
  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsLg(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return isLg;
}

export function AislesWorkspace({ canWrite }: { canWrite: boolean }) {
  const isLg = useIsLg();
  const { business, branchId } = useDashboard();
  const currency = business?.currency?.trim() || "KES";

  const [aisles, setAisles] = useState<AisleRecord[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("active");
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<AisleRecord | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const sortedAisles = useMemo(
    () =>
      [...aisles].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [aisles],
  );

  const visibleAisles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedAisles.filter((a) => {
      if (filterMode === "active" && !a.active) return false;
      if (filterMode === "inactive" && a.active) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q)
      );
    });
  }, [sortedAisles, search, filterMode]);

  const maxProducts = useMemo(
    () => Math.max(...visibleAisles.map((a) => a.productCount), 1),
    [visibleAisles],
  );

  const assignedTotal = useMemo(
    () => aisles.reduce((sum, a) => sum + a.productCount, 0),
    [aisles],
  );

  const catalogTotal = assignedTotal + unassignedCount;

  const selected = useMemo(
    () => sortedAisles.find((a) => a.id === selectedId) ?? null,
    [sortedAisles, selectedId],
  );

  const selectedIndex = selected
    ? sortedAisles.findIndex((a) => a.id === selected.id)
    : -1;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [list, unassigned] = await Promise.all([
        fetchAisles(),
        fetchUnassignedAisleCount(),
      ]);
      setAisles(list);
      setUnassignedCount(unassigned);
      setSelectedId((prev) => {
        if (prev && list.some((a) => a.id === prev)) return prev;
        const first = [...list].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        )[0];
        return first?.id ?? null;
      });
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Could not load shelf zones.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectAisle = (id: string) => {
    setSelectedId(id);
    if (!isLg) setMobileDetailOpen(true);
  };

  const handleCreate = async () => {
    const name = createName.trim();
    const code = (createCode.trim() || labelToAisleCode(name)).trim();
    if (!name || !code) {
      setFeedback({ kind: "error", text: "Name and code are required." });
      return;
    }
    setCreateBusy(true);
    setFeedback(null);
    try {
      const created = await createAisle({ name, code, sortOrder: aisles.length });
      setAisles((prev) =>
        [...prev, created].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        ),
      );
      setSelectedId(created.id);
      setCreateOpen(false);
      setCreateName("");
      setCreateCode("");
      setFeedback({ kind: "success", text: `Created ${created.name}.` });
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not create shelf zone.",
      });
    } finally {
      setCreateBusy(false);
    }
  };

  const moveAisle = async (index: number, direction: -1 | 1) => {
    if (!canWrite || reorderBusy) return;
    const target = index + direction;
    if (target < 0 || target >= sortedAisles.length) return;
    const reordered = [...sortedAisles];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    setAisles(reordered);
    setReorderBusy(true);
    setFeedback(null);
    try {
      await Promise.all(
        reordered.map((a, i) => updateAisle(a.id, { sortOrder: i })),
      );
    } catch (err) {
      setFeedback({
        kind: "error",
        text:
          err instanceof Error ? err.message : "Could not reorder shelf zones.",
      });
      void load();
    } finally {
      setReorderBusy(false);
    }
  };

  const openEdit = () => {
    if (!selected) return;
    setEditName(selected.name);
    setEditCode(selected.code);
    setEditError(null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selected || !canWrite) return;
    const name = editName.trim();
    const code = editCode.trim();
    if (!name || !code) {
      setEditError("Name and code are required.");
      return;
    }
    setEditBusy(true);
    setEditError(null);
    try {
      const updated = await updateAisle(selected.id, { name, code });
      setAisles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setEditOpen(false);
      setFeedback({ kind: "success", text: `Updated ${updated.name}.` });
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Could not update shelf zone.",
      );
    } finally {
      setEditBusy(false);
    }
  };

  const confirmStatus = async () => {
    if (!statusTarget || !canWrite) return;
    setStatusBusy(true);
    setFeedback(null);
    try {
      const updated = await updateAisle(statusTarget.id, {
        active: !statusTarget.active,
      });
      setAisles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setStatusTarget(null);
      setFeedback({
        kind: "success",
        text: updated.active
          ? `${updated.name} is active again.`
          : `${updated.name} deactivated.`,
      });
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not update shelf zone.",
      });
    } finally {
      setStatusBusy(false);
    }
  };

  const listProps = {
    rows: visibleAisles,
    loading,
    focusedId: selectedId,
    search,
    onSearch: setSearch,
    filterMode,
    onFilterMode: setFilterMode,
    unassignedCount,
    maxProducts,
    onFocus: selectAisle,
  };

  const detailProps = {
    aisle: selected,
    walkIndex: selectedIndex,
    walkStops: sortedAisles.length,
    catalogTotal,
    branchId,
    currency,
    canWrite,
    reorderBusy,
    onMoveUp: () => {
      if (selectedIndex >= 0) void moveAisle(selectedIndex, -1);
    },
    onMoveDown: () => {
      if (selectedIndex >= 0) void moveAisle(selectedIndex, 1);
    },
    onEdit: openEdit,
    onToggleStatus: () => {
      if (selected) setStatusTarget(selected);
    },
  };

  const summary = (
    <>
      {visibleAisles.length.toLocaleString("en-KE")} aisle
      {visibleAisles.length === 1 ? "" : "s"} ·{" "}
      {assignedTotal.toLocaleString("en-KE")} products tagged
      {unassignedCount > 0
        ? ` · ${unassignedCount.toLocaleString("en-KE")} unassigned`
        : ""}
      .
      {selected
        ? ` ${selected.name} — stock and sales on the right.`
        : " Pick an aisle on the left."}
    </>
  );

  if (loadError && aisles.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-2 py-4 sm:px-4">
        <DashboardLoadError
          title="Couldn't load shelf zones"
          message={loadError}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-2 pb-16 pt-2 sm:px-4 sm:pt-3">
      {feedback ? (
        <div className="mb-3">
          <DashboardFeedback kind={feedback.kind} text={feedback.text} />
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <DashboardPageHero
          compact
          icon={MapPin}
          eyebrow="Catalog"
          title="Shelf zones"
          description={summary}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={APP_ROUTES.products}
            className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Products
          </Link>
          <Link
            href={APP_ROUTES.categories}
            className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Categories
          </Link>
          <Link
            href={APP_ROUTES.itemTypes}
            className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Departments
          </Link>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-9"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh"
          >
            <RefreshCw
              className={cn("size-4", loading && "animate-spin")}
              aria-hidden
            />
          </Button>
          {canWrite ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setCreateName("");
                setCreateCode("");
                setCreateOpen(true);
              }}
            >
              <Plus className="size-4" />
              New zone
            </Button>
          ) : null}
        </div>
      </div>

      {loading && aisles.length === 0 ? (
        <DashboardLoading label="Loading shelf zones…" />
      ) : aisles.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/80 px-4 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
            <MapPin className="size-5 text-muted-foreground" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">No zones yet</h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Create your first walk stop — e.g. front beverages, back wall dairy.
          </p>
          {canWrite ? (
            <Button
              type="button"
              className="mt-5 gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              New shelf zone
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(15rem,17rem)_minmax(0,1fr)]">
          {!isLg ? (
            mobileDetailOpen && selected ? (
              <div className="min-w-0 lg:order-2">
                <button
                  type="button"
                  className="mb-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileDetailOpen(false)}
                >
                  <ArrowLeft className="size-4" />
                  Back to aisles
                </button>
                <AisleDetailColumn
                  {...detailProps}
                  allAisles={sortedAisles}
                  onSelectAisle={selectAisle}
                />
              </div>
            ) : (
              <div className="min-w-0 lg:order-1">
                <AisleListColumn {...listProps} />
              </div>
            )
          ) : (
            <>
              <div className="min-w-0 lg:order-1">
                <AisleListColumn {...listProps} />
              </div>
              <div className="min-w-0 lg:order-2">
                <AisleDetailColumn
                  {...detailProps}
                  allAisles={sortedAisles}
                  onSelectAisle={selectAisle}
                />
              </div>
            </>
          )}
        </div>
      )}

      {!isLg && selected && !mobileDetailOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 py-3 text-center backdrop-blur-sm">
          <button
            type="button"
            className="text-sm font-medium text-foreground"
            onClick={() => setMobileDetailOpen(true)}
          >
            View {selected.name}
          </button>
        </div>
      ) : null}

      <AisleCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        name={createName}
        code={createCode}
        onNameChange={setCreateName}
        onCodeChange={setCreateCode}
        busy={createBusy}
        onSubmit={() => void handleCreate()}
      />

      {selected ? (
        <AisleEditDrawer
          aisle={selected}
          open={editOpen}
          onOpenChange={setEditOpen}
          name={editName}
          code={editCode}
          onNameChange={setEditName}
          onCodeChange={setEditCode}
          busy={editBusy}
          error={editError}
          onSubmit={() => void saveEdit()}
        />
      ) : null}

      <AisleStatusDialog
        aisle={statusTarget}
        open={statusTarget != null}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
        busy={statusBusy}
        onConfirm={() => void confirmStatus()}
      />
    </div>
  );
}
