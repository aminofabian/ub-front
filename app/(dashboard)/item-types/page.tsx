"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  LayoutGrid,
  Package,
  Plus,
  Save,
  Tags,
  Trash2,
  X,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_TABLE_SURFACE,
  DASHBOARD_SECTION_SURFACE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import {
  type ItemTypeRecord,
  type CreateItemTypePayload,
  fetchItemTypes,
  createItemType,
  updateItemType,
  deleteItemType,
} from "@/lib/api";
import { buildPendingSectionCreates } from "@/lib/item-type-suggestions";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { ExtraSectionNames } from "./_components/extra-section-names";
import { SectionSuggestions } from "./_components/section-suggestions";

const INITIAL_EXTRA_NAMES = [""];

// ─── feedback ────────────────────────────────────────────────────────────────

type Feedback = { kind: "success" | "error"; text: string } | null;

// ─── create draft ─────────────────────────────────────────────────────────────

// ─── edit draft ───────────────────────────────────────────────────────────────

type EditDraft = CreateItemTypePayload & { active: boolean };

// ─── confirm-delete dialog ────────────────────────────────────────────────────

type ConfirmDelete = {
  id: string;
  key: string;
  label: string;
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ItemTypesPage() {
  const searchParams = useSearchParams();
  const { me } = useDashboard();
  const canWrite = hasPermission(me?.permissions, Permission.CatalogItemsWrite);

  // data
  const [rows, setRows] = useState<ItemTypeRecord[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  // feedback
  const [feedback, setFeedback] = useState<Feedback>(null);

  // drawers
  const [createOpen, setCreateOpen] = useState(false);
  const [sectionPickLabels, setSectionPickLabels] = useState<string[]>([]);
  const [extraNames, setExtraNames] = useState<string[]>(INITIAL_EXTRA_NAMES);
  const [createBusy, setCreateBusy] = useState(false);

  const resetCreateForm = useCallback(() => {
    setSectionPickLabels([]);
    setExtraNames(INITIAL_EXTRA_NAMES);
  }, []);

  const existingSectionKeys = useMemo(
    () => new Set(rows.map((r) => r.key.trim().toLowerCase())),
    [rows],
  );

  const existingSectionLabels = useMemo(
    () => new Set(rows.map((r) => r.label.trim().toLowerCase())),
    [rows],
  );

  const toggleSectionPick = useCallback((label: string) => {
    const k = label.trim().toLowerCase();
    setSectionPickLabels((prev) =>
      prev.some((p) => p.trim().toLowerCase() === k)
        ? prev.filter((p) => p.trim().toLowerCase() !== k)
        : [...prev, label],
    );
  }, []);

  const pendingSectionCreates = useMemo(
    () =>
      buildPendingSectionCreates({
        pickedLabels: sectionPickLabels,
        extraNames,
        existingKeys: existingSectionKeys,
        existingLabels: existingSectionLabels,
      }),
    [
      sectionPickLabels,
      extraNames,
      existingSectionKeys,
      existingSectionLabels,
    ],
  );

  const pendingSectionCount = pendingSectionCreates.length;

  const [editId, setEditId] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  // delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete | null>(
    null,
  );
  const [deleteBusy, setDeleteBusy] = useState(false);

  // ─── load ──────────────────────────────────────────────────────────────────

  const load = useCallback(() => {
    fetchItemTypes()
      .then((list) => {
        setRows(list);
        setLoadFailed(false);
        setFeedback(null);
      })
      .catch(() => {
        setLoadFailed(true);
        setRows([]);
        setFeedback({ kind: "error", text: "Failed to load departments." });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("onboarding") === "create-item-type" && canWrite) {
      resetCreateForm();
      setCreateOpen(true);
    }
  }, [searchParams, canWrite, resetCreateForm]);

  // ─── create ────────────────────────────────────────────────────────────────

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const plan = pendingSectionCreates;
      if (plan.length === 0) {
        setFeedback({
          kind: "error",
          text: "Pick at least one department, or add a name below.",
        });
        return;
      }
      setCreateBusy(true);
      setFeedback(null);

      const createdRows: ItemTypeRecord[] = [];
      let failCount = 0;

      try {
        for (let i = 0; i < plan.length; i++) {
          const row = plan[i]!;
          try {
            const created = await createItemType({
              key: row.key,
              label: row.label,
              sortOrder: rows.length + i,
            });
            createdRows.push(created);
          } catch {
            failCount += 1;
          }
        }

        if (createdRows.length > 0) {
          setRows((prev) => [...prev, ...createdRows]);
        }

        if (failCount === 0) {
          setCreateOpen(false);
          resetCreateForm();
          setFeedback({
            kind: "success",
            text:
              createdRows.length === 1
                ? `Department "${createdRows[0]!.label}" created.`
                : `Created ${createdRows.length} departments.`,
          });
        } else if (createdRows.length === 0) {
          setFeedback({ kind: "error", text: "Could not create departments." });
        } else {
          setFeedback({
            kind: "error",
            text: `Created ${createdRows.length}; ${failCount} failed.`,
          });
        }
      } finally {
        setCreateBusy(false);
      }
    },
    [pendingSectionCreates, resetCreateForm, rows.length],
  );

  // ─── edit ──────────────────────────────────────────────────────────────────

  const openEdit = useCallback((row: ItemTypeRecord) => {
    setEditId(row.id);
    setFeedback(null);
  }, []);

  const closeEdit = useCallback(() => {
    setEditId(null);
    setFeedback(null);
  }, []);

  const handleUpdate = useCallback(
    async (
      e: React.FormEvent<HTMLFormElement>,
      id: string,
      draft: EditDraft,
    ) => {
      e.preventDefault();
      if (!draft.key.trim() || !draft.label.trim()) {
        setFeedback({
          kind: "error",
          text: "Short code and department name are required.",
        });
        return;
      }
      setEditBusy(true);
      setFeedback(null);
      try {
        const updated = await updateItemType(id, draft);
        setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
        setEditId(null);
        setFeedback({
          kind: "success",
          text: `Department "${updated.label}" updated.`,
        });
      } catch {
        setFeedback({ kind: "error", text: "Failed to update department." });
      } finally {
        setEditBusy(false);
      }
    },
    [],
  );

  // ─── delete ────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setDeleteBusy(true);
    setFeedback(null);
    try {
      await deleteItemType(confirmDelete.id);
      setRows((prev) => prev.filter((r) => r.id !== confirmDelete.id));
      setConfirmDelete(null);
      setFeedback({
        kind: "success",
        text: `Department "${confirmDelete.label}" deleted.`,
      });
    } catch {
      setFeedback({ kind: "error", text: "Failed to delete department." });
    } finally {
      setDeleteBusy(false);
    }
  }, [confirmDelete]);

  // ─── render helpers ────────────────────────────────────────────────────────

  if (loadFailed && rows.length === 0) {
    return (
      <DashboardLoadError
        title="Failed to load"
        message={feedback?.text ?? "Could not load departments. Please try again."}
        onRetry={() => void load()}
      />
    );
  }

  if (!me) {
    return <DashboardLoading label="Loading departments…" />;
  }

  if (!hasPermission(me?.permissions, Permission.CatalogItemsRead)) {
    return (
      <DashboardAccessDenied
        title="Departments"
        description={
          <>
            You need <code className="text-xs">catalog.items.read</code> to view
            this page.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  return (
    <>
      <div className="h-full overflow-y-auto overscroll-contain">
        <div className={DASHBOARD_MAX_WIDE}>
          <div className="space-y-4">
            <DashboardPageHero
              compact
              icon={Tags}
              eyebrow="Catalog"
              title="Departments"
              description="Name each area how you run the shop — Grocery, Fruits, Retail shop, Mali mali. Not products. Not Categories."
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <DashboardQuickLinks
                compact
                links={[
                  {
                    href: APP_ROUTES.business,
                    label: "Business",
                    desc: "Workspace",
                    icon: Building2,
                  },
                  {
                    href: APP_ROUTES.products,
                    label: "Products",
                    desc: "Catalog items",
                    icon: Package,
                  },
                  {
                    href: APP_ROUTES.categories,
                    label: "Categories",
                    desc: "Separate product tree",
                    icon: LayoutGrid,
                  },
                ]}
              />
              {canWrite ? (
                <Button
                  type="button"
                  className="h-10 min-h-10 gap-2 self-start px-4 text-sm shadow-sm transition-shadow hover:shadow-md"
                  onClick={() => {
                    resetCreateForm();
                    setCreateOpen(true);
                    setFeedback(null);
                  }}
                >
                  <Plus className="size-4" aria-hidden />
                  Add department
                </Button>
              ) : null}
            </div>
          </div>

          {feedback ? (
            <DashboardFeedback
              kind={feedback.kind === "error" ? "error" : "success"}
              text={feedback.text}
            />
          ) : null}

          {!canWrite ? (
            <div
              role="note"
              className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3.5 text-sm leading-relaxed text-amber-950 shadow-sm dark:text-amber-50"
            >
              <span className="mt-0.5 size-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
              <p>
                View-only mode. Ask an admin for{" "}
                <span className="rounded bg-background/60 px-1 py-0.5 font-mono text-xs dark:bg-background/20">
                  catalog.items.write
                </span>
                .
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shadow-sm"
                onClick={() => void load()}
              >
                Refresh
              </Button>
            </div>
            <p className={cn(dashboardHintClass(), "tabular-nums")}>
              {rows.length} department{rows.length !== 1 ? "s" : ""}
            </p>
          </div>

          {rows.length === 0 ? (
            <div
              className={cn(
                DASHBOARD_SECTION_SURFACE,
                "border-dashed bg-muted/15 py-12 text-center",
              )}
            >
              <Tags
                className="mx-auto size-10 text-muted-foreground/60"
                aria-hidden
              />
              <h2 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                No departments yet
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                e.g. Grocery, Retail shop, Fruits
              </p>
              {canWrite ? (
                <Button
                  type="button"
                  className="mt-6 gap-2 shadow-sm transition-shadow hover:shadow-md"
                  onClick={() => {
                    resetCreateForm();
                    setCreateOpen(true);
                    setFeedback(null);
                  }}
                >
                  <Plus className="size-4" aria-hidden />
                  Add department
                </Button>
              ) : null}
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className={DASHBOARD_TABLE_SURFACE}>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/50 bg-muted/25">
                  <tr>
                    <th
                      scope="col"
                      className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                    >
                      Short code
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                    >
                      Department
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                    >
                      Icon
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                    >
                      Color
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                    >
                      Sort
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                    >
                      Active
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                    >
                      Default
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-5 py-4 font-mono text-xs text-foreground sm:px-6">
                        {row.key}
                      </td>
                      <td className="px-5 py-4 font-medium text-foreground sm:px-6">
                        {row.label}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground sm:px-6">
                        {row.icon || "\u2014"}
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        {row.color ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="inline-block size-4 rounded-full border border-border/60"
                              style={{ backgroundColor: row.color }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {row.color}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">&mdash;</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground sm:px-6">
                        {row.sortOrder}
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        {row.active ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <X className="size-3.5 shrink-0" aria-hidden />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        {row.isDefault ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                            <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                            Default
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            &mdash;
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right sm:px-6">
                        {canWrite ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 px-2 text-xs hover:bg-muted"
                              onClick={() => openEdit(row)}
                            >
                              <Save className="size-3.5" aria-hidden />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                setConfirmDelete({
                                  id: row.id,
                                  key: row.key,
                                  label: row.label,
                                })
                              }
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                              Delete
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      {/* Create drawer */}
      <FormDrawer
        open={createOpen}
        onboardingTarget={ONBOARDING_TARGETS.itemTypesDrawer}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            resetCreateForm();
            setCreateBusy(false);
          }
        }}
        title="Add departments"
        description="Grey chips are already in your list. Tap others to select."
        contextLabel="Catalog · Create"
        icon={<Plus className="size-5 text-primary" aria-hidden />}
        banner={
          feedback && createOpen ? (
            <DashboardFeedback
              kind={feedback.kind === "error" ? "error" : "success"}
              text={feedback.text}
            />
          ) : undefined
        }
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                resetCreateForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-item-type-form"
              disabled={createBusy || pendingSectionCount === 0}
            >
              {createBusy
                ? "Creating…"
                : pendingSectionCount > 1
                  ? `Create ${pendingSectionCount} departments`
                  : pendingSectionCount === 1
                    ? "Create department"
                    : "Create"}
            </Button>
          </div>
        }
      >
        <form
          id="create-item-type-form"
          className="space-y-4"
          onSubmit={(e) => void handleCreate(e)}
        >
          <SectionSuggestions
            existingKeySet={existingSectionKeys}
            existingLabelSet={existingSectionLabels}
            pickedLabels={sectionPickLabels}
            onTogglePick={toggleSectionPick}
            onSetPicks={setSectionPickLabels}
            onboardingHighlight={
              searchParams.get("onboarding") === "create-item-type"
            }
          />

          <ExtraSectionNames names={extraNames} onChange={setExtraNames} />
        </form>
      </FormDrawer>

      {/* Edit drawer */}
      {editId ? (
        <EditItemTypeDrawer
          key={editId}
          row={rows.find((r) => r.id === editId)!}
          onClose={closeEdit}
          onSave={handleUpdate}
          busy={editBusy}
          feedback={feedback}
        />
      ) : null}

      {/* Delete confirmation dialog */}
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-card p-6 shadow-lg ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Delete department?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Delete <strong className="text-foreground">{confirmDelete.label}</strong>? This
              cannot be undone.
            </p>
            <div className="mt-8 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(null)}
                disabled={deleteBusy}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleDelete()}
                disabled={deleteBusy}
              >
                {deleteBusy ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

// ─── edit drawer component ────────────────────────────────────────────────────

function EditItemTypeDrawer({
  row,
  onClose,
  onSave,
  busy,
  feedback,
}: {
  row: ItemTypeRecord;
  onClose: () => void;
  onSave: (
    e: React.FormEvent<HTMLFormElement>,
    id: string,
    draft: EditDraft,
  ) => Promise<void>;
  busy: boolean;
  feedback: Feedback;
}) {
  const [draft, setDraft] = useState<EditDraft>({
    key: row.key,
    label: row.label,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sortOrder,
    active: row.active,
    isDefault: row.isDefault,
  });
  const [open, setOpen] = useState(true);

  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setOpen(false);
          onClose();
        }
      }}
      title={`Edit "${row.label}"`}
      contextLabel="Catalog · Edit"
      icon={<Save className="size-5 text-primary" aria-hidden />}
      banner={
        feedback ? (
          <DashboardFeedback
            kind={feedback.kind === "error" ? "error" : "success"}
            text={feedback.text}
          />
        ) : undefined
      }
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-item-type-form" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <form
        id="edit-item-type-form"
        className="space-y-4"
        onSubmit={(e) => void onSave(e, row.id, draft)}
      >
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Name
          <input
            className={dashboardInputClass()}
            value={draft.label}
            onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
            aria-label="Department name"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Short code
          <input
            className={dashboardInputClass()}
            value={draft.key}
            onChange={(e) => setDraft((p) => ({ ...p, key: e.target.value }))}
            aria-label="Department short code"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-input accent-primary"
            checked={draft.active}
            onChange={(e) => setDraft((p) => ({ ...p, active: e.target.checked }))}
          />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-input accent-primary"
            checked={draft.isDefault ?? false}
            onChange={(e) =>
              setDraft((p) => ({ ...p, isDefault: e.target.checked }))
            }
          />
          Default for new products
        </label>
      </form>
    </FormDrawer>
  );
}
