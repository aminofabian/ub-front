"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Package,
  PackagePlus,
  Search,
  Truck,
} from "lucide-react";

import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  fetchItemSupplierLinks,
  fetchItems,
  fetchSupplierById,
  fetchSuppliersPage,
  type ItemSummaryRecord,
  type SupplierRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { displaySupplierName } from "@/lib/supplier-display";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 220;
const RECENT_KEY = "kiosk.hub.start-supply.recent";
const RECENT_LIMIT = 6;

type RecentSupplier = {
  id: string;
  name: string;
};

type ProductHit = {
  item: ItemSummaryRecord;
  suppliers: { id: string; name: string; primary: boolean }[];
};

type SeedSupplier = {
  id: string;
  name: string;
};

function readRecent(): RecentSupplier[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (row): row is RecentSupplier =>
          !!row &&
          typeof row === "object" &&
          typeof (row as RecentSupplier).id === "string" &&
          typeof (row as RecentSupplier).name === "string",
      )
      .slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

function writeRecent(supplier: SupplierRecord) {
  if (typeof window === "undefined") return;
  const next: RecentSupplier = {
    id: supplier.id,
    name: displaySupplierName({ name: supplier.name }) || supplier.name,
  };
  const prev = readRecent().filter((row) => row.id !== next.id);
  try {
    window.localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([next, ...prev].slice(0, RECENT_LIMIT)),
    );
  } catch {
    /* ignore quota */
  }
}

function mergeSeedIntoRecent(
  recent: RecentSupplier[],
  seeds: SeedSupplier[],
): RecentSupplier[] {
  const out: RecentSupplier[] = [];
  const seen = new Set<string>();
  for (const row of [...recent, ...seeds]) {
    const id = row.id?.trim();
    const name = row.name?.trim();
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name });
    if (out.length >= RECENT_LIMIT) break;
  }
  return out;
}

/**
 * First step of recording a delivery from the business hub: find who brought
 * the goods (by supplier name or by a product they supply), then hand off to
 * New supply with that vendor already chosen.
 */
export function StartSupplySheet({
  open,
  onOpenChange,
  onPick,
  seedSuppliers = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (supplier: SupplierRecord) => void;
  /** Today's delivery vendors — shown with recent when the search is empty. */
  seedSuppliers?: SeedSupplier[];
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [productHits, setProductHits] = useState<ProductHit[]>([]);
  const [recent, setRecent] = useState<RecentSupplier[]>([]);

  const seedRef = useRef(seedSuppliers);
  seedRef.current = seedSuppliers;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setDebounced("");
    setSuppliers([]);
    setProductHits([]);
    setError(null);
    setResolvingId(null);
    setRecent(mergeSeedIntoRecent(readRecent(), seedRef.current));
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    if (!debounced) {
      setSuppliers([]);
      setProductHits([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [supplierPage, items] = await Promise.all([
          fetchSuppliersPage({
            search: debounced,
            status: "ACTIVE",
            page: 0,
            size: 12,
          }),
          fetchItems(debounced, { page: 0, size: 8 }),
        ]);
        if (cancelled) return;

        const supplierRows = supplierPage.content ?? [];
        setSuppliers(supplierRows);

        const topItems = items.slice(0, 5);
        const linkBatches = await Promise.all(
          topItems.map(async (item) => {
            try {
              const links = await fetchItemSupplierLinks(item.id);
              return {
                item,
                suppliers: links
                  .filter((link) => link.active !== false)
                  .map((link) => ({
                    id: link.supplierId,
                    name: link.supplierName,
                    primary: link.primary === true,
                  })),
              } satisfies ProductHit;
            } catch {
              return { item, suppliers: [] } satisfies ProductHit;
            }
          }),
        );
        if (cancelled) return;
        setProductHits(linkBatches.filter((hit) => hit.suppliers.length > 0));
      } catch (e) {
        if (cancelled) return;
        setSuppliers([]);
        setProductHits([]);
        setError(e instanceof Error ? e.message : "Could not search suppliers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  const supplierIdsFromProducts = useMemo(() => {
    const ids = new Set<string>();
    for (const hit of productHits) {
      for (const s of hit.suppliers) ids.add(s.id);
    }
    return ids;
  }, [productHits]);

  const namedSuppliers = useMemo(
    () => suppliers.filter((s) => !supplierIdsFromProducts.has(s.id)),
    [suppliers, supplierIdsFromProducts],
  );

  const finishPick = (supplier: SupplierRecord) => {
    writeRecent(supplier);
    onPick(supplier);
    onOpenChange(false);
  };

  const resolveAndPick = async (id: string, fallbackName: string) => {
    const known = suppliers.find((s) => s.id === id);
    if (known) {
      finishPick(known);
      return;
    }
    setResolvingId(id);
    setError(null);
    try {
      const full = await fetchSupplierById(id);
      finishPick(full);
    } catch {
      // Still open New supply with what we have — drawer mainly needs id + name.
      finishPick({
        id,
        name: fallbackName,
        code: null,
        supplierType: "VENDOR",
        vatPin: null,
        taxExempt: false,
        creditTermsDays: null,
        creditLimit: null,
        rating: null,
        status: "ACTIVE",
        notes: null,
        paymentMethodPreferred: null,
        paymentDetails: null,
        payoutType: null,
        payoutPhone: null,
        version: 0,
        createdAt: "",
        updatedAt: "",
      });
    } finally {
      setResolvingId(null);
    }
  };

  const searching = debounced.length > 0;
  const emptySearch =
    searching && !loading && namedSuppliers.length === 0 && productHits.length === 0;
  const busy = loading || resolvingId != null;

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Who delivered?"
      description="Search a supplier, or a product they usually bring."
      icon={<PackagePlus className="size-4 text-[var(--hub-accent,#0F4A38)]" aria-hidden />}
      appearance="sharp"
      headerDensity="compact"
      width="default"
    >
      <div className="flex flex-col gap-4 px-1 pb-2">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--hub-muted,#5E6B65)]"
            aria-hidden
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Lucy Eggs, Royco, tray…"
            autoComplete="off"
            spellCheck={false}
            disabled={resolvingId != null}
            className={cn(
              "h-12 w-full border border-[var(--hub-rule,#E7E3D8)] bg-[var(--hub-paper,#fff)]",
              "pl-10 pr-3 text-[15px] text-[var(--hub-ink,#14211C)] outline-none",
              "placeholder:text-[var(--hub-muted,#5E6B65)]",
              "focus:border-[var(--hub-accent,#0F4A38)]/45 focus:ring-2 focus:ring-[var(--hub-accent,#0F4A38)]/20",
            )}
            aria-label="Search supplier or product"
          />
        </label>

        {error ? (
          <p role="alert" className="text-[13px] text-red-700">
            {error}
          </p>
        ) : null}

        {busy ? (
          <p className="inline-flex items-center gap-2 text-[13px] text-[var(--hub-muted,#5E6B65)]">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {resolvingId ? "Opening…" : "Looking up…"}
          </p>
        ) : null}

        {!searching && recent.length > 0 ? (
          <section className="space-y-1.5">
            <h3 className="text-[12px] font-semibold text-[var(--hub-ink,#14211C)]">
              Recent
            </h3>
            <ul className="divide-y divide-[var(--hub-rule,#E7E3D8)] border border-[var(--hub-rule,#E7E3D8)] bg-[var(--hub-paper,#fff)]">
              {recent.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    disabled={resolvingId != null}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--hub-accent,#0F4A38)_6%,white)] disabled:opacity-60"
                    onClick={() => void resolveAndPick(row.id, row.name)}
                  >
                    <span className="grid size-9 shrink-0 place-items-center border border-[var(--hub-rule,#E7E3D8)] bg-[color-mix(in_srgb,var(--hub-accent,#0F4A38)_8%,white)] text-[var(--hub-accent,#0F4A38)]">
                      <Truck className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-[var(--hub-ink,#14211C)]">
                        {row.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[var(--hub-muted,#5E6B65)]">
                        Tap to record what they brought
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!searching && recent.length === 0 && !loading ? (
          <div className="border border-dashed border-[var(--hub-rule,#E7E3D8)] px-4 py-6 text-center">
            <Package
              className="mx-auto size-6 text-[var(--hub-accent,#0F4A38)]/70"
              aria-hidden
            />
            <p className="mt-2 font-[family-name:var(--font-cormorant)] text-[1.35rem] leading-none text-[var(--hub-ink,#14211C)]">
              Start with a name
            </p>
            <p className="mt-1.5 text-[13px] leading-snug text-[var(--hub-muted,#5E6B65)]">
              Type the supplier, or a product on the delivery — eggs, soap, flour.
            </p>
          </div>
        ) : null}

        {namedSuppliers.length > 0 ? (
          <section className="space-y-1.5">
            <h3 className="text-[12px] font-semibold text-[var(--hub-ink,#14211C)]">
              Suppliers
            </h3>
            <ul className="divide-y divide-[var(--hub-rule,#E7E3D8)] border border-[var(--hub-rule,#E7E3D8)] bg-[var(--hub-paper,#fff)]">
              {namedSuppliers.map((supplier) => {
                const label =
                  displaySupplierName({ name: supplier.name }) || supplier.name;
                return (
                  <li key={supplier.id}>
                    <button
                      type="button"
                      disabled={resolvingId != null}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--hub-accent,#0F4A38)_6%,white)] disabled:opacity-60"
                      onClick={() => finishPick(supplier)}
                    >
                      <span className="grid size-9 shrink-0 place-items-center border border-[var(--hub-rule,#E7E3D8)] text-[var(--hub-accent,#0F4A38)]">
                        <Truck className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-[var(--hub-ink,#14211C)]">
                          {label}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--hub-muted,#5E6B65)]">
                          {supplier.notes?.trim() || "Record this delivery"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {productHits.length > 0 ? (
          <section className="space-y-1.5">
            <h3 className="text-[12px] font-semibold text-[var(--hub-ink,#14211C)]">
              Found on a product
            </h3>
            <ul className="space-y-2">
              {productHits.map((hit) => (
                <li
                  key={hit.item.id}
                  className="border border-[var(--hub-rule,#E7E3D8)] bg-[var(--hub-paper,#fff)]"
                >
                  <div className="flex items-start gap-2 border-b border-[var(--hub-rule,#E7E3D8)] px-3 py-2">
                    <Package
                      className="mt-0.5 size-3.5 shrink-0 text-[var(--hub-accent,#0F4A38)]"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[var(--hub-ink,#14211C)]">
                        {hit.item.name}
                      </p>
                      <p className="text-[11px] text-[var(--hub-muted,#5E6B65)]">
                        Who supplies this
                      </p>
                    </div>
                  </div>
                  <ul className="divide-y divide-[var(--hub-rule,#E7E3D8)]">
                    {hit.suppliers.map((supplier) => (
                      <li key={`${hit.item.id}:${supplier.id}`}>
                        <button
                          type="button"
                          disabled={resolvingId != null}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--hub-accent,#0F4A38)_6%,white)] disabled:opacity-60"
                          onClick={() =>
                            void resolveAndPick(supplier.id, supplier.name)
                          }
                        >
                          <Truck
                            className="size-3.5 shrink-0 text-[var(--hub-accent,#0F4A38)]"
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--hub-ink,#14211C)]">
                            {supplier.name}
                          </span>
                          {supplier.primary ? (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--hub-accent,#0F4A38)]">
                              Usual
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {emptySearch ? (
          <div className="border border-[var(--hub-rule,#E7E3D8)] px-4 py-5 text-center">
            <p className="text-[14px] font-semibold text-[var(--hub-ink,#14211C)]">
              Nothing matched “{debounced}”
            </p>
            <p className="mt-1 text-[12px] text-[var(--hub-muted,#5E6B65)]">
              Try the supplier’s name, or open Suppliers to add them first.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-9 rounded-[2px]"
              asChild
            >
              <Link href={APP_ROUTES.suppliers} onClick={() => onOpenChange(false)}>
                Open suppliers
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </FormDrawer>
  );
}

/** Forest CTA for the business hub — opens {@link StartSupplySheet}. */
export function RecordDeliveryButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 border border-[var(--hub-accent,#0F4A38)]/25",
        "bg-[color-mix(in_srgb,var(--hub-accent,#0F4A38)_8%,white)] px-3 py-3 text-left",
        "transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--hub-accent,#0F4A38)_12%,white)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-accent,#0F4A38)]/35",
        className,
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center border border-[var(--hub-accent,#0F4A38)]/30 bg-[var(--hub-accent,#0F4A38)] text-white">
        <PackagePlus className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-[family-name:var(--font-cormorant)] text-[1.25rem] leading-none tracking-tight text-[var(--hub-ink,#14211C)]">
          Record a delivery
        </span>
        <span className="mt-1 block text-[12px] leading-snug text-[var(--hub-muted,#5E6B65)]">
          Pick who brought it, then enter the lines
        </span>
      </span>
      <span
        className="shrink-0 text-[12px] font-semibold text-[var(--hub-accent,#0F4A38)] transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden
      >
        →
      </span>
    </button>
  );
}
