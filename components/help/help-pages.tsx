import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HelpArticleList } from "@/components/help/help-article-list";
import { HelpBreadcrumbs } from "@/components/help/help-breadcrumbs";
import { HelpCategoryGrid } from "@/components/help/help-category-grid";
import { HelpContactCta } from "@/components/help/help-contact-cta";
import { HelpSearch } from "@/components/help/help-search";
import {
  HelpBreadcrumbJsonLd,
  HelpCollectionJsonLd,
  HelpHubStructuredData,
} from "@/components/help/help-structured-data";
import {
  HELP_AUDIENCES,
  audienceLabel,
  getSearchIndex,
  listCategories,
  listPopularArticles,
  type HelpAudience,
} from "@/lib/help";
import { helpAbsoluteUrl, helpSiteUrl } from "@/lib/help/seo";
import {
  landingSectionClass,
  sectionLabelPillClass,
} from "@/components/tenant-console/landing/landing-styles";

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
        </div>
      </section>

      <section className="border-t border-[var(--kiosk-border-soft)] px-4 py-12 sm:px-10 sm:py-16">
        <div className="mx-auto grid max-w-[1100px] gap-4 md:grid-cols-2">
          {HELP_AUDIENCES.map((audience) => (
            <Link
              key={audience.id}
              href={audience.href}
              className="group relative overflow-hidden rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-6 transition hover:border-[var(--kiosk-gold-border)] sm:p-8"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[var(--kiosk-gold-soft)] opacity-70 transition group-hover:opacity-100"
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
                {audience.id === "merchants" ? "Merchants" : "Shoppers"}
              </p>
              <h2 className="mt-3 font-heading text-2xl tracking-[-0.02em] text-[var(--kiosk-text)] sm:text-3xl">
                {audience.title}
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--kiosk-text-soft)]">
                {audience.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--kiosk-gold)]">
                Browse guides
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--kiosk-border-soft)] px-4 py-12 sm:px-10 sm:py-16">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="font-heading text-[clamp(24px,4vw,36px)] tracking-[-0.02em] text-[var(--kiosk-text)]">
            Popular articles
          </h2>
          <p className="mt-2 text-sm text-[var(--kiosk-text-soft)]">
            Most-read guides for getting started and everyday selling.
          </p>
          <div className="mt-8">
            <HelpArticleList articles={popular} />
          </div>
          <HelpContactCta />
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
          <p className={sectionLabelPillClass}>
            {audience === "merchants" ? "Merchants" : "Shoppers"}
          </p>
          <h1 className="mt-5 font-heading text-[clamp(1.85rem,5vw,3rem)] leading-[1.1] tracking-[-0.03em] text-[var(--kiosk-text)]">
            {label}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-[1.65] text-[var(--kiosk-text-soft)]">
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
          <HelpContactCta
            variant={audience === "merchants" ? "merchant" : "shopper"}
          />
        </div>
      </section>
    </>
  );
}
