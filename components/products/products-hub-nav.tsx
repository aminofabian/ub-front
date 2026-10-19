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
      p.startsWith(`${APP_ROUTES.products}/p/`),
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

export function ProductsHubNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
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
            title={tab.hint}
            className={cn(
              "group relative flex h-11 shrink-0 items-center gap-2 rounded-none border-b-2 border-transparent px-3.5 transition-colors",
              active
                ? "border-[var(--catalog-primary,#1D4B3B)] text-[var(--catalog-ink,#121A16)]"
                : "text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_58%,transparent)] hover:text-[var(--catalog-ink,#121A16)]",
            )}
          >
            <Icon
              className={cn(
                "size-3.5 shrink-0 transition-colors",
                active
                  ? "text-[var(--catalog-primary,#1D4B3B)]"
                  : "text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_45%,transparent)] group-hover:text-[var(--catalog-primary,#1D4B3B)]",
              )}
              aria-hidden
            />
            <span className="truncate text-[12.5px] font-medium tracking-[0.005em]">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
