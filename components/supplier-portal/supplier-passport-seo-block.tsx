import type { MarketplaceSupplierDetail } from "@/lib/marketplace-api";
import { formatMoney } from "@/lib/money";
import {
  resolveSupplierProductHighlights,
  resolveSupplierServiceAreas,
} from "@/lib/supplier-passport-seo";
import { formatAreaPhrase } from "@/lib/storefront-seo-defaults";

/**
 * Crawler-visible text block for supplier passport pages.
 *
 * The interactive hub UI is client-rendered, so this `sr-only` block gives
 * Googlebot a server-rendered, keyword-rich summary: who the supplier is,
 * what they stock (with prices), and where they deliver.
 */
export function SupplierPassportSeoBlock({
  username,
  displayName,
  detail,
}: {
  username: string;
  displayName?: string | null;
  detail?: MarketplaceSupplierDetail | null;
}) {
  const name =
    displayName?.trim() ||
    username.replace(/-/g, " ").replace(/\s+/g, " ").trim() ||
    "Wholesale supplier";
  const areas = resolveSupplierServiceAreas(detail);
  const areaPhrase = formatAreaPhrase(areas);
  const highlights = resolveSupplierProductHighlights(detail?.products, 6);
  const productCount = detail?.products?.length ?? 0;

  const pricedLines = (detail?.products ?? [])
    .filter((p) => p.parentItemName?.trim() || p.name?.trim())
    .slice(0, 6)
    .map((p) => ({
      key: p.id,
      name: p.parentItemName?.trim() || p.name,
      price:
        p.unitPrice != null
          ? formatMoney(p.unitPrice, p.currency ?? "KES")
          : null,
    }));

  return (
    <div className="sr-only">
      <h1>{name}</h1>
      <p>
        {name} is a wholesale supplier on Kiosk.ke{highlights.length
          ? ` stocking ${highlights.join(", ")}`
          : ""}.
      </p>
      {areaPhrase ? (
        <p>{name} supplies wholesale orders to shops across {areaPhrase}.</p>
      ) : null}
      {pricedLines.length > 0 ? (
        <>
          <p>
            {name} has {productCount} wholesale{" "}
            {productCount === 1 ? "line" : "lines"}, including:
          </p>
          <ul>
            {pricedLines.map((line) => (
              <li key={line.key}>
                {line.price ? `${line.name} at ${line.price}` : line.name}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p>
        Browse the full {name} catalogue, compare pack prices, and order
        wholesale on Kiosk.ke.
      </p>
    </div>
  );
}
