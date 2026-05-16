import type { PublicCategory } from "@/lib/public-storefront";
import { ShopAisleSlider } from "@/components/storefront/shop-aisle-slider";

export function ShopAisleGrid({
  categories,
  primaryHex,
  accentHex,
}: {
  categories: PublicCategory[];
  primaryHex: string | null;
  accentHex: string | null;
}) {
  if (categories.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
        Shop by Aisle
      </h2>
      <ShopAisleSlider
        categories={categories}
        primaryHex={primaryHex}
        accentHex={accentHex}
      />
    </section>
  );
}
