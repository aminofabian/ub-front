"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  createCategory,
  fetchCategories,
  patchCategory,
  type CategoryRecord,
} from "@/lib/api";

type CreateDraft = {
  name: string;
  parentId: string;
  positionStr: string;
  icon: string;
};

const EMPTY_CREATE: CreateDraft = {
  name: "",
  parentId: "",
  positionStr: "",
  icon: "",
};

type EditDraft = {
  name: string;
  slug: string;
  positionStr: string;
  active: boolean;
};

function sortCategories(list: CategoryRecord[]): CategoryRecord[] {
  return [...list].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

function parseWholeNumber(raw: string, emptyOk: boolean): { error?: string; value?: number } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return emptyOk ? {} : { error: "Position is required." };
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { error: "Use a whole number for position." };
  }
  return { value: n };
}

export default function CategoriesPage() {
  const { loading, canViewCategories, canManageCategories } = useDashboard();
  const [rows, setRows] = useState<CategoryRecord[]>([]);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(EMPTY_CREATE);
  const [edits, setEdits] = useState<Record<string, EditDraft>>({});
  const [message, setMessage] = useState("");

  const sorted = useMemo(() => sortCategories(rows), [rows]);

  const byId = useMemo(() => {
    const map = new Map<string, CategoryRecord>();
    for (const c of rows) {
      map.set(c.id, c);
    }
    return map;
  }, [rows]);

  const load = useCallback(async () => {
    const list = await fetchCategories();
    setRows(list);
    const next: Record<string, EditDraft> = {};
    for (const c of list) {
      next[c.id] = {
        name: c.name,
        slug: c.slug,
        positionStr: String(c.position),
        active: c.active,
      };
    }
    setEdits(next);
  }, []);

  useEffect(() => {
    if (loading || !canViewCategories) {
      return;
    }
    load().catch((error) =>
      setMessage(error instanceof Error ? error.message : "Failed to load categories."),
    );
  }, [load, loading, canViewCategories]);

  const onCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageCategories) {
      return;
    }
    setMessage("");
    const name = createDraft.name.trim();
    if (!name) {
      setMessage("Name is required.");
      return;
    }
    const pos = parseWholeNumber(createDraft.positionStr, true);
    if (pos.error) {
      setMessage(pos.error);
      return;
    }
    try {
      await createCategory({
        name,
        ...(createDraft.parentId.trim() ? { parentId: createDraft.parentId.trim() } : {}),
        ...(pos.value !== undefined ? { position: pos.value } : {}),
        ...(createDraft.icon.trim() ? { icon: createDraft.icon.trim() } : {}),
      });
      setCreateDraft(EMPTY_CREATE);
      await load();
      setMessage("Category created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create failed.");
    }
  };

  const onSaveRow = async (categoryId: string) => {
    if (!canManageCategories) {
      return;
    }
    setMessage("");
    const draft = edits[categoryId];
    const baseline = byId.get(categoryId);
    if (!draft?.name.trim()) {
      setMessage("Name is required.");
      return;
    }
    const pos = parseWholeNumber(draft.positionStr, false);
    if (pos.error || pos.value === undefined) {
      setMessage(pos.error ?? "Position is required.");
      return;
    }
    try {
      const body: Parameters<typeof patchCategory>[1] = {
        name: draft.name.trim(),
        active: draft.active,
        position: pos.value,
      };
      const nextSlug = draft.slug.trim();
      if (baseline && nextSlug && nextSlug !== baseline.slug) {
        body.slug = nextSlug;
      }
      await patchCategory(categoryId, body);
      await load();
      setMessage("Category updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!canViewCategories) {
    return (
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Categories</h2>
        <p className="text-sm text-muted-foreground">
          You need <code className="text-xs">catalog.items.read</code> to view this page.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-xl font-semibold">Categories</h2>
        <p className="text-sm text-muted-foreground">
          Product taxonomy for this business. Listing uses <code className="text-xs">catalog.items.read</code>
          ; creating and editing need <code className="text-xs">catalog.categories.write</code>.
        </p>
      </header>

      {canManageCategories ? (
        <form
          className="grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-6"
          onSubmit={onCreate}
        >
          <h3 className="text-sm font-medium md:col-span-6">New category</h3>
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
            placeholder="Name *"
            value={createDraft.name}
            onChange={(e) =>
              setCreateDraft((p) => ({ ...p, name: e.target.value }))
            }
            required
            aria-label="New category name"
          />
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
            value={createDraft.parentId}
            onChange={(e) =>
              setCreateDraft((p) => ({ ...p, parentId: e.target.value }))
            }
            aria-label="Parent category"
          >
            <option value="">— Top level —</option>
            {sorted.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {!c.active ? " (inactive)" : ""}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-1"
            placeholder="Position"
            inputMode="numeric"
            value={createDraft.positionStr}
            onChange={(e) =>
              setCreateDraft((p) => ({ ...p, positionStr: e.target.value }))
            }
            aria-label="Sort position (optional)"
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-1"
            placeholder="Icon (optional)"
            value={createDraft.icon}
            onChange={(e) =>
              setCreateDraft((p) => ({ ...p, icon: e.target.value }))
            }
            aria-label="Icon key"
          />
          <Button className="md:col-span-2 w-fit" type="submit">
            Create category
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          You can view categories but not edit. Ask an admin for{" "}
          <code className="text-xs">catalog.categories.write</code>.
        </p>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Position</th>
              <th className="px-3 py-2">Parent</th>
              <th className="px-3 py-2">Active</th>
              {canManageCategories ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const draft = edits[row.id];
              const parentName = row.parentId ? byId.get(row.parentId)?.name ?? "—" : "—";
              return (
                <tr key={row.id} className="border-b border-muted/50 align-top">
                  <td className="px-3 py-2">
                    {canManageCategories && draft ? (
                      <input
                        className="w-full min-w-[8rem] rounded border bg-background px-2 py-1 text-sm"
                        value={draft.name}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...draft, name: e.target.value },
                          }))
                        }
                        aria-label={`Name ${row.name}`}
                      />
                    ) : (
                      row.name
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {canManageCategories && draft ? (
                      <input
                        className="w-full min-w-[6rem] rounded border bg-background px-2 py-1 text-xs"
                        value={draft.slug}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...draft, slug: e.target.value },
                          }))
                        }
                        aria-label={`Slug ${row.slug}`}
                      />
                    ) : (
                      row.slug
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {canManageCategories && draft ? (
                      <input
                        className="w-16 rounded border bg-background px-2 py-1 text-sm"
                        inputMode="numeric"
                        value={draft.positionStr}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...draft, positionStr: e.target.value },
                          }))
                        }
                        aria-label={`Position ${row.name}`}
                      />
                    ) : (
                      row.position
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{parentName}</td>
                  <td className="px-3 py-2">
                    {canManageCategories && draft ? (
                      <input
                        type="checkbox"
                        checked={draft.active}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...draft, active: e.target.checked },
                          }))
                        }
                        aria-label={`Active ${row.name}`}
                      />
                    ) : row.active ? (
                      "Yes"
                    ) : (
                      "No"
                    )}
                  </td>
                  {canManageCategories ? (
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void onSaveRow(row.id)}
                      >
                        Save
                      </Button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      ) : null}

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </section>
  );
}
