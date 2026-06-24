import { Search } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

export default function ShopSearchBar({
  defaultQuery,
  categoryId,
  searchActionPath,
  accentHex,
  variant = "default",
}: {
  defaultQuery?: string;
  categoryId?: string;
  /** When set (e.g. `/shop/c/bakery`), GET search keeps the shopper on that category. */
  searchActionPath?: string;
  /** Tenant primary (#RRGGBB) used for the submit control. */
  accentHex?: string | null;
  /** Header variant matches the masthead pill in the mockup. */
  variant?: "default" | "header";
}) {
  const validAccent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim()) ? accentHex.trim() : null;
  const inputId = variant === "header" ? "shop-header-search-q" : "shop-search-q";
  const formAction = (searchActionPath?.trim() || APP_ROUTES.shop) as string;

  if (variant === "header") {
    return (
      <form
        action={formAction}
        method="get"
        className="group relative flex h-9 items-stretch overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.04] transition-shadow focus-within:border-primary/30 focus-within:shadow-md sm:h-10"
        role="search"
      >
        <label className="sr-only" htmlFor={inputId}>
          Search products
        </label>
        <div className="relative flex flex-1 items-center">
          <Search
            className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground/70"
            aria-hidden
          />
          <input
            id={inputId}
            name="q"
            type="search"
            defaultValue={defaultQuery ?? ""}
            placeholder="Search products…"
            className="h-full w-full border-0 bg-transparent pl-9 pr-2 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0 sm:placeholder:text-muted-foreground/70"
          />
        </div>
        {categoryId ? <input type="hidden" name="categoryId" value={categoryId} /> : null}
        <button
          type="submit"
          aria-label="Search"
          className={cn(
            "flex h-full w-10 shrink-0 items-center justify-center text-white transition hover:brightness-110 active:brightness-95 sm:w-11",
            !validAccent && "bg-primary",
          )}
          style={validAccent ? { backgroundColor: validAccent, color: "#fff" } : undefined}
        >
          <Search className="h-4 w-4" aria-hidden />
        </button>
      </form>
    );
  }

  return (
    <form
      action={formAction}
      method="get"
      className="group relative flex flex-col gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.04] transition-shadow focus-within:border-primary/30 focus-within:shadow-md focus-within:ring-primary/15 dark:ring-white/[0.06] sm:flex-row sm:items-stretch sm:rounded-full sm:pr-1 sm:pl-1"
      role="search"
    >
      <label className="sr-only" htmlFor={inputId}>
        Search products
      </label>
      <div className="relative flex min-h-[3rem] flex-1 items-center sm:min-h-0">
        <Search
          className="pointer-events-none absolute left-4 h-4 w-4 text-muted-foreground/70 sm:left-5"
          aria-hidden
        />
        <input
          id={inputId}
          name="q"
          type="search"
          defaultValue={defaultQuery ?? ""}
          placeholder="Search products by name or description…"
          className="h-12 w-full border-0 bg-transparent py-3 pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0 sm:h-11 sm:pl-12 sm:pr-3"
          autoComplete="off"
        />
      </div>
      {categoryId ? <input type="hidden" name="categoryId" value={categoryId} /> : null}
      <div className="shrink-0 border-t border-border/60 p-2 sm:border-t-0 sm:p-1.5 sm:pl-0">
        <button
          type="submit"
          className={cn(
            "flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.99] sm:h-auto sm:w-auto sm:rounded-full sm:px-6",
            !validAccent && "bg-primary",
          )}
          style={validAccent ? { backgroundColor: validAccent, color: "#fff" } : undefined}
        >
          <Search className="h-4 w-4 opacity-90 sm:hidden" aria-hidden />
          Search
        </button>
      </div>
    </form>
  );
}
