import type { PublicCategory } from "@/lib/public-storefront";
import { ShopAisleSlider } from "@/components/storefront/shop-aisle-slider";

function rootAisles(categories: PublicCategory[]): PublicCategory[] {
  const roots = categories
    .filter((c) => !c.parentId?.trim())
    .sort((a, b) => a.name.localeCompare(b.name));
  return roots.length > 0 ? roots : categories;
}

export function ShopAisleGrid({
  categories,
  primaryHex,
  accentHex,
}: {
  categories: PublicCategory[];
  primaryHex: string | null;
  accentHex: string | null;
}) {
  const aisles = rootAisles(categories);
  if (aisles.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
            Shop by Aisle
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground/80">
            Walk the store from your screen — pick an aisle to browse.
          </p>
        </div>
      </div>
      <ShopAisleSlider
        categories={aisles}
        primaryHex={primaryHex}
        accentHex={accentHex}
      />
    </section>
  );
}
