"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, Flame, LayoutGrid } from "lucide-react";
import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import type { PublicCategory } from "@/lib/public-storefront";
import { APP_ROUTES } from "@/lib/config";
import {
  activeStorefrontCategorySlugFromPathname,
  shopListPath,
  storefrontCategoryPathSlug,
} from "@/lib/shop-url";
import { cn } from "@/lib/utils";

const FEATURED_COUNT = 5;

type CategorySection = {
  category: PublicCategory;
  links: PublicCategory[];
};

function slugMatches(pathSlug: string, c: PublicCategory): boolean {
  const seg = storefrontCategoryPathSlug(c);
  return seg === pathSlug || seg.toLowerCase() === pathSlug.toLowerCase();
}

function isInCategoryBranch(
  c: PublicCategory,
  pathSlug: string,
  childrenByParent: Map<string, PublicCategory[]>,
): boolean {
  if (!pathSlug) return false;
  if (slugMatches(pathSlug, c)) return true;
  return (childrenByParent.get(c.id) ?? []).some((child) =>
    isInCategoryBranch(child, pathSlug, childrenByParent),
  );
}

function buildSections(
  rootId: string,
  childrenByParent: Map<string, PublicCategory[]>,
): CategorySection[] {
  const level2 = childrenByParent.get(rootId) ?? [];
  return level2.map((category) => ({
    category,
    links: childrenByParent.get(category.id) ?? [],
  }));
}

function MegaMenuPanel({
  root,
  childrenByParent,
  pathSlug,
  q,
  accentHex,
}: {
  root: PublicCategory;
  childrenByParent: Map<string, PublicCategory[]>;
  pathSlug: string;
  q: string;
  accentHex: string | null;
}) {
  const sections = buildSections(root.id, childrenByParent);
  const rootSeg = storefrontCategoryPathSlug(root);
  const headingColor =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim())
      ? accentHex.trim()
      : "var(--color-primary)";

  if (sections.length === 0) {
    return (
      <div className="flex min-h-[12rem] min-w-0 flex-1 flex-col justify-center bg-white px-8 py-6">
        <p className="text-sm text-muted-foreground">
          Browse everything in this aisle.
        </p>
        <Link
          href={shopListPath({ categoryPathSlug: rootSeg, q })}
          className="mt-4 inline-flex text-sm font-bold uppercase tracking-wide hover:underline"
          style={{ color: headingColor }}
        >
          Shop all {root.name}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 overflow-y-auto bg-white px-6 py-5 sm:px-8">
      <Link
        href={shopListPath({ categoryPathSlug: rootSeg, q })}
        className="mb-4 inline-block border-b border-border/60 pb-3 text-base font-bold uppercase tracking-wide hover:underline"
        style={{ color: headingColor }}
      >
        All {root.name}
      </Link>
      <div className="columns-2 gap-x-8 sm:columns-3 lg:columns-4">
        {sections.map(({ category, links }) => {
          const sectionSeg = storefrontCategoryPathSlug(category);
          const sectionActive = pathSlug && slugMatches(pathSlug, category);
          return (
            <div key={category.id} className="mb-6 break-inside-avoid">
              <Link
                href={shopListPath({ categoryPathSlug: sectionSeg, q })}
                className={cn(
                  "mb-2 block text-sm font-bold leading-snug hover:underline",
                  sectionActive && "underline",
                )}
                style={{ color: headingColor }}
              >
                {category.name}
              </Link>
              {links.length > 0 ? (
                <ul className="space-y-1.5">
                  {links.map((link) => {
                    const linkSeg = storefrontCategoryPathSlug(link);
                    const linkActive = pathSlug && slugMatches(pathSlug, link);
                    return (
                      <li key={link.id}>
                        <Link
                          href={shopListPath({
                            categoryPathSlug: linkSeg,
                            q,
                          })}
                          className={cn(
                            "text-sm text-muted-foreground transition hover:text-foreground",
                            linkActive && "font-medium text-foreground",
                          )}
                        >
                          {link.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShopByAisleMenu({
  roots,
  childrenByParent,
  pathSlug,
  q,
  accentHex,
}: {
  roots: PublicCategory[];
  childrenByParent: Map<string, PublicCategory[]>;
  pathSlug: string;
  q: string;
  accentHex: string | null;
}) {
  const [hoveredRootId, setHoveredRootId] = useState<string | null | undefined>(
    undefined,
  );
  const activeRoot =
    hoveredRootId === null
      ? null
      : hoveredRootId !== undefined
        ? (roots.find((r) => r.id === hoveredRootId) ?? null)
        : (roots[0] ?? null);

  return (
    <div className="group/aisle relative shrink-0 border-r border-white/15 py-2.5 pr-3 sm:pr-4">
      <button
        type="button"
        className="flex items-center gap-2 text-sm font-semibold text-white"
        aria-haspopup="true"
      >
        <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden whitespace-nowrap sm:inline">Shop by Aisle</span>
        <span className="sm:hidden">Aisles</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-white/85" aria-hidden />
      </button>

      <div
        className={cn(
          "pointer-events-none invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-opacity duration-150",
          "group-hover/aisle:pointer-events-auto group-hover/aisle:visible group-hover/aisle:opacity-100",
          "group-focus-within/aisle:pointer-events-auto group-focus-within/aisle:visible group-focus-within/aisle:opacity-100",
        )}
        onMouseLeave={() => setHoveredRootId(undefined)}
      >
        <div className="flex w-[min(calc(100vw-2rem),56rem)] max-h-[min(75vh,28rem)] overflow-hidden rounded-lg border border-border/60 bg-white shadow-xl ring-1 ring-black/5">
          <aside className="w-[11.5rem] shrink-0 overflow-y-auto border-r border-border/50 bg-muted/40 sm:w-[13rem]">
            <ul role="menu">
              <li role="none">
                <Link
                  href={shopListPath({ q })}
                  role="menuitem"
                  onMouseEnter={() => setHoveredRootId(null)}
                  className={cn(
                    "flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium text-foreground transition",
                    hoveredRootId === null && "bg-white shadow-sm",
                    hoveredRootId !== null && "hover:bg-white/80",
                  )}
                >
                  <span>All products</span>
                </Link>
              </li>
              {roots.map((root) => {
                const hasChildren =
                  (childrenByParent.get(root.id) ?? []).length > 0;
                const isActive =
                  hoveredRootId !== null && activeRoot?.id === root.id;
                const branchActive = isInCategoryBranch(
                  root,
                  pathSlug,
                  childrenByParent,
                );
                const seg = storefrontCategoryPathSlug(root);

                return (
                  <li key={root.id} role="none">
                    <Link
                      href={shopListPath({ categoryPathSlug: seg, q })}
                      role="menuitem"
                      onMouseEnter={() => setHoveredRootId(root.id)}
                      className={cn(
                        "flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium transition",
                        isActive
                          ? "bg-white text-foreground shadow-sm"
                          : "text-foreground/85 hover:bg-white/80",
                        branchActive && !isActive && "font-semibold",
                      )}
                    >
                      <span className="truncate">{root.name}</span>
                      {hasChildren ? (
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>

          {activeRoot ? (
            <MegaMenuPanel
              root={activeRoot}
              childrenByParent={childrenByParent}
              pathSlug={pathSlug}
              q={q}
              accentHex={accentHex}
            />
          ) : (
            <div className="flex min-w-0 flex-1 items-center justify-center bg-white px-8 py-6">
              <Link
                href={shopListPath({ q })}
                className="text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                View all products
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeaturedAisleNav({
  featured,
  pathSlug,
  q,
}: {
  featured: PublicCategory[];
  pathSlug: string;
  q: string;
}) {
  return (
    <nav
      className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto py-1.5 sm:justify-start sm:gap-2"
      aria-label="Featured aisles"
    >
      {featured.map((c) => {
        const seg = storefrontCategoryPathSlug(c);
        const active =
          pathSlug !== "" &&
          (seg === pathSlug || seg.toLowerCase() === pathSlug.toLowerCase());
        return (
          <Link
            key={c.id}
            href={shopListPath({ categoryPathSlug: seg, q })}
            className={cn(
              "shrink-0 truncate rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition sm:px-3 sm:text-[11px] sm:tracking-[0.14em]",
              active
                ? "bg-white/20 text-white"
                : "text-white/90 hover:bg-white/10 hover:text-white",
            )}
            title={c.name}
          >
            {c.name}
          </Link>
        );
      })}
    </nav>
  );
}

export function ShopCategoryRail({
  categories,
  primaryHex,
  accentHex,
}: {
  categories: PublicCategory[];
  primaryHex: string | null;
  accentHex: string | null;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const pathSlug = activeStorefrontCategorySlugFromPathname(pathname);
  const q = sp.get("q")?.trim() ?? "";

  const roots = useMemo(
    () =>
      categories
        .filter((c) => !c.parentId?.trim())
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );
  const featured = useMemo(() => roots.slice(0, FEATURED_COUNT), [roots]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, PublicCategory[]>();
    for (const c of categories) {
      const p = c.parentId?.trim();
      if (!p) continue;
      const list = map.get(p);
      if (list) list.push(c);
      else map.set(p, [c]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [categories]);

  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim())
      ? primaryHex.trim()
      : null;
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim())
      ? accentHex.trim()
      : null;

  if (roots.length === 0) return null;

  return (
    <div
      className={cn("text-white", !primary && "bg-primary")}
      style={primary ? { backgroundColor: primary } : undefined}
    >
      <div className="mx-auto flex max-w-7xl items-stretch gap-2 px-4 sm:px-6">
        <ShopByAisleMenu
          roots={roots}
          childrenByParent={childrenByParent}
          pathSlug={pathSlug}
          q={q}
          accentHex={accent}
        />

        <FeaturedAisleNav featured={featured} pathSlug={pathSlug} q={q} />

        <Link
          href={`${APP_ROUTES.shop}#shop-catalog`}
          className={cn(
            "ml-auto inline-flex shrink-0 items-center gap-1.5 self-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition hover:bg-white/10",
          )}
        >
          <Flame className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Offers</span>
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shadow"
            style={
              accent ? { backgroundColor: accent } : { backgroundColor: "#dc2626" }
            }
          >
            Hot
          </span>
        </Link>
      </div>
    </div>
  );
}
