"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SaSection, saSelectClass } from "@/components/super-admin/sa-section";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createSaGlobalPack,
  deleteSaGlobalPack,
  fetchSaGlobalPack,
  fetchSaGlobalPackProducts,
  fetchSaGlobalProducts,
  patchSaGlobalPack,
  type SaGlobalPackDetail,
  type SaGlobalPackSummary,
  type SaGlobalProduct,
} from "@/lib/super-admin-api";

const STORE_KIT_OPTIONS = [
  { value: "butchery", label: "Butchery" },
  { value: "mini-mart", label: "Mini mart" },
  { value: "full-grocery", label: "Full grocery" },
  { value: "fresh-market", label: "Fresh market" },
  { value: "mixed-shop", label: "Mixed shop" },
  { value: "cosmetics", label: "Cosmetics" },
  { value: "wines-spirits", label: "Wines & spirits" },
  { value: "pharmacy", label: "Pharmacy / chemist" },
] as const;

const CANDIDATE_PAGE_SIZE = 50;
/** Hard ceiling for "Add all matching" so one click cannot pull an entire catalog. */
const ADD_ALL_MAX = 500;

type GlobalCatalogPacksPanelProps = {
  catalogId: string;
  packs: SaGlobalPackSummary[];
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onSaved: () => Promise<void>;
};

export function GlobalCatalogPacksPanel({
  catalogId,
  packs,
  busy,
  onBusyChange,
  onSaved,
}: GlobalCatalogPacksPanelProps) {
  const [selectedPackId, setSelectedPackId] = useState<string>(packs[0]?.id ?? "");
  const [packDetail, setPackDetail] = useState<SaGlobalPackDetail | null>(null);
  /** Members as currently edited (ids in order) + the saved baseline for the diff save. */
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [baselineIds, setBaselineIds] = useState<string[]>([]);
  const [memberRows, setMemberRows] = useState<SaGlobalProduct[]>([]);
  const [candidateQ, setCandidateQ] = useState("");
  const [candidates, setCandidates] = useState<SaGlobalProduct[]>([]);
  const [candidatePage, setCandidatePage] = useState(0);
  const [candidateTotal, setCandidateTotal] = useState(0);
  const [candidateChecked, setCandidateChecked] = useState<Set<string>>(new Set());
  const [preferImaged, setPreferImaged] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [storeKitId, setStoreKitId] = useState("");
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setSelectedPackId("");
    setPackDetail(null);
    setMemberIds([]);
    setBaselineIds([]);
    setMemberRows([]);
    setDirty(false);
  }, [catalogId]);

  useEffect(() => {
    if (!selectedPackId && packs[0]?.id) {
      setSelectedPackId(packs[0].id);
    }
  }, [packs, selectedPackId]);

  useEffect(() => {
    if (!selectedPackId) return;
    let cancelled = false;
    void (async () => {
      try {
        // Members arrive with full detail in ONE call — no more request-per-member.
        const [detail, rows] = await Promise.all([
          fetchSaGlobalPack(selectedPackId, catalogId),
          fetchSaGlobalPackProducts(selectedPackId, catalogId),
        ]);
        if (cancelled) return;
        setPackDetail(detail);
        setMemberIds(rows.map((r) => r.id));
        setBaselineIds(rows.map((r) => r.id));
        setMemberRows(rows);
        setStoreKitId(detail.storeKitId ?? "");
        setDirty(false);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Could not load pack.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPackId, catalogId]);

  const loadCandidates = useCallback(
    async (page: number, append: boolean) => {
      const result = await fetchSaGlobalProducts({
        catalogId,
        q: candidateQ,
        status: "published",
        page,
        size: CANDIDATE_PAGE_SIZE,
      });
      let content = result.content ?? [];
      if (preferImaged) {
        content = [...content].sort(
          (a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)),
        );
      }
      setCandidateTotal(result.totalElements ?? content.length);
      setCandidatePage(page);
      setCandidates((prev) => (append ? [...prev, ...content] : content));
    },
    [catalogId, candidateQ, preferImaged],
  );

  useEffect(() => {
    setCandidateChecked(new Set());
    void (async () => {
      try {
        await loadCandidates(0, false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load candidates.");
      }
    })();
  }, [loadCandidates]);

  const memberIdSet = useMemo(() => new Set(memberIds), [memberIds]);
  const hasMoreCandidates = (candidatePage + 1) * CANDIDATE_PAGE_SIZE < candidateTotal;

  const addMembers = (products: SaGlobalProduct[]) => {
    const fresh = products.filter((p) => !memberIdSet.has(p.id));
    if (fresh.length === 0) return;
    setMemberIds((prev) => [...prev, ...fresh.map((p) => p.id)]);
    setMemberRows((prev) => [...prev, ...fresh]);
    setDirty(true);
  };

  const removeMember = (productId: string) => {
    setMemberIds((prev) => prev.filter((id) => id !== productId));
    setMemberRows((prev) => prev.filter((p) => p.id !== productId));
    setDirty(true);
  };

  const onAddChecked = () => {
    addMembers(candidates.filter((c) => candidateChecked.has(c.id)));
    setCandidateChecked(new Set());
  };

  const onAddAllMatching = async () => {
    onBusyChange(true);
    try {
      const all: SaGlobalProduct[] = [];
      let page = 0;
      for (;;) {
        const result = await fetchSaGlobalProducts({
          catalogId,
          q: candidateQ,
          status: "published",
          page,
          size: 100,
        });
        all.push(...(result.content ?? []));
        if (all.length >= ADD_ALL_MAX) {
          toast.warning(`Stopped at ${ADD_ALL_MAX} products — narrow the search to add more precisely.`);
          break;
        }
        if ((page + 1) * 100 >= (result.totalElements ?? 0)) break;
        page++;
      }
      addMembers(all.slice(0, ADD_ALL_MAX));
      toast.success(`Added ${all.slice(0, ADD_ALL_MAX).filter((p) => !memberIdSet.has(p.id)).length} products (not saved yet).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load all matching products.");
    } finally {
      onBusyChange(false);
    }
  };

  const onSave = async () => {
    if (!selectedPackId) return;
    onBusyChange(true);
    try {
      // Diff save (scope §7.3): only what changed travels, so two editors working on
      // the same pack cannot silently wipe each other's additions.
      const baseline = new Set(baselineIds);
      const current = new Set(memberIds);
      const addProductIds = memberIds.filter((id) => !baseline.has(id));
      const removeProductIds = baselineIds.filter((id) => !current.has(id));
      const saved = await patchSaGlobalPack(
        selectedPackId,
        {
          ...(addProductIds.length > 0 ? { addProductIds } : {}),
          ...(removeProductIds.length > 0 ? { removeProductIds } : {}),
          ...(storeKitId.trim() !== (packDetail?.storeKitId ?? "")
            ? { storeKitId: storeKitId.trim() || null }
            : {}),
        },
        catalogId,
      );
      setPackDetail(saved);
      const rows = await fetchSaGlobalPackProducts(selectedPackId, catalogId);
      setMemberIds(rows.map((r) => r.id));
      setBaselineIds(rows.map((r) => r.id));
      setMemberRows(rows);
      setStoreKitId(saved.storeKitId ?? "");
      setDirty(false);
      await onSaved();
      toast.success(
        `Pack saved — ${addProductIds.length} added, ${removeProductIds.length} removed.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save pack.");
    } finally {
      onBusyChange(false);
    }
  };

  const onCreatePack = async () => {
    if (!newCode.trim() || !newName.trim()) {
      toast.error("New packs need a code and a name.");
      return;
    }
    onBusyChange(true);
    try {
      const created = await createSaGlobalPack(
        { code: newCode.trim(), name: newName.trim(), status: "draft" },
        catalogId,
      );
      await onSaved();
      setSelectedPackId(created.id);
      setCreating(false);
      setNewCode("");
      setNewName("");
      toast.success(`Pack '${created.name}' created as draft.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create pack.");
    } finally {
      onBusyChange(false);
    }
  };

  const onDeletePack = () => {
    if (!packDetail) return;
    showThemedConfirmToast({
      id: `delete-pack-${packDetail.id}`,
      title: `Delete pack '${packDetail.name}'?`,
      description: "Shops that already adopted its products keep them; only the pack grouping is removed.",
      confirmLabel: "Delete pack",
      confirmVariant: "destructive",
      onConfirm: async () => {
        onBusyChange(true);
        try {
          await deleteSaGlobalPack(packDetail.id, catalogId);
          setSelectedPackId("");
          setPackDetail(null);
          setMemberIds([]);
          setBaselineIds([]);
          setMemberRows([]);
          await onSaved();
          toast.success("Pack deleted.");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not delete pack.");
        } finally {
          onBusyChange(false);
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      <SaSection
        title="Starter pack"
        description={
          packDetail
            ? `${packDetail.description || "No description"} · ${memberIds.length} members${packDetail.storeKitId ? ` · kit ${packDetail.storeKitId}` : ""}${dirty ? " · unsaved changes" : ""}`
            : "Create a pack to group products shops can adopt in one go."
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setCreating((v) => !v)}
            >
              <Plus className="size-4" aria-hidden />
              New pack
            </Button>
            {packDetail ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={onDeletePack}
                title="Delete this pack"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            ) : null}
            <Button disabled={busy || !dirty} onClick={() => void onSave()}>
              Save pack
            </Button>
          </div>
        }
      >
        {creating ? (
          <div className="mb-3 flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-end">
            <div className="w-full space-y-1.5 sm:w-44">
              <Label htmlFor="pack-new-code">Code</Label>
              <Input
                id="pack-new-code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="MM-STARTER"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="pack-new-name">Name</Label>
              <Input
                id="pack-new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Mini-mart starter pack"
              />
            </div>
            <Button type="button" size="sm" disabled={busy} onClick={() => void onCreatePack()}>
              Create draft
            </Button>
          </div>
        ) : null}
        {packs.length === 0 && !creating ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No starter packs yet — create one above, or import packs from a manifest CSV.
          </p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="pack-select">Pack</Label>
              <select
                id="pack-select"
                className={saSelectClass}
                value={selectedPackId}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!dirty) {
                    setSelectedPackId(next);
                    return;
                  }
                  showThemedConfirmToast({
                    id: "discard-pack-changes",
                    title: "Discard unsaved changes?",
                    description: "Switching packs will lose edits you have not saved.",
                    confirmLabel: "Discard",
                    onConfirm: () => setSelectedPackId(next),
                  });
                }}
              >
                {packs.map((pack) => {
                  const pct =
                    pack.productCount > 0
                      ? Math.round((pack.imagedProductCount / pack.productCount) * 100)
                      : 0;
                  return (
                    <option key={pack.id} value={pack.id}>
                      {pack.name} — {pack.imagedProductCount}/{pack.productCount} imaged ({pct}%)
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="w-full space-y-1.5 sm:w-52">
              <Label htmlFor="pack-store-kit">Onboarding kit</Label>
              <select
                id="pack-store-kit"
                className={saSelectClass}
                value={storeKitId}
                onChange={(e) => {
                  setStoreKitId(e.target.value);
                  setDirty(true);
                }}
              >
                <option value="">None</option>
                {STORE_KIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </SaSection>

      {packDetail ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SaSection title="In pack" description={`${memberRows.length} members`} padded={false}>
            <ul className="max-h-[28rem] divide-y divide-border/60 overflow-y-auto">
              {memberRows.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No members yet — add published products from the right.
                </li>
              ) : (
                memberRows.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Thumb url={row.imageUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{row.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[row.barcode, row.status].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    {!row.imageUrl ? (
                      <Badge className="border-0 bg-amber-500/15 font-normal text-amber-900 dark:text-amber-100">
                        No image
                      </Badge>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => removeMember(row.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </SaSection>

          <SaSection
            title="Add published products"
            description={`${candidateTotal.toLocaleString()} match`}
            padded={false}
          >
            <div className="space-y-3 border-b border-border/60 px-4 py-3 sm:px-5">
              <Input
                value={candidateQ}
                onChange={(e) => setCandidateQ(e.target.value)}
                placeholder="Search published products…"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Switch
                  id="pack-prefer-imaged"
                  checked={preferImaged}
                  onCheckedChange={setPreferImaged}
                />
                <Label htmlFor="pack-prefer-imaged">Prefer products with images</Label>
                <span className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || candidateChecked.size === 0}
                  onClick={onAddChecked}
                >
                  Add {candidateChecked.size || ""} selected
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy || candidateTotal === 0}
                  onClick={() => void onAddAllMatching()}
                  title={`Adds every product matching the search (up to ${ADD_ALL_MAX})`}
                >
                  Add all {candidateTotal.toLocaleString()}
                </Button>
              </div>
            </div>
            <ul className="max-h-[28rem] divide-y divide-border/60 overflow-y-auto">
              {candidates
                .filter((c) => !memberIdSet.has(c.id))
                .map((row) => (
                  <li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                    <input
                      type="checkbox"
                      className="size-4 rounded border"
                      checked={candidateChecked.has(row.id)}
                      onChange={(e) => {
                        setCandidateChecked((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(row.id);
                          else next.delete(row.id);
                          return next;
                        });
                      }}
                    />
                    <Thumb url={row.imageUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{row.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[row.brand, row.barcode].filter(Boolean).join(" · ") || row.status}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => addMembers([row])}
                    >
                      Add
                    </Button>
                  </li>
                ))}
              {hasMoreCandidates ? (
                <li className="px-4 py-2.5 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void loadCandidates(candidatePage + 1, true)}
                  >
                    Load more ({(candidateTotal - (candidatePage + 1) * CANDIDATE_PAGE_SIZE).toLocaleString()} left)
                  </Button>
                </li>
              ) : null}
            </ul>
          </SaSection>
        </div>
      ) : null}
    </div>
  );
}

function Thumb({ url }: { url: string | null }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/60">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <ImageOff className="size-3.5 text-muted-foreground" aria-hidden />
      )}
    </div>
  );
}
