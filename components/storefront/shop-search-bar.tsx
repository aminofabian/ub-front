import { APP_ROUTES } from "@/lib/config";

export default function ShopSearchBar({
  defaultQuery,
  categoryId,
}: {
  defaultQuery?: string;
  categoryId?: string;
}) {
  return (
    <form
      action={APP_ROUTES.shop}
      method="get"
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      role="search"
    >
      <label className="sr-only" htmlFor="shop-search-q">
        Search products
      </label>
      <input
        id="shop-search-q"
        name="q"
        type="search"
        defaultValue={defaultQuery ?? ""}
        placeholder="Search by name or description…"
        className="h-10 w-full flex-1 rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        autoComplete="off"
      />
      {categoryId ? <input type="hidden" name="categoryId" value={categoryId} /> : null}
      <button
        type="submit"
        className="h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Search
      </button>
    </form>
  );
}
