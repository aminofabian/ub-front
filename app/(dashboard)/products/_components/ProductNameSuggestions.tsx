"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Globe2, Loader2, Package } from "lucide-react";

import {
  fetchItemsPage,
  itemListThumbnailUrl,
  lookupGlobalCatalogProducts,
  type GlobalProductRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";
import { sharedCatalogCoverUrl } from "./shared-option-fill";
import { planSuggestionRows } from "./plan-suggestion-rows";
import styles from "./product-create-modal.module.css";

const SEARCH_DEBOUNCE_MS = 280;
const MIN_QUERY_LEN = 2;
const RESULT_LIMIT = 5;
const BARCODE_DIGIT_MIN = 6;

type Props = {
  name: string;
  barcode?: string;
  enabled?: boolean;
  canGlobalCatalog: boolean;
  /** Bump after the existing product is edited or deleted so the list looks again. */
  lookupRevision?: number;
  onOpenExisting: (itemId: string) => void;
  onUseGlobal: (product: GlobalProductRecord) => void;
  /**
   * Fired at most once per barcode when an exact barcode lookup returns exactly one
   * shared-catalog product and nothing from the shop — scan a barcode and the form
   * fills itself, no tap needed.
   */
  onAutoGlobal?: (product: GlobalProductRecord) => void;
  /** Label on the shared-catalog action. Defaults to "Use". */
  useLabel?: string;
  /** Shown after the clerk dismisses the matches. */
  dismissedLabel?: string;
};

function queryLooksLikeBarcode(q: string): boolean {
  return new RegExp(`^\\d{${BARCODE_DIGIT_MIN},}$`).test(q.trim());
}

function formatPrice(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function suggestionQueryKey(name: string, barcode: string): string {
  return `${name.trim()}|${barcode.trim()}`;
}

export function ProductNameSuggestions({
  name,
  barcode = "",
  enabled = true,
  canGlobalCatalog,
  lookupRevision = 0,
  onOpenExisting,
  onUseGlobal,
  onAutoGlobal,
  useLabel = "Fill",
}: Props) {
  const [tenantHits, setTenantHits] = useState<ItemSummaryRecord[]>([]);
  const [globalHits, setGlobalHits] = useState<GlobalProductRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const autoAppliedBarcodeRef = useRef<string | null>(null);
  const activeKey = suggestionQueryKey(name, barcode);
  const dismissed = dismissedKey === activeKey;

  useEffect(() => {
    if (!enabled) {
      const idle = window.setTimeout(() => {
        setTenantHits([]);
        setGlobalHits([]);
        setBusy(false);
      }, 0);
      return () => window.clearTimeout(idle);
    }

    const nameQ = name.trim();
    const barcodeQ = barcode.trim();
    const lookupBarcode = queryLooksLikeBarcode(barcodeQ)
      ? barcodeQ
      : queryLooksLikeBarcode(nameQ)
        ? nameQ
        : "";
    const lookupName =
      nameQ.length >= MIN_QUERY_LEN && !queryLooksLikeBarcode(nameQ)
        ? nameQ
        : "";

    if (!lookupBarcode && !lookupName) {
      const idle = window.setTimeout(() => {
        setTenantHits([]);
        setGlobalHits([]);
        setBusy(false);
      }, 0);
      return () => window.clearTimeout(idle);
    }

    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(() => {
      setBusy(true);
      const tenantPromise = (async () => {
        if (lookupBarcode) {
          const exact = await fetchItemsPage(undefined, {
            barcode: lookupBarcode,
            page: 0,
            size: RESULT_LIMIT,
            includeInactive: true,
          });
          if (exact.content.length > 0) return exact;
        }
        if (lookupName) {
          return fetchItemsPage(lookupName, {
            page: 0,
            size: RESULT_LIMIT,
            includeInactive: true,
          });
        }
        return fetchItemsPage(lookupBarcode || undefined, {
          page: 0,
          size: RESULT_LIMIT,
          includeInactive: true,
        });
      })();
      const globalPromise = canGlobalCatalog
        ? lookupGlobalCatalogProducts({
            ...(lookupBarcode ? { barcode: lookupBarcode } : {}),
            ...(lookupName
              ? { q: lookupName }
              : lookupBarcode
                ? { q: lookupBarcode }
                : {}),
          })
        : Promise.resolve([] as GlobalProductRecord[]);

      void Promise.all([tenantPromise, globalPromise])
        .then(([tenantPage, globalRows]) => {
          if (requestId !== requestIdRef.current) return;
          setTenantHits(tenantPage.content);
          setGlobalHits(globalRows.slice(0, RESULT_LIMIT));
          // Scan-to-fill: an exact, unambiguous barcode hit applies itself.
          if (
            onAutoGlobal &&
            lookupBarcode &&
            tenantPage.content.length === 0 &&
            globalRows.length === 1 &&
            (globalRows[0].barcode ?? "").trim() === lookupBarcode &&
            !globalRows[0].alreadyImported &&
            autoAppliedBarcodeRef.current !== lookupBarcode
          ) {
            autoAppliedBarcodeRef.current = lookupBarcode;
            onAutoGlobal(globalRows[0]);
          }
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setTenantHits([]);
          setGlobalHits([]);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setBusy(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [name, barcode, canGlobalCatalog, enabled, onAutoGlobal, lookupRevision]);

  if (!enabled) return null;

  const plans = planSuggestionRows({ name, barcode }, globalHits, tenantHits);
  const hasMatches = plans.length > 0;
  const shown = plans.slice(0, 3);
  if (!busy && !hasMatches) return null;

  if (dismissed && hasMatches) {
    return (
      <button
        type="button"
        onClick={() => setDismissedKey(null)}
        className={styles.suggestShow}
      >
        Matches
      </button>
    );
  }

  return (
    <div className={styles.suggest}>
      {busy && !hasMatches ? (
        <p className={styles.suggestWait}>
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Looking…
        </p>
      ) : null}

      {shown.length > 0 ? (
        <ul className={styles.suggestList} aria-label="Matching products">
          {shown.map((plan) => (
            <li key={plan.source === "shared" ? plan.catalogId : plan.itemId}>
              <PlannedSuggestionRow
                plan={plan}
                catalog={globalHits}
                shop={tenantHits}
                useLabel={useLabel}
                onOpenExisting={onOpenExisting}
                onUseGlobal={onUseGlobal}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {hasMatches ? (
        <button
          type="button"
          onClick={() => setDismissedKey(activeKey)}
          className={styles.suggestSkip}
        >
          Skip
        </button>
      ) : null}
    </div>
  );
}

function sharedDetail(hit: GlobalProductRecord): string {
  const sell = formatPrice(hit.recommendedSellingPrice);
  return sell ? `Sell ${sell}` : "";
}

const suggestionRowClass = styles.suggestStatic;
const suggestionButtonClass = styles.suggestRow;

function SuggestionFace({
  title,
  detail,
  imageUrl,
  catalog,
  ownedLine,
  action,
}: {
  title: string;
  detail: string;
  imageUrl?: string | null;
  catalog: boolean;
  ownedLine: boolean;
  action: React.ReactNode;
}) {
  return (
    <>
      <SuggestionThumb
        src={imageUrl}
        fallback={
          catalog ? (
            <Globe2 className="size-3.5 text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_45%,transparent)]" aria-hidden />
          ) : (
            <Package className="size-3.5 text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_45%,transparent)]" aria-hidden />
          )
        }
      />
      <span className={styles.suggestCopy}>
        <span className={styles.suggestName}>{title}</span>
        {ownedLine ? (
          <span className={styles.suggestOwned}>
            <Check className="size-3 shrink-0" aria-hidden />
            In your shop
          </span>
        ) : null}
        {!ownedLine && detail ? (
          <span className={styles.suggestMeta}>{detail}</span>
        ) : null}
      </span>
      {action}
    </>
  );
}

function InShopMark() {
  return (
    <span className={styles.suggestOwned}>
      <Check className="size-3.5" aria-hidden />
      In your shop
    </span>
  );
}

function OwnedSuggestionButton({
  title,
  detail,
  imageUrl,
  catalog,
  open,
  onOpen,
}: {
  title: string;
  detail: string;
  imageUrl?: string | null;
  catalog: boolean;
  open: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={suggestionButtonClass}
      aria-label={open ? `Open ${title}` : `${title}, in your shop`}
    >
      <SuggestionFace
        title={title}
        detail={detail}
        imageUrl={imageUrl}
        catalog={catalog}
        ownedLine={false}
        action={
          open ? (
            <span className={styles.suggestGo}>Open</span>
          ) : (
            <InShopMark />
          )
        }
      />
    </button>
  );
}

function ShopSuggestionRow({
  itemId,
  open,
  shop,
  onOpenExisting,
}: {
  itemId: string;
  open: boolean;
  shop: ItemSummaryRecord[];
  onOpenExisting: (itemId: string) => void;
}) {
  const item = shop.find((row) => row.id === itemId);
  if (!item) return null;
  const title = itemCatalogDisplayTitle(item);
  return (
    <OwnedSuggestionButton
      title={title}
      detail=""
      imageUrl={itemListThumbnailUrl(item)}
      catalog={false}
      open={open}
      onOpen={() => onOpenExisting(item.id)}
    />
  );
}

function CatalogSuggestionRow({
  plan,
  catalog,
  useLabel,
  onOpenExisting,
  onUseGlobal,
}: {
  plan: Extract<ReturnType<typeof planSuggestionRows>[number], { source: "shared" }>;
  catalog: GlobalProductRecord[];
  useLabel: string;
  onOpenExisting: (itemId: string) => void;
  onUseGlobal: (product: GlobalProductRecord) => void;
}) {
  const hit = catalog.find((row) => row.id === plan.catalogId);
  const shopItemId = plan.itemId;
  if (!hit) return null;
  if (plan.inShop && shopItemId) {
    return (
      <OwnedSuggestionButton
        title={hit.name}
        detail={sharedDetail(hit)}
        imageUrl={sharedCatalogCoverUrl(hit)}
        catalog
        open={plan.open}
        onOpen={() => onOpenExisting(shopItemId)}
      />
    );
  }
  if (plan.inShop) {
    return (
      <div className={suggestionRowClass}>
        <SuggestionFace
          title={hit.name}
          detail={sharedDetail(hit)}
          imageUrl={sharedCatalogCoverUrl(hit)}
          catalog
          ownedLine={false}
          action={<InShopMark />}
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onUseGlobal(hit)}
      className={suggestionButtonClass}
      aria-label={`${useLabel} ${hit.name}`}
    >
      <SuggestionFace
        title={hit.name}
        detail={sharedDetail(hit)}
        imageUrl={sharedCatalogCoverUrl(hit)}
        catalog
        ownedLine={false}
        action={
          <span className={styles.suggestGo}>{useLabel}</span>
        }
      />
    </button>
  );
}

function PlannedSuggestionRow({
  plan,
  catalog,
  shop,
  useLabel,
  onOpenExisting,
  onUseGlobal,
}: {
  plan: ReturnType<typeof planSuggestionRows>[number];
  catalog: GlobalProductRecord[];
  shop: ItemSummaryRecord[];
  useLabel: string;
  onOpenExisting: (itemId: string) => void;
  onUseGlobal: (product: GlobalProductRecord) => void;
}) {
  if (plan.source === "shop") {
    return (
      <ShopSuggestionRow
        itemId={plan.itemId}
        open={plan.open}
        shop={shop}
        onOpenExisting={onOpenExisting}
      />
    );
  }
  return (
    <CatalogSuggestionRow
      plan={plan}
      catalog={catalog}
      useLabel={useLabel}
      onOpenExisting={onOpenExisting}
      onUseGlobal={onUseGlobal}
    />
  );
}

function SuggestionThumb({
  src,
  fallback,
}: {
  src: string | null | undefined;
  fallback: React.ReactNode;
}) {
  return (
    <span className={styles.suggestThumb}>
      {src ? (
        <Image
          src={src}
          alt=""
          width={28}
          height={28}
          unoptimized
          className="size-full object-cover"
        />
      ) : (
        fallback
      )}
    </span>
  );
}
