"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Footprints,
  LayoutGrid,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Tags,
} from "lucide-react";

import {
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
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
import { AisleEditDrawer } from "./aisle-edit-drawer";
import { AisleStatusDialog } from "./aisle-status-dialog";
import { AislesLayout } from "./aisles-layout";

type Feedback = { kind: "success" | "error"; text: string } | null;

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

function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        accent
          ? "border-[color-mix(in_srgb,var(--aisle-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aisle-primary)_8%,var(--aisle-slip))]"
          : "border-[color-mix(in_srgb,var(--aisle-ink)_10%,transparent)] bg-[color-mix(in_srgb,var(--aisle-slip)_92%,transparent)]",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--aisle-ink)_48%,transparent)]">
        {label}
      </p>
      <p className="mt-1 font-heading text-xl font-semibold tabular-nums tracking-tight text-[var(--aisle-ink)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function InspectorPanel({
  aisle,
  canWrite,
  reorderBusy,
  index,
  walkStops,
  catalogTotal,
  onMoveUp,
  onMoveDown,
  onEdit,
  onToggleStatus,
  onClose,
}: {
  aisle: AisleRecord;
  canWrite: boolean;
  reorderBusy: boolean;
  index: number;
  walkStops: number;
  catalogTotal: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onClose?: () => void;
}) {
  const share =
    catalogTotal > 0
      ? Math.round((aisle.productCount / catalogTotal) * 100)
      : 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-[color-mix(in_srgb,var(--aisle-ink)_10%,transparent)] px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--aisle-ink)_45%,transparent)]">
            Inspector
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Stop {index + 1} of {walkStops}
          </p>
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onClose}
          >
            Close
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--aisle-ink)_12%,transparent)] bg-[var(--aisle-slip)] p-4 shadow-[0_12px_40px_-28px_color-mix(in_srgb,var(--aisle-ink)_25%,transparent)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-[color-mix(in_srgb,var(--aisle-primary)_12%,transparent)]"
          />
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aisle-primary)]">
            {aisle.code}
          </p>
          <h2 className="mt-2 font-heading text-2xl font-semibold leading-tight tracking-[-0.03em] text-[var(--aisle-ink)]">
            {aisle.name}
          </h2>
          {!aisle.active ? (
            <span className="mt-2 inline-flex rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Inactive
            </span>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[color-mix(in_srgb,var(--aisle-paper)_70%,transparent)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Products
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {aisle.productCount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-[color-mix(in_srgb,var(--aisle-paper)_70%,transparent)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Catalog share
              </p>
              <p className="text-lg font-semibold tabular-nums">{share}%</p>
            </div>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--aisle-grid)_40%,transparent)]">
            <div
              className="h-full rounded-full bg-[var(--aisle-primary)] transition-[width] duration-300"
              style={{ width: `${Math.min(100, share)}%` }}
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Button type="button" className="w-full justify-between gap-2" asChild>
            <Link href={`${APP_ROUTES.products}?aisleId=${encodeURIComponent(aisle.id)}`}>
              View products in zone
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
          {canWrite ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={onEdit}
                >
                  <Pencil className="size-3.5" aria-hidden />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onToggleStatus}
                >
                  {aisle.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-dashed border-[color-mix(in_srgb,var(--aisle-ink)_14%,transparent)] px-3 py-2">
                <span className="text-[11px] text-muted-foreground">Walk order</span>
                <div className="flex gap-0.5">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={reorderBusy || index === 0}
                    onClick={onMoveUp}
                    aria-label="Move up"
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={reorderBusy || index === walkStops - 1}
                    onClick={onMoveDown}
                    aria-label="Move down"
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AislesWorkspace({ canWrite }: { canWrite: boolean }) {
  const isLg = useIsLg();
  const [aisles, setAisles] = useState<AisleRecord[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);

  const sortedAisles = useMemo(
    () =>
      [...aisles].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [aisles],
  );

  const activeCount = useMemo(
    () => aisles.filter((a) => a.active).length,
    [aisles],
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
    if (!isLg) setMobileInspectorOpen(true);
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

  const header = (
    <header className="shrink-0 space-y-3 px-0.5 sm:px-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--aisle-ink)_42%,transparent)]">
            Your shop
          </p>
          <h1 className="mt-1 flex items-center gap-2 font-heading text-xl font-semibold tracking-[-0.03em] text-[var(--aisle-ink)] sm:text-2xl">
            <MapPin className="size-5 text-[var(--aisle-primary)]" aria-hidden />
            Shelf zones
          </h1>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--aisle-ink)_58%,transparent)] sm:text-sm">
            Floor walk paths for restock and stock take — separate from categories
            and departments.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
          {canWrite ? (
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1.5 shadow-sm"
              onClick={() => {
                setCreateName("");
                setCreateCode("");
                setCreateOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              New zone
            </Button>
          ) : null}
        </div>
      </div>
      <DashboardQuickLinks
        compact
        links={[
          {
            href: APP_ROUTES.products,
            label: "Products",
            desc: "Assign zones",
            icon: Package,
          },
          {
            href: APP_ROUTES.categories,
            label: "Categories",
            desc: "What it is",
            icon: LayoutGrid,
          },
          {
            href: APP_ROUTES.itemTypes,
            label: "Departments",
            desc: "How you run",
            icon: Tags,
          },
        ]}
      />
    </header>
  );

  if (loadError && aisles.length === 0) {
    return (
      <AislesLayout header={header}>
        <DashboardLoadError
          title="Couldn't load shelf zones"
          message={loadError}
          onRetry={() => void load()}
        />
      </AislesLayout>
    );
  }

  return (
    <AislesLayout header={header}>
      {feedback ? (
        <DashboardFeedback kind={feedback.kind} text={feedback.text} />
      ) : null}

      {loading && aisles.length === 0 ? (
        <DashboardLoading label="Mapping shelf zones…" />
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)] xl:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)_minmax(15rem,18rem)]">
          {/* Left — insights rail */}
          <aside className="flex flex-col gap-3 lg:min-h-0">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <StatTile label="Walk stops" value={String(activeCount)} hint="Active zones" />
              <StatTile
                label="Tagged"
                value={assignedTotal.toLocaleString()}
                hint="Products with a zone"
              />
            </div>

            <Link
              href={`${APP_ROUTES.products}?aisleUnset=1`}
              className="group block rounded-xl border border-[color-mix(in_srgb,var(--aisle-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aisle-primary)_6%,var(--aisle-slip))] p-3 transition-colors hover:border-[var(--aisle-primary)]"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aisle-primary)]">
                Unassigned
              </p>
              <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-[var(--aisle-ink)]">
                {unassignedCount.toLocaleString()}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-foreground">
                Review in products
                <ArrowRight className="size-3" aria-hidden />
              </p>
            </Link>

            <div className="hidden rounded-xl border border-[color-mix(in_srgb,var(--aisle-ink)_10%,transparent)] bg-[color-mix(in_srgb,var(--aisle-slip)_90%,transparent)] p-3 lg:block">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <Footprints className="size-3" aria-hidden />
                Taxonomy
              </p>
              <ul className="mt-2 space-y-2 text-[11px] leading-snug text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">Department</span> — how
                  you run the shop
                </li>
                <li>
                  <span className="font-medium text-foreground">Category</span> — what
                  the product is
                </li>
                <li>
                  <span className="font-medium text-foreground">Shelf zone</span> — where
                  feet walk
                </li>
              </ul>
            </div>
          </aside>

          {/* Center — walk path */}
          <section
            className="flex min-h-[min(60dvh,28rem)] min-w-0 flex-col overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--aisle-ink)_10%,transparent)] bg-[color-mix(in_srgb,var(--aisle-slip)_94%,transparent)] shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_60%,transparent)] lg:min-h-0"
            aria-label="Walk path"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--aisle-ink)_8%,transparent)] px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--aisle-ink)_45%,transparent)]">
                  Walk path
                </p>
                <p className="text-xs text-muted-foreground">
                  Top to bottom is how staff walk during stock take
                </p>
              </div>
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {sortedAisles.length} stop{sortedAisles.length === 1 ? "" : "s"}
              </p>
            </div>

            <div
              className="relative min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"
              style={{
                backgroundImage: `
                  linear-gradient(color-mix(in srgb, var(--aisle-grid) 18%, transparent) 1px, transparent 1px),
                  linear-gradient(90deg, color-mix(in srgb, var(--aisle-grid) 18%, transparent) 1px, transparent 1px)
                `,
                backgroundSize: "20px 20px",
              }}
            >
              {sortedAisles.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--aisle-ink)_18%,transparent)] bg-[var(--aisle-paper)]">
                    <MapPin className="size-5 text-[var(--aisle-primary)]" aria-hidden />
                  </div>
                  <h2 className="mt-4 font-heading text-lg font-semibold text-[var(--aisle-ink)]">
                    No zones yet
                  </h2>
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
                <ol className="relative mx-auto max-w-lg space-y-0">
                  {sortedAisles.map((a, index) => {
                    const selectedRow = selectedId === a.id;
                    const isLast = index === sortedAisles.length - 1;
                    return (
                      <li key={a.id} className="relative flex gap-3 pb-3">
                        {!isLast ? (
                          <span
                            aria-hidden
                            className="absolute left-[1.125rem] top-9 bottom-0 w-px bg-[color-mix(in_srgb,var(--aisle-primary)_35%,transparent)]"
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => selectAisle(a.id)}
                          className={cn(
                            "group flex w-full min-w-0 items-stretch gap-3 rounded-xl border text-left transition-[border-color,box-shadow,transform] duration-200",
                            selectedRow
                              ? "border-[var(--aisle-primary)] bg-[color-mix(in_srgb,var(--aisle-primary)_9%,var(--aisle-slip))] shadow-[0_8px_28px_-16px_color-mix(in_srgb,var(--aisle-primary)_55%,transparent)]"
                              : "border-[color-mix(in_srgb,var(--aisle-ink)_12%,transparent)] bg-[color-mix(in_srgb,var(--aisle-slip)_96%,#fff)] hover:border-[color-mix(in_srgb,var(--aisle-primary)_35%,transparent)]",
                            !a.active && "opacity-60",
                          )}
                        >
                          <div className="flex w-9 shrink-0 flex-col items-center pt-3">
                            <span
                              className={cn(
                                "flex size-9 items-center justify-center rounded-full border-2 font-mono text-xs font-bold tabular-nums",
                                selectedRow
                                  ? "border-[var(--aisle-primary)] bg-[var(--aisle-primary)] text-white"
                                  : "border-[color-mix(in_srgb,var(--aisle-ink)_15%,transparent)] bg-[var(--aisle-paper)] text-[var(--aisle-ink)]",
                              )}
                            >
                              {index + 1}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 py-3 pr-3">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                              <p className="font-medium text-[var(--aisle-ink)]">{a.name}</p>
                              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--aisle-primary)]">
                                {a.code}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {a.productCount.toLocaleString()} products
                              {!a.active ? " · inactive" : ""}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>

          {/* Right — inspector (desktop) */}
          <aside className="hidden min-h-0 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--aisle-ink)_10%,transparent)] bg-[color-mix(in_srgb,var(--aisle-slip)_96%,transparent)] xl:flex xl:flex-col">
            {selected && selectedIndex >= 0 ? (
              <InspectorPanel
                aisle={selected}
                canWrite={canWrite}
                reorderBusy={reorderBusy}
                index={selectedIndex}
                walkStops={sortedAisles.length}
                catalogTotal={catalogTotal}
                onMoveUp={() => void moveAisle(selectedIndex, -1)}
                onMoveDown={() => void moveAisle(selectedIndex, 1)}
                onEdit={openEdit}
                onToggleStatus={() => setStatusTarget(selected)}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <Footprints className="size-8 text-[color-mix(in_srgb,var(--aisle-ink)_25%,transparent)]" />
                <p className="mt-3 text-sm font-medium text-[var(--aisle-ink)]">
                  Select a walk stop
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Details and actions appear here
                </p>
              </div>
            )}
          </aside>
        </div>
      )}

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

      {selected && selectedIndex >= 0 && !isLg ? (
        <FormDrawer
          open={mobileInspectorOpen}
          onOpenChange={setMobileInspectorOpen}
          contextLabel={selected.code}
          title={selected.name}
          description="Shelf zone details"
          width="default"
          appearance="sharp"
          bodyLayout="fill"
        >
          <InspectorPanel
            aisle={selected}
            canWrite={canWrite}
            reorderBusy={reorderBusy}
            index={selectedIndex}
            walkStops={sortedAisles.length}
            catalogTotal={catalogTotal}
            onMoveUp={() => void moveAisle(selectedIndex, -1)}
            onMoveDown={() => void moveAisle(selectedIndex, 1)}
            onEdit={() => {
              setMobileInspectorOpen(false);
              openEdit();
            }}
            onToggleStatus={() => {
              setMobileInspectorOpen(false);
              setStatusTarget(selected);
            }}
            onClose={() => setMobileInspectorOpen(false)}
          />
        </FormDrawer>
      ) : null}
    </AislesLayout>
  );
}
