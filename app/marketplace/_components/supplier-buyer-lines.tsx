import { tryFetchSupplierBuyerLines } from "@/lib/marketplace-api";

/**
 * "What buyers say" on a supplier's public page. Shows only true lines, with the sample they rest on.
 * Renders nothing while the buyer-lines flag is off, when no line is true, or when the sample is too small.
 */
export async function SupplierBuyerLinesBlock({ supplierId }: { supplierId: string }) {
  const data = await tryFetchSupplierBuyerLines(supplierId);
  if (!data || !data.enabled || data.lines.length === 0) {
    return null;
  }
  return (
    <section aria-label="What buyers say" className="mb-3 border border-black/10 px-3 py-2 text-sm">
      <p className="font-medium">What buyers say</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {data.lines.map((line) => (
          <li key={line.key}>{line.label}</li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-muted-foreground">
        Based on {data.orders} orders from {data.buyers} buyers in the last 90 days.
      </p>
    </section>
  );
}
