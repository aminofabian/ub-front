"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";

import styles from "@/components/storefront/templates/store/chem-lab.module.css";
import { StorefrontInlineText } from "@/components/storefront/storefront-inline-text";
import { StorefrontNativeHeroHeadline } from "@/components/storefront/storefront-native-hero-copy";
import { StorefrontProductImageShell } from "@/components/storefront/storefront-product-image-shell";
import { useStorefrontDisplayImage } from "@/components/storefront/storefront-staff-edit";
import { useChemLabCopy } from "@/components/storefront/templates/store/chem-lab-mode";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import {
  formatDisplayPrice,
  type PublicCatalogItemCard,
} from "@/lib/public-storefront";
import { shopItemPathFromCard } from "@/lib/shop-item-url";
import { cn } from "@/lib/utils";

function priceLabel(item: PublicCatalogItemCard, currency: string): string {
  const price =
    item.price != null ? formatDisplayPrice(currency, item.price) : "—";
  const unit = item.unitType?.trim();
  return unit ? `${price} / ${unit}` : price;
}

function skuHint(item: PublicCatalogItemCard): string {
  if (item.sku?.trim()) return item.sku.trim().slice(0, 12).toUpperCase();
  return `RX-${item.id.slice(0, 6).toUpperCase()}`;
}

/** Deterministic fill % + bay label from item id (visual only). */
function reagentSignal(id: string): { fill: number; bay: string } {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return {
    fill: 38 + (h % 42),
    bay: `${String.fromCharCode(65 + (h % 6))}${(h % 9) + 1}`,
  };
}

function PipetteIcon() {
  return (
    <svg
      className={styles.addIcon}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M10 2.5h4M12 2.5v5.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M9.2 7.7h5.6v3.1H9.2z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 10.8v6.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10.2 17.2h3.6L12 21.2z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChemLabBondMark() {
  return (
    <svg
      className={styles.bondMark}
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="32" r="4.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="28" cy="16" r="4.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="44" cy="34" r="4.2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M15.6 29.2 24.6 18.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M31.6 18.6 40.6 30.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M31.2 14.4 40.4 31.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChemLabAssaySeal({ label }: { label?: string }) {
  const text = label?.trim() ?? "";
  if (!text) return null;
  const lines = text.split(/\s+/);
  const top = lines[0] ?? text;
  const bottom = lines.slice(1).join(" ");
  return (
    <span className={styles.assaySeal} aria-hidden>
      <span className={styles.assaySealRing} />
      <span className={styles.assaySealText}>
        {top}
        {bottom ? (
          <>
            <br />
            {bottom}
          </>
        ) : null}
      </span>
    </span>
  );
}

function ChassisScrews() {
  return (
    <span className={styles.chassisScrews} aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export function ChemLabAddButton({
  item,
  size = "default",
}: {
  item: PublicCatalogItemCard;
  size?: "default" | "small";
}) {
  const cart = useShopCart();
  const copy = useChemLabCopy();
  const [busy, setBusy] = useState(false);
  const label = copy?.dispense || "Add";
  const busyLabel = copy?.busy || "Adding…";
  const editing = Boolean(copy?.editMode);
  const showPipette = size === "default" && copy?.voice === "lab";

  const onAdd = async () => {
    if (busy || item.price == null) return;
    setBusy(true);
    try {
      const existing =
        cart.cart?.lines.find((l) => l.itemId === item.id)?.quantity ?? 0;
      await cart.setLineQty(item.id, existing + 1);
      cart.notifyAdded(item.id);
      cart.openDrawer();
    } catch {
      /* cart UI surfaces failures */
    } finally {
      setBusy(false);
    }
  };

  if (item.price == null) return null;

  const className = size === "small" ? styles.addBtnSmall : styles.addBtn;

  if (editing) {
    return (
      <span className={className}>
        {showPipette ? <PipetteIcon /> : null}
        <StorefrontInlineText
          as="span"
          value={label}
          placeholder="Add"
          onCommit={(next) => copy?.commitDispense(next)}
        />
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={() => void onAdd()}
    >
      {showPipette ? <PipetteIcon /> : null}
      {busy ? busyLabel : label}
    </button>
  );
}

function BottleVisual({
  item,
  href,
  sizes,
  priority,
  variant = "default",
}: {
  item: PublicCatalogItemCard;
  href: string;
  sizes: string;
  priority?: boolean;
  variant?: "default" | "vial";
}) {
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);
  const { fill } = reagentSignal(item.id);
  const fillStyle = { "--cl-fill": `${fill}%` } as CSSProperties;

  return (
    <StorefrontProductImageShell
      href={href}
      className={cn(
        styles.bottleVisual,
        variant === "vial" && styles.bottleVial,
        "relative",
      )}
      itemId={item.id}
      itemName={item.name}
      ariaLabel={item.name}
    >
      <span className={styles.bottleCap} aria-hidden />
      <span className={styles.glassSheen} aria-hidden />
      <span className={styles.reticle} aria-hidden />
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={item.name}
          fill
          sizes={sizes}
          unoptimized
          priority={priority}
          className={styles.bottlePhoto}
          style={{ objectFit: "cover" }}
        />
      ) : (
        <>
          <span className={styles.bottleFill} style={fillStyle} aria-hidden />
          <span className={styles.meniscus} style={fillStyle} aria-hidden />
          <span className={styles.bottleLabel} aria-hidden />
          <span className={styles.visualPlaceholder} aria-hidden />
        </>
      )}
    </StorefrontProductImageShell>
  );
}

function LotChip({ item }: { item: PublicCatalogItemCard }) {
  const { bay } = reagentSignal(item.id);
  return (
    <span className={styles.lotChip}>
      <span className={styles.compoundCode}>{skuHint(item)}</span>
      <span className={styles.lotChipBay}>{bay}</span>
    </span>
  );
}

export function ChemLabVial({
  item,
  currency,
  slot,
}: {
  item: PublicCatalogItemCard;
  currency: string;
  slot?: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const meta = item.variantName?.trim() || "";

  return (
    <article className={styles.vial}>
      <span className={styles.vialSlot} aria-hidden>
        {slot ?? "V"}
      </span>
      <BottleVisual item={item} href={href} sizes="160px" variant="vial" />
      <div className={styles.vialBody}>
        <LotChip item={item} />
        <Link href={href} className={styles.vialName}>
          {item.name}
        </Link>
        {meta ? <p className={styles.itemMeta}>{meta}</p> : null}
        <div className={styles.vialFoot}>
          <span className={styles.priceTag}>{priceLabel(item, currency)}</span>
          <ChemLabAddButton item={item} size="small" />
        </div>
      </div>
    </article>
  );
}

export function ChemLabCard({
  item,
  currency,
}: {
  item: PublicCatalogItemCard;
  currency: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const meta = item.variantName?.trim() || "";

  return (
    <article className={styles.card}>
      <BottleVisual item={item} href={href} sizes="(min-width: 900px) 30vw, 50vw" />
      <div className={styles.cardBody}>
        <LotChip item={item} />
        <Link href={href} className={styles.cardName}>
          {item.name}
        </Link>
        {meta ? <p className={styles.itemMeta}>{meta}</p> : null}
        <div className={styles.cardFoot}>
          <span className={styles.priceTag}>{priceLabel(item, currency)}</span>
          <ChemLabAddButton item={item} size="small" />
        </div>
      </div>
    </article>
  );
}

export function ChemLabHero({
  item,
  currency,
  headline,
}: {
  item: PublicCatalogItemCard;
  currency: string;
  headline: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const meta = item.variantName?.trim() || "";
  const { bay } = reagentSignal(item.id);
  const copy = useChemLabCopy();

  return (
    <article className={styles.flask}>
      <ChemLabBondMark />
      <div className={styles.flaskInner}>
        <ChassisScrews />
        <div className={styles.flaskHead}>
          <StorefrontNativeHeroHeadline
            value={headline}
            className={styles.flaskHeadline}
          />
        </div>
        <BottleVisual
          item={item}
          href={href}
          sizes="(min-width: 900px) 55vw, 100vw"
          priority
        />
        <div className={styles.coa}>
          <ChemLabAssaySeal label={copy?.assay} />
          <div className={styles.coaHead}>
            <span>{copy?.coaTitle || "Details"}</span>
            <span className={styles.coaDocId}>{skuHint(item)}</span>
          </div>
          <div className={styles.coaRow}>
            <span className={styles.coaKey}>{copy?.statusKey || "Status"}</span>
            <span className={styles.coaValPlain}>
              <span className={styles.statusLed} aria-hidden />
              {copy?.statusOn || "In stock"}
            </span>
          </div>
          <div className={styles.coaRow}>
            <span className={styles.coaKey}>{copy?.compoundKey || "Product"}</span>
            <Link href={href} className={styles.coaVal}>
              {item.name}
            </Link>
          </div>
          <div className={styles.coaRow}>
            <span className={styles.coaKey}>{copy?.bayKey || "Shelf"}</span>
            <span className={styles.coaValPlain}>{bay}</span>
          </div>
          {meta ? (
            <div className={styles.coaRow}>
              <span className={styles.coaKey}>{copy?.gradeKey || "Variant"}</span>
              <span className={styles.coaValPlain}>{meta}</span>
            </div>
          ) : null}
          <div className={styles.coaActions}>
            <span className={styles.priceTagLarge}>{priceLabel(item, currency)}</span>
            <ChemLabAddButton item={item} />
          </div>
        </div>
      </div>
    </article>
  );
}
