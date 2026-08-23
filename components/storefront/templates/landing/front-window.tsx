"use client";

import Link from "next/link";

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
import type { LandingTemplateProps } from "@/components/storefront/templates/types";
import { cn } from "@/lib/utils";

const CARRY = [
  {
    title: "Notebooks & journals",
    note: "Hardback, spiral, and pocket sizes for school and desk.",
  },
  {
    title: "Fine pens & pencils",
    note: "Ballpoints, gel, fountain-friendly inks, and sharpeners.",
  },
  {
    title: "Gift wrap & cards",
    note: "Ribbon, tissue, bags, and greeting cards for every occasion.",
  },
  {
    title: "Office essentials",
    note: "Files, staplers, clips, tape — the everyday counter staples.",
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

const SILL_TAGS = [
  "Pens & ink",
  "Paper",
  "Gifts",
  "Office",
  "Art",
  "Cards",
] as const;

export function FrontWindowLanding(props: LandingTemplateProps) {
  const accent = props.primaryHex || props.accentHex || "#0F766E";
  const brand = props.accentHex || props.primaryHex || accent;
  const copy = resolveLandingCopy(props.storeName, props.landingContent, {
    headline: props.storeName,
    subheadline:
      "Pens, paper, gifts and everyday essentials — curated at our neighborhood counter.",
    ctaLabel: "Message us",
    hours: "Mon–Sat 8:00–19:00 · Sun 9:00–17:00",
    address: "Walk in — we are easy to find on the high street.",
  });

  const parts = copy.storeName.trim().split(/\s+/);
  const nameFirst = parts[0] || copy.storeName;
  const nameRest = parts.slice(1).join(" ");

  return (
    <LandingShell
      templateId="front-window"
      storeName={props.storeName}
      className={cn(styles.root, styles.body, frontWindowFontVariables)}
      style={
        {
          ["--fw-accent" as string]: accent,
        } as React.CSSProperties
      }
    >
      <nav className={styles.nav} aria-label="Site">
        <div className={styles.navInner}>
          <a href="#top" className={styles.navBrand}>
            {nameFirst}
            {nameRest ? (
              <>
                {" "}
                <em>{nameRest}</em>
              </>
            ) : null}
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
        <span className={styles.heroStars} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.window}>
            <span className={styles.windowMullions} aria-hidden />
            <div className={styles.windowGlow}>
              <div className={styles.heroCopy}>
                <p className={styles.heroEyebrow}>Through the front window</p>
                <h1 className={styles.heroHeadline}>{copy.headline}</h1>
                <p className={styles.heroSub}>{copy.subheadline}</p>
                <div className={styles.heroCta}>
                  <a href="#contact" className={styles.btnPrimary}>
                    {copy.ctaLabel}
                  </a>
                  <a href="#visit" className={styles.btnGhost}>
                    Plan your visit
                  </a>
                </div>
                <div className={styles.sill} aria-label="Departments">
                  {SILL_TAGS.map((tag) => (
                    <span key={tag} className={styles.sillTag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="story" className={styles.section}>
        <div className={styles.storyGrid}>
          <div>
            <p className={styles.sectionLabel}>Our story</p>
            <h2 className={styles.sectionTitle}>
              A counter you can actually walk up to.
            </h2>
            <p className={styles.sectionBody}>
              {copy.storeName} is a neighborhood stationery shop — the kind with
              someone behind the counter who knows which notebook lays flat, which
              pen will not bleed, and where to find the right gift wrap before
              closing time. No algorithms, no warehouse aisles — just a well-stocked
              shelf and a person who will help you choose.
            </p>
          </div>
          <aside className={styles.storyAside}>
            <p>
              &ldquo;We opened so students, offices, and gift-givers could get
              what they need without hunting through a mega-store.&rdquo;
            </p>
          </aside>
        </div>
      </section>

      <section id="carry" className={styles.section}>
        <p className={styles.sectionLabel}>What we carry</p>
        <h2 className={styles.sectionTitle}>Stocked for desk, school & gift.</h2>
        <p className={styles.sectionBody}>
          Walk the aisles in person — these are the counters our regulars come back
          for. Ask the team if you need something specific; we reorder fast.
        </p>
        <div className={styles.carryGrid}>
          {CARRY.map((item) => (
            <article key={item.title} className={styles.carryCard}>
              <h3>{item.title}</h3>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="visit" className={cn(styles.section, styles.visit)}>
        <p className={styles.sectionLabel}>Visit</p>
        <h2 className={styles.sectionTitle}>Find us on the street.</h2>
        <div className={styles.visitGrid}>
          <div className={styles.visitBlock}>
            <h3>Hours</h3>
            <p>{copy.hours}</p>
          </div>
          <div className={styles.visitBlock}>
            <h3>Address</h3>
            <p>{copy.address}</p>
          </div>
          <div className={styles.visitMap} aria-hidden>
            <span className={styles.visitPin}>{copy.address}</span>
          </div>
          <div className={styles.visitBlock}>
            <h3>Before you come</h3>
            <p>
              Message us on WhatsApp if you want something held at the counter — we
              will have it ready when you arrive.
            </p>
          </div>
        </div>
      </section>

      <section id="contact" className={cn(styles.section, styles.contact)}>
        <p className={styles.sectionLabel}>Contact</p>
        <h2 className={styles.sectionTitle}>Say hello from the sidewalk.</h2>
        <p className={styles.sectionBody}>
          Questions about stock, bulk orders, or school lists? Reach out — a real
          person at {copy.storeName} will reply.
        </p>
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
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>{copy.storeName}</div>
        <p>{copy.hours}</p>
        <p>{copy.address}</p>
        <p className="mt-4 flex items-center justify-center gap-2">
          <TenantLogo
            brand={copy.storeName}
            logoUrl={props.logoUrl}
            primaryColor={accent}
            size="sm"
          />
        </p>
      </footer>
    </LandingShell>
  );
}
