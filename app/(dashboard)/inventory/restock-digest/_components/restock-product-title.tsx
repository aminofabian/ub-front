import {
  isInternalCatalogSku,
  resolveCatalogVariantListTitle,
} from "@/lib/catalog-display";
import { cn } from "@/lib/utils";

export type RestockProductFields = {
  itemName: string;
  variantName?: string | null;
  itemSku?: string | null;
};

/** Combined title for aria-labels, confirms, and one-line fallbacks. */
export function restockProductCombinedName(s: RestockProductFields): string {
  return restockProductTitle(s).combined;
}

export function restockProductTitle(s: RestockProductFields) {
  return resolveCatalogVariantListTitle({
    name: s.itemName,
    variantName: s.variantName,
    sku: s.itemSku,
  });
}

/** Human SKU when it still adds information beyond the title. */
export function restockProductSkuHint(s: RestockProductFields): string | null {
  const sku = s.itemSku?.trim();
  if (!sku || isInternalCatalogSku(sku)) return null;
  const title = restockProductTitle(s);
  const haystack = `${title.combined} ${title.option}`.toLowerCase();
  if (haystack.includes(sku.toLowerCase())) return null;
  return sku;
}

/**
 * Catalog-style family / option title so sibling SKUs (three "Festive Bread"
 * variants) are readable without leaving the restock sheet.
 */
export function RestockProductTitle({
  itemName,
  variantName,
  itemSku,
  className,
  struck,
  size = "md",
}: RestockProductFields & {
  className?: string;
  struck?: boolean;
  size?: "sm" | "md";
}) {
  const title = restockProductTitle({ itemName, variantName, itemSku });
  const familyIsDistinct =
    !!title.family &&
    !title.family.toLowerCase().includes(title.option.toLowerCase());

  if (familyIsDistinct) {
    return (
      <p
        className={cn(
          "min-w-0 leading-snug",
          size === "md" ? "text-[14px]" : "text-sm",
          struck && "text-muted-foreground line-through",
          className,
        )}
        title={title.combined}
      >
        <span className="font-normal text-muted-foreground">{title.family}</span>
        <span className="mx-1 text-foreground/30" aria-hidden>
          /
        </span>
        <span className="font-medium text-foreground">{title.option}</span>
      </p>
    );
  }

  return (
    <p
      className={cn(
        "min-w-0 font-medium leading-snug text-foreground",
        size === "md" ? "text-[14px]" : "text-sm",
        struck && "text-muted-foreground line-through",
        className,
      )}
    >
      {title.combined}
    </p>
  );
}
