"use client";

import Image from "next/image";
import { useEffect } from "react";
import type { CSSProperties } from "react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { freshMarketFontVariables } from "@/components/storefront/templates/landing/fresh-market-fonts";
import styles from "@/components/storefront/templates/landing/fresh-market.module.css";
import {
  LandingShell,
  resolveLandingCopy,
} from "@/components/storefront/templates/landing/shared";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";
import { normalizeWhatsApp } from "@/lib/whatsapp-order";
import { cn } from "@/lib/utils";

const DEFAULT_TAGS = [
  "Seasonal produce",
  "Dairy & eggs",
  "Fresh herbs",
  "Weekly specials",
];

const FALLBACK_HERO = "/hello/fudowakira0-paprika-638654_1920.jpg";

function useFreshMarketReveal() {
  useEffect(() => {
    const root = document.querySelector('[data-landing-template-id="fresh-market"]');
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = root.querySelectorAll("[data-fm-reveal]");
    if (reduced) {
      targets.forEach((el) => el.setAttribute("data-fm-visible", ""));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-fm-visible", "");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export function FreshMarketLanding(props: LandingTemplateProps) {
  useFreshMarketReveal();

  const brand = props.primaryHex || props.accentHex || "#15803D";
  const copy = resolveLandingCopy(props.storeName, props.landingContent, {
    headline: `${props.storeName} market`,
    subheadline:
      "Farm-fresh picks, stacked daily. Come early for the best crates.",
    ctaLabel: "Order today's box",
    hours: "Open daily 6:30–19:00",
    address: "Find us at the market row",
  });
  const heroSrc =
    props.landingContent?.vitrineImageUrl?.trim() ||
    props.heroFallbackUrl?.trim() ||
    FALLBACK_HERO;
  const wa =
    normalizeWhatsApp(copy.whatsapp) ?? normalizeWhatsApp(copy.phone);
  const tags =
    props.categories
      ?.slice(0, 4)
      .map((c) => c.name.trim())
      .filter(Boolean) ?? DEFAULT_TAGS;

  return (
    <LandingShell
      templateId="fresh-market"
      storeName={props.storeName}
      className={cn(styles.root, freshMarketFontVariables)}
      style={{ ["--fm-brand" as string]: brand } as CSSProperties}
    >
      <div className={styles.scene}>
        <div className={styles.awning} aria-hidden />
        <div className={styles.hero}>
          <Image src={heroSrc} alt="" fill priority unoptimized sizes="100vw" />
          <div className={styles.heroShade} />
        </div>

        <div className={styles.content}>
          <header className={styles.topRow}>
            <div className={styles.logoWrap}>
              {props.logoUrl ? (
                <TenantLogo
                  brand={copy.storeName}
                  logoUrl={props.logoUrl}
                  primaryColor={brand}
                  size="sm"
                  tone="dark"
                />
              ) : (
                <span className={styles.logoFallback}>{copy.storeName}</span>
              )}
            </div>
            <p className={styles.openBadge}>Fresh today</p>
          </header>

          <main className={styles.main}>
            <p className={styles.eyebrow} data-fm-reveal>
              Morning market
            </p>
            <h1 className={styles.headline} data-fm-reveal data-fm-delay="1">
              {copy.headline}
            </h1>
            <p
              className={styles.subheadline}
              data-fm-reveal
              data-fm-delay="2"
            >
              {copy.subheadline}
            </p>

            <div className={styles.tags} data-fm-reveal data-fm-delay="2">
              {tags.map((item) => (
                <span key={item} className={styles.tag}>
                  {item}
                </span>
              ))}
            </div>

            <p className={styles.meta} data-fm-reveal data-fm-delay="3">
              <strong>{copy.hours}</strong>
              {copy.address ? <> · {copy.address}</> : null}
            </p>

            {wa || copy.phone ? (
              <div className={styles.contactActions} data-fm-reveal data-fm-delay="3">
                {wa ? (
                  <a href={`https://wa.me/${wa}`}>{copy.ctaLabel}</a>
                ) : null}
                {copy.phone ? (
                  <a href={`tel:${copy.phone}`}>Call {copy.phone}</a>
                ) : null}
              </div>
            ) : null}

            <p className={styles.crate}>Stacked daily · ask what came in this morning</p>
          </main>
        </div>
      </div>
    </LandingShell>
  );
}
