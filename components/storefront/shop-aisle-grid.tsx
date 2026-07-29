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
    <section className="min-w-0">
      <div className="mb-1.5 flex items-baseline gap-2">
        <h2 className="storefront-section-title">Shop by aisle</h2>
        <p className="storefront-section-eyebrow">Browse</p>
      </div>
      <ShopAisleSlider
        categories={aisles}
        primaryHex={primaryHex}
        accentHex={accentHex}
      />
    </section>
  );
}
