"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import {
  DirectoryBackButton,
  DirectoryColumn,
  DirectoryMobileTabs,
  DirectoryToolbar,
  directoryFrameClass,
} from "@/components/credits/directory-workspace-ui";
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
    <div className="mx-auto w-full max-w-[1320px] px-2 pb-14 pt-1 sm:px-3 sm:pt-2">
      {feedback ? (
        <div className="mb-2">
          <DashboardFeedback kind={feedback.kind} text={feedback.text} />
        </div>
      ) : null}

      <DirectoryToolbar
        icon={MapPin}
        eyebrow="Catalog"
        title="Shelf zones"
        meta={summary}
        links={[
          { href: APP_ROUTES.products, label: "Products" },
          { href: APP_ROUTES.categories, label: "Categories" },
          { href: APP_ROUTES.itemTypes, label: "Departments" },
        ]}
        actions={
          <>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => void load()}
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw
                className={cn("size-3.5", loading && "animate-spin")}
                aria-hidden
              />
            </Button>
            {canWrite ? (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => {
                  setCreateName("");
                  setCreateCode("");
                  setCreateOpen(true);
                }}
              >
                <Plus className="size-3.5" />
                New
              </Button>
            ) : null}
          </>
        }
      />

      {loading && aisles.length === 0 ? (
        <DashboardLoading label="Loading shelf zones…" />
      ) : aisles.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/80 px-4 py-12 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40">
            <MapPin className="size-4 text-muted-foreground" aria-hidden />
          </div>
          <h2 className="mt-3 text-base font-semibold text-foreground">No zones yet</h2>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Create walk stops — e.g. front beverages, back wall dairy.
          </p>
          {canWrite ? (
            <Button type="button" size="sm" className="mt-4 h-8 text-xs" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              New zone
            </Button>
          ) : null}
        </div>
      ) : (
        <div className={directoryFrameClass}>
          <div className="grid min-h-0 flex-1 divide-y lg:grid-cols-[13rem_minmax(0,1fr)] lg:divide-x lg:divide-y-0 divide-border/60">
            {!isLg ? (
              mobileDetailOpen && selected ? (
                <DirectoryColumn title="Aisle" hint={selected.name}>
                  <DirectoryBackButton
                    label="All aisles"
                    onClick={() => setMobileDetailOpen(false)}
                  />
                  <AisleDetailColumn
                    {...detailProps}
                    allAisles={sortedAisles}
                    onSelectAisle={selectAisle}
                  />
                </DirectoryColumn>
              ) : (
                <DirectoryColumn
                  title="Walk order"
                  hint="Tap to inspect"
                  badge={visibleAisles.length}
                >
                  <AisleListColumn {...listProps} />
                </DirectoryColumn>
              )
            ) : (
              <>
                <DirectoryColumn
                  title="Walk order"
                  hint="Aisles on the floor"
                  badge={visibleAisles.length}
                >
                  <AisleListColumn {...listProps} />
                </DirectoryColumn>
                <DirectoryColumn
                  title="Shelf intelligence"
                  hint={selected?.name ?? "Pick an aisle"}
                >
                  <AisleDetailColumn
                    {...detailProps}
                    allAisles={sortedAisles}
                    onSelectAisle={selectAisle}
                  />
                </DirectoryColumn>
              </>
            )}
          </div>
        </div>
      )}

      {!isLg && selected && !mobileDetailOpen ? (
        <DirectoryMobileTabs
          tabs={[
            {
              id: "detail",
              label: selected.name,
              onClick: () => setMobileDetailOpen(true),
            },
          ]}
        />
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
