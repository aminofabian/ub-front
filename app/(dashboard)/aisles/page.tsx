"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Pencil, Plus, ChevronDown, ChevronUp } from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  createAisle,
  fetchAisles,
  fetchUnassignedAisleCount,
  updateAisle,
  type AisleRecord,
} from "@/lib/api";
import { labelToAisleCode } from "@/lib/aisle-suggestions";
import { hasPermission, Permission } from "@/lib/permissions";

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function AislesPage() {
  const { me } = useDashboard();
  const canWrite = hasPermission(me?.permissions, Permission.CatalogItemsWrite);

  const [aisles, setAisles] = useState<AisleRecord[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const sortedAisles = useMemo(
    () =>
      [...aisles].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [aisles],
  );

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
      setAisles((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
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

  const toggleActive = async (aisle: AisleRecord) => {
    if (!canWrite) return;
    setFeedback(null);
    try {
      const updated = await updateAisle(aisle.id, { active: !aisle.active });
      setAisles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not update shelf zone.",
      });
    }
  };

  const startEdit = (aisle: AisleRecord) => {
    setEditingId(aisle.id);
    setEditName(aisle.name);
    setEditCode(aisle.code);
    setFeedback(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditCode("");
  };

  const saveEdit = async () => {
    if (!editingId || !canWrite) return;
    const name = editName.trim();
    const code = editCode.trim();
    if (!name || !code) {
      setFeedback({ kind: "error", text: "Name and code are required." });
      return;
    }
    setEditBusy(true);
    setFeedback(null);
    try {
      const updated = await updateAisle(editingId, { name, code });
      setAisles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      cancelEdit();
      setFeedback({ kind: "success", text: `Updated ${updated.name}.` });
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not update shelf zone.",
      });
    } finally {
      setEditBusy(false);
    }
  };

  if (!hasPermission(me?.permissions, Permission.CatalogItemsRead)) {
    return (
      <DashboardAccessDenied
        title="Shelf zones"
        description={
          <>
            You need <code className="text-xs">catalog.items.read</code> to view
            this page.
          </>
        }
        backHref={APP_ROUTES.products}
        backLabel="Products"
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <DashboardPageHero
        title="Shelf zones"
        description="Optional floor locations for products — where staff walk to find or restock items. Different from categories (what it is) and departments (how you run the shop). Drag order sets walk path for stock take."
        icon={MapPin}
      />

      {feedback ? <DashboardFeedback kind={feedback.kind} text={feedback.text} /> : null}
      {loadError ? (
        <DashboardLoadError
          title="Couldn't load shelf zones"
          message={loadError}
          onRetry={() => void load()}
        />
      ) : null}

      {loading ? (
        <DashboardLoading label="Loading shelf zones…" />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <Link
                href={`${APP_ROUTES.products}?aisleUnset=1`}
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                {unassignedCount.toLocaleString()} products
              </Link>{" "}
              have no shelf zone
            </p>
            {canWrite ? (
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={() => setCreateOpen((o) => !o)}
              >
                <Plus className="size-4" aria-hidden />
                New shelf zone
              </Button>
            ) : null}
          </div>

          {createOpen && canWrite ? (
            <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <input
                    className={dashboardInputClass()}
                    value={createName}
                    onChange={(e) => {
                      setCreateName(e.target.value);
                      if (!createCode.trim()) {
                        setCreateCode(labelToAisleCode(e.target.value));
                      }
                    }}
                    placeholder="Front · Beverages"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Code</span>
                  <input
                    className={dashboardInputClass()}
                    value={createCode}
                    onChange={(e) => setCreateCode(e.target.value)}
                    placeholder="a1-beverages"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={createBusy}
                  onClick={() => void handleCreate()}
                >
                  {createBusy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  Create
                </Button>
              </div>
            </div>
          ) : null}

          <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
            {aisles.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                No shelf zones yet. Create one to start assigning products.
              </li>
            ) : (
              sortedAisles.map((a, index) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  {editingId === a.id && canWrite ? (
                    <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                      <label className="block space-y-1 text-sm">
                        <span className="text-muted-foreground">Name</span>
                        <input
                          className={dashboardInputClass()}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={editBusy}
                        />
                      </label>
                      <label className="block space-y-1 text-sm">
                        <span className="text-muted-foreground">Code</span>
                        <input
                          className={dashboardInputClass()}
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          disabled={editBusy}
                        />
                      </label>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={editBusy}
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={editBusy}
                          onClick={() => void saveEdit()}
                        >
                          {editBusy ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                          ) : null}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {a.name}
                      {!a.active ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (inactive)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.code} · {a.productCount.toLocaleString()} products
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canWrite ? (
                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          disabled={reorderBusy || index === 0}
                          onClick={() => void moveAisle(index, -1)}
                          aria-label={`Move ${a.name} up`}
                        >
                          <ChevronUp className="size-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          disabled={
                            reorderBusy || index === sortedAisles.length - 1
                          }
                          onClick={() => void moveAisle(index, 1)}
                          aria-label={`Move ${a.name} down`}
                        >
                          <ChevronDown className="size-4" aria-hidden />
                        </Button>
                      </div>
                    ) : null}
                    <Button type="button" size="sm" variant="outline" asChild>
                      <Link href={`${APP_ROUTES.products}?aisleId=${encodeURIComponent(a.id)}`}>
                        View products
                      </Link>
                    </Button>
                    {canWrite ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          onClick={() => startEdit(a)}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void toggleActive(a)}
                        >
                          {a.active ? "Deactivate" : "Activate"}
                        </Button>
                      </>
                    ) : null}
                  </div>
                    </>
                  )}
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}
