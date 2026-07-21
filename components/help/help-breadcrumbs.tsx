import Link from "next/link";

import { cn } from "@/lib/utils";

export type HelpCrumb = {
  label: string;
  href?: string;
};

type HelpBreadcrumbsProps = {
  items: HelpCrumb[];
  className?: string;
};

export function HelpBreadcrumbs({ items, className }: HelpBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-[var(--kiosk-text-faint)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
              {index > 0 ? (
                <span aria-hidden className="text-[var(--kiosk-text-faint)]">
                  /
                </span>
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-[var(--kiosk-text)]"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    isLast
                      ? "text-[var(--kiosk-text-muted)]"
                      : "text-[var(--kiosk-text-faint)]",
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
