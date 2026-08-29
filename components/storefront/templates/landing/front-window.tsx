"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, MessageCircle } from "lucide-react";

import type { CSSProperties, MouseEvent } from "react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { frontWindowFontVariables } from "@/components/storefront/templates/landing/front-window-fonts";
import styles from "@/components/storefront/templates/landing/front-window.module.css";
import {
  ContactActions,
  LandingAccountAction,
  LandingShell,
  LANDING_STAFF_LOGIN_HREF,
  resolveLandingCopy,
} from "@/components/storefront/templates/landing/shared";
import {
  isGarbageProductName,
  joinProductNameParts,
} from "@/lib/catalog-display";
import { formatDisplayPrice } from "@/lib/money";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";
import { cn } from "@/lib/utils";

const VITRINE_SRC = "/storefront/front-window/vitrine.png";
const COUNTER_SRC = "/storefront/front-window/counter.png";
const STREET_SRC = "/storefront/front-window/street.png";

const CARRY = [
  {
    title: "Notebooks and journals",
    note: "Hardback, spiral, and pocket sizes for school and desk.",
  },
  {
    title: "Fine pens and pencils",
    note: "Ballpoints, gel, fountain-friendly inks, and sharpeners.",
  },
  {
    title: "Gift wrap and cards",
    note: "Ribbon, tissue, bags, and greeting cards for every occasion.",
  },
  {
    title: "Office essentials",
    note: "Files, staplers, clips and tape. The everyday counter staples.",
  },
  {
    title: "Art supplies",
    note: "Markers, sketch pads, paints, and craft basics.",
  },
  {
    title: "School packs",
    note: "Term lists, bulk stationery, and student-friendly bundles.",
  },
] as const;

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
  return CARRY.map((item, index) => ({
    id: `carry-${index}`,
    title: item.title,
    note: item.note,
    imageUrl: index === 0 ? VITRINE_SRC : null,
  }));
}

export function FrontWindowLanding(props: LandingTemplateProps) {
  const accent = props.primaryHex || props.accentHex || "#2F6F6A";
  const brand = props.accentHex || props.primaryHex || accent;
  const copy = resolveLandingCopy(props.storeName, props.landingContent, {
    headline: props.storeName,
    subheadline:
      "Pens, paper, gifts and everyday essentials, curated at our neighborhood counter.",
    ctaLabel: "Message us",
    hours: "Mon–Sat 8:00–19:00 · Sun 9:00–17:00",
    address: "Walk in. We are easy to find on the high street.",
  });
  const display = buildDisplay(
    props.featured,
    props.catalogItems,
    props.currency,
  );
  const featured = display[0]!;
  const rest = display.slice(1);
  const vitrineSrc = props.heroFallbackUrl?.trim() || VITRINE_SRC;
  const closeMenu = (event: MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.closest("details")?.removeAttribute("open");
  };

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
              <a href="#story" className={styles.navLink}>
                Our story
              </a>
            </li>
            <li>
              <a href="#carry" className={styles.navLink}>
                What we carry
              </a>
            </li>
            <li>
              <a href="#visit" className={styles.navLink}>
                Visit
              </a>
            </li>
            <li>
              <a href="#contact" className={styles.navLink}>
                Contact
              </a>
            </li>
          </ul>
          <details className={styles.menu}>
            <summary className={styles.menuToggle}>Menu</summary>
            <ul className={styles.menuList}>
              <li>
                <a href="#story" onClick={closeMenu}>
                  Our story
                </a>
              </li>
              <li>
                <a href="#carry" onClick={closeMenu}>
                  What we carry
                </a>
              </li>
              <li>
                <a href="#visit" onClick={closeMenu}>
                  Visit
                </a>
              </li>
              <li>
                <a href="#contact" onClick={closeMenu}>
                  Contact
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
                Plan your visit
              </a>
            </div>
          </div>
          <div className={styles.vitrine}>
            <span className={styles.vitrineGlow} aria-hidden />
            <div className={styles.glass}>
              <Image
                src={vitrineSrc}
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
        <div className={styles.storyPhoto}>
          <Image
            src={COUNTER_SRC}
            alt=""
            fill
            unoptimized
            className={styles.cover}
            sizes="(max-width: 860px) 100vw, 60vw"
          />
        </div>
        <div className={styles.storyCopy}>
          <h2 className={styles.storyTitle}>
            A counter you can actually walk up to.
          </h2>
          <p className={styles.storyBody}>
            {copy.storeName} is a neighborhood stationery shop: the kind with
            someone behind the counter who knows which notebook lays flat, which
            pen will not bleed, and where to find the right gift wrap before
            closing. No warehouse aisles. A well-stocked shelf and a person who
            will help you choose.
          </p>
          <blockquote className={styles.storyQuote}>
            We opened so students, offices, and gift-givers could get what they
            need without hunting through a mega-store.
          </blockquote>
        </div>
      </section>

      <section id="carry" className={styles.carry}>
        <div className={styles.carryHeader}>
          <h2 className={styles.carryTitle}>Stocked for desk, school and gift.</h2>
          <p className={styles.carryLead}>
            Walk the aisles in person. These are the counters our regulars come
            back for. Ask if you need something specific; we reorder fast.
          </p>
        </div>
        <div className={styles.carryGrid}>
          <article className={styles.carryFeatured}>
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
            >
              <h3>{item.title}</h3>
              {item.note ? <p>{item.note}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section id="visit" className={styles.visit}>
        <div className={styles.visitInner}>
          <div className={styles.visitVisual}>
            <Image
              src={STREET_SRC}
              alt=""
              fill
              unoptimized
              className={styles.cover}
              sizes="(max-width: 860px) 100vw, 45vw"
            />
          </div>
          <div className={styles.visitContent}>
            <h2 className={styles.visitTitle}>Find us on the street.</h2>
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
                  <dd>
                    Message us on WhatsApp if you want something ready when you
                    arrive.
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section id="contact" className={styles.contact}>
        <div className={styles.contactPanel}>
          <div>
            <h2 className={styles.contactTitle}>Say hello from the sidewalk.</h2>
            <p className={styles.contactBody}>
              Questions about stock, bulk orders, or school lists? A real person at{" "}
              {copy.storeName} will reply.
            </p>
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
              <a href="#story">Our story</a>
              <a href="#carry">What we carry</a>
              <a href="#visit">Find us</a>
              <a href="#contact">Contact</a>
            </nav>
          </div>
        </div>
      </footer>
    </LandingShell>
  );
}
