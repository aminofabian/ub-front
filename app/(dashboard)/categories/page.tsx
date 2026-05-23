"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Building2,
  Camera,
  ChevronDown,
  ChevronRight,
  Copy,
  FolderPlus,
  LayoutGrid,
  Package,
  Pencil,
  Tags,
  X,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES, categorySlugPath, categoryAnalyticsPath } from "@/lib/config";
import {
  createCategory,
  deleteCategoryImage,
  deleteCategoryPriceRule,
  deleteCategorySupplierLink,
  fetchCategories,
  fetchCategoryImages,
  fetchCategoryPriceRules,
  fetchPriceRules,
  fetchSuppliers,
  fetchTaxRates,
  patchCategory,
  patchCategorySupplierLink,
  postCategoryPriceRule,
  postCategorySupplierLink,
  uploadCategoryImageToCloudinary,
  type CategoryLinkedPriceRuleRecord,
  type CategoryRecord,
  type ItemImageRecord,
  type PatchCategoryPayload,
  type PriceRuleRecord,
  type SupplierRecord,
  type TaxRateRecord,
} from "@/lib/api";
import {
  filterSuggestionPickKeys,
  parseSuggestionSubKey,
  suggestionSubKey,
  suggestionTopKey,
} from "@/lib/category-suggestions";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import { CategoryBulkSuggestions } from "./_components/category-bulk-suggestions";
import { cn, categoryIconImageUrl } from "@/lib/utils";

const ROOT_PARENT_VALUE = "";

const categoryDrawerLabel =
  "text-[11px] font-medium text-muted-foreground";
const categoryDrawerInput =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm";
const categoryDrawerTextarea =
  "min-h-[4.5rem] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

type CreateQueueRow = {
  id: string;
  name: string;
  parentId: string;
  queueKey?: string;
  /** Suggestion top-level group name for subtype rows (for UI when parent is not in catalog yet). */
  suggestionParentName?: string;
  /** When set, this row only exists from a checkbox tick (not yet in `createQueue`). */
  fromPickKey?: string;
};

type CategoryDrawerId = "create" | "defaults" | "gallery" | "suppliers";

type CreateDraft = {
  name: string;
  parentId: string;
  positionStr: string;
  icon: string;
  description: string;
  markupStr: string;
  taxRateId: string;
};

const EMPTY_CREATE: CreateDraft = {
  name: "",
  parentId: ROOT_PARENT_VALUE,
  positionStr: "",
  icon: "",
  description: "",
  markupStr: "",
  taxRateId: "",
};

type EditDraft = {
  name: string;
  slug: string;
  positionStr: string;
  active: boolean;
  icon: string;
  parentId: string;
};

function categoryCoverUrl(row: CategoryRecord): string | null {
  const thumb = row.thumbnailUrl?.trim();
  if (thumb) {
    return thumb;
  }
  const key = row.imageKey?.trim();
  if (key?.startsWith("http://") || key?.startsWith("https://")) {
    return key;
  }
  return null;
}

function sortCategories(list: CategoryRecord[]): CategoryRecord[] {
  return [...list].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

/** Parent rows first, then descendants; siblings ordered by position then name. Orphans/cycles append last. */
function sortCategoriesDepthFirst(rows: CategoryRecord[]): CategoryRecord[] {
  const map = childrenByParentMap(rows);
  for (const key of [...map.keys()]) {
    map.set(key, sortCategories(map.get(key) ?? []));
  }
  const ordered: CategoryRecord[] = [];
  const walk = (parentKey: string) => {
    for (const c of map.get(parentKey) ?? []) {
      ordered.push(c);
      walk(c.id);
    }
  };
  walk(ROOT_PARENT_VALUE);
  const seen = new Set(ordered.map((r) => r.id));
  for (const r of sortCategories(rows)) {
    if (!seen.has(r.id)) {
      ordered.push(r);
    }
  }
  return ordered;
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

function parseOptionalMarkup(raw: string): { error?: string; value?: number } {
  const t = raw.trim();
  if (!t) {
    return {};
  }
  const n = Number(t);
  if (!Number.isFinite(n)) {
    return { error: "Markup must be a valid number." };
  }
  return { value: n };
}

type PendingCategoryCreate = {
  name: string;
  parentId: string;
  /** When set and parentId is empty, create (or find) this top-level parent before the child. */
  suggestionParentName?: string;
};

function findTopLevelCategoryIdByName(rows: CategoryRecord[], displayName: string): string | null {
  const t = displayName.trim().toLowerCase();
  for (const r of rows) {
    if (!r.parentId?.trim() && r.name.trim().toLowerCase() === t) {
      return r.id;
    }
  }
  return null;
}

function newQueueItemId(): string {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**

 * Build ordered creates: first the primary name + Parent dropdown, then each textarea line under that same parent,
 * then structured queue rows (each with its own parent).
 * Rows from the suggestion queue carry `queueKey` so we do not collapse different suggestion paths that share the
 * same API parent + display name (e.g. two “Eggs” subtypes under different groups when parents are not in the catalog yet).
 */
function buildPendingCreatesList(input: {
  primaryName: string;
  primaryParentFromDropdown: string;
  sameParentMultiline: string;
  structuredQueue: Array<Pick<CreateQueueRow, "name" | "parentId" | "queueKey" | "suggestionParentName">>;
}): PendingCategoryCreate[] {
  const dedupe = new Set<string>();
  const out: PendingCategoryCreate[] = [];
  const push = (name: string, parentId: string, queueKey?: string, suggestionParentName?: string) => {
    const n = name.trim();
    if (!n) {
      return;
    }
    const rootish = !parentId.trim() || parentId.trim() === ROOT_PARENT_VALUE;
    const pid = rootish ? ROOT_PARENT_VALUE : parentId.trim();
    const key = queueKey ?? `${pid}\n${n.toLowerCase()}`;
    if (dedupe.has(key)) {
      return;
    }
    dedupe.add(key);
    const row: PendingCategoryCreate = { name: n, parentId: pid };
    if (suggestionParentName?.trim()) {
      row.suggestionParentName = suggestionParentName.trim();
    }
    out.push(row);
  };
  const drop = input.primaryParentFromDropdown.trim() || ROOT_PARENT_VALUE;
  if (input.primaryName.trim()) {
    push(input.primaryName.trim(), drop);
  }
  for (const raw of input.sameParentMultiline.split(/\r?\n/)) {
    const line = raw.trim();
    if (line) {
      push(line, drop);
    }
  }
  for (const row of input.structuredQueue) {
    const pid = row.parentId.trim() || ROOT_PARENT_VALUE;
    push(row.name, pid, row.queueKey, row.suggestionParentName);
  }
  return out;
}

/** Rows that will be created: saved queue plus any ticked suggestions not already on the queue. */
function mergeQueueWithSuggestionPicks(
  queue: CreateQueueRow[],
  pickKeys: readonly string[],
  resolveParentIdForSuggestion: (parentDisplayName: string) => string,
): CreateQueueRow[] {
  const covered = new Set<string>();
  for (const q of queue) {
    if (q.queueKey) {
      covered.add(q.queueKey);
    }
  }
  const next: CreateQueueRow[] = [...queue];
  for (const key of pickKeys) {
    if (covered.has(key)) {
      continue;
    }
    if (key.startsWith("top:")) {
      const parent = key.slice(4).trim();
      if (!parent) {
        continue;
      }
      next.push({
        id: `tick:${encodeURIComponent(key)}`,
        name: parent,
        parentId: ROOT_PARENT_VALUE,
        queueKey: key,
        fromPickKey: key,
      });
    } else if (key.startsWith("sub:")) {
      const { parentName, childName } = parseSuggestionSubKey(key.slice(4));
      if (!childName.trim()) {
        continue;
      }
      const pid = resolveParentIdForSuggestion(parentName);
      next.push({
        id: `tick:${encodeURIComponent(key)}`,
        name: childName.trim(),
        parentId: pid,
        queueKey: key,
        fromPickKey: key,
        suggestionParentName: parentName.trim(),
      });
    }
  }
  return next;
}

function childrenByParentMap(rows: CategoryRecord[]): Map<string, CategoryRecord[]> {
  const m = new Map<string, CategoryRecord[]>();
  for (const r of rows) {
    const key = r.parentId ?? ROOT_PARENT_VALUE;
    const list = m.get(key) ?? [];
    list.push(r);
    m.set(key, list);
  }
  return m;
}

/** Includes `rootId` and all descendants (invalid choices when moving parent). */
function subtreeIncludingSelf(rootId: string, childrenMap: Map<string, CategoryRecord[]>): Set<string> {
  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || out.has(id)) {
      continue;
    }
    out.add(id);
    const kids = childrenMap.get(id) ?? [];
    for (const ch of kids) {
      stack.push(ch.id);
    }
  }
  return out;
}

function depthByIdMap(rows: CategoryRecord[]): Map<string, number> {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const memo = new Map<string, number>();
  function depth(id: string, guard: number): number {
    if (guard > 64) {
      return 0;
    }
    const cached = memo.get(id);
    if (cached !== undefined) {
      return cached;
    }
    const parentId = byId.get(id)?.parentId;
    const val = parentId ? 1 + depth(parentId, guard + 1) : 0;
    memo.set(id, val);
    return val;
  }
  const out = new Map<string, number>();
  for (const r of rows) {
    out.set(r.id, depth(r.id, 0));
  }
  return out;
}

function stopActivateRow(event: React.SyntheticEvent) {
  event.stopPropagation();
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/** Row is shown when every ancestor with children has been expanded (roots always shown). */
function isCategoryRowExpandedVisible(
  row: CategoryRecord,
  byId: Map<string, CategoryRecord>,
  expandedParentIds: Set<string>,
): boolean {
  const pid = row.parentId?.trim();
  if (!pid) {
    return true;
  }
  const parent = byId.get(pid);
  if (!parent) {
    return true;
  }
  if (!expandedParentIds.has(pid)) {
    return false;
  }
  return isCategoryRowExpandedVisible(parent, byId, expandedParentIds);
}

export default function CategoriesPage() {
  const searchParams = useSearchParams();
  const { loading, canViewCategories, canManageCategories, canViewSuppliers } = useDashboard();
  const [rows, setRows] = useState<CategoryRecord[]>([]);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(EMPTY_CREATE);
  const [edits, setEdits] = useState<Record<string, EditDraft>>({});
  const [listBusy, setListBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; kind: "error" | "success" } | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryImages, setCategoryImages] = useState<ItemImageRecord[]>([]);
  const [detailBusy, setDetailBusy] = useState(false);
  const [supplierRows, setSupplierRows] = useState<SupplierRecord[]>([]);
  const [supplierPickId, setSupplierPickId] = useState("");
  const [taxRates, setTaxRates] = useState<TaxRateRecord[]>([]);
  const [priceRules, setPriceRules] = useState<PriceRuleRecord[]>([]);
  const [linkedRules, setLinkedRules] = useState<CategoryLinkedPriceRuleRecord[]>([]);
  const [commercialDraft, setCommercialDraft] = useState<{
    description: string;
    markupStr: string;
    taxRateId: string;
  } | null>(null);
  const [rulePickId, setRulePickId] = useState("");
  const [rulePrecStr, setRulePrecStr] = useState("");
  const [uploadAsCover, setUploadAsCover] = useState(true);
  const [activeDrawer, setActiveDrawer] = useState<CategoryDrawerId | null>(null);
  const [pendingCategoryImage, setPendingCategoryImage] = useState<File | null>(null);
  const [pendingCreateIconFile, setPendingCreateIconFile] = useState<File | null>(null);
  /** Extra names for the same create action (one per line); each uses the Parent dropdown. */
  const [batchNamesText, setBatchNamesText] = useState("");
  /** Picks from suggestions (or “queue all”); each row has its own parent (top level or resolved group). */
  const [createQueue, setCreateQueue] = useState<CreateQueueRow[]>([]);
  /** Multi-select keys from suggested categories before “Add selected to list”. */
  const [suggestionPickKeys, setSuggestionPickKeys] = useState<string[]>([]);
  /** When false, taxonomy checkboxes stay hidden; manual Name / More names / Parent is the default path. */
  const [showBulkSuggestions, setShowBulkSuggestions] = useState(true);
  const [createBusy, setCreateBusy] = useState(false);
  const [iconUploadCategoryId, setIconUploadCategoryId] = useState<string | null>(null);
  /** Parents whose child rows are revealed in the table. Loaded and refreshed as fully expanded by default. */
  const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(() => new Set());
  /** Inline table edit: null = browse / select rows; set to a category id to show inputs for that row only. */
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [copiedIconCategoryId, setCopiedIconCategoryId] = useState<string | null>(null);

  const sorted = useMemo(() => sortCategoriesDepthFirst(rows), [rows]);

  const byId = useMemo(() => new Map(rows.map((c) => [c.id, c])), [rows]);

  const childrenMap = useMemo(() => childrenByParentMap(rows), [rows]);

  const depths = useMemo(() => depthByIdMap(rows), [rows]);

  /** Lowercased category names in the catalog — used to hide suggestions the user already has. */
  const catalogNameLowerSet = useMemo(
    () => new Set(rows.map((r) => r.name.trim().toLowerCase()).filter(Boolean)),
    [rows],
  );

  useEffect(() => {
    setSuggestionPickKeys((prev) => filterSuggestionPickKeys(prev, catalogNameLowerSet));
  }, [catalogNameLowerSet]);

  const resolveParentIdForSuggestion = useCallback((parentDisplayName: string) => {
    const target = parentDisplayName.trim().toLowerCase();
    if (!target) {
      return ROOT_PARENT_VALUE;
    }
    const roots = rows.filter(
      (r) => !r.parentId?.trim() && r.name.trim().toLowerCase() === target,
    );
    if (roots.length > 0) {
      return roots[0].id;
    }
    const match = rows.find((r) => r.name.trim().toLowerCase() === target);
    return match?.id ?? ROOT_PARENT_VALUE;
  }, [rows]);

  const toggleSuggestionPickKey = useCallback((key: string) => {
    setSuggestionPickKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);

  const clearSuggestionPickKeys = useCallback(() => {
    setSuggestionPickKeys([]);
  }, []);

  const addSuggestionPicksToQueue = useCallback(() => {
    const picks = [...suggestionPickKeys];
    if (picks.length === 0) {
      return;
    }
    setCreateQueue((prev) => {
      const seen = new Set(
        prev.map((q) => q.queueKey ?? `${q.parentId}\t${q.name.trim().toLowerCase()}`),
      );
      const next = [...prev];
      for (const key of picks) {
        if (seen.has(key)) {
          continue;
        }
        if (key.startsWith("top:")) {
          const parent = key.slice(4);
          if (!parent.trim()) {
            continue;
          }
          seen.add(key);
          next.push({ id: newQueueItemId(), name: parent.trim(), parentId: ROOT_PARENT_VALUE, queueKey: key });
        } else if (key.startsWith("sub:")) {
          const rest = key.slice(4);
          const { parentName, childName } = parseSuggestionSubKey(rest);
          if (!childName.trim()) {
            continue;
          }
          const pid = resolveParentIdForSuggestion(parentName);
          seen.add(key);
          next.push({
            id: newQueueItemId(),
            name: childName.trim(),
            parentId: pid,
            queueKey: key,
            suggestionParentName: parentName.trim(),
          });
        }
      }
      return next;
    });
    setSuggestionPickKeys([]);
  }, [suggestionPickKeys, resolveParentIdForSuggestion]);

  const removeCreateQueueRow = useCallback((id: string) => {
    setCreateQueue((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const effectiveStructuredQueue = useMemo(
    () => mergeQueueWithSuggestionPicks(createQueue, suggestionPickKeys, resolveParentIdForSuggestion),
    [createQueue, suggestionPickKeys, resolveParentIdForSuggestion],
  );

  const discardEffectiveQueueRow = useCallback(
    (row: CreateQueueRow) => {
      if (row.fromPickKey) {
        setSuggestionPickKeys((prev) => prev.filter((k) => k !== row.fromPickKey));
      } else {
        removeCreateQueueRow(row.id);
      }
    },
    [removeCreateQueueRow],
  );

  const pendingCreateNameCount = useMemo(
    () =>
      buildPendingCreatesList({
        primaryName: createDraft.name.trim(),
        primaryParentFromDropdown: createDraft.parentId,
        sameParentMultiline: batchNamesText,
        structuredQueue: effectiveStructuredQueue,
      }).length,
    [createDraft.name, createDraft.parentId, batchNamesText, effectiveStructuredQueue],
  );

  const queueParentLabel = useCallback(
    (parentId: string) => {
      const pid = parentId.trim();
      if (!pid) {
        return "Top level";
      }
      const row = rows.find((r) => r.id === pid);
      return row?.name ?? "Unknown parent";
    },
    [rows],
  );

  const formatCreateListParentCaption = useCallback(
    (row: CreateQueueRow): string => {
      const group = row.suggestionParentName?.trim();
      if (group) {
        if (row.parentId.trim()) {
          return `Under “${queueParentLabel(row.parentId)}”`;
        }
        return `Subtype under “${group}” (parent auto-created at top level if missing, then nested)`;
      }
      if (row.parentId.trim()) {
        return `Under “${queueParentLabel(row.parentId)}”`;
      }
      return "Top level";
    },
    [queueParentLabel],
  );

  const parentIdsWithChildren = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const p = r.parentId?.trim();
      if (p) {
        s.add(p);
      }
    }
    return s;
  }, [rows]);

  const visibleSorted = useMemo(
    () => sorted.filter((row) => isCategoryRowExpandedVisible(row, byId, expandedParentIds)),
    [sorted, byId, expandedParentIds],
  );

  const selectedCategory = selectedCategoryId ? byId.get(selectedCategoryId) : undefined;

  const restoreDraftFromRow = useCallback((id: string) => {
    const c = rows.find((r) => r.id === id);
    if (!c) {
      return;
    }
    setEdits((prev) => ({
      ...prev,
      [id]: {
        name: c.name,
        slug: c.slug,
        positionStr: String(c.position),
        active: c.active,
        icon: c.icon ?? "",
        parentId: c.parentId ?? ROOT_PARENT_VALUE,
      },
    }));
  }, [rows]);

  const load = useCallback(async () => {
    const list = await fetchCategories();
    setRows(list);
    const expandAllParents = new Set<string>();
    for (const c of list) {
      const p = c.parentId?.trim();
      if (p) {
        expandAllParents.add(p);
      }
    }
    setExpandedParentIds(expandAllParents);
    setEditingCategoryId(null);
    const next: Record<string, EditDraft> = {};
    for (const c of list) {
      next[c.id] = {
        name: c.name,
        slug: c.slug,
        positionStr: String(c.position),
        active: c.active,
        icon: c.icon ?? "",
        parentId: c.parentId ?? ROOT_PARENT_VALUE,
      };
    }
    setEdits(next);
  }, []);

  const refresh = useCallback(async () => {
    setFeedback(null);
    setListBusy(true);
    try {
      await load();
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Failed to load categories.",
        kind: "error",
      });
    } finally {
      setListBusy(false);
    }
  }, [load]);

  useEffect(() => {
    if (loading || !canViewCategories) {
      return;
    }
    queueMicrotask(() => void refresh());
  }, [refresh, loading, canViewCategories]);

  useEffect(() => {
    if (searchParams.get("onboarding") === "create-category") {
      setActiveDrawer("create");
      setShowBulkSuggestions(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!canManageCategories || !canViewSuppliers) {
      return;
    }
    fetchSuppliers()
      .then(setSupplierRows)
      .catch(() => setSupplierRows([]));
  }, [canManageCategories, canViewSuppliers]);

  useEffect(() => {
    if (!canManageCategories) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [rates, rules] = await Promise.all([fetchTaxRates(), fetchPriceRules()]);
        if (!cancelled) {
          setTaxRates(rates);
          setPriceRules(rules);
        }
      } catch {
        if (!cancelled) {
          setTaxRates([]);
          setPriceRules([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManageCategories]);

  useEffect(() => {
    if (!selectedCategoryId || !canViewCategories) {
      queueMicrotask(() => setCategoryImages([]));
      return;
    }
    let cancelled = false;
    fetchCategoryImages(selectedCategoryId)
      .then((imgs) => {
        if (!cancelled) {
          setCategoryImages(imgs);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategoryImages([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, canViewCategories]);

  useEffect(() => {
    if (!selectedCategory) {
      setCommercialDraft(null);
      setLinkedRules([]);
      setRulePickId("");
      setRulePrecStr("");
      return;
    }
    setCommercialDraft({
      description: selectedCategory.description ?? "",
      markupStr:
        selectedCategory.defaultMarkupPct != null && selectedCategory.defaultMarkupPct !== ""
          ? String(selectedCategory.defaultMarkupPct)
          : "",
      taxRateId: selectedCategory.defaultTaxRateId ?? "",
    });
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedCategoryId) {
      return;
    }
    const row = rows.find((r) => r.id === selectedCategoryId);
    if (!row) {
      setSelectedCategoryId(null);
      return;
    }
    const map = new Map(rows.map((c) => [c.id, c]));
    if (!isCategoryRowExpandedVisible(row, map, expandedParentIds)) {
      setSelectedCategoryId(null);
    }
  }, [selectedCategoryId, rows, expandedParentIds]);

  useEffect(() => {
    if (!selectedCategoryId || !canManageCategories) {
      setLinkedRules([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchCategoryPriceRules(selectedCategoryId);
        if (!cancelled) {
          setLinkedRules(rows);
        }
      } catch {
        if (!cancelled) {
          setLinkedRules([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, canManageCategories]);

  const reloadImagesOnly = useCallback(async () => {
    if (!selectedCategoryId) {
      return;
    }
    try {
      setCategoryImages(await fetchCategoryImages(selectedCategoryId));
    } catch {
      setCategoryImages([]);
    }
  }, [selectedCategoryId]);

  const onSaveCommercialDefaults = async () => {
    if (!canManageCategories || !selectedCategory || !commercialDraft) {
      return;
    }
    setFeedback(null);
    const baseline = selectedCategory;
    const cd = commercialDraft;
    const body: PatchCategoryPayload = {};
    const dDesc = cd.description.trim();
    const bDesc = (baseline.description ?? "").trim();
    if (dDesc !== bDesc) {
      body.description = dDesc;
    }
    const mk = parseOptionalMarkup(cd.markupStr);
    if (mk.error) {
      setFeedback({ text: mk.error, kind: "error" });
      return;
    }
    const bMarkupRaw = baseline.defaultMarkupPct;
    const bMarkup =
      bMarkupRaw != null && String(bMarkupRaw).trim() !== "" ? Number(bMarkupRaw) : null;
    if (mk.value !== undefined) {
      if (bMarkup === null || !Number.isFinite(bMarkup) || bMarkup !== mk.value) {
        body.defaultMarkupPct = mk.value;
      }
    } else if (bMarkup !== null && Number.isFinite(bMarkup)) {
      body.clearDefaultMarkup = true;
    }
    const btax = (baseline.defaultTaxRateId ?? "").trim();
    const dtax = cd.taxRateId.trim();
    if (dtax !== btax) {
      if (!dtax) {
        body.clearDefaultTaxRate = true;
      } else {
        body.defaultTaxRateId = dtax;
      }
    }
    if (Object.keys(body).length === 0) {
      setFeedback({ text: "No changes to save.", kind: "error" });
      return;
    }
    setDetailBusy(true);
    try {
      await patchCategory(baseline.id, body);
      await refresh();
      setFeedback({ text: "Commercial defaults saved.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Could not save defaults.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  const onLinkPriceRule = async () => {
    if (!canManageCategories || !selectedCategoryId || !rulePickId.trim()) {
      return;
    }
    setFeedback(null);
    const precRaw = rulePrecStr.trim();
    let precedence: number | undefined;
    if (precRaw) {
      precedence = Number(precRaw);
      if (!Number.isFinite(precedence) || !Number.isInteger(precedence)) {
        setFeedback({ text: "Precedence must be a whole number.", kind: "error" });
        return;
      }
    }
    setDetailBusy(true);
    try {
      await postCategoryPriceRule(selectedCategoryId, {
        ruleId: rulePickId.trim(),
        ...(precedence !== undefined ? { precedence } : {}),
      });
      setRulePickId("");
      setRulePrecStr("");
      setLinkedRules(await fetchCategoryPriceRules(selectedCategoryId));
      setFeedback({ text: "Price rule linked.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Could not link rule.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  const onUnlinkPriceRule = async (ruleId: string) => {
    if (!canManageCategories || !selectedCategoryId) {
      return;
    }
    setFeedback(null);
    setDetailBusy(true);
    try {
      await deleteCategoryPriceRule(selectedCategoryId, ruleId);
      setLinkedRules(await fetchCategoryPriceRules(selectedCategoryId));
      setFeedback({ text: "Price rule removed.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Could not remove rule.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  const onSetSupplierPrimary = async (supplierId: string) => {
    if (!canManageCategories || !selectedCategoryId) {
      return;
    }
    setFeedback(null);
    setDetailBusy(true);
    try {
      await patchCategorySupplierLink(selectedCategoryId, supplierId, { primary: true });
      await refresh();
      setFeedback({ text: "Primary supplier updated.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Could not update primary supplier.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  const onCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageCategories || createBusy) {
      return;
    }
    setFeedback(null);
    const plan = buildPendingCreatesList({
      primaryName: createDraft.name.trim(),
      primaryParentFromDropdown: createDraft.parentId,
      sameParentMultiline: batchNamesText,
      structuredQueue: mergeQueueWithSuggestionPicks(
        createQueue,
        suggestionPickKeys,
        resolveParentIdForSuggestion,
      ),
    });
    if (plan.length === 0) {
      setFeedback({
        text: "Enter at least one category: use Name and/or More names (same parent as the dropdown), tick suggestions below, and/or add rows to the create list.",
        kind: "error",
      });
      return;
    }
    const pos = parseWholeNumber(createDraft.positionStr, true);
    if (pos.error) {
      setFeedback({ text: pos.error, kind: "error" });
      return;
    }
    const mk = parseOptionalMarkup(createDraft.markupStr);
    if (mk.error) {
      setFeedback({ text: mk.error, kind: "error" });
      return;
    }

    const savedParentForRetry = createDraft.parentId;

    const sharedBody = {
      ...(pos.value !== undefined ? { position: pos.value } : {}),
      ...(!pendingCreateIconFile && createDraft.icon.trim() ? { icon: createDraft.icon.trim() } : {}),
      ...(createDraft.description.trim() ? { description: createDraft.description.trim() } : {}),
      ...(mk.value !== undefined ? { defaultMarkupPct: mk.value } : {}),
      ...(createDraft.taxRateId.trim() ? { defaultTaxRateId: createDraft.taxRateId.trim() } : {}),
    };

    const iconFile = pendingCreateIconFile;
    setCreateBusy(true);
    try {
      const createdIds: string[] = [];
      const fails: { name: string; parentId: string; message: string }[] = [];
      let firstSuccessId: string | null = null;

      let liveRows: CategoryRecord[] = [...rows];
      const dedupeCreateKey = (parentId: string, name: string) =>
        `${parentId.trim() || ROOT_PARENT_VALUE}\t${name.trim().toLowerCase()}`;
      const seenCreateKeys = new Set<string>();

      for (const row of plan) {
        let pidFinal = row.parentId.trim();
        try {
          const sp = row.suggestionParentName?.trim();
          if (sp && !pidFinal) {
            let existingId = findTopLevelCategoryIdByName(liveRows, sp);
            if (!existingId) {
              const parentKey = dedupeCreateKey(ROOT_PARENT_VALUE, sp);
              if (!seenCreateKeys.has(parentKey)) {
                const pCreated = await createCategory({
                  name: sp,
                  ...sharedBody,
                });
                liveRows = [...liveRows, pCreated];
                createdIds.push(pCreated.id);
                if (!firstSuccessId) {
                  firstSuccessId = pCreated.id;
                }
                seenCreateKeys.add(parentKey);
                existingId = pCreated.id;
              } else {
                existingId = findTopLevelCategoryIdByName(liveRows, sp);
              }
            }
            if (!existingId) {
              throw new Error(`Could not create or find top-level parent “${sp}”.`);
            }
            pidFinal = existingId;
          }

          const rowKey = dedupeCreateKey(pidFinal, row.name);
          if (seenCreateKeys.has(rowKey)) {
            continue;
          }
          seenCreateKeys.add(rowKey);

          const created = await createCategory({
            name: row.name,
            ...(pidFinal ? { parentId: pidFinal } : {}),
            ...sharedBody,
          });
          liveRows = [...liveRows, created];
          createdIds.push(created.id);
          if (!firstSuccessId) {
            firstSuccessId = created.id;
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Create failed.";
          fails.push({
            name: row.name,
            parentId: pidFinal || row.parentId.trim() || ROOT_PARENT_VALUE,
            message: msg,
          });
        }
      }

      const fullSuccess = fails.length === 0;
      const totalFail = fails.length === plan.length;
      const partial = fails.length > 0 && createdIds.length > 0;

      if (fullSuccess) {
        setPendingCreateIconFile(null);
        setCreateDraft(EMPTY_CREATE);
        setBatchNamesText("");
        setCreateQueue([]);
        setSuggestionPickKeys([]);
      } else if (totalFail) {
        /* keep form, queue, selection, icon */
      } else if (partial) {
        setPendingCreateIconFile(null);
        setCreateQueue(
          fails.map((f) => ({
            id: newQueueItemId(),
            name: f.name,
            parentId: f.parentId.trim() ? f.parentId.trim() : ROOT_PARENT_VALUE,
          })),
        );
        setSuggestionPickKeys([]);
        setCreateDraft({
          ...EMPTY_CREATE,
          parentId: savedParentForRetry.trim() ? savedParentForRetry.trim() : ROOT_PARENT_VALUE,
        });
        setBatchNamesText("");
      }

      if (iconFile && firstSuccessId) {
        try {
          const uploaded = await uploadCategoryImageToCloudinary(firstSuccessId, iconFile, { primary: false });
          const url = uploaded.secureUrl?.trim();
          if (url) {
            await patchCategory(firstSuccessId, { icon: url });
          }
        } catch (iconErr) {
          await refresh();
          setSelectedCategoryId(firstSuccessId);
          setActiveDrawer(null);
          setFeedback({
            text:
              iconErr instanceof Error
                ? `${createdIds.length} categor${createdIds.length === 1 ? "y" : "ies"} created, but icon upload failed: ${iconErr.message}`
                : `${createdIds.length} categor${createdIds.length === 1 ? "y" : "ies"} created, but icon upload failed.`,
            kind: "error",
          });
          return;
        }
      }

      await refresh();
      const lastId = createdIds[createdIds.length - 1] ?? null;
      if (lastId) {
        setSelectedCategoryId(lastId);
      }

      if (totalFail) {
        setFeedback({
          text:
            fails
              .slice(0, 5)
              .map((f) => `${f.name}: ${f.message}`)
              .join(" ") + (fails.length > 5 ? ` …and ${fails.length - 5} more.` : ""),
          kind: "error",
        });
        return;
      }

      if (fullSuccess) {
        setActiveDrawer(null);
        setFeedback({
          text:
            createdIds.length > 1
              ? `${createdIds.length} categories created (including any missing suggestion parents created first so subtypes nest correctly). Shared tax, markup, position, and description applied where set. Slugs were generated—you can edit each row.`
              : iconFile
                ? "Category created with image icon. It also appears in Gallery."
                : "Category created. Slug was generated automatically—you can customize it when editing.",
          kind: "success",
        });
        return;
      }

      /* partial */
      const ok = createdIds.length;
      setFeedback({
        text: `Created ${ok} of ${plan.length}. Failed rows are back on the create list with the right parents. ${fails
          .slice(0, 2)
          .map((f) => `${f.name}: ${f.message}`)
          .join(" ")}${fails.length > 2 ? ` …(+${fails.length - 2})` : ""}`,
        kind: "error",
      });
      return;
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Create failed.",
        kind: "error",
      });
    } finally {
      setCreateBusy(false);
    }
  };

  const onSaveRow = async (categoryId: string) => {
    if (!canManageCategories) {
      return;
    }
    setFeedback(null);
    const draft = edits[categoryId];
    const baseline = byId.get(categoryId);
    if (!draft?.name.trim()) {
      setFeedback({ text: "Name is required.", kind: "error" });
      return;
    }
    const pos = parseWholeNumber(draft.positionStr, false);
    if (pos.error || pos.value === undefined) {
      setFeedback({ text: pos.error ?? "Position is required.", kind: "error" });
      return;
    }
    if (!baseline) {
      return;
    }

    try {
      const body: Parameters<typeof patchCategory>[1] = {
        name: draft.name.trim(),
        active: draft.active,
        position: pos.value,
      };

      const nextSlug = draft.slug.trim().toLowerCase();
      if (nextSlug && nextSlug !== baseline.slug) {
        body.slug = draft.slug.trim();
      }

      const baselineIcon = (baseline.icon ?? "").trim();
      const draftIcon = draft.icon.trim();
      if (draftIcon !== baselineIcon) {
        body.icon = draftIcon;
      }

      const baselineParent = baseline.parentId ?? ROOT_PARENT_VALUE;
      const draftParent = draft.parentId.trim();
      if (draftParent !== baselineParent) {
        if (!draftParent && baselineParent) {
          body.root = true;
        } else if (draftParent) {
          body.parentId = draftParent;
        }
      }

      await patchCategory(categoryId, body);
      await refresh();
      setEditingCategoryId(null);
      setFeedback({ text: "Category updated.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Update failed.",
        kind: "error",
      });
    }
  };

  const onUploadCategoryImage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageCategories || !selectedCategoryId) {
      return;
    }
    const file = pendingCategoryImage;
    if (!file) {
      setFeedback({ text: "Choose an image file.", kind: "error" });
      return;
    }
    setFeedback(null);
    setDetailBusy(true);
    try {
      await uploadCategoryImageToCloudinary(selectedCategoryId, file, { primary: uploadAsCover });
      setPendingCategoryImage(null);
      await refresh();
      await reloadImagesOnly();
      setFeedback({ text: "Image uploaded.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Upload failed.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  const onReplaceCategoryIconImage = async (categoryId: string, file: File | null | undefined) => {
    if (!canManageCategories || !file || !categoryId.trim()) {
      return;
    }
    setFeedback(null);
    setIconUploadCategoryId(categoryId);
    try {
      const uploaded = await uploadCategoryImageToCloudinary(categoryId, file, { primary: false });
      const url = uploaded.secureUrl?.trim();
      if (!url) {
        throw new Error("Upload returned no image URL.");
      }
      await patchCategory(categoryId, { icon: url });
      await refresh();
      setFeedback({
        text: "Icon image saved. It also appears in Gallery — avoid deleting it there or the URL may break.",
        kind: "success",
      });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Icon upload failed.",
        kind: "error",
      });
    } finally {
      setIconUploadCategoryId(null);
    }
  };

  const onCopyCategoryIconUrl = useCallback(async (categoryId: string, url: string) => {
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopiedIconCategoryId(categoryId);
      window.setTimeout(() => {
        setCopiedIconCategoryId((current) => (current === categoryId ? null : current));
      }, 2000);
    } else {
      setFeedback({ text: "Could not copy to clipboard.", kind: "error" });
    }
  }, []);

  const onDeleteCategoryImage = async (imageId: string) => {
    if (!canManageCategories || !selectedCategoryId) {
      return;
    }
    setFeedback(null);
    setDetailBusy(true);
    try {
      await deleteCategoryImage(selectedCategoryId, imageId);
      await refresh();
      await reloadImagesOnly();
      setFeedback({ text: "Image removed.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Remove failed.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  const onLinkSupplier = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageCategories || !selectedCategoryId || !supplierPickId.trim()) {
      return;
    }
    setFeedback(null);
    setDetailBusy(true);
    try {
      await postCategorySupplierLink(selectedCategoryId, { supplierId: supplierPickId.trim() });
      setSupplierPickId("");
      await refresh();
      setFeedback({ text: "Supplier linked to category.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Link failed.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  const onUnlinkSupplier = async (supplierId: string) => {
    if (!canManageCategories || !selectedCategoryId) {
      return;
    }
    setFeedback(null);
    setDetailBusy(true);
    try {
      await deleteCategorySupplierLink(selectedCategoryId, supplierId);
      await refresh();
      setFeedback({ text: "Supplier unlinked.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Unlink failed.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  if (loading) {
    return <DashboardLoading label="Loading categories…" />;
  }

  if (!canViewCategories) {
    return (
      <DashboardAccessDenied
        title="Categories"
        description={
          <>
            You need <code className="text-xs">catalog.items.read</code> to view this page.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  const linkedSupplierIds = new Set(selectedCategory?.linkedSuppliers?.map((l) => l.supplierId) ?? []);
  const supplierChoices = supplierRows.filter((s) => !linkedSupplierIds.has(s.id));

  return (
    <>
      <div className="h-full overflow-y-auto overscroll-contain">
        <div className={DASHBOARD_MAX_WIDE}>
        {/* Header */}
        <div className="space-y-4">
          <DashboardPageHero
            compact
            icon={LayoutGrid}
            eyebrow="Catalog"
            title="Categories"
            description="Manage your category tree, covers, icons, and commercial defaults."
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DashboardQuickLinks
              compact
              links={[
                { href: APP_ROUTES.products, label: "Products", desc: "Items & variants", icon: Package },
                { href: APP_ROUTES.suppliers, label: "Suppliers", desc: "Vendors", icon: Building2 },
                { href: APP_ROUTES.pricing, label: "Pricing", desc: "Rules & margins", icon: Tags },
              ]}
            />
            {canManageCategories ? (
              <Button
                type="button"
                className="h-9 gap-2 self-start px-4 text-sm"
                onClick={() => setActiveDrawer("create")}
              >
                <FolderPlus className="size-4" aria-hidden />
                New category
              </Button>
            ) : null}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={listBusy} onClick={() => void refresh()}>
              {listBusy ? "Refreshing…" : "Refresh"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={listBusy || rows.length === 0 || parentIdsWithChildren.size === 0}
              onClick={() => setExpandedParentIds(new Set(parentIdsWithChildren))}
            >
              Expand all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={listBusy || expandedParentIds.size === 0}
              onClick={() => setExpandedParentIds(new Set())}
            >
              Collapse
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {visibleSorted.length} visible / {rows.length} total
            {editingCategoryId ? " · inline editing" : " · select a row to edit"}
          </p>
        </div>

        {/* Feedback — hidden while a drawer is open; each drawer shows the same message in its banner */}
        {feedback && !activeDrawer ? (
          <DashboardFeedback kind={feedback.kind === "error" ? "error" : "success"} text={feedback.text} />
        ) : null}

        {!canManageCategories ? (
          <p className="text-sm text-muted-foreground">
            View-only mode. Ask an admin for <code className="text-xs">catalog.categories.write</code>.
          </p>
        ) : null}

        {/* Selected row actions */}
        {selectedCategory && canManageCategories ? (
          <div className="flex flex-col gap-3 rounded-lg border border-primary/15 bg-primary/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                {categoryCoverUrl(selectedCategory) ? (
                  <Image
                    src={categoryCoverUrl(selectedCategory)!}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="40px"
                    unoptimized
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">—</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{selectedCategory.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{selectedCategory.slug}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs" onClick={() => setActiveDrawer("defaults")}>
                <Tags className="size-3.5" aria-hidden />
                Defaults
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs" onClick={() => setActiveDrawer("gallery")}>
                <Camera className="size-3.5" aria-hidden />
                Gallery
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs" onClick={() => setActiveDrawer("suppliers")}>
                <Building2 className="size-3.5" aria-hidden />
                Suppliers
              </Button>
              <Button asChild type="button" variant="secondary" size="sm" className="h-8 gap-1.5 px-2.5 text-xs">
                <Link href={categoryAnalyticsPath(selectedCategory.slug)}>
                  <BarChart3 className="size-3.5" aria-hidden />
                  Analytics
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => {
                  setPendingCategoryImage(null);
                  setPendingCreateIconFile(null);
                  setSelectedCategoryId(null);
                }}
              >
                <X className="size-3.5" aria-hidden />
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        {/* Table */}
        <section className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-border/60 bg-muted/40 backdrop-blur">
                <tr>
                  <th className="w-12 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cover</th>
                  <th className="min-w-[11rem] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="w-[8rem] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Slug</th>
                  <th className="min-w-[7rem] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Icon</th>
                  <th className="w-20 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground tabular-nums">Pos</th>
                  <th className="min-w-[8rem] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Parent</th>
                  <th className="min-w-[7rem] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Suppliers</th>
                  <th className="w-16 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active</th>
                  {canManageCategories ? (
                    <th className="w-28 whitespace-nowrap px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {visibleSorted.map((row) => {
                  const draft = edits[row.id];
                  const rowIsEditing = Boolean(canManageCategories && draft && editingCategoryId === row.id);
                  const parentName = row.parentId ? byId.get(row.parentId)?.name ?? "—" : "Top level";
                  const blockedParents = subtreeIncludingSelf(row.id, childrenMap);
                  const indentPx = (depths.get(row.id) ?? 0) * 14;
                  const cover = categoryCoverUrl(row);
                  const hasKids = (childrenMap.get(row.id)?.length ?? 0) > 0;
                  const branchExpanded = expandedParentIds.has(row.id);
                  const supplierHint =
                    row.linkedSuppliers?.length > 0
                      ? row.linkedSuppliers
                          .map((l) => `${l.supplierName}${l.primary ? " ★" : ""}`)
                          .join(", ")
                      : "—";

                  return (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "cursor-pointer align-middle transition-colors hover:bg-accent/25",
                        selectedCategoryId === row.id && "bg-accent/15",
                      )}
                      onClick={() => {
                        setPendingCategoryImage(null);
                        setSelectedCategoryId(row.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPendingCategoryImage(null);
                          setSelectedCategoryId(row.id);
                        }
                      }}
                    >
                      <td className="px-3 py-2">
                        <div className="relative mx-auto h-8 w-8 shrink-0 overflow-hidden rounded border bg-muted">
                          {cover ? (
                            <Image src={cover} alt="" fill className="object-cover" sizes="32px" unoptimized />
                          ) : (
                            <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2" onMouseDown={stopActivateRow}>
                        <div className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: indentPx }}>
                          {hasKids ? (
                            <button
                              type="button"
                              className="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              aria-expanded={branchExpanded}
                              aria-label={
                                branchExpanded
                                  ? `Hide subcategories under ${row.name}`
                                  : `Show subcategories under ${row.name}`
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedParentIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(row.id)) {
                                    next.delete(row.id);
                                  } else {
                                    next.add(row.id);
                                  }
                                  return next;
                                });
                              }}
                            >
                              {branchExpanded ? (
                                <ChevronDown className="size-3.5" aria-hidden />
                              ) : (
                                <ChevronRight className="size-3.5" aria-hidden />
                              )}
                            </button>
                          ) : (
                            <span className="inline-flex size-6 shrink-0" aria-hidden />
                          )}
                          {rowIsEditing && draft ? (
                            <input
                              className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 text-sm shadow-sm"
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
                            <Link
                              href={categorySlugPath(row.slug)}
                              className="block min-w-0 flex-1 truncate text-sm font-medium text-foreground transition-colors hover:text-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {row.name}
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground" onMouseDown={stopActivateRow}>
                        {rowIsEditing && draft ? (
                          <input
                            className="w-full min-w-0 rounded border border-input bg-background px-2 py-1 text-xs shadow-sm"
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
                          <span className="block truncate">{row.slug}</span>
                        )}
                      </td>
                      <td className="px-3 py-2" onMouseDown={stopActivateRow}>
                        {rowIsEditing && draft ? (
                          <div className="flex max-w-[14rem] flex-col gap-2">
                            {categoryIconImageUrl(draft.icon) ? (
                              <>
                                <span className="relative h-8 w-8 overflow-hidden rounded border bg-muted">
                                  <Image
                                    src={categoryIconImageUrl(draft.icon)!}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    sizes="32px"
                                    unoptimized
                                  />
                                </span>
                                <label className="flex flex-col gap-0.5 text-[10px] font-medium text-muted-foreground">
                                  Replace image
                                  <input
                                    type="file"
                                    accept="image/*"
                                    disabled={iconUploadCategoryId === row.id || listBusy}
                                    className="max-w-full text-[10px] file:mr-1 file:rounded file:border file:bg-background file:px-1.5 file:py-0.5"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      void onReplaceCategoryIconImage(row.id, f);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                {iconUploadCategoryId === row.id ? (
                                  <span className="text-[10px] text-muted-foreground">Uploading…</span>
                                ) : null}
                                <div className="flex flex-wrap gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 gap-1 text-[11px]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void onCopyCategoryIconUrl(row.id, categoryIconImageUrl(draft.icon)!);
                                    }}
                                  >
                                    <Copy className="size-3" aria-hidden />
                                    {copiedIconCategoryId === row.id ? "Copied" : "Copy URL"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[11px] text-muted-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEdits((prev) => ({
                                        ...prev,
                                        [row.id]: { ...draft, icon: "" },
                                      }));
                                    }}
                                  >
                                    Clear
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <label className="flex flex-col gap-0.5 text-[10px] font-medium text-muted-foreground">
                                  Image
                                  <input
                                    type="file"
                                    accept="image/*"
                                    disabled={iconUploadCategoryId === row.id || listBusy}
                                    className="max-w-full text-[10px] file:mr-1 file:rounded file:border file:bg-background file:px-1.5 file:py-0.5"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      void onReplaceCategoryIconImage(row.id, f);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                {iconUploadCategoryId === row.id ? (
                                  <span className="text-[10px] text-muted-foreground">Uploading…</span>
                                ) : null}
                                <input
                                  className="w-full rounded border border-input bg-background px-2 py-1 text-xs shadow-sm"
                                  placeholder="Emoji, key, or URL"
                                  value={draft.icon}
                                  onChange={(e) =>
                                    setEdits((prev) => ({
                                      ...prev,
                                      [row.id]: { ...draft, icon: e.target.value },
                                    }))
                                  }
                                  aria-label={`Icon ${row.name}`}
                                />
                              </>
                            )}
                          </div>
                        ) : categoryIconImageUrl(row.icon) ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded border bg-muted">
                              <Image
                                src={categoryIconImageUrl(row.icon)!}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="24px"
                                unoptimized
                              />
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-[11px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                void onCopyCategoryIconUrl(row.id, categoryIconImageUrl(row.icon)!);
                              }}
                            >
                              <Copy className="size-3" aria-hidden />
                              {copiedIconCategoryId === row.id ? "Copied" : "Copy"}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{row.icon?.trim() ? row.icon : "—"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums" onMouseDown={stopActivateRow}>
                        {rowIsEditing && draft ? (
                          <input
                            className="inline-block w-14 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums shadow-sm"
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
                          <span className="text-sm text-muted-foreground">{row.position}</span>
                        )}
                      </td>
                      <td className="px-3 py-2" onMouseDown={stopActivateRow}>
                        {rowIsEditing && draft ? (
                          <select
                            className="max-w-full rounded border border-input bg-background px-2 py-1 text-xs shadow-sm"
                            value={draft.parentId}
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [row.id]: { ...draft, parentId: e.target.value },
                              }))
                            }
                            aria-label={`Parent ${row.name}`}
                          >
                            <option value={ROOT_PARENT_VALUE}>Top level</option>
                            {sorted
                              .filter((c) => !blockedParents.has(c.id))
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {"—".repeat(depths.get(c.id) ?? 0)} {c.name}
                                  {!c.active ? " (inactive)" : ""}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <span className="block truncate text-xs text-muted-foreground">{parentName}</span>
                        )}
                      </td>
                      <td className="max-w-[9rem] px-3 py-2 text-xs text-muted-foreground">
                        <span className="line-clamp-2" title={supplierHint}>
                          {supplierHint}
                        </span>
                      </td>
                      <td className="px-3 py-2" onMouseDown={stopActivateRow}>
                        {rowIsEditing && draft ? (
                          <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
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
                            Active
                          </label>
                        ) : row.active ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            No
                          </span>
                        )}
                      </td>
                      {canManageCategories ? (
                        <td className="whitespace-nowrap px-3 py-2 text-right" onMouseDown={stopActivateRow}>
                          {rowIsEditing && draft ? (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                disabled={listBusy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  restoreDraftFromRow(row.id);
                                  setEditingCategoryId(null);
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                disabled={listBusy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void onSaveRow(row.id);
                                }}
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                              disabled={listBusy || !draft}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (editingCategoryId && editingCategoryId !== row.id) {
                                  restoreDraftFromRow(editingCategoryId);
                                }
                                restoreDraftFromRow(row.id);
                                setEditingCategoryId(row.id);
                              }}
                            >
                              <Pencil className="size-3" aria-hidden />
                              Edit
                            </Button>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer notes */}
        <div className="space-y-1.5">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No categories yet{canManageCategories ? " — click New category to get started." : "."}
            </p>
          ) : !selectedCategory ? (
            <p className="text-xs text-muted-foreground">
              Tip: select a row to unlock drawers for defaults, gallery uploads, and supplier links.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Inactive categories remain in the tree for editing but may be hidden in product filters.
          </p>
        </div>
      </div>
      </div>

      {/* Drawers */}
      <FormDrawer
        open={activeDrawer === "create"}
        width="half"
        onboardingTarget={ONBOARDING_TARGETS.categoriesDrawer}
        onOpenChange={(open) => {
          if (!open) {
            setActiveDrawer(null);
            setPendingCreateIconFile(null);
            setBatchNamesText("");
            setCreateQueue([]);
            setSuggestionPickKeys([]);
            setShowBulkSuggestions(true);
            setCreateBusy(false);
          }
        }}
        title="New category"
        contextLabel="Catalog"
        icon={<FolderPlus className="size-5 text-primary" aria-hidden />}
        banner={
          activeDrawer === "create" && feedback ? (
            <DashboardFeedback kind={feedback.kind === "error" ? "error" : "success"} text={feedback.text} />
          ) : undefined
        }
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" className="h-9" onClick={() => setActiveDrawer(null)}>
              Cancel
            </Button>
            <Button type="submit" form="create-category-form" className="h-9" disabled={createBusy}>
              {createBusy
                ? "Creating…"
                : pendingCreateNameCount > 1
                  ? `Create ${pendingCreateNameCount}`
                  : "Create"}
            </Button>
          </div>
        }
      >
        <form id="create-category-form" className="space-y-4" onSubmit={(e) => void onCreate(e)}>
          <CategoryBulkSuggestions
            compact
            open={showBulkSuggestions}
            onOpenChange={setShowBulkSuggestions}
            pickKeys={suggestionPickKeys}
            onTogglePickKey={toggleSuggestionPickKey}
            onSetPickKeys={setSuggestionPickKeys}
            onClearPicks={clearSuggestionPickKeys}
            onAddPicksToQueue={addSuggestionPicksToQueue}
            catalogNameLowerSet={catalogNameLowerSet}
            onboardingHighlight={searchParams.get("onboarding") === "create-category"}
          />

          <FormDrawerFields legend="Names" compact>
            <label className={cn("flex flex-col gap-1", categoryDrawerLabel)}>
              Name
              <input
                className={categoryDrawerInput}
                value={createDraft.name}
                onChange={(e) => setCreateDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder="Category name"
                aria-label="New category name"
              />
            </label>
            <label className={cn("flex flex-col gap-1", categoryDrawerLabel)}>
              More names
              <textarea
                className={categoryDrawerTextarea}
                placeholder="One per line (same parent)"
                value={batchNamesText}
                onChange={(e) => setBatchNamesText(e.target.value)}
                aria-label="Additional category names one per line"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={cn("flex flex-col gap-1", categoryDrawerLabel)}>
                Parent
                <select
                  className={categoryDrawerInput}
                  value={createDraft.parentId}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, parentId: e.target.value }))}
                  aria-label="Parent category"
                >
                  <option value={ROOT_PARENT_VALUE}>Top level</option>
                  {sorted.map((c) => (
                    <option key={c.id} value={c.id}>
                      {"—".repeat(depths.get(c.id) ?? 0)} {c.name}
                      {!c.active ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className={cn("flex flex-col gap-1", categoryDrawerLabel)}>
                Position
                <input
                  className={categoryDrawerInput}
                  placeholder="Auto"
                  inputMode="numeric"
                  value={createDraft.positionStr}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, positionStr: e.target.value }))}
                  aria-label="Sort position optional"
                />
              </label>
            </div>

            {effectiveStructuredQueue.length > 0 ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                <p className="text-xs font-medium text-foreground">
                  To create · {effectiveStructuredQueue.length}
                </p>
                <ul className="mt-1.5 max-h-32 space-y-1 overflow-y-auto text-sm">
                  {effectiveStructuredQueue.map((q) => (
                    <li
                      key={q.id}
                      className="flex items-center justify-between gap-2 rounded-md bg-background/80 px-2 py-1"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium text-foreground">{q.name}</span>
                        <span className="text-muted-foreground"> · {formatCreateListParentCaption(q)}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="h-6 shrink-0 px-1.5 text-muted-foreground hover:text-destructive"
                        onClick={() => discardEffectiveQueueRow(q)}
                        aria-label={`Remove ${q.name}`}
                      >
                        <X className="size-3.5" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </FormDrawerFields>

          <FormDrawerFields legend="Optional" compact>
            <label className={cn("flex flex-col gap-1", categoryDrawerLabel)}>
              Icon image
              <input
                type="file"
                accept="image/*"
                className="max-w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setPendingCreateIconFile(f);
                  e.target.value = "";
                }}
              />
              {pendingCreateIconFile ? (
                <span className="truncate text-[11px] text-muted-foreground">
                  {pendingCreateIconFile.name}
                </span>
              ) : null}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={cn("flex flex-col gap-1", categoryDrawerLabel)}>
                Icon
                <input
                  className={categoryDrawerInput}
                  placeholder="Emoji"
                  value={createDraft.icon}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, icon: e.target.value }))}
                  aria-label="Icon optional text"
                  disabled={Boolean(pendingCreateIconFile)}
                />
              </label>
              <label className={cn("flex flex-col gap-1", categoryDrawerLabel)}>
                Markup %
                <input
                  className={cn(categoryDrawerInput, "tabular-nums")}
                  placeholder="—"
                  inputMode="decimal"
                  value={createDraft.markupStr}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, markupStr: e.target.value }))}
                  aria-label="Default markup optional"
                />
              </label>
            </div>
            <label className={cn("flex flex-col gap-1", categoryDrawerLabel)}>
              Tax rate
              <select
                className={categoryDrawerInput}
                value={createDraft.taxRateId}
                onChange={(e) => setCreateDraft((p) => ({ ...p, taxRateId: e.target.value }))}
                aria-label="Default tax optional"
              >
                <option value="">None</option>
                {taxRates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({String(t.ratePercent)}%){t.inclusive ? " incl." : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className={cn("flex flex-col gap-1", categoryDrawerLabel)}>
              Description
              <textarea
                className={cn(categoryDrawerTextarea, "min-h-[3rem]")}
                placeholder="Shelf copy"
                value={createDraft.description}
                onChange={(e) => setCreateDraft((p) => ({ ...p, description: e.target.value }))}
                aria-label="Description optional"
              />
            </label>
          </FormDrawerFields>
        </form>
      </FormDrawer>

      <FormDrawer
        open={activeDrawer === "defaults" && selectedCategory != null}
        onOpenChange={(open) => {
          if (!open) setActiveDrawer(null);
        }}
        title="Defaults & price rules"
        description={
          selectedCategory
            ? `Marketing copy and tax posture for ${selectedCategory.name}.`
            : ""
        }
        contextLabel="Commercial"
        icon={<Tags className="size-5 text-primary" aria-hidden />}
        width="wide"
        banner={
          activeDrawer === "defaults" && feedback ? (
            <DashboardFeedback kind={feedback.kind === "error" ? "error" : "success"} text={feedback.text} />
          ) : undefined
        }
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setActiveDrawer(null)}>
              Close
            </Button>
            <Button type="button" disabled={detailBusy || !commercialDraft} onClick={() => void onSaveCommercialDefaults()}>
              Save defaults
            </Button>
          </div>
        }
      >
        {selectedCategory ? (
          <div className="space-y-6">
            <FormDrawerFields legend="Shelf story">
              {!commercialDraft ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : (
                <>
                  <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                    Description
                    <textarea
                      className="min-h-[5rem] resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                      value={commercialDraft.description}
                      onChange={(e) =>
                        setCommercialDraft((d) => (d ? { ...d, description: e.target.value } : d))
                      }
                      disabled={detailBusy}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                      Default markup %
                      <input
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums shadow-sm"
                        inputMode="decimal"
                        placeholder="empty = none"
                        value={commercialDraft.markupStr}
                        onChange={(e) =>
                          setCommercialDraft((d) => (d ? { ...d, markupStr: e.target.value } : d))
                        }
                        disabled={detailBusy}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                      Default tax rate
                      <select
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                        value={commercialDraft.taxRateId}
                        onChange={(e) =>
                          setCommercialDraft((d) => (d ? { ...d, taxRateId: e.target.value } : d))
                        }
                        disabled={detailBusy || taxRates.length === 0}
                      >
                        <option value="">None</option>
                        {taxRates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({String(t.ratePercent)}%){t.inclusive ? " incl." : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {selectedCategory.defaultTaxRate ? (
                    <p className="text-[11px] text-muted-foreground">
                      Resolved:{" "}
                      <span className="font-medium text-foreground">{selectedCategory.defaultTaxRate.name}</span> (
                      {String(selectedCategory.defaultTaxRate.ratePercent)}%
                      {selectedCategory.defaultTaxRate.inclusive ? ", inclusive" : ""})
                    </p>
                  ) : null}
                </>
              )}
            </FormDrawerFields>

            <FormDrawerFields legend="Direct price rules">
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  Rule
                  <select
                    className="min-w-[12rem] rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                    value={rulePickId}
                    onChange={(e) => setRulePickId(e.target.value)}
                    disabled={detailBusy || priceRules.length === 0}
                  >
                    <option value="">Choose…</option>
                    {priceRules
                      .filter((r) => r.active)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  Precedence (optional)
                  <input
                    className="w-28 rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums shadow-sm"
                    inputMode="numeric"
                    value={rulePrecStr}
                    onChange={(e) => setRulePrecStr(e.target.value)}
                    disabled={detailBusy}
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  disabled={detailBusy || !rulePickId.trim()}
                  onClick={() => void onLinkPriceRule()}
                >
                  Link rule
                </Button>
              </div>
              <ul className="divide-y divide-border/40 text-sm">
                {linkedRules.length === 0 ? (
                  <li className="py-2 text-xs text-muted-foreground">No rules linked on this category.</li>
                ) : (
                  linkedRules.map((lr) => (
                    <li
                      key={lr.ruleId}
                      className="flex items-center justify-between gap-2 py-2 text-xs"
                    >
                      <span>
                        {lr.ruleName}{" "}
                        <span className="tabular-nums text-muted-foreground">· precedence {lr.precedence}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] text-destructive"
                        disabled={detailBusy}
                        onClick={() => void onUnlinkPriceRule(lr.ruleId)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))
                )}
              </ul>
            </FormDrawerFields>
          </div>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={activeDrawer === "gallery" && selectedCategory != null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveDrawer(null);
            setPendingCategoryImage(null);
          }
        }}
        title="Gallery"
        description="Images are uploaded to Cloudinary and referenced by URL."
        contextLabel="Media"
        icon={<Camera className="size-5 text-primary" aria-hidden />}
        banner={
          activeDrawer === "gallery" && feedback ? (
            <DashboardFeedback kind={feedback.kind === "error" ? "error" : "success"} text={feedback.text} />
          ) : undefined
        }
        footer={
          <p className="text-[11px] text-muted-foreground">
            Toggle “cover” so kiosk rails pick up the hero tile after upload.
          </p>
        }
      >
        {selectedCategory ? (
          <div className="space-y-5">
            <form
              id="category-gallery-upload-form"
              className="space-y-3 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10 p-4"
              onSubmit={(e) => void onUploadCategoryImage(e)}
            >
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Image file
                <input
                  type="file"
                  accept="image/*"
                  className="max-w-full text-sm file:mr-3 file:rounded file:border file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
                  disabled={detailBusy}
                  onChange={(e) => setPendingCategoryImage(e.target.files?.[0] ?? null)}
                />
              </label>
              {pendingCategoryImage ? (
                <p className="text-[11px] text-muted-foreground">Selected: {pendingCategoryImage.name}</p>
              ) : null}
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={uploadAsCover}
                  onChange={(e) => setUploadAsCover(e.target.checked)}
                  disabled={detailBusy}
                />
                Set as cover
              </label>
              <Button type="submit" size="sm" disabled={detailBusy || !pendingCategoryImage}>
                {detailBusy ? "Uploading…" : "Upload"}
              </Button>
            </form>
            {categoryImages.length === 0 ? (
              <p className="text-xs text-muted-foreground">No gallery images yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-3">
                {categoryImages.map((img) => {
                  const src = img.secureUrl?.trim() ?? "";
                  return (
                    <li
                      key={img.id}
                      className="relative w-28 shrink-0 overflow-hidden rounded-lg border bg-background text-xs shadow-sm"
                    >
                      <div className="relative aspect-square w-full bg-muted">
                        {src ? (
                          <Image src={src} alt="" fill className="object-cover" sizes="112px" unoptimized />
                        ) : (
                          <span className="flex h-full items-center justify-center text-muted-foreground">—</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full rounded-none text-[11px] text-destructive hover:text-destructive"
                        disabled={detailBusy}
                        onClick={() => void onDeleteCategoryImage(img.id)}
                      >
                        Remove
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={activeDrawer === "suppliers" && selectedCategory != null}
        onOpenChange={(open) => {
          if (!open) setActiveDrawer(null);
        }}
        title="Supplier anchors"
        description="Flag vendors that stock this aisle for replenishment and reporting."
        contextLabel="Supply chain"
        icon={<Building2 className="size-5 text-primary" aria-hidden />}
        banner={
          activeDrawer === "suppliers" && feedback ? (
            <DashboardFeedback kind={feedback.kind === "error" ? "error" : "success"} text={feedback.text} />
          ) : undefined
        }
        footer={
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setActiveDrawer(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedCategory ? (
          <div className="space-y-5">
            {!canViewSuppliers ? (
              <p className="text-sm text-muted-foreground">
                You need <code className="rounded bg-muted px-1 font-mono text-xs">suppliers.read</code> to attach
                vendors.
              </p>
            ) : (
              <>
                <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => void onLinkSupplier(e)}>
                  <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                    Add supplier
                    <select
                      className="min-w-[12rem] rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                      value={supplierPickId}
                      onChange={(e) => setSupplierPickId(e.target.value)}
                      disabled={detailBusy || supplierChoices.length === 0}
                    >
                      <option value="">Choose…</option>
                      {supplierChoices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button type="submit" disabled={detailBusy || !supplierPickId.trim()}>
                    Link
                  </Button>
                </form>
                <ul className="divide-y divide-border/40 rounded-lg border bg-muted/10 p-2 text-sm">
                  {(selectedCategory.linkedSuppliers ?? []).length === 0 ? (
                    <li className="px-2 py-2 text-xs text-muted-foreground">No suppliers linked yet.</li>
                  ) : (
                    (selectedCategory.linkedSuppliers ?? []).map((l) => (
                      <li
                        key={l.supplierId}
                        className="flex flex-wrap items-center justify-between gap-2 px-2 py-2"
                      >
                        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {l.supplierName}
                          {l.primary ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              Primary
                            </span>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 gap-1">
                          {!l.primary ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-7 text-[11px]"
                              disabled={detailBusy}
                              onClick={() => void onSetSupplierPrimary(l.supplierId)}
                            >
                              Set primary
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] text-destructive"
                            disabled={detailBusy}
                            onClick={() => void onUnlinkSupplier(l.supplierId)}
                          >
                            Remove
                          </Button>
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </div>
        ) : null}
      </FormDrawer>
    </>
  );
}
