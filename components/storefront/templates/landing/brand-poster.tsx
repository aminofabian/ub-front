"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import type { CSSProperties } from "react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { brandPosterFontVariables } from "@/components/storefront/templates/landing/brand-poster-fonts";
import styles from "@/components/storefront/templates/landing/brand-poster.module.css";
import {
  LandingAccountAction,
  LandingShell,
  LANDING_STAFF_LOGIN_HREF,
} from "@/components/storefront/templates/landing/shared";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";
import { resolveBrandPosterCopy } from "@/lib/brand-poster-landing";
import { normalizeWhatsApp } from "@/lib/whatsapp-order";
import { cn } from "@/lib/utils";

function useBrandPosterScrollEffects() {
  useEffect(() => {
    const root = document.querySelector(
      '[data-landing-template-id="brand-poster"]',
    );
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealTargets = root.querySelectorAll("[data-bp-reveal]");

    if (reduced) {
      revealTargets.forEach((el) => el.setAttribute("data-bp-visible", ""));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-bp-visible", "");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    revealTargets.forEach((el) => revealObserver.observe(el));
    return () => revealObserver.disconnect();
  }, []);
}

export function BrandPosterLanding(props: LandingTemplateProps) {
  useBrandPosterScrollEffects();

  const brand = props.primaryHex || props.accentHex || "#171717";
  const copy = resolveBrandPosterCopy(
    props.storeName,
    props.landingContent,
    props.heroFallbackUrl,
  );
  const hasContact = Boolean(copy.phone || copy.whatsapp);
  const wa =
    normalizeWhatsApp(copy.whatsapp) ?? normalizeWhatsApp(copy.phone);
  const isNight = copy.tone === "night";

  return (
    <LandingShell
      templateId="brand-poster"
      storeName={props.storeName}
      className={cn(
        styles.root,
        brandPosterFontVariables,
        isNight && styles.night,
      )}
      style={
        {
          ["--bp-brand" as string]: brand,
        } as CSSProperties
      }
    >
      <div className={styles.frame}>
        <p className={styles.spine} aria-hidden>
          {copy.spineText}
        </p>
        <article className={styles.poster}>
          <span className={styles.watermark} aria-hidden>
            {copy.editionText}
          </span>
          <div className={styles.cropMarks}>
            <span className={styles.cropMarkTL} aria-hidden />
            <span className={styles.cropMarkTR} aria-hidden />
            <span className={styles.cropMarkBL} aria-hidden />
            <span className={styles.cropMarkBR} aria-hidden />
            <header className={styles.topRow} data-bp-reveal="up">
              <div className={styles.logoFrame}>
                {props.logoUrl ? (
                  <TenantLogo
                    brand={copy.storeName}
                    logoUrl={props.logoUrl}
                    primaryColor={brand}
                    size="md"
                    tone={isNight ? "dark" : "light"}
                  />
                ) : (
                  <span className={styles.logoFallback}>{copy.storeName}</span>
                )}
              </div>
              <div className={styles.meta}>
                <p className={styles.badge}>{copy.badgeLabel}</p>
                {copy.hours ? (
                  <p className={styles.hours}>{copy.hours}</p>
                ) : null}
              </div>
            </header>

            {copy.tagline ? (
              <p className={styles.tagline} data-bp-reveal="up" data-bp-reveal-delay="1">
                {copy.tagline}
              </p>
            ) : null}

            <h1 className={styles.headline} data-bp-reveal="up" data-bp-reveal-delay="1">
              {copy.headline}
            </h1>
            <span className={styles.rule} aria-hidden />
            <p
              className={styles.subheadline}
              data-bp-reveal="up"
              data-bp-reveal-delay="2"
            >
              {copy.subheadline}
            </p>

            {copy.heroImageUrl || copy.secondaryImageUrl ? (
              <div
                className={styles.visualStack}
                data-bp-reveal="scale"
                data-bp-reveal-delay="2"
              >
                {copy.heroImageUrl ? (
                  <div className={styles.imageBand}>
                    <Image
                      src={copy.heroImageUrl}
                      alt=""
                      fill
                      priority
                      unoptimized
                      sizes="(max-width: 680px) 100vw, 680px"
                    />
                  </div>
                ) : null}
                {copy.secondaryImageUrl ? (
                  <div className={styles.detailPhoto}>
                    <Image
                      src={copy.secondaryImageUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="220px"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {copy.address ? (
              <dl className={styles.facts} data-bp-reveal="up">
                <div>
                  <dt className={styles.factLabel}>Find us</dt>
                  <dd className={styles.factValue}>{copy.address}</dd>
                </div>
              </dl>
            ) : null}

            {hasContact ? (
              <div className={styles.contactBar} data-bp-reveal="up">
                <p className={styles.contactLead}>{copy.contactLead}</p>
                <div className={styles.contactActions}>
                  {wa ? (
                    <a href={`https://wa.me/${wa}`}>{copy.ctaLabel}</a>
                  ) : null}
                  {copy.phone ? (
                    <a href={`tel:${copy.phone}`}>Call {copy.phone}</a>
                  ) : null}
                </div>
              </div>
            ) : null}

            <footer className={styles.footer} data-bp-reveal="up">
              <div className={styles.footerLinks}>
                <LandingAccountAction className="text-sm font-medium" />
                <Link href={LANDING_STAFF_LOGIN_HREF}>Staff</Link>
              </div>
              <p className={styles.footerNote}>{copy.storeName}</p>
            </footer>
          </div>
        </article>
      </div>
    </LandingShell>
  );
}
