"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import type { CSSProperties } from "react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { neighborhoodBoardFontVariables } from "@/components/storefront/templates/landing/neighborhood-board-fonts";
import styles from "@/components/storefront/templates/landing/neighborhood-board.module.css";
import {
  LandingAccountAction,
  LandingShell,
  LANDING_STAFF_LOGIN_HREF,
  resolveLandingCopy,
} from "@/components/storefront/templates/landing/shared";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";
import { normalizeWhatsApp } from "@/lib/whatsapp-order";
import { cn } from "@/lib/utils";

function useNeighborhoodBoardScrollEffects() {
  useEffect(() => {
    const root = document.querySelector(
      '[data-landing-template-id="neighborhood-board"]',
    );
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = root.querySelectorAll("[data-nb-reveal]");

    if (reduced) {
      targets.forEach((el) => el.setAttribute("data-nb-visible", ""));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-nb-visible", "");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export function NeighborhoodBoardLanding(props: LandingTemplateProps) {
  useNeighborhoodBoardScrollEffects();

  const brand = props.primaryHex || props.accentHex || "#B45309";
  const copy = resolveLandingCopy(props.storeName, props.landingContent, {
    headline: `Welcome to ${props.storeName}`,
    subheadline:
      "Your neighborhood shop — open for walk-ins and WhatsApp orders.",
    ctaLabel: "Message us on WhatsApp",
    hours: "Mon–Sat 7:00–21:00 · Sun 8:00–18:00",
    address: "Ask us for directions when you visit",
  });
  const heroSrc =
    props.landingContent?.vitrineImageUrl?.trim() ||
    props.heroFallbackUrl?.trim() ||
    null;
  const wa =
    normalizeWhatsApp(copy.whatsapp) ?? normalizeWhatsApp(copy.phone);
  const hasContact = Boolean(wa || copy.phone);
  const posted = new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <LandingShell
      templateId="neighborhood-board"
      storeName={props.storeName}
      className={cn(styles.root, neighborhoodBoardFontVariables)}
      style={{ ["--nb-brand" as string]: brand } as CSSProperties}
    >
      <div className={styles.frame}>
        <div className={styles.board}>
          <header className={styles.topBar}>
            <div className={styles.logoPin}>
              <div className={styles.logoWrap}>
                {props.logoUrl ? (
                  <TenantLogo
                    brand={copy.storeName}
                    logoUrl={props.logoUrl}
                    primaryColor={brand}
                    size="sm"
                    tone="light"
                  />
                ) : (
                  <span className={styles.logoFallback}>{copy.storeName}</span>
                )}
              </div>
              <p className={styles.storeLabel}>{copy.storeName}</p>
            </div>
            <p className={styles.posted}>Posted · {posted}</p>
          </header>

          <div className={styles.grid}>
            <div className={styles.mainCol}>
              <article
                className={cn(styles.note, styles.noteHero)}
                data-nb-reveal="tilt"
              >
                <span className={styles.pin} aria-hidden />
                <p className={styles.eyebrow}>Neighborhood board</p>
                <h1 className={styles.headline}>{copy.headline}</h1>
                <p className={styles.subheadline}>{copy.subheadline}</p>
                {heroSrc ? (
                  <figure className={styles.photo}>
                    <Image
                      src={heroSrc}
                      alt=""
                      fill
                      priority
                      unoptimized
                      sizes="(max-width: 560px) 100vw, 420px"
                    />
                    <figcaption className={styles.photoCaption}>
                      On the block · {copy.storeName}
                    </figcaption>
                  </figure>
                ) : null}
              </article>
            </div>

            <div className={styles.sideCol}>
              {copy.hours ? (
                <section
                  className={cn(styles.note, styles.noteHours)}
                  data-nb-reveal="tilt"
                  data-nb-reveal-delay="1"
                >
                  <span className={styles.pin} aria-hidden />
                  <p className={styles.noteLabel}>Hours</p>
                  <p className={styles.noteBody}>{copy.hours}</p>
                </section>
              ) : null}

              {copy.address ? (
                <section
                  className={cn(styles.note, styles.noteHours)}
                  data-nb-reveal="tilt"
                  data-nb-reveal-delay="2"
                >
                  <span className={styles.pin} aria-hidden />
                  <p className={styles.noteLabel}>Find us</p>
                  <p className={styles.noteBody}>{copy.address}</p>
                </section>
              ) : null}

              {hasContact ? (
                <section
                  className={cn(styles.note, styles.noteContact)}
                  data-nb-reveal="tilt"
                  data-nb-reveal-delay="3"
                >
                  <span className={styles.pin} aria-hidden />
                  <p className={styles.noteLabel}>Reach out</p>
                  <p className={styles.contactLead}>
                    Walk-ins welcome. WhatsApp and phone orders too.
                  </p>
                  <div className={styles.contactActions}>
                    {wa ? (
                      <a href={`https://wa.me/${wa}`}>{copy.ctaLabel}</a>
                    ) : null}
                    {copy.phone ? (
                      <a href={`tel:${copy.phone}`}>Call {copy.phone}</a>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>
          </div>

          <footer className={styles.footer} data-nb-reveal="up">
            <div className={styles.footerLinks}>
              <LandingAccountAction className="text-sm font-medium" />
              <Link href={LANDING_STAFF_LOGIN_HREF}>Staff</Link>
            </div>
            <p className={styles.tearHint}>Pull a tab · save our number</p>
          </footer>
        </div>
      </div>
    </LandingShell>
  );
}
