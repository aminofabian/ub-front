"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { MapPin } from "lucide-react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { minimartHoursFontVariables } from "@/components/storefront/templates/landing/minimart-hours-fonts";
import styles from "@/components/storefront/templates/landing/minimart-hours.module.css";
import {
  LandingAccountAction,
  LandingShell,
  LANDING_STAFF_LOGIN_HREF,
  resolveLandingCopy,
} from "@/components/storefront/templates/landing/shared";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";
import { normalizeWhatsApp } from "@/lib/whatsapp-order";
import { cn } from "@/lib/utils";

export function MinimartHoursLanding(props: LandingTemplateProps) {
  const brand = props.primaryHex || props.accentHex || "#0369A1";
  const copy = resolveLandingCopy(props.storeName, props.landingContent, {
    headline: props.storeName,
    subheadline: "Everyday essentials around the corner.",
    ctaLabel: "Get directions",
    hours: "Open 6:00 – 22:00, every day",
    address: "Drop a pin — ask us for the exact street",
  });
  const wa =
    normalizeWhatsApp(copy.whatsapp) ?? normalizeWhatsApp(copy.phone);

  return (
    <LandingShell
      templateId="minimart-hours"
      storeName={props.storeName}
      className={cn(styles.root, minimartHoursFontVariables)}
      style={
        {
          ["--mm-brand" as string]: brand,
          ["--mm-glow" as string]: props.accentHex || "#38bdf8",
        } as CSSProperties
      }
    >
      <div className={styles.frame}>
        <div className={styles.window}>
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
            <p className={styles.openSign}>Open</p>
          </header>

          <h1 className={styles.headline}>{copy.headline}</h1>
          <p className={styles.subheadline}>{copy.subheadline}</p>

          <div className={styles.hoursPanel}>
            <p className={styles.hoursLabel}>Store hours</p>
            <p className={styles.hoursValue}>{copy.hours}</p>
          </div>

          {copy.address ? (
            <p className={styles.address}>
              <MapPin className={styles.addressIcon} size={16} aria-hidden />
              <span>{copy.address}</span>
            </p>
          ) : null}

          {wa || copy.phone ? (
            <div className={styles.contactWrap}>
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

          <footer className={styles.footer}>
            <LandingAccountAction className="text-sm font-medium" />
            {" · "}
            <Link href={LANDING_STAFF_LOGIN_HREF}>Staff</Link>
          </footer>
        </div>
      </div>
    </LandingShell>
  );
}
