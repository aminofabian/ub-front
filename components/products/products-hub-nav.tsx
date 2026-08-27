"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderTree,
  Layers,
  Library,
  Package,
  type LucideIcon,
} from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type HubTab = {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const HUB_TABS: HubTab[] = [
  {
    href: APP_ROUTES.products,
    label: "Products",
    hint: "Catalog & SKUs",
    icon: Package,
    match: (p) =>
      p === APP_ROUTES.products ||
      p.startsWith(`${APP_ROUTES.products}?`),
  },
  {
    href: APP_ROUTES.itemTypes,
    label: "Departments",
    hint: "How items group",
    icon: Layers,
    match: (p) => p.startsWith(APP_ROUTES.itemTypes),
  },
  {
    href: APP_ROUTES.categories,
    label: "Categories",
    hint: "Browse & analytics",
    icon: FolderTree,
    match: (p) => p.startsWith(APP_ROUTES.categories),
  },
  {
    href: APP_ROUTES.productsCatalog,
    label: "Global catalog",
    hint: "Adopt shared items",
    icon: Library,
    match: (p) => p.startsWith(APP_ROUTES.productsCatalog),
  },
];

export function ProductsHubNav({
  className,
  columns = 4,
}: {
  className?: string;
  columns?: 2 | 4;
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "grid gap-1 p-1",
        columns === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4",
        className,
      )}
      aria-label="Products pages"
    >
      {HUB_TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "group relative flex min-h-[3.25rem] flex-col justify-center rounded-lg px-3 py-2.5 transition-[background-color,box-shadow,color] duration-200 sm:min-h-[3.5rem] sm:flex-row sm:items-center sm:gap-3 sm:px-4",
              active
                ? "bg-[var(--catalog-ink,#15231f)] text-white shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_12%,transparent)]"
                : "text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_62%,transparent)] hover:bg-[color-mix(in_srgb,var(--catalog-ink,#15231f)_4%,transparent)] hover:text-[var(--catalog-ink,#15231f)]",
            )}
          >
            <span className="flex items-center gap-2">
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-transform duration-200 group-hover:scale-105",
                  active
                    ? "text-[color-mix(in_srgb,#fff_88%,transparent)]"
                    : "text-[var(--catalog-primary,#0f766e)]",
                )}
                aria-hidden
              />
              <span className="text-[13px] font-semibold tracking-[-0.01em] sm:text-sm">
                {tab.label}
              </span>
            </span>
            <span
              className={cn(
                "mt-0.5 hidden text-[11px] sm:ml-auto sm:mt-0 sm:block",
                active
                  ? "text-[color-mix(in_srgb,#fff_62%,transparent)]"
                  : "text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_42%,transparent)]",
              )}
            >
              {tab.hint}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
