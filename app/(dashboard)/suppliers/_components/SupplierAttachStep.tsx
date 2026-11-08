"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  attachMarketplaceSupplier,
  attachMarketplaceSupplierFromSeed,
  fetchMarketplaceAttachPreview,
  fetchMarketplaceSupplierDetail,
  type MarketplaceAttachResult,
  type SupplierDuplicateMatch,
} from "@/lib/marketplace-api";
import { cn } from "@/lib/utils";

import { SupplierProductPicker } from "./SupplierProductPicker";
import {
  addableProducts,
  attachCta,
  type AttachMode,
  type AttachPickerProduct,
} from "./supplier-attach";
import { SupDrawerFooter } from "./supplier-layout-primitives";
import { supCard, supSectionHint, supSectionTitle } from "./supplier-ui-tokens";

type Shelf = {
  name: string;
  supplierNumber: string | null;
  phone: string | null;
  email: string | null;
  alreadyConnected: boolean;
  localSupplierId: string | null;
  products: AttachPickerProduct[];
};

/**
 * A global supplier is previewed against this shop (what it already stocks and
 * has linked). Another shop's supplier has no passport yet, so it is read from
 * its public listing, which cannot say what this shop stocks.
 */
async function loadShelf(candidate: SupplierDuplicateMatch): Promise<Shelf> {
  if (candidate.marketplaceSupplierId) {
    const preview = await fetchMarketplaceAttachPreview(
      candidate.marketplaceSupplierId,
    );
    return {
      name: preview.supplierName,
      supplierNumber: preview.supplierNumber,
      phone: preview.contactPhone,
      email: preview.contactEmail,
      alreadyConnected: preview.alreadyConnected,
      localSupplierId: preview.localSupplierId,
      products: preview.products,
    };
  }
  if (candidate.localSupplierId) {
    const detail = await fetchMarketplaceSupplierDetail(
      candidate.localSupplierId,
    );
    return {
      name: detail.name,
      supplierNumber: candidate.supplierNumber,
      phone: detail.contactPhone,
      email: detail.contactEmail,
      alreadyConnected: false,
      localSupplierId: null,
      products: detail.products ?? [],
    };
  }
  throw new Error("This supplier cannot be added from here.");
}

type Props = {
  candidate: SupplierDuplicateMatch;
  onBack: () => void;
  /** `requested` is how many products were ticked, or null when the whole shelf was added. */
  onAttached: (
    result: MarketplaceAttachResult,
    requested: number | null,
  ) => void | Promise<void>;
  /** Close the drawer and show a supplier the shop already has. */
  onOpenSupplier?: (localSupplierId: string) => void;
};

/**
 * Second step of "New supplier": the user picked an existing supplier from the
 * suggestions and now chooses which of its products come with it. The server
 * links whatever is chosen as part of the same request.
 */
export function SupplierAttachStep({
  candidate,
  onBack,
  onAttached,
  onOpenSupplier,
}: Props) {
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState<AttachMode>("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    loadShelf(candidate)
      .then((loaded) => {
        if (!cancelled) setShelf(loaded);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setShelf(null);
          setLoadError(
            e instanceof Error
              ? e.message
              : "Could not load this supplier's products.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [candidate, attempt]);

  const products = shelf?.products ?? [];
  const addableCount = addableProducts(products).length;
  const cta = attachCta({
    mode,
    selectedCount: selected.size,
    addableCount,
    alreadyConnected: shelf?.alreadyConnected ?? false,
    busy,
  });
  // If the shelf could not be read the user can still add the supplier the
  // way this button always worked: with everything it lists.
  const fallback = !loading && !shelf && Boolean(loadError);
  const confirmLabel = fallback
    ? busy
      ? "Adding…"
      : "Add supplier and all products"
    : loading
      ? "Loading products…"
      : cta.label;
  const confirmDisabled = fallback ? busy : loading || cta.disabled;

  async function confirm() {
    if (busy || confirmDisabled) return;
    setBusy(true);
    setError("");
    const productIds =
      shelf && mode === "choose" ? Array.from(selected) : undefined;
    let result: MarketplaceAttachResult;
    try {
      result = candidate.marketplaceSupplierId
        ? await attachMarketplaceSupplier(
            candidate.marketplaceSupplierId,
            productIds,
          )
        : await attachMarketplaceSupplierFromSeed(
            candidate.localSupplierId ?? "",
            productIds,
          );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add this supplier.");
      setBusy(false);
      return;
    }
    await onAttached(result, productIds ? productIds.length : null);
    setBusy(false);
  }

  const name = shelf?.name ?? candidate.name ?? "Supplier";
  const number = shelf?.supplierNumber ?? candidate.supplierNumber;
  const phone = shelf?.phone ?? candidate.phone;
  const email = shelf?.email ?? candidate.email;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5">
        <section className={cn(supCard, "px-3 py-2.5")}>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="text-base font-medium text-foreground">{name}</h3>
            {number ? (
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {number}
              </span>
            ) : null}
          </div>
          {phone || email ? (
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {[phone, email].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
            {shelf?.alreadyConnected ? (
              <>
                Already in your directory.{" "}
                {shelf.localSupplierId && onOpenSupplier ? (
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    onClick={() => onOpenSupplier(shelf.localSupplierId ?? "")}
                  >
                    Open {name}
                  </button>
                ) : null}
              </>
            ) : (
              "Adding links this supplier to your shop. Products you choose are linked to it straight away."
            )}
          </p>
        </section>

        <section className={supCard}>
          <div className="border-b border-border px-2.5 py-1.5">
            <h3 className={supSectionTitle}>Products</h3>
            <p className={supSectionHint}>
              {shelf?.alreadyConnected
                ? "Add more of this supplier's products to your shop."
                : "Choose what to bring in with this supplier."}
            </p>
          </div>

          {loading ? (
            <p className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading this supplier&apos;s products…
            </p>
          ) : null}

          {fallback ? (
            <div role="alert" className="space-y-2 px-3 py-3">
              <p className="text-sm font-medium text-destructive">
                Could not load this supplier&apos;s products.
              </p>
              <p className="text-xs text-muted-foreground">{loadError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-xl px-3"
                onClick={() => setAttempt((n) => n + 1)}
              >
                Try again
              </Button>
              <p className="text-xs text-muted-foreground">
                You can also add the supplier with everything it lists.
              </p>
            </div>
          ) : null}

          {!loading && shelf ? (
            <SupplierProductPicker
              products={shelf.products}
              mode={mode}
              onModeChange={setMode}
              selected={selected}
              onSelectedChange={setSelected}
              disabled={busy}
            />
          ) : null}
        </section>
      </div>

      <div className="shrink-0 border-t border-[var(--op-rule)] bg-[var(--op-surface)] px-3 py-3 sm:px-5">
        {error ? (
          <p role="alert" className="mb-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <SupDrawerFooter
          onCancel={() => {
            if (!busy) onBack();
          }}
          cancelLabel="Back"
        >
          <Button
            type="button"
            className="h-12 w-full gap-2 rounded-xl px-4 font-semibold sm:h-9 sm:w-auto sm:rounded-xl"
            disabled={confirmDisabled}
            onClick={() => void confirm()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {confirmLabel}
          </Button>
        </SupDrawerFooter>
      </div>
    </div>
  );
}
