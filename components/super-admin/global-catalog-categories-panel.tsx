"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { flattenGlobalCategoriesForNav } from "@/lib/global-catalog-category-nav";
import {
  createSaGlobalCategory,
  fetchSaGlobalCategories,
  patchSaGlobalCategory,
  type SaGlobalCategory,
} from "@/lib/super-admin-api";

type GlobalCatalogCategoriesPanelProps = {
  catalogId: string;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onSaved: () => Promise<void>;
};

export function GlobalCatalogCategoriesPanel({
  catalogId,
  busy,
  onBusyChange,
  onSaved,
}: GlobalCatalogCategoriesPanelProps) {
  const [rows, setRows] = useState<SaGlobalCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [hint, setHint] = useState("");
  const [parentId, setParentId] = useState("");
  const [position, setPosition] = useState("0");
  const [active, setActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    const list = await fetchSaGlobalCategories(catalogId);
    setRows(list);
  }, [catalogId]);

  useEffect(() => {
    setSelectedId(null);
    setCreating(false);
  }, [catalogId]);

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load categories.");
      }
    })();
  }, [reload]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  useEffect(() => {
    if (!selected || creating) return;
    setName(selected.name);
    setSlug(selected.slug);
    setHint(selected.tenantCategorySlugHint ?? "");
    setParentId(selected.parentId ?? "");
    setPosition(String(selected.position ?? 0));
    setActive(selected.active);
  }, [selected, creating]);

  const beginCreate = () => {
    setCreating(true);
    setSelectedId(null);
    setName("");
    setSlug("");
    setHint("");
    setParentId("");
    setPosition("0");
    setActive(true);
  };

  const onSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    onBusyChange(true);
    try {
      const body = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        tenantCategorySlugHint: hint.trim() || undefined,
        parentId: parentId.trim() || undefined,
        position: Number.parseInt(position, 10) || 0,
        active,
      };
      if (creating) {
        const created = await createSaGlobalCategory(body, catalogId);
        setCreating(false);
        setSelectedId(created.id);
        toast.success("Category created.");
      } else if (selectedId) {
        await patchSaGlobalCategory(selectedId, body, catalogId);
        toast.success("Category updated.");
      }
      await reload();
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      onBusyChange(false);
    }
  };

  const treeRows = useMemo(
    () =>
      flattenGlobalCategoriesForNav(
        rows.map((r) => ({
          id: r.id,
          parentId: r.parentId,
          name: r.name,
          slug: r.slug,
          position: r.position,
        })),
      ).map((node) => {
        const full = rows.find((r) => r.id === node.id)!;
        return { ...full, depth: node.depth };
      }),
    [rows],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
      <section className="overflow-hidden rounded-2xl border border-border/70">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Categories ({rows.length})
          </span>
          <Button size="sm" variant="outline" disabled={busy} onClick={beginCreate}>
            New category
          </Button>
        </div>
        <ul className="max-h-[32rem] divide-y divide-border/60 overflow-y-auto">
          {treeRows.map((row) => (
            <li key={row.id}>
              <CategoryRow
                row={row}
                depth={row.depth}
                selected={selectedId === row.id && !creating}
                onSelect={() => {
                  setCreating(false);
                  setSelectedId(row.id);
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      <aside className="rounded-2xl border border-border/70 bg-card/50 p-4">
        {!creating && !selected ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Select a category or create a new one.
          </p>
        ) : (
          <div className="space-y-3">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              {creating ? "New category" : "Edit category"}
            </h2>
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-slug">Slug</Label>
              <Input
                id="cat-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto from name"
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-hint">Tenant category slug hint</Label>
              <Input
                id="cat-hint"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-parent">Parent</Label>
              <select
                id="cat-parent"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={parentId}
                disabled={busy}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">None (root)</option>
                {treeRows
                  .filter((r) => r.id !== selectedId)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {"—".repeat(r.depth)}
                      {r.depth > 0 ? " " : ""}
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-pos">Position</Label>
              <Input
                id="cat-pos"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                disabled={busy}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={active}
                disabled={busy}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>
            <Button disabled={busy || !name.trim()} onClick={() => void onSave()}>
              {creating ? "Create" : "Save"}
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}

function CategoryRow({
  row,
  depth,
  selected,
  onSelect,
}: {
  row: SaGlobalCategory;
  depth: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted/40 ${
        selected ? "bg-primary/8" : ""
      }`}
      style={{ paddingLeft: `${16 + depth * 16}px` }}
    >
      <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{row.slug}</span>
      {!row.active ? (
        <span className="shrink-0 text-[10px] uppercase text-muted-foreground">inactive</span>
      ) : null}
    </button>
  );
}
