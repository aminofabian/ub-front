import Link from "next/link";
import { ArrowRight, BookOpenCheck, CornerDownRight } from "lucide-react";

import { HelpArticleList } from "@/components/help/help-article-list";
import { HelpArticleNav } from "@/components/help/help-article-nav";
import { HelpBreadcrumbs } from "@/components/help/help-breadcrumbs";
import { HelpCategoryGrid } from "@/components/help/help-category-grid";
import { HELP_CATEGORY_ICONS } from "@/components/help/help-category-icons";
import { HelpContactCta } from "@/components/help/help-contact-cta";
import { HelpSearch } from "@/components/help/help-search";
import {
  HelpBreadcrumbJsonLd,
  HelpCollectionJsonLd,
  HelpHubStructuredData,
} from "@/components/help/help-structured-data";
import {
  audienceLabel,
  categoryHref,
  getSearchIndex,
  listCategories,
  listPopularArticles,
  type HelpAudience,
} from "@/lib/help";
import { helpAbsoluteUrl, helpSiteUrl } from "@/lib/help/seo";
import { APP_ROUTES } from "@/lib/config";
import {
  landingSectionClass,
  sectionLabelPillClass,
} from "@/components/tenant-console/landing/landing-styles";

/** 1fr : 3fr reader grid — titles on the left, content on the right. */
const READER_GRID =
  "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] lg:gap-12";

export function HelpHubPage({ initialQuery = "" }: { initialQuery?: string }) {
  const siteUrl = helpSiteUrl();
  const popular = listPopularArticles(8);
  const articles = getSearchIndex();

  return (
    <>
      <HelpHubStructuredData siteUrl={siteUrl} />
      <HelpBreadcrumbJsonLd
        items={[
          { name: "Home", url: helpAbsoluteUrl("/") },
          { name: "Help", url: helpAbsoluteUrl("/help") },
        ]}
      />

      <section className={`${landingSectionClass} !pb-10 sm:!pb-14`}>
        <div className="mx-auto max-w-[1100px]">
          <HelpBreadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "Help" }]}
            className="mb-8"
          />

          <p className={sectionLabelPillClass}>Help center</p>
          <h1 className="mt-5 font-heading text-[clamp(2rem,6vw,3.5rem)] leading-[1.08] tracking-[-0.03em] text-[var(--kiosk-text)]">
            Kiosk Help
          </h1>
          <p className="mt-4 max-w-xl text-base leading-[1.65] text-[var(--kiosk-text-soft)] sm:text-[17px]">
            Guides for shop counters and online shoppers across Kenya — search
            below or choose who you are.
          </p>

          <div className="mt-8 max-w-2xl">
            <HelpSearch articles={articles} initialQuery={initialQuery} />
          </div>

          <div className="mt-8">
            <Link
              href={APP_ROUTES.helpKioskGuide}
              className="group relative block overflow-hidden rounded-2xl border border-[var(--kiosk-gold-border)] bg-gradient-to-br from-[var(--kiosk-gold-soft)] via-[var(--kiosk-elevated)] to-[var(--kiosk-elevated)] p-6 transition hover:border-[var(--kiosk-gold)] sm:p-8"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[var(--kiosk-gold)]/15 blur-2xl transition group-hover:bg-[var(--kiosk-gold)]/25"
              />
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-elevated)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
                <BookOpenCheck className="size-3.5" aria-hidden />
                Start here
              </span>
              <h2 className="mt-4 font-heading text-[clamp(1.4rem,3.5vw,2rem)] tracking-[-0.02em] text-[var(--kiosk-text)]">
                Get the most out of Kiosk
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--kiosk-text-soft)]">
                One catalog, one till, one storefront. Follow the daily rhythm,
                then jump into the guide for whatever you&apos;re doing next — every
                deeper guide is linked from here.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--kiosk-gold)]">
                Open the master guide
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--kiosk-border-soft)] px-4 py-12 sm:px-10 sm:py-16">
        <div className="mx-auto max-w-[1100px]">
          <div className={READER_GRID}>
            <aside className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                Browse by topic
              </p>
              <ul className="mt-3 space-y-1 rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-2">
                {listCategories("merchants").map((cat) => {
                  const Icon = HELP_CATEGORY_ICONS[cat.icon];
                  return (
                    <li key={cat.slug}>
                      <Link
                        href={categoryHref("merchants", cat.slug)}
                        className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-[var(--kiosk-gold-surface)]"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[var(--kiosk-border)] bg-[var(--kiosk-surface)] text-[var(--kiosk-gold)] transition-colors group-hover:border-[var(--kiosk-gold-border)]">
                          <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium text-[var(--kiosk-text)]">
                            {cat.title}
                          </span>
                          <span className="block truncate text-[11px] text-[var(--kiosk-text-soft)]">
                            {cat.description}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--kiosk-text-faint)]">
                          {cat.articleCount}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <Link
                href="/help/shoppers"
                className="group mt-3 flex items-center gap-2.5 rounded-2xl border border-dashed border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] px-3.5 py-3 transition-colors hover:border-[var(--kiosk-gold-border)]"
              >
                <CornerDownRight
                  className="size-4 shrink-0 text-[var(--kiosk-gold)] transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
                <span className="text-[13px] text-[var(--kiosk-text-muted)] transition-colors group-hover:text-[var(--kiosk-text)]">
                  Shopping on a kiosk.ke storefront? Browse shopper guides.
                </span>
              </Link>
            </aside>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-heading text-[clamp(24px,4vw,36px)] tracking-[-0.02em] text-[var(--kiosk-text)]">
                  Most-read guides
                </h2>
                <Link
                  href="/help/merchants"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--kiosk-gold)] transition-colors hover:text-[var(--kiosk-gold-hover)]"
                >
                  All merchant guides
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
              <p className="mt-2 text-sm text-[var(--kiosk-text-soft)]">
                Most-read guides for getting started and everyday selling.
              </p>
              <div className="mt-8">
                <HelpArticleList articles={popular} />
              </div>
              <div className="mt-10">
                <HelpContactCta />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function HelpAudiencePage({ audience }: { audience: HelpAudience }) {
  const categories = listCategories(audience);
  const articles = getSearchIndex().filter((a) => a.audience === audience);
  const url = helpAbsoluteUrl(`/help/${audience}`);
  const label = audienceLabel(audience);
  const description =
    audience === "merchants"
      ? "POS, M-Pesa, inventory, storefront, and staff guides for Kiosk merchants."
      : "Orders, delivery, payments, and returns for customers shopping on kiosk.ke storefronts.";

  return (
    <>
      <HelpCollectionJsonLd
        name={`${label} — Kiosk Help`}
        description={description}
        url={url}
      />
      <HelpBreadcrumbJsonLd
        items={[
          { name: "Home", url: helpAbsoluteUrl("/") },
          { name: "Help", url: helpAbsoluteUrl("/help") },
          { name: label, url },
        ]}
      />

      <section className={landingSectionClass}>
        <div className="mx-auto max-w-[1100px]">
          <HelpBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Help", href: "/help" },
              { label },
            ]}
            className="mb-8"
          />

          <div className={READER_GRID}>
            <HelpArticleNav audience={audience} />

            <div className="min-w-0">
              <p className={sectionLabelPillClass}>
                {audience === "merchants" ? "Merchants" : "Shoppers"}
              </p>
              <h1 className="mt-5 font-heading text-[clamp(1.85rem,5vw,3rem)] leading-[1.1] tracking-[-0.03em] text-[var(--kiosk-text)]">
                {label}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-[1.65] text-[var(--kiosk-text-soft)]">
                {description}
              </p>
              <div className="mt-8 max-w-2xl">
                <HelpSearch
                  articles={articles}
                  placeholder={
                    audience === "merchants"
                      ? "Search merchant help…"
                      : "Search shopper help…"
                  }
                />
              </div>
              <div className="mt-12">
                <HelpCategoryGrid categories={categories} />
              </div>
              <div className="mt-12">
                <HelpContactCta
                  variant={audience === "merchants" ? "merchant" : "shopper"}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
