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
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { INK, NAVY } from "@/components/credits/customer-board-theme";
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
  const { business, me, branchId } = useDashboard();
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

      <div
        className={cn(
          "overflow-hidden rounded-none p-4 sm:p-5",
          loading && aisles.length === 0 && "opacity-90",
        )}
        style={{ background: NAVY }}
      >
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center bg-white">
              <MapPin className="size-6" aria-hidden style={{ color: INK }} />
            </span>
            <h1 className="min-w-0 font-sans text-[1.4rem] font-bold uppercase leading-tight tracking-[-0.02em] text-white sm:text-[1.75rem]">
              Shelf zones
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="hidden text-[11px] font-medium uppercase tracking-[-0.02em] text-white/85 sm:block">
              {me?.name || business?.name || ""}
            </p>
            <Link
              href={APP_ROUTES.products}
              className="text-[12px] text-white/85 underline-offset-2 hover:text-white hover:underline"
            >
              Products
            </Link>
            <Link
              href={APP_ROUTES.categories}
              className="text-[12px] text-white/85 underline-offset-2 hover:text-white hover:underline"
            >
              Categories
            </Link>
            <Link
              href={APP_ROUTES.itemTypes}
              className="text-[12px] text-white/85 underline-offset-2 hover:text-white hover:underline"
            >
              Departments
            </Link>
            <button
              type="button"
              className="flex size-11 items-center justify-center text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
              onClick={() => void load()}
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw
                className={cn("size-4", loading && "animate-spin")}
                aria-hidden
              />
            </button>
            {canWrite ? (
              <Button
                type="button"
                size="sm"
                className="h-11 rounded-none bg-white hover:bg-white/90"
                style={{ color: INK }}
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
        </header>

        <p className="mb-5 max-w-[72ch] text-[15px] leading-relaxed text-white">
          {visibleAisles.length.toLocaleString("en-KE")} walk stop
          {visibleAisles.length === 1 ? "" : "s"} in view ·{" "}
          {assignedTotal.toLocaleString("en-KE")} products tagged
          {unassignedCount > 0
            ? ` · ${unassignedCount.toLocaleString("en-KE")} still unassigned`
            : ""}
          .
          {selected
            ? ` ${selected.name} is open — products, stock, and movers on the right.`
            : " Pick an aisle on the left to open its shelf story."}
        </p>

        {loading && aisles.length === 0 ? (
          <DashboardLoading label="Mapping shelf zones…" />
        ) : aisles.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-16 text-center">
            <div className="flex size-12 items-center justify-center bg-white">
              <MapPin className="size-5" style={{ color: INK }} aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">No zones yet</h2>
            <p className="mt-1 max-w-xs text-sm text-white/80">
              Create your first walk stop — e.g. front beverages, back wall dairy.
            </p>
            {canWrite ? (
              <Button
                type="button"
                className="mt-5 gap-2 rounded-none bg-white hover:bg-white/90"
                style={{ color: INK }}
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
                    className="mb-3 flex items-center gap-2 text-[12px] text-white/85"
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
      </div>

      {!isLg && selected && !mobileDetailOpen ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-white/20 py-3 text-center"
          style={{ background: NAVY }}
        >
          <button
            type="button"
            className="text-[13px] font-medium text-white/90 hover:text-white"
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
