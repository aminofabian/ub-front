"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { PROCUREMENT_VARS } from "@/components/procurement/procurement-hub-nav";
import { APP_ROUTES } from "@/lib/config";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import {
  type ItemTypeRecord,
  type CreateItemTypePayload,
  fetchItemTypes,
  createItemType,
  updateItemType,
  deleteItemType,
  uploadItemTypeIcon,
} from "@/lib/api";
import { buildPendingSectionCreates } from "@/lib/item-type-suggestions";
import { hasPermission, Permission } from "@/lib/permissions";
import { categoryIconImageUrl, cn } from "@/lib/utils";

import { ExtraSectionNames } from "./_components/extra-section-names";
import { SectionSuggestions } from "./_components/section-suggestions";
import {
  supBtnOutline,
  supBtnPrimary,
  supChipIdle,
  supFieldLabel,
  supInput,
} from "../suppliers/_components/supplier-ui-tokens";

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
  const { me, business } = useDashboard();
  const canWrite = hasPermission(me?.permissions, Permission.CatalogItemsWrite);
  const businessId = business?.id?.trim() ?? "";

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
    [sectionPickLabels, extraNames, existingSectionKeys, existingSectionLabels],
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
        message={
          feedback?.text ?? "Could not load departments. Please try again."
        }
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
      <div
        className="relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col bg-white px-3 pt-1 sm:px-5 sm:pt-1.5"
        style={PROCUREMENT_VARS}
      >
        <div className="relative flex min-h-0 flex-1 flex-col gap-1">
          <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2.5 py-1 sm:px-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-none border border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]">
                  <Tags className="size-3.5" aria-hidden />
                </span>
                <h1 className="truncate font-heading text-[15px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
                  Departments
                </h1>
              </div>
              <span
                aria-hidden
                className="hidden h-3.5 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
              />
              <p className="min-w-0 truncate text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                Shop areas — Grocery, Fruits, Retail. Not products or
                categories.
              </p>
              <nav
                aria-label="Related pages"
                className="flex min-w-0 flex-wrap items-center gap-1"
              >
                {[
                  {
                    href: APP_ROUTES.business,
                    label: "Business",
                    icon: Building2,
                  },
                  {
                    href: APP_ROUTES.products,
                    label: "Products",
                    icon: Package,
                  },
                  {
                    href: APP_ROUTES.categories,
                    label: "Categories",
                    icon: LayoutGrid,
                  },
                ].map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className={supChipIdle}>
                    <Icon
                      className="mr-1 size-3 shrink-0 opacity-70"
                      aria-hidden
                    />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            {canWrite ? (
              <Button
                type="button"
                className={cn(
                  supBtnPrimary,
                  "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-2.5 text-[12px] text-white hover:bg-[#0d6b63]",
                )}
                onClick={() => {
                  resetCreateForm();
                  setCreateOpen(true);
                  setFeedback(null);
                }}
              >
                <Plus className="size-3.5" aria-hidden />
                Add department
              </Button>
            ) : null}
          </header>

          {feedback ? (
            <DashboardFeedback
              kind={feedback.kind === "error" ? "error" : "success"}
              text={feedback.text}
            />
          ) : null}

          {!canWrite ? (
            <div
              role="note"
              className="flex gap-2 rounded-none border border-amber-700/40 bg-white px-3 py-2 text-[13px] leading-relaxed text-amber-800"
            >
              <p>
                View-only. Ask an admin for{" "}
                <span className="font-mono text-xs">catalog.items.write</span>.
              </p>
            </div>
          ) : null}

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 py-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={supBtnOutline}
              onClick={() => void load()}
            >
              Refresh
            </Button>
            <p className="text-[11px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              {rows.length} department{rows.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
            {rows.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
                <span className="inline-flex size-11 items-center justify-center rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_35%,transparent)]">
                  <Tags className="size-5" aria-hidden />
                </span>
                <h2 className="mt-4 text-sm font-semibold tracking-tight text-[var(--order-ink,#15231f)]">
                  No departments yet
                </h2>
                <p className="mx-auto mt-1 max-w-sm text-[13px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                  e.g. Grocery, Retail shop, Fruits
                </p>
                {canWrite ? (
                  <Button
                    type="button"
                    className="mt-4 h-8 gap-1.5 rounded-none bg-[var(--pos-primary,#0f766e)] px-3 text-[12px] font-semibold text-white hover:bg-[#0d6b63]"
                    onClick={() => {
                      resetCreateForm();
                      setCreateOpen(true);
                      setFeedback(null);
                    }}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Add department
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead className="sticky top-0 z-10 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Short code
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Department
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Icon
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Color
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Sort
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Active
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Default
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-right font-semibold"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)]"
                      >
                        <td className="px-3 py-2 font-mono text-xs text-[var(--order-ink,#15231f)]">
                          {row.key}
                        </td>
                        <td className="px-3 py-2 font-medium text-[var(--order-ink,#15231f)]">
                          {row.label}
                        </td>
                        <td className="px-3 py-2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                          {categoryIconImageUrl(row.icon) ? (
                            <span className="relative inline-block size-8 overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
                              <Image
                                src={categoryIconImageUrl(row.icon)!}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="32px"
                                unoptimized
                              />
                            </span>
                          ) : row.icon ? (
                            <span className="font-mono text-xs">
                              {row.icon}
                            </span>
                          ) : (
                            "\u2014"
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {row.color ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="inline-block size-4 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]"
                                style={{ backgroundColor: row.color }}
                              />
                              <span className="text-xs text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                                {row.color}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                              &mdash;
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                          {row.sortOrder}
                        </td>
                        <td className="px-3 py-2">
                          {row.active ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]">
                              <CheckCircle2
                                className="size-3.5 shrink-0"
                                aria-hidden
                              />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                              <X className="size-3.5 shrink-0" aria-hidden />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {row.isDefault ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]">
                              <CheckCircle2
                                className="size-3.5 shrink-0"
                                aria-hidden
                              />
                              Default
                            </span>
                          ) : (
                            <span className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                              &mdash;
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {canWrite ? (
                            <div className="inline-flex items-center justify-end gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 rounded-none px-2 text-[11px]"
                                onClick={() => openEdit(row)}
                              >
                                <Save className="size-3.5" aria-hidden />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 rounded-none px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
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
            )}
          </div>
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
              className="h-8 rounded-none"
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
              className="h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3 font-semibold text-white hover:bg-[#0d6b63]"
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
          style={PROCUREMENT_VARS}
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
      {editId && rows.some((r) => r.id === editId) ? (
        <EditItemTypeDrawer
          key={editId}
          row={rows.find((r) => r.id === editId)!}
          businessId={businessId}
          onClose={closeEdit}
          onSave={handleUpdate}
          busy={editBusy}
          feedback={feedback}
        />
      ) : null}

      {/* Delete confirmation dialog */}
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-sm rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-5"
            style={PROCUREMENT_VARS}
          >
            <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
              Delete department?
            </h2>
            <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
              Delete{" "}
              <strong className="text-[var(--order-ink,#15231f)]">
                {confirmDelete.label}
              </strong>
              ? This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                className="h-8 rounded-none"
                onClick={() => setConfirmDelete(null)}
                disabled={deleteBusy}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="h-8 rounded-none"
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
  businessId,
  onClose,
  onSave,
  busy,
  feedback,
}: {
  row: ItemTypeRecord;
  businessId: string;
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
    icon: row.icon ?? "",
    color: row.color,
    sortOrder: row.sortOrder,
    active: row.active,
    isDefault: row.isDefault,
  });
  const [open, setOpen] = useState(true);
  const [iconUploading, setIconUploading] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);

  const iconPreview = categoryIconImageUrl(draft.icon);

  const handleIconFile = async (file: File | undefined) => {
    if (!file) return;
    if (!businessId) {
      setIconError("Business is not loaded yet. Try again in a moment.");
      return;
    }
    setIconUploading(true);
    setIconError(null);
    try {
      const url = await uploadItemTypeIcon(row.id, file, businessId);
      setDraft((p) => ({ ...p, icon: url }));
    } catch (err) {
      setIconError(err instanceof Error ? err.message : "Icon upload failed.");
    } finally {
      setIconUploading(false);
    }
  };

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
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-none"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-item-type-form"
            disabled={busy || iconUploading}
            className="h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3 font-semibold text-white hover:bg-[#0d6b63]"
          >
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <form
        id="edit-item-type-form"
        className="space-y-4"
        style={PROCUREMENT_VARS}
        onSubmit={(e) => void onSave(e, row.id, draft)}
      >
        <label className={cn(supFieldLabel, "flex flex-col gap-1")}>
          Name
          <input
            className={supInput}
            value={draft.label}
            onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
            aria-label="Department name"
          />
        </label>
        <label className={cn(supFieldLabel, "flex flex-col gap-1")}>
          Short code
          <input
            className={supInput}
            value={draft.key}
            onChange={(e) => setDraft((p) => ({ ...p, key: e.target.value }))}
            aria-label="Department short code"
          />
        </label>

        <div className="space-y-2 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-3">
          <p className={supFieldLabel}>Custom icon</p>
          <p className="text-[11px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
            Shown on the storefront type filters. Upload an image or paste an
            HTTPS URL.
          </p>
          {iconPreview ? (
            <span className="relative block size-14 overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
              <Image
                src={iconPreview}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
                unoptimized
              />
            </span>
          ) : null}
          <label className={cn(supFieldLabel, "flex flex-col gap-1")}>
            Upload image
            <input
              type="file"
              accept="image/*"
              disabled={iconUploading || busy}
              className="max-w-full text-xs file:mr-2 file:rounded-none file:border file:border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] file:bg-white file:px-2 file:py-1"
              onChange={(e) => {
                const f = e.target.files?.[0];
                void handleIconFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {iconUploading ? (
            <p className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              Uploading…
            </p>
          ) : null}
          <label className={cn(supFieldLabel, "flex flex-col gap-1")}>
            Or image URL
            <input
              className={supInput}
              value={draft.icon ?? ""}
              onChange={(e) =>
                setDraft((p) => ({ ...p, icon: e.target.value }))
              }
              placeholder="https://…"
              aria-label="Department icon URL"
            />
          </label>
          {(draft.icon ?? "").trim() ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-none px-2 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]"
              disabled={iconUploading || busy}
              onClick={() => setDraft((p) => ({ ...p, icon: "" }))}
            >
              Clear icon
            </Button>
          ) : null}
          {iconError ? (
            <p className="text-xs text-destructive">{iconError}</p>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--order-ink,#15231f)]">
          <input
            type="checkbox"
            className="size-4 rounded-none border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] accent-[var(--pos-primary,#0f766e)]"
            checked={draft.active}
            onChange={(e) =>
              setDraft((p) => ({ ...p, active: e.target.checked }))
            }
          />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--order-ink,#15231f)]">
          <input
            type="checkbox"
            className="size-4 rounded-none border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] accent-[var(--pos-primary,#0f766e)]"
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
