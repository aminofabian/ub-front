"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchSaGlobalPack,
  fetchSaGlobalProduct,
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
] as const;

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
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberRows, setMemberRows] = useState<SaGlobalProduct[]>([]);
  const [candidateQ, setCandidateQ] = useState("");
  const [candidates, setCandidates] = useState<SaGlobalProduct[]>([]);
  const [preferImaged, setPreferImaged] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [storeKitId, setStoreKitId] = useState("");

  useEffect(() => {
    setSelectedPackId("");
    setPackDetail(null);
    setMemberIds([]);
    setMemberRows([]);
    setDirty(false);
  }, [catalogId]);

  useEffect(() => {
    if (!selectedPackId && packs[0]?.id) {
      setSelectedPackId(packs[0].id);
    }
  }, [packs, selectedPackId]);

  const reloadMembers = useCallback(async (productIds: string[]) => {
    const rows: SaGlobalProduct[] = [];
    for (const id of productIds) {
      try {
        rows.push(await fetchSaGlobalProduct(id, catalogId));
      } catch {
        // Drop stale ids from the visual list; save will persist the id list as-edited.
      }
    }
    setMemberRows(rows);
  }, [catalogId]);

  useEffect(() => {
    if (!selectedPackId) return;
    let cancelled = false;
    void (async () => {
      try {
        const detail = await fetchSaGlobalPack(selectedPackId, catalogId);
        if (cancelled) return;
        setPackDetail(detail);
        setMemberIds(detail.productIds);
        setStoreKitId(detail.storeKitId ?? "");
        setDirty(false);
        await reloadMembers(detail.productIds);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Could not load pack.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPackId, catalogId, reloadMembers]);

  const reloadCandidates = useCallback(async () => {
    const result = await fetchSaGlobalProducts({
      catalogId,
      q: candidateQ,
      status: "published",
      page: 0,
      size: 50,
    });
    let content = result.content ?? [];
    if (preferImaged) {
      content = [...content].sort(
        (a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)),
      );
    }
    setCandidates(content);
  }, [catalogId, candidateQ, preferImaged]);

  useEffect(() => {
    void (async () => {
      try {
        await reloadCandidates();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load candidates.");
      }
    })();
  }, [reloadCandidates]);

  const memberIdSet = useMemo(() => new Set(memberIds), [memberIds]);

  const addMember = (product: SaGlobalProduct) => {
    if (memberIdSet.has(product.id)) return;
    setMemberIds((prev) => [...prev, product.id]);
    setMemberRows((prev) => [...prev, product]);
    setDirty(true);
  };

  const removeMember = (productId: string) => {
    setMemberIds((prev) => prev.filter((id) => id !== productId));
    setMemberRows((prev) => prev.filter((p) => p.id !== productId));
    setDirty(true);
  };

  const onSave = async () => {
    if (!selectedPackId) return;
    onBusyChange(true);
    try {
      const saved = await patchSaGlobalPack(
        selectedPackId,
        {
          productIds: memberIds,
          storeKitId: storeKitId.trim() || null,
        },
        catalogId,
      );
      setPackDetail(saved);
      setMemberIds(saved.productIds);
      setStoreKitId(saved.storeKitId ?? "");
      setDirty(false);
      await reloadMembers(saved.productIds);
      await onSaved();
      toast.success("Pack saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save pack.");
    } finally {
      onBusyChange(false);
    }
  };

  if (packs.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 px-4 py-12 text-center text-sm text-muted-foreground">
        No starter packs found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/40 p-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="pack-select">Starter pack</Label>
          <select
            id="pack-select"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedPackId}
            onChange={(e) => {
              if (dirty && !window.confirm("Discard unsaved changes?")) return;
              setSelectedPackId(e.target.value);
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
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
        <Button disabled={busy || !dirty} onClick={() => void onSave()}>
          Save pack
        </Button>
      </div>

      {packDetail ? (
        <p className="text-sm text-muted-foreground">
          {packDetail.description || "No description"} · {memberIds.length} members
          {packDetail.storeKitId ? ` · kit ${packDetail.storeKitId}` : ""}
          {dirty ? " · unsaved changes" : ""}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-border/70">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            In pack ({memberRows.length})
          </div>
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
        </section>

        <section className="overflow-hidden rounded-2xl border border-border/70">
          <div className="space-y-3 border-b border-border/60 bg-muted/30 px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Add published products
            </div>
            <Input
              value={candidateQ}
              onChange={(e) => setCandidateQ(e.target.value)}
              placeholder="Search published products…"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={preferImaged}
                onChange={(e) => setPreferImaged(e.target.checked)}
              />
              Prefer products with images
            </label>
          </div>
          <ul className="max-h-[28rem] divide-y divide-border/60 overflow-y-auto">
            {candidates
              .filter((c) => !memberIdSet.has(c.id))
              .map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
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
                    onClick={() => addMember(row)}
                  >
                    Add
                  </Button>
                </li>
              ))}
          </ul>
        </section>
      </div>
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
