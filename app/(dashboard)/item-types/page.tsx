"use client";

import { useCallback, useEffect, useState } from "react";
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
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
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
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

// ─── feedback ────────────────────────────────────────────────────────────────

type Feedback = { kind: "success" | "error"; text: string } | null;

// ─── create draft ─────────────────────────────────────────────────────────────

const EMPTY_CREATE_DRAFT: CreateItemTypePayload = {
  key: "",
  label: "",
  icon: "",
  color: "",
  sortOrder: undefined,
  isDefault: false,
};

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
  const [createDraft, setCreateDraft] =
    useState<CreateItemTypePayload>(EMPTY_CREATE_DRAFT);
  const [createBusy, setCreateBusy] = useState(false);

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
        setFeedback({ kind: "error", text: "Failed to load item types." });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("onboarding") === "create-item-type" && canWrite) {
      setCreateDraft(EMPTY_CREATE_DRAFT);
      setCreateOpen(true);
    }
  }, [searchParams, canWrite]);

  // ─── create ────────────────────────────────────────────────────────────────

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const { key, label } = createDraft;
      if (!key.trim() || !label.trim()) {
        setFeedback({ kind: "error", text: "Key and label are required." });
        return;
      }
      setCreateBusy(true);
      setFeedback(null);
      try {
        const created = await createItemType({
          ...createDraft,
          key: key.trim(),
          label: label.trim(),
        });
        setRows((prev) => [...prev, created]);
        setCreateOpen(false);
        setCreateDraft(EMPTY_CREATE_DRAFT);
        setFeedback({
          kind: "success",
          text: `Item type "${created.label}" created.`,
        });
      } catch {
        setFeedback({ kind: "error", text: "Failed to create item type." });
      } finally {
        setCreateBusy(false);
      }
    },
    [createDraft],
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
        setFeedback({ kind: "error", text: "Key and label are required." });
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
          text: `Item type "${updated.label}" updated.`,
        });
      } catch {
        setFeedback({ kind: "error", text: "Failed to update item type." });
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
        text: `Item type "${confirmDelete.label}" deleted.`,
      });
    } catch {
      setFeedback({ kind: "error", text: "Failed to delete item type." });
    } finally {
      setDeleteBusy(false);
    }
  }, [confirmDelete]);

  // ─── render helpers ────────────────────────────────────────────────────────

  if (loadFailed && rows.length === 0) {
    return (
      <DashboardLoadError
        title="Failed to load"
        message={feedback?.text ?? "Could not load item types. Please try again."}
        onRetry={() => void load()}
      />
    );
  }

  if (!me) {
    return <DashboardLoading label="Loading item types…" />;
  }

  if (!hasPermission(me?.permissions, Permission.CatalogItemsRead)) {
    return (
      <DashboardAccessDenied
        title="Item types"
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
              title="Item types"
              description="Manage item type classifications used across products."
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
                    desc: "Category tree",
                    icon: LayoutGrid,
                  },
                ]}
              />
              {canWrite ? (
                <Button
                  type="button"
                  className="h-10 min-h-10 gap-2 self-start px-4 text-sm shadow-sm transition-shadow hover:shadow-md"
                  onClick={() => {
                    setCreateDraft(EMPTY_CREATE_DRAFT);
                    setCreateOpen(true);
                    setFeedback(null);
                  }}
                >
                  <Plus className="size-4" aria-hidden />
                  Create item type
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
              {rows.length} item type{rows.length !== 1 ? "s" : ""}
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
                No item types yet
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Create your first item type to categorise products.
              </p>
              {canWrite ? (
                <Button
                  type="button"
                  className="mt-6 gap-2 shadow-sm transition-shadow hover:shadow-md"
                  onClick={() => {
                    setCreateDraft(EMPTY_CREATE_DRAFT);
                    setCreateOpen(true);
                    setFeedback(null);
                  }}
                >
                  <Plus className="size-4" aria-hidden />
                  Create item type
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
                      Key
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                    >
                      Label
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
            setCreateDraft(EMPTY_CREATE_DRAFT);
            setCreateBusy(false);
          }
        }}
        title="Create item type"
        description="Add a new classification that products can be grouped by."
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
                setCreateDraft(EMPTY_CREATE_DRAFT);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-item-type-form"
              disabled={createBusy}
            >
              {createBusy ? "Creating…" : "Create"}
            </Button>
          </div>
        }
      >
        <form
          id="create-item-type-form"
          className="space-y-5"
          onSubmit={(e) => void handleCreate(e)}
        >
          <FormDrawerFields legend="Identity">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Key
              <input
                className={dashboardInputClass()}
                value={createDraft.key}
                onChange={(e) =>
                  setCreateDraft((p) => ({ ...p, key: e.target.value }))
                }
                placeholder="e.g. finished-good"
                aria-label="Item type key"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Label
              <input
                className={dashboardInputClass()}
                value={createDraft.label}
                onChange={(e) =>
                  setCreateDraft((p) => ({ ...p, label: e.target.value }))
                }
                placeholder="e.g. Finished Good"
                aria-label="Item type label"
              />
            </label>
          </FormDrawerFields>

          <FormDrawerFields legend="Appearance (optional)">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Icon
                <input
                  className={dashboardInputClass()}
                  value={createDraft.icon ?? ""}
                  onChange={(e) =>
                    setCreateDraft((p) => ({ ...p, icon: e.target.value }))
                  }
                  placeholder="e.g. package-icon"
                  aria-label="Item type icon"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Color
                <input
                  className={dashboardInputClass()}
                  value={createDraft.color ?? ""}
                  onChange={(e) =>
                    setCreateDraft((p) => ({ ...p, color: e.target.value }))
                  }
                  placeholder="e.g. #ff6600"
                  aria-label="Item type color"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Sort order
              <input
                type="number"
                className={dashboardInputClass()}
                value={createDraft.sortOrder ?? ""}
                onChange={(e) =>
                  setCreateDraft((p) => ({
                    ...p,
                    sortOrder: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
                placeholder="e.g. 1"
                aria-label="Item type sort order"
              />
            </label>
          </FormDrawerFields>

          <FormDrawerFields legend="Default">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-input accent-primary"
                checked={createDraft.isDefault ?? false}
                onChange={(e) =>
                  setCreateDraft((p) => ({ ...p, isDefault: e.target.checked }))
                }
              />
              <span className="text-foreground">Use as default item type</span>
            </label>
            <p className="text-xs text-muted-foreground">
              The default item type is pre-selected when creating new products.
            </p>
          </FormDrawerFields>
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
              Delete item type?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You are about to delete <strong className="text-foreground">{confirmDelete.label}</strong>{" "}
              (key: <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{confirmDelete.key}</code>). This
              action cannot be undone.
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
      description="Update the item type details."
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
        className="space-y-5"
        onSubmit={(e) => void onSave(e, row.id, draft)}
      >
        <FormDrawerFields legend="Identity">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Key
            <input
              className={dashboardInputClass()}
              value={draft.key}
              onChange={(e) => setDraft((p) => ({ ...p, key: e.target.value }))}
              placeholder="e.g. finished-good"
              aria-label="Item type key"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Label
            <input
              className={dashboardInputClass()}
              value={draft.label}
              onChange={(e) =>
                setDraft((p) => ({ ...p, label: e.target.value }))
              }
              placeholder="e.g. Finished Good"
              aria-label="Item type label"
            />
          </label>
        </FormDrawerFields>

        <FormDrawerFields legend="Appearance (optional)">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Icon
              <input
                className={dashboardInputClass()}
                value={draft.icon ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, icon: e.target.value }))
                }
                placeholder="e.g. package-icon"
                aria-label="Item type icon"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Color
              <input
                className={dashboardInputClass()}
                value={draft.color ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, color: e.target.value }))
                }
                placeholder="e.g. #ff6600"
                aria-label="Item type color"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Sort order
            <input
              type="number"
              className={dashboardInputClass()}
              value={draft.sortOrder ?? ""}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  sortOrder: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                }))
              }
              placeholder="e.g. 1"
              aria-label="Item type sort order"
            />
          </label>
        </FormDrawerFields>

        <FormDrawerFields legend="Status">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              checked={draft.active}
              onChange={(e) =>
                setDraft((p) => ({ ...p, active: e.target.checked }))
              }
            />
            <span className="text-foreground">Active</span>
          </label>
        </FormDrawerFields>

        <FormDrawerFields legend="Default">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              checked={draft.isDefault ?? false}
              onChange={(e) =>
                setDraft((p) => ({ ...p, isDefault: e.target.checked }))
              }
            />
            <span className="text-foreground">Use as default item type</span>
          </label>
          <p className="text-xs text-muted-foreground">
            The default item type is pre-selected when creating new products.
          </p>
        </FormDrawerFields>
      </form>
    </FormDrawer>
  );
}
