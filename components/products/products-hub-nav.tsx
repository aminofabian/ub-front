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
              "group relative flex h-8 shrink-0 items-center gap-1.5 rounded-none px-2.5 transition-colors sm:h-9 sm:flex-1 sm:px-3",
              active
                ? "bg-[var(--catalog-ink,#15231f)] text-white"
                : "text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_58%,transparent)] hover:bg-[color-mix(in_srgb,var(--catalog-ink,#15231f)_4%,transparent)] hover:text-[var(--catalog-ink,#15231f)]",
            )}
          >
            <Icon
              className={cn(
                "size-3.5 shrink-0 transition-colors",
                active
                  ? "text-[color-mix(in_srgb,#fff_88%,transparent)]"
                  : "text-[var(--catalog-primary,#0f766e)]",
              )}
              aria-hidden
            />
            <span className="truncate text-[12px] font-medium tracking-[-0.015em] sm:text-[13px]">
              {tab.label}
            </span>
            <span
              className={cn(
                "ml-auto hidden truncate text-[10px] tracking-[-0.01em] lg:block",
                active
                  ? "text-[color-mix(in_srgb,#fff_62%,transparent)]"
                  : "text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_42%,transparent)]",
              )}
            >
              {tab.hint}
            </span>
            {active ? (
              <span
                className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[var(--catalog-primary,#0f766e)]"
                aria-hidden
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
