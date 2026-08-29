"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, MessageCircle } from "lucide-react";

import type { CSSProperties, MouseEvent } from "react";
import { useEffect } from "react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { frontWindowFontVariables } from "@/components/storefront/templates/landing/front-window-fonts";
import styles from "@/components/storefront/templates/landing/front-window.module.css";
import {
  ContactActions,
  LandingAccountAction,
  LandingShell,
  LANDING_STAFF_LOGIN_HREF,
} from "@/components/storefront/templates/landing/shared";
import {
  isGarbageProductName,
  joinProductNameParts,
} from "@/lib/catalog-display";
import { resolveFrontWindowCopy } from "@/lib/front-window-landing";
import type { LandingHighlight } from "@/lib/storefront-templates";
import { formatDisplayPrice } from "@/lib/money";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";
import { cn } from "@/lib/utils";

const VITRINE_SRC = "/storefront/front-window/vitrine.png";

type DisplayItem = {
  id: string;
  title: string;
  note: string;
  imageUrl: string | null;
};

function catalogTitle(item: PublicCatalogItemCard) {
  return item.variantName
    ? joinProductNameParts(item.name, item.variantName)
    : item.name;
}

function buildDisplay(
  featured: readonly PublicCatalogItemCard[] | undefined,
  catalog: readonly PublicCatalogItemCard[] | undefined,
  currency: string | null | undefined,
  highlights: readonly LandingHighlight[],
  vitrineFallback: string,
): DisplayItem[] {
  const seen = new Set<string>();
  const fromStock: DisplayItem[] = [];
  for (const item of [...(featured ?? []), ...(catalog ?? [])]) {
    const title = catalogTitle(item).trim();
    if (!title || isGarbageProductName(title) || seen.has(item.id)) continue;
    seen.add(item.id);
    fromStock.push({
      id: item.id,
      title,
      note:
        item.price != null && !Number.isNaN(item.price)
          ? formatDisplayPrice(currency, item.price)
          : "",
      imageUrl: item.imageUrl?.trim() || null,
    });
    if (fromStock.length >= 6) break;
  }
  if (fromStock.length >= 3) return fromStock;
  return highlights.slice(0, 6).map((item, index) => ({
    id: `carry-${index}`,
    title: item.title ?? "",
    note: item.note ?? "",
    imageUrl:
      item.imageUrl?.trim() ||
      (index === 0 ? vitrineFallback : null),
  }));
}

const SECTION_IDS = ["story", "carry", "visit", "contact"] as const;

function useFrontWindowScrollEffects() {
  useEffect(() => {
    const root = document.querySelector(
      '[data-landing-template-id="front-window"]',
    );
    if (!root) return;

    const nav = root.querySelector("nav");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onScroll = () => {
      nav?.toggleAttribute("data-scrolled", window.scrollY > 32);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const revealTargets = root.querySelectorAll("[data-fw-reveal]");
    if (reduced) {
      revealTargets.forEach((el) => el.setAttribute("data-fw-visible", ""));
    } else {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.setAttribute("data-fw-visible", "");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
      );
      revealTargets.forEach((el) => revealObserver.observe(el));

      const navLinks = root.querySelectorAll("[data-fw-nav]");
      const sectionObserver = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort(
              (a, b) => b.intersectionRatio - a.intersectionRatio,
            )[0];
          if (!visible) return;
          const id = visible.target.id;
          navLinks.forEach((link) => {
            link.toggleAttribute(
              "data-active",
              link.getAttribute("href") === `#${id}`,
            );
          });
        },
        { rootMargin: "-42% 0px -48% 0px", threshold: [0, 0.25, 0.5] },
      );
      SECTION_IDS.forEach((id) => {
        const section = root.querySelector(`#${id}`);
        if (section) sectionObserver.observe(section);
      });

      return () => {
        window.removeEventListener("scroll", onScroll);
        revealObserver.disconnect();
        sectionObserver.disconnect();
      };
    }

    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

export function FrontWindowLanding(props: LandingTemplateProps) {
  const accent = props.primaryHex || props.accentHex || "#2F6F6A";
  const brand = props.accentHex || props.primaryHex || accent;
  const copy = resolveFrontWindowCopy(
    props.storeName,
    props.landingContent,
    props.heroFallbackUrl,
  );
  const display = buildDisplay(
    props.featured,
    props.catalogItems,
    props.currency,
    copy.highlights,
    copy.vitrineImageUrl || VITRINE_SRC,
  );
  const featured = display[0]!;
  const rest = display.slice(1);
  const closeMenu = (event: MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.closest("details")?.removeAttribute("open");
  };

  useFrontWindowScrollEffects();

  return (
    <LandingShell
      templateId="front-window"
      storeName={props.storeName}
      className={cn(styles.root, frontWindowFontVariables)}
      style={
        {
          ["--fw-accent" as string]: accent,
        } as CSSProperties
      }
    >
      <nav className={styles.nav} aria-label="Site">
        <div className={styles.navInner}>
          <a href="#top" className={styles.navBrand}>
            {props.logoUrl ? (
              <TenantLogo
                brand={copy.storeName}
                logoUrl={props.logoUrl}
                primaryColor={accent}
                size="sm"
                tone="dark"
              />
            ) : (
              <span className={styles.navName}>{copy.storeName}</span>
            )}
          </a>
          <ul className={styles.navLinks}>
            <li>
              <a href="#story" className={styles.navLink} data-fw-nav>
                {copy.navStoryLabel}
              </a>
            </li>
            <li>
              <a href="#carry" className={styles.navLink} data-fw-nav>
                {copy.navCarryLabel}
              </a>
            </li>
            <li>
              <a href="#visit" className={styles.navLink} data-fw-nav>
                {copy.navVisitLabel}
              </a>
            </li>
            <li>
              <a href="#contact" className={styles.navLink} data-fw-nav>
                {copy.navContactLabel}
              </a>
            </li>
          </ul>
          <details className={styles.menu}>
            <summary className={styles.menuToggle}>Menu</summary>
            <ul className={styles.menuList}>
              <li>
                <a href="#story" onClick={closeMenu}>
                  {copy.navStoryLabel}
                </a>
              </li>
              <li>
                <a href="#carry" onClick={closeMenu}>
                  {copy.navCarryLabel}
                </a>
              </li>
              <li>
                <a href="#visit" onClick={closeMenu}>
                  {copy.navVisitLabel}
                </a>
              </li>
              <li>
                <a href="#contact" onClick={closeMenu}>
                  {copy.navContactLabel}
                </a>
              </li>
            </ul>
          </details>
          <div className={styles.navOwnerGroup}>
            <LandingAccountAction className={styles.navOwner} />
            <Link
              href={LANDING_STAFF_LOGIN_HREF}
              className={styles.navOwnerMuted}
              aria-label="Staff sign-in"
            >
              Staff
            </Link>
          </div>
        </div>
      </nav>

      <header id="top" className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroHeadline}>{copy.headline}</h1>
            <p className={styles.heroSub}>{copy.subheadline}</p>
            <div className={styles.heroMeta}>
              <p className={styles.heroHours}>{copy.hours}</p>
            </div>
            <div className={styles.heroCta}>
              <a href="#contact" className={styles.btnPrimary}>
                {copy.ctaLabel}
              </a>
              <a href="#visit" className={styles.btnGhost}>
                {copy.secondaryCtaLabel}
              </a>
            </div>
          </div>
          <div className={styles.vitrine}>
            <span className={styles.vitrineGlow} aria-hidden />
            <div className={styles.glass}>
              <Image
                src={copy.vitrineImageUrl}
                alt=""
                fill
                priority
                unoptimized
                className={styles.glassPhoto}
                sizes="(max-width: 860px) 100vw, 58vw"
              />
              <span className={styles.glassFrame} aria-hidden />
              <span className={styles.glassMullionV} aria-hidden />
              <span className={styles.glassMullionH} aria-hidden />
              <span className={styles.glassReflection} aria-hidden />
              <span className={styles.glassShine} aria-hidden />
              <span className={styles.glassSill} aria-hidden />
            </div>
          </div>
        </div>
      </header>

      <section id="story" className={styles.story}>
        <div className={styles.storyPhoto} data-fw-reveal="left">
          <Image
            src={copy.storyImageUrl}
            alt=""
            fill
            unoptimized
            className={styles.cover}
            sizes="(max-width: 860px) 100vw, 60vw"
          />
        </div>
        <div className={styles.storyCopy} data-fw-reveal="right">
          <h2 className={styles.storyTitle}>{copy.storyTitle}</h2>
          <p className={styles.storyBody}>{copy.storyBody}</p>
          <blockquote className={styles.storyQuote}>{copy.storyQuote}</blockquote>
        </div>
      </section>

      <section id="carry" className={styles.carry}>
        <div className={styles.carryHeader}>
          <h2 className={styles.carryTitle} data-fw-reveal="up">
            {copy.carryTitle}
          </h2>
          <p className={styles.carryLead} data-fw-reveal="up" data-fw-reveal-delay="1">
            {copy.carryLead}
          </p>
        </div>
        <div className={styles.carryGrid}>
          <article
            className={styles.carryFeatured}
            data-fw-reveal="scale"
          >
            {featured.imageUrl ? (
              <div className={styles.carryShot}>
                <Image
                  src={featured.imageUrl}
                  alt=""
                  fill
                  unoptimized
                  className={styles.cover}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            ) : (
              <div className={styles.carryEmpty} aria-hidden />
            )}
            <div className={styles.carryCaption}>
              <h3>{featured.title}</h3>
              {featured.note ? <p>{featured.note}</p> : null}
            </div>
          </article>
          {rest.map((item, index) => (
            <article
              key={item.id}
              className={cn(
                styles.carryCell,
                index % 2 === 0 && styles.carryCellTint,
              )}
              data-fw-reveal="up"
              data-fw-reveal-delay={String(Math.min(index + 1, 5))}
            >
              <h3>{item.title}</h3>
              {item.note ? <p>{item.note}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section id="visit" className={styles.visit}>
        <div className={styles.visitInner}>
          <div className={styles.visitVisual} data-fw-reveal="scale">
            <Image
              src={copy.visitImageUrl}
              alt=""
              fill
              unoptimized
              className={styles.cover}
              sizes="(max-width: 860px) 100vw, 45vw"
            />
          </div>
          <div className={styles.visitContent} data-fw-reveal="right">
            <h2 className={styles.visitTitle}>{copy.visitTitle}</h2>
            <dl className={styles.visitFacts}>
              <div className={styles.visitFact}>
                <span className={styles.visitFactIcon} aria-hidden>
                  <Clock size={18} strokeWidth={1.75} />
                </span>
                <div>
                  <dt>Hours</dt>
                  <dd>{copy.hours}</dd>
                </div>
              </div>
              <div className={styles.visitFact}>
                <span className={styles.visitFactIcon} aria-hidden>
                  <MapPin size={18} strokeWidth={1.75} />
                </span>
                <div>
                  <dt>Address</dt>
                  <dd>{copy.address}</dd>
                </div>
              </div>
              <div className={styles.visitFact}>
                <span className={styles.visitFactIcon} aria-hidden>
                  <MessageCircle size={18} strokeWidth={1.75} />
                </span>
                <div>
                  <dt>Hold at the counter</dt>
                  <dd>{copy.holdAtCounterNote}</dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section id="contact" className={styles.contact}>
        <div className={styles.contactPanel} data-fw-reveal="up">
          <div>
            <h2 className={styles.contactTitle}>{copy.contactTitle}</h2>
            <p className={styles.contactBody}>{copy.contactBody}</p>
          </div>
          {(copy.phone || copy.whatsapp) && (
            <div className={styles.contactActions}>
              <ContactActions
                phone={copy.phone}
                whatsapp={copy.whatsapp}
                ctaLabel={copy.ctaLabel}
                brand={brand}
              />
            </div>
          )}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div>
            <div className={styles.footerBrand}>
              <TenantLogo
                brand={copy.storeName}
                logoUrl={props.logoUrl}
                primaryColor={accent}
                size="sm"
                tone="dark"
              />
              <span>{copy.storeName}</span>
            </div>
          </div>
          <div className={styles.footerCol}>
            <p className={styles.footerLabel}>Visit</p>
            <p>{copy.hours}</p>
            <p>{copy.address}</p>
          </div>
          <div className={styles.footerCol}>
            <p className={styles.footerLabel}>Explore</p>
            <nav className={styles.footerNav} aria-label="Footer">
              <a href="#story">{copy.navStoryLabel}</a>
              <a href="#carry">{copy.navCarryLabel}</a>
              <a href="#visit">{copy.navVisitLabel}</a>
              <a href="#contact">{copy.navContactLabel}</a>
            </nav>
          </div>
        </div>
      </footer>
    </LandingShell>
  );
}
