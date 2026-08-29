"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import type { CSSProperties } from "react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { butcheryCutFontVariables } from "@/components/storefront/templates/landing/butchery-cut-fonts";
import styles from "@/components/storefront/templates/landing/butchery-cut.module.css";
import {
  LandingAccountAction,
  LandingShell,
  LANDING_STAFF_LOGIN_HREF,
  resolveLandingCopy,
} from "@/components/storefront/templates/landing/shared";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";
import { normalizeWhatsApp } from "@/lib/whatsapp-order";
import { cn } from "@/lib/utils";

const DEFAULT_CUTS: { name: string; note: string }[] = [
  { name: "Beef stew", note: "Boneless cubes" },
  { name: "Goat chops", note: "Cut to thickness" },
  { name: "Chicken", note: "Whole or pieces" },
  { name: "Mince", note: "Fresh daily" },
  { name: "Offal", note: "Ask at counter" },
  { name: "Sausages", note: "When available" },
];

function useButcheryReveal() {
  useEffect(() => {
    const root = document.querySelector('[data-landing-template-id="butchery-cut"]');
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = root.querySelectorAll("[data-bc-reveal]");
    if (reduced) {
      targets.forEach((el) => el.setAttribute("data-bc-visible", ""));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-bc-visible", "");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export function ButcheryCutLanding(props: LandingTemplateProps) {
  useButcheryReveal();

  const brand = props.accentHex || props.primaryHex || "#EA580C";
  const copy = resolveLandingCopy(props.storeName, props.landingContent, {
    headline: `${props.storeName} cuts`,
    subheadline:
      "Order by phone — we cut to your preference and hold for pickup.",
    ctaLabel: "Call to order",
    hours: "Tue–Sun 6:00–18:00",
    address: "Counter service · no appointment needed",
  });
  const heroSrc =
    props.landingContent?.vitrineImageUrl?.trim() ||
    props.heroFallbackUrl?.trim() ||
    null;
  const wa =
    normalizeWhatsApp(copy.whatsapp) ?? normalizeWhatsApp(copy.phone);
  const categoryCuts =
    props.categories
      ?.slice(0, 6)
      .map((c) => ({ name: c.name.trim(), note: "Cut to order" }))
      .filter((c) => c.name.length > 0) ?? [];
  const cuts = categoryCuts.length > 0 ? categoryCuts : DEFAULT_CUTS;

  return (
    <LandingShell
      templateId="butchery-cut"
      storeName={props.storeName}
      className={cn(styles.root, butcheryCutFontVariables)}
      style={{ ["--bc-brand" as string]: brand } as CSSProperties}
    >
      <div className={styles.frame}>
        <header className={styles.topRow}>
          <div className={styles.logoWrap}>
            <div className={styles.logoMark}>
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
          </div>
          <p className={styles.stamp}>Cut to order</p>
        </header>

        <div className={styles.layout}>
          <div className={styles.intro}>
            <p className={styles.eyebrow} data-bc-reveal>
              Butchery board
            </p>
            <h1 className={styles.headline} data-bc-reveal data-bc-delay="1">
              {copy.headline}
            </h1>
            <p className={styles.subheadline} data-bc-reveal data-bc-delay="1">
              {copy.subheadline}
            </p>

            <div className={styles.board} data-bc-reveal data-bc-delay="2">
              <p className={styles.boardTitle}>Today&apos;s counter</p>
              <ul className={styles.cuts}>
                {cuts.map((cut) => (
                  <li key={cut.name} className={styles.cut}>
                    <span className={styles.cutName}>{cut.name}</span>
                    <span className={styles.cutNote}>{cut.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className={styles.visual} data-bc-reveal data-bc-delay="2">
            {heroSrc ? (
              <figure className={styles.photo}>
                <Image
                  src={heroSrc}
                  alt=""
                  fill
                  priority
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 420px"
                />
                <figcaption className={styles.photoCaption}>
                  Fresh at the block
                </figcaption>
              </figure>
            ) : null}
            {(copy.hours || copy.address) && (
              <div className={styles.paperStrip}>
                {copy.hours ? (
                  <p>
                    <strong>Hours</strong>
                    {copy.hours}
                  </p>
                ) : null}
                {copy.address ? (
                  <p style={{ marginTop: copy.hours ? 10 : 0 }}>
                    <strong>Find us</strong>
                    {copy.address}
                  </p>
                ) : null}
              </div>
            )}
          </aside>
        </div>

        <footer className={styles.footer}>
          {wa || copy.phone ? (
            <div className={styles.contactActions}>
              {wa ? (
                <a href={`https://wa.me/${wa}`}>{copy.ctaLabel}</a>
              ) : null}
              {copy.phone ? (
                <a href={`tel:${copy.phone}`}>Call {copy.phone}</a>
              ) : null}
            </div>
          ) : (
            <p className={styles.meta}>
              {copy.hours}
              {copy.address ? <> · {copy.address}</> : null}
            </p>
          )}
          <div className={styles.footerLinks}>
            <LandingAccountAction className="text-sm font-medium" />
            <Link href={LANDING_STAFF_LOGIN_HREF}>Staff</Link>
          </div>
        </footer>
      </div>
    </LandingShell>
  );
}
