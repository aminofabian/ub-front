import Link from "next/link";
import {
  ClipboardList,
  CreditCard,
  Package,
  Rocket,
  RotateCcw,
  ScanBarcode,
  Smartphone,
  Store,
  Truck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { HelpCategory, HelpCategoryIcon } from "@/lib/help";
import { categoryHref } from "@/lib/help";
import { landingIconWrapClass } from "@/components/tenant-console/landing/landing-styles";

const ICONS: Record<HelpCategoryIcon, LucideIcon> = {
  rocket: Rocket,
  scan: ScanBarcode,
  smartphone: Smartphone,
  package: Package,
  store: Store,
  users: Users,
  user: User,
  truck: Truck,
  "credit-card": CreditCard,
  "rotate-ccw": RotateCcw,
  "clipboard-list": ClipboardList,
};

type HelpCategoryGridProps = {
  categories: HelpCategory[];
};

export function HelpCategoryGrid({ categories }: HelpCategoryGridProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => {
        const Icon = ICONS[cat.icon];
        return (
          <li key={cat.slug}>
            <Link
              href={categoryHref(cat.audience, cat.slug)}
              className="group flex h-full flex-col rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-5 transition-all duration-300 hover:border-[var(--kiosk-gold-border)] hover:shadow-[0_12px_40px_-16px_var(--kiosk-success-shadow)] sm:p-6"
            >
              <span className={landingIconWrapClass}>
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="mt-4 font-heading text-xl font-medium tracking-[-0.02em] text-[var(--kiosk-text)] transition-colors group-hover:text-[var(--kiosk-gold)]">
                {cat.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--kiosk-text-soft)]">
                {cat.description}
              </p>
              <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
                {cat.articleCount}{" "}
                {cat.articleCount === 1 ? "article" : "articles"}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
