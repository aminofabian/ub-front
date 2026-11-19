"use client";

import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";

import { LandingAccountAction } from "@/components/storefront/templates/landing/shared";
import styles from "@/components/storefront/shop-storefront-coming-soon.module.css";
import { useComingSoonStaff } from "@/hooks/use-coming-soon-staff";
import {
  openStorefrontFromLanding,
  saveComingSoonPhoto,
} from "@/lib/coming-soon-landing-edit";
import type { ComingSoonEditorialContent } from "@/lib/coming-soon-editorial";
import { buildComingSoonTheme } from "@/lib/coming-soon-theme";
import {
  COMING_SOON_PHOTO_FIELDS,
  comingSoonPhotoKey,
  type ComingSoonPhotoSlot,
} from "@/lib/coming-soon-photos";
import {
  STOREFRONT_PREVIEW_DESIGN_PARAM,
  STOREFRONT_PREVIEW_LANDING_PARAM,
  STOREFRONT_PREVIEW_THEME_PARAM,
} from "@/lib/storefront-preview";
import type { LandingContent } from "@/lib/storefront-templates";
import { cn } from "@/lib/utils";

const SHELF_ID = "shelf";
const SERVICES_ID = "services";
const STORY_ID = "story";
const VISIT_ID = "visit";

const PHOTO_NOUN: Record<ComingSoonPhotoSlot, string> = {
  cover: "cover photo",
  story: "story photo",
  shop: "shop photo",
};

export type ShopStorefrontComingSoonProps = {
  storeName: string;
  logoUrl?: string | null;
  primaryHex?: string | null;
  accentHex?: string | null;
  content: ComingSoonEditorialContent;
  landingContent?: LandingContent | null;
};

export function ShopStorefrontComingSoon(props: ShopStorefrontComingSoonProps) {
  const staff = useComingSoonStaff();
  const theme = buildComingSoonTheme(props.primaryHex, props.accentHex);
  const [photos, setPhotos] = useState(props.content.photos);
  const [landing, setLanding] = useState<LandingContent | null>(
    props.landingContent ?? null,
  );

  const onPhoto = (slot: ComingSoonPhotoSlot, next: LandingContent) => {
    const url = next[COMING_SOON_PHOTO_FIELDS[slot]]?.trim() || null;
    setLanding(next);
    setPhotos((current) => ({ ...current, [comingSoonPhotoKey(slot)]: url }));
  };

  const manager = staff === "manager";
  const showStory = Boolean(
    photos.story || props.content.storyTitle || props.content.storyBody || props.content.storyQuote,
  );
  const showVisit = Boolean(
    photos.visit ||
      props.content.address ||
      props.content.hours ||
      props.content.visitTitle,
  );

  return (
    <div id="top" className={styles.page} style={theme.cssVars}>
      <header className={styles.header}>
        <div className={styles.nav}>
          <Wordmark name={props.content.displayName} logoUrl={props.logoUrl} />
          <SectionLinks
            shelf={props.content.shelf.length > 0}
            services={props.content.services.length > 0}
            story={showStory}
            visit={showVisit}
          />
          <LandingAccountAction className={styles.account} />
        </div>
        {manager ? (
          <ManagerBar
            photos={photos}
            landing={landing}
            onPhoto={onPhoto}
          />
        ) : null}
      </header>
      <Hero
        content={props.content}
        photos={photos}
        manager={manager}
        landing={landing}
        onPhoto={onPhoto}
      />
      {props.content.shelf.length > 0 ? <Shelf content={props.content} /> : null}
      {props.content.services.length > 0 ? (
        <ServiceList services={props.content.services} />
      ) : null}
      {showStory ? (
        <Story
          content={props.content}
          photo={photos.story}
          manager={manager}
          landing={landing}
          onPhoto={onPhoto}
        />
      ) : null}
      {showVisit ? (
        <Visit
          content={props.content}
          photo={photos.visit}
          manager={manager}
          landing={landing}
          onPhoto={onPhoto}
        />
      ) : null}
      <p className={styles.foot}>
        {props.content.displayName}
        {props.content.footerPlace ? ` · ${props.content.footerPlace}` : ""}
      </p>
    </div>
  );
}

function Wordmark({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  if (logoUrl?.trim()) {
    return (
      <a className={styles.wordmark} href="#top" aria-label={name}>
        <Image
          src={logoUrl}
          alt=""
          width={140}
          height={40}
          className={styles.logo}
          unoptimized
        />
      </a>
    );
  }
  return (
    <a className={styles.wordmark} href="#top">
      {name}
    </a>
  );
}

function SectionLinks(props: {
  shelf: boolean;
  services: boolean;
  story: boolean;
  visit: boolean;
}) {
  const links = [
    props.shelf ? { href: `#${SHELF_ID}`, label: "Shop" } : null,
    props.services ? { href: `#${SERVICES_ID}`, label: "Services" } : null,
    props.story ? { href: `#${STORY_ID}`, label: "Story" } : null,
    props.visit ? { href: `#${VISIT_ID}`, label: "Visit" } : null,
  ].filter((link) => link !== null);
  if (links.length === 0) return null;
  return (
    <nav className={styles.navLinks} aria-label="On this page">
      {links.map((link) => (
        <a key={link.href} href={link.href}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}

function ManagerBar({
  photos,
  landing,
  onPhoto,
}: {
  photos: ComingSoonEditorialContent["photos"];
  landing: LandingContent | null;
  onPhoto: (slot: ComingSoonPhotoSlot, next: LandingContent) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const open = () => {
    setBusy(true);
    setMessage(null);
    void openStorefrontFromLanding()
      .then(showLiveShop)
      .catch((reason: unknown) => {
        setMessage(reason instanceof Error ? reason.message : "Could not open the storefront.");
        setBusy(false);
      });
  };

  return (
    <div className={styles.manager} role="region" aria-label="Shop controls">
      <p className={styles.managerNote}>
        Customers see this page.
        {message ? <span className={styles.managerError}>{message}</span> : null}
      </p>
      <div className={styles.managerActions}>
        <MissingPhoto slot="cover" url={photos.hero} landing={landing} onPhoto={onPhoto} />
        <MissingPhoto slot="story" url={photos.story} landing={landing} onPhoto={onPhoto} />
        <MissingPhoto slot="shop" url={photos.visit} landing={landing} onPhoto={onPhoto} />
        <button type="button" className={styles.managerOpen} disabled={busy} onClick={open}>
          {busy ? "Opening" : "Open the storefront"}
        </button>
      </div>
    </div>
  );
}

function MissingPhoto(props: {
  slot: ComingSoonPhotoSlot;
  url: string | null;
  landing: LandingContent | null;
  onPhoto: (slot: ComingSoonPhotoSlot, next: LandingContent) => void;
}) {
  if (props.url) return null;
  return <PhotoActions {...props} compact={false} />;
}

function showLiveShop() {
  const url = new URL(window.location.href);
  url.searchParams.delete(STOREFRONT_PREVIEW_THEME_PARAM);
  url.searchParams.delete(STOREFRONT_PREVIEW_LANDING_PARAM);
  url.searchParams.delete(STOREFRONT_PREVIEW_DESIGN_PARAM);
  url.searchParams.delete("setup");
  window.location.assign(`${url.pathname}${url.search}`);
}

function PhotoActions({
  slot,
  url,
  landing,
  compact,
  onPhoto,
}: {
  slot: ComingSoonPhotoSlot;
  url: string | null;
  landing: LandingContent | null;
  compact: boolean;
  onPhoto: (slot: ComingSoonPhotoSlot, next: LandingContent) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noun = PHOTO_NOUN[slot];
  const replaceLabel = url ? (compact ? "Replace" : `Replace ${noun}`) : `Add ${noun}`;

  const save = (file: File | null) => {
    setBusy(true);
    setError(null);
    void saveComingSoonPhoto(slot, file, landing)
      .then((next) => onPhoto(slot, next))
      .catch((reason: unknown) => {
        const fallback = "Could not update the photo.";
        setError(reason instanceof Error && reason.message ? reason.message : fallback);
      })
      .finally(() => setBusy(false));
  };

  return (
    <span className={compact ? styles.photoTools : styles.photoActions}>
      <input
        ref={inputRef}
        className={styles.fileInput}
        type="file"
        accept="image/*"
        aria-label={replaceLabel}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) save(file);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        className={styles.photoBtn}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Uploading" : replaceLabel}
      </button>
      {url ? (
        <button
          type="button"
          className={styles.photoBtn}
          disabled={busy}
          aria-label={`Remove ${noun}`}
          onClick={() => save(null)}
        >
          Remove
        </button>
      ) : null}
      {error ? <span className={styles.photoError}>{error}</span> : null}
    </span>
  );
}

function Hero({
  content,
  photos,
  manager,
  landing,
  onPhoto,
}: {
  content: ComingSoonEditorialContent;
  photos: ComingSoonEditorialContent["photos"];
  manager: boolean;
  landing: LandingContent | null;
  onPhoto: (slot: ComingSoonPhotoSlot, next: LandingContent) => void;
}) {
  const action = content.ctaLabel || content.contactLabel;
  const shopNamed = content.headline.mode === "shop";
  const title = shopNamed ? content.displayName : content.headline.lines.join(" ");
  return (
    <section aria-label={content.displayName}>
      {photos.hero ? (
        <PhotoFrame src={photos.hero} alt={content.displayName} className={styles.heroMedia} sizes="100vw">
          {manager ? (
            <PhotoActions slot="cover" url={photos.hero} landing={landing} compact onPhoto={onPhoto} />
          ) : null}
        </PhotoFrame>
      ) : null}
      <div className={cn(styles.heroSheet, photos.hero && styles.heroSheetOverlap)}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lede}>{content.description}</p>
        {content.chips.length > 0 ? (
          <ul className={styles.facts}>
            {content.chips.map((chip) => (
              <li key={chip.kind}>{chip.label}</li>
            ))}
          </ul>
        ) : null}
        {content.contactHref && action ? (
          <ShopContact href={content.contactHref} label={action} />
        ) : null}
      </div>
    </section>
  );
}

function Shelf({ content }: { content: ComingSoonEditorialContent }) {
  const count = content.chips.find((chip) => chip.kind === "products")?.label;
  return (
    <section id={SHELF_ID} className={styles.block} aria-labelledby="shelf-heading">
      <div className={styles.blockHead}>
        <h2 id="shelf-heading">In the shop</h2>
        {count ? <p className={styles.count}>{count}</p> : null}
      </div>
      <ul className={styles.film}>
        {content.shelf.map((item) => (
          <li key={item.id} className={cn(styles.filmItem, item.imageUrl && styles.filmItemPhoto)}>
            {item.imageUrl ? (
              <div className={styles.filmPhoto}>
                <Image
                  src={item.imageUrl}
                  alt={item.imageAlt}
                  fill
                  sizes="72px"
                  className={styles.cover}
                  unoptimized
                />
              </div>
            ) : null}
            <p className={styles.filmName}>{item.name}</p>
            {item.price ? <span className={styles.leader} aria-hidden /> : null}
            {item.price ? <p className={styles.filmPrice}>{item.price}</p> : null}
          </li>
        ))}
      </ul>
      {content.collectionNames.length > 0 ? (
        <ul className={styles.collections}>
          {content.collectionNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ServiceList({ services }: { services: ComingSoonEditorialContent["services"] }) {
  return (
    <section id={SERVICES_ID} className={styles.block} aria-labelledby="services-heading">
      <div className={styles.blockHead}>
        <h2 id="services-heading">Services</h2>
      </div>
      <ul className={styles.services}>
        {services.map((service) => (
          <li key={service.id} className={styles.service}>
            {service.imageUrl ? (
              <div className={styles.serviceThumb}>
                <Image
                  src={service.imageUrl}
                  alt=""
                  fill
                  sizes="56px"
                  className={styles.cover}
                  unoptimized
                />
              </div>
            ) : null}
            <div className={styles.serviceBody}>
              <div className={styles.serviceLine}>
                <span className={styles.serviceName}>{service.name}</span>
                {service.duration ? (
                  <span className={styles.serviceMeta}>{service.duration}</span>
                ) : null}
                <span className={styles.leader} aria-hidden />
                {service.price ? (
                  <span className={styles.servicePrice}>{service.price}</span>
                ) : null}
              </div>
              {service.description ? (
                <p className={styles.serviceDesc}>{service.description}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Story({
  content,
  photo,
  manager,
  landing,
  onPhoto,
}: {
  content: ComingSoonEditorialContent;
  photo: string | null;
  manager: boolean;
  landing: LandingContent | null;
  onPhoto: (slot: ComingSoonPhotoSlot, next: LandingContent) => void;
}) {
  const hasCopy = Boolean(content.storyTitle || content.storyBody || content.storyQuote);
  return (
    <section
      id={STORY_ID}
      className={cn(styles.story, photo && hasCopy && styles.storySplit)}
      aria-labelledby={content.storyTitle ? "story-heading" : undefined}
    >
      {photo ? (
        <PhotoFrame
          src={photo}
          alt={content.storyTitle || content.displayName}
          className={styles.storyMedia}
          sizes="(min-width: 960px) 50vw, 100vw"
        >
          {manager ? (
            <PhotoActions slot="story" url={photo} landing={landing} compact onPhoto={onPhoto} />
          ) : null}
        </PhotoFrame>
      ) : null}
      {hasCopy ? (
        <div className={styles.storyCopy}>
          {content.storyTitle ? <h2 id="story-heading">{content.storyTitle}</h2> : null}
          {content.storyQuote ? <blockquote className={styles.quote}>{content.storyQuote}</blockquote> : null}
          {content.storyBody ? <p>{content.storyBody}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function Visit({
  content,
  photo,
  manager,
  landing,
  onPhoto,
}: {
  content: ComingSoonEditorialContent;
  photo: string | null;
  manager: boolean;
  landing: LandingContent | null;
  onPhoto: (slot: ComingSoonPhotoSlot, next: LandingContent) => void;
}) {
  const heading = content.visitTitle || content.address || content.hours || content.displayName;
  const action = content.ctaLabel || content.contactLabel;
  return (
    <section
      id={VISIT_ID}
      className={cn(styles.visit, photo && styles.visitSplit)}
      aria-labelledby="visit-heading"
    >
      <div className={styles.visitCopy}>
        <h2 id="visit-heading">{heading}</h2>
        {content.address && content.address !== heading ? <p>{content.address}</p> : null}
        {content.hours && content.hours !== heading ? <p>{content.hours}</p> : null}
        {content.contactHref && action ? (
          <ShopContact href={content.contactHref} label={action} />
        ) : null}
      </div>
      {photo ? (
        <PhotoFrame
          src={photo}
          alt={content.address || content.displayName}
          className={styles.visitMedia}
          sizes="(min-width: 960px) 50vw, 100vw"
        >
          {manager ? (
            <PhotoActions slot="shop" url={photo} landing={landing} compact onPhoto={onPhoto} />
          ) : null}
        </PhotoFrame>
      ) : null}
    </section>
  );
}

function PhotoFrame({
  src,
  alt,
  className,
  sizes,
  children,
}: {
  src: string;
  alt: string;
  className: string;
  sizes: string;
  children?: ReactNode;
}) {
  return (
    <div className={className}>
      <Image src={src} alt={alt} fill sizes={sizes} className={styles.cover} unoptimized />
      {children}
    </div>
  );
}

function ShopContact({ href, label }: { href: string; label: string }) {
  const external = href.startsWith("http");
  return (
    <a
      className={styles.contact}
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {label}
    </a>
  );
}
