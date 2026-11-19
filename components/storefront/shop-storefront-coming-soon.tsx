"use client";

import Image from "next/image";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Clock, MapPin, MessageCircle, Minus, Plus, Smartphone } from "lucide-react";

import { inter } from "@/app/fonts/inter";
import { ComingSoonOrderSlip } from "@/components/storefront/coming-soon-order-slip";
import { LandingAccountAction } from "@/components/storefront/templates/landing/shared";
import styles from "@/components/storefront/shop-storefront-coming-soon.module.css";
import { ComingSoonOrderProvider, useComingSoonOrder } from "@/hooks/use-coming-soon-order";
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

const SHELF_ID = "shop";
const HOW_ID = "how";
const SERVICES_ID = "services";
const STORY_ID = "story";
const VISIT_ID = "visit";

const TILE_TONES = [
  { bg: "#FBEFC8", fg: "#5E4300" },
  { bg: "#EADBCB", fg: "#4A2E17" },
  { bg: "#FFE0CC", fg: "#7A3208" },
  { bg: "#DDEBE3", fg: "#0B4F2B" },
  { bg: "#F9DDE6", fg: "#7A2147" },
  { bg: "#EFE9DC", fg: "#4F4631" },
] as const;

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
  currency?: string | null;
  paysWithMpesa?: boolean;
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
  const showHow = Boolean(props.content.contactHref?.startsWith("http"));
  const showVisit = Boolean(
    photos.visit ||
      props.content.address ||
      props.content.hours ||
      props.content.visitTitle ||
      props.content.footerPlace ||
      showHow,
  );

  const paysWithMpesa =
    props.paysWithMpesa ?? props.content.chips.some((chip) => chip.kind === "pay");

  return (
    <ComingSoonOrderProvider
      shopName={props.content.displayName}
      contactHref={props.content.contactHref}
      currency={props.currency}
      paysWithMpesa={paysWithMpesa}
    >
    <OrderFrame className={cn(styles.page, inter.variable)} style={theme.cssVars}>
      <header className={styles.header}>
        <div className={styles.nav}>
          <Wordmark name={props.content.displayName} logoUrl={props.logoUrl} />
          <div className={styles.navCluster}>
            <SectionLinks
              shelf={props.content.shelf.length > 0}
              how={showHow}
              services={props.content.services.length > 0}
              story={showStory}
              visit={showVisit}
            />
            <LandingAccountAction className={styles.account} />
            <ListNavButton />
            {showHow && props.content.contactHref ? (
              <ShopContact href={props.content.contactHref} label="WhatsApp us" kind="navCta" />
            ) : null}
          </div>
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
      {showHow ? <HowItWorks place={props.content.footerPlace} /> : null}
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
      <footer className={styles.foot}>
        <span className={styles.footName}>
          {props.content.displayName}
          {props.content.footerPlace ? ` · ${props.content.footerPlace}` : ""}
        </span>
        {paysWithMpesa ? <span>M-Pesa ready</span> : null}
      </footer>
    </OrderFrame>
    </ComingSoonOrderProvider>
  );
}

function OrderFrame({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const order = useComingSoonOrder();
  return (
    <div
      id="top"
      className={cn(className, order.lines.length > 0 && styles.pageWithList, order.open && styles.pageListOpen)}
      style={style}
    >
      {children}
      <p className={styles.live} aria-live="polite">
        {order.notice}
      </p>
      <ComingSoonOrderSlip />
    </div>
  );
}

function ListNavButton() {
  const order = useComingSoonOrder();
  if (order.lines.length === 0) return null;
  return (
    <button
      type="button"
      className={styles.listChip}
      aria-expanded={order.open}
      onClick={() => order.setOpen(!order.open)}
    >
      Your list
      <span className={styles.listCount}>{order.itemCount}</span>
    </button>
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
  how: boolean;
  services: boolean;
  story: boolean;
  visit: boolean;
}) {
  const links = [
    props.shelf ? { href: `#${SHELF_ID}`, label: "Shop" } : null,
    props.how ? { href: `#${HOW_ID}`, label: "How it works" } : null,
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
  const shopNamed = content.headline.mode === "shop";
  const title = shopNamed
    ? "Everyday essentials, ready when you are."
    : content.headline.lines.join(" ");
  const place = content.footerPlace;
  const facts = content.chips.filter((chip) => chip.kind !== "products");
  const whatsApp = content.contactHref?.startsWith("http") ? content.contactHref : null;
  const tiles = content.heroCells.slice(0, 4);
  return (
    <section className={styles.hero} aria-label={content.displayName}>
      <div className={styles.heroCopy}>
        {place ? (
          <p className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden />
            Opening in {place}
          </p>
        ) : null}
        <h1 className={styles.title}>{title}</h1>
        {content.description && content.description !== title ? (
          <p className={styles.lede}>{content.description}</p>
        ) : null}
        <div className={styles.actions}>
          {content.shelf.length > 0 ? (
            <a className={styles.primary} href={`#${SHELF_ID}`}>
              Browse the shop
            </a>
          ) : null}
          <HeroOrderAction href={whatsApp} />
        </div>
        {facts.length > 0 ? (
          <ul className={styles.facts}>
            {facts.map((chip) => (
              <li key={chip.kind}>
                <FactIcon kind={chip.kind} />
                {chip.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {photos.hero ? (
        <PhotoFrame src={photos.hero} alt={content.displayName} className={styles.heroMedia} sizes="(min-width: 800px) 40vw, 100vw">
          {manager ? (
            <PhotoActions slot="cover" url={photos.hero} landing={landing} compact onPhoto={onPhoto} />
          ) : null}
        </PhotoFrame>
      ) : tiles.length > 0 ? (
        <HeroTiles tiles={tiles} />
      ) : null}
    </section>
  );
}

function HeroTiles({ tiles }: { tiles: ComingSoonEditorialContent["heroCells"] }) {
  return (
    <div className={styles.tiles}>
      {tiles.map((tile, index) => {
        const tone = TILE_TONES[index % TILE_TONES.length];
        return (
          <article
            key={`${tile.name}-${index}`}
            className={cn(styles.tile, index === 1 && styles.tileDown, index === 2 && styles.tileUp)}
            style={{ background: tone.bg, color: tone.fg }}
          >
            <span className={styles.tileLabel}>{tile.name}</span>
            {tile.price ? <span className={styles.tilePrice}>{tile.price}</span> : null}
          </article>
        );
      })}
    </div>
  );
}

function HeroOrderAction({ href }: { href: string | null }) {
  const order = useComingSoonOrder();
  if (order.lines.length > 0) {
    return (
      <button type="button" className={styles.secondary} onClick={() => order.setOpen(true)}>
        Send the list
      </button>
    );
  }
  if (!href) return null;
  return <ShopContact href={href} label="Order on WhatsApp" kind="secondary" />;
}

function Shelf({ content }: { content: ComingSoonEditorialContent }) {
  const order = useComingSoonOrder();
  const count = content.chips.find((chip) => chip.kind === "products")?.label;
  const canOrder = Boolean(content.contactHref?.startsWith("http"));
  return (
    <section id={SHELF_ID} className={styles.block} aria-labelledby="shelf-heading">
      <div className={styles.blockHead}>
        <h2 id="shelf-heading">In the shop</h2>
        {count ? <p className={styles.count}>{count}</p> : null}
      </div>
      {content.collectionNames.length > 0 ? (
        <ul className={styles.chips}>
          {content.collectionNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : null}
      <ul className={styles.grid}>
        {content.shelf.map((item, index) => {
          const tone = TILE_TONES[index % TILE_TONES.length];
          const qty = order.quantityOf(item.id);
          return (
            <li key={item.id}>
              <article className={cn(styles.card, qty > 0 && styles.cardOnList)}>
                {item.imageUrl ? (
                  <div className={styles.cardPhoto}>
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt}
                      fill
                      sizes="280px"
                      className={styles.cover}
                      unoptimized
                    />
                    {qty > 0 ? <span className={styles.qtyStamp}>{qty}</span> : null}
                  </div>
                ) : (
                  <div className={styles.cardFace} style={{ background: tone.bg, color: tone.fg }}>
                    <h3 className={styles.faceName}>{item.name}</h3>
                    {qty > 0 ? <span className={styles.qtyStamp}>{qty}</span> : null}
                  </div>
                )}
                <div className={styles.cardBody}>
                  {item.imageUrl ? <h3 className={styles.cardName}>{item.name}</h3> : null}
                  <div className={styles.cardRow}>
                    {item.price ? <span className={styles.cardPrice}>{item.price}</span> : <span />}
                    <ShelfOrderControl
                      item={item}
                      quantity={qty}
                      enabled={canOrder}
                      onAdd={() => order.add(item)}
                      onSet={(next) => order.setQuantity(item.id, next)}
                    />
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HowItWorks({ place }: { place: string | null }) {
  const collect = place
    ? `Pay by M-Pesa and collect your order in ${place}.`
    : "Pay by M-Pesa and collect your order.";
  const steps = [
    { title: "Pick your items", body: "Add what you need. Your list stays on this page until you send it." },
    { title: "Message us on WhatsApp", body: "Send the whole list in one message. We confirm stock and your total." },
    { title: "Pay with M-Pesa", body: collect },
  ];
  return (
    <section id={HOW_ID} className={styles.block} aria-labelledby="how-heading">
      <h2 id="how-heading">Order in three steps</h2>
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.stepNo}>{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
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
  const place = content.footerPlace;
  const heading = content.visitTitle || (place ? `Find us in ${place}` : content.address || content.displayName);
  const action = content.contactHref?.startsWith("http")
    ? "Chat on WhatsApp"
    : content.ctaLabel || content.contactLabel;
  const detail = [content.address, content.hours].filter((line) => line && line !== heading);
  return (
    <section id={VISIT_ID} className={styles.visit} aria-labelledby="visit-heading">
      <div className={styles.visitBand}>
        <div className={styles.visitCopy}>
          <h2 id="visit-heading">{heading}</h2>
          {detail.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        {content.contactHref && action ? (
          <ShopContact href={content.contactHref} label={action} kind="gold" />
        ) : null}
        {photo ? (
          <PhotoFrame
            src={photo}
            alt={content.address || content.displayName}
            className={styles.visitMedia}
            sizes="(min-width: 960px) 40vw, 100vw"
          >
            {manager ? (
              <PhotoActions slot="shop" url={photo} landing={landing} compact onPhoto={onPhoto} />
            ) : null}
          </PhotoFrame>
        ) : null}
      </div>
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

function ShelfOrderControl({
  item,
  quantity,
  enabled,
  onAdd,
  onSet,
}: {
  item: ComingSoonEditorialContent["shelf"][number];
  quantity: number;
  enabled: boolean;
  onAdd: () => void;
  onSet: (quantity: number) => void;
}) {
  if (!enabled) return null;
  if (quantity === 0) {
    return (
      <button type="button" className={styles.order} onClick={onAdd}>
        Add
      </button>
    );
  }
  return (
    <span className={styles.stepper}>
      <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => onSet(quantity - 1)}>
        <Minus size={16} strokeWidth={2} aria-hidden />
      </button>
      <span>{quantity}</span>
      <button type="button" aria-label={`Add another ${item.name}`} onClick={onAdd}>
        <Plus size={16} strokeWidth={2} aria-hidden />
      </button>
    </span>
  );
}

function FactIcon({ kind }: { kind: ComingSoonEditorialContent["chips"][number]["kind"] }) {
  const props = { size: 18, strokeWidth: 2, "aria-hidden": true as const };
  if (kind === "pay") return <Smartphone {...props} />;
  if (kind === "hours") return <Clock {...props} />;
  if (kind === "place" || kind === "delivery") return <MapPin {...props} />;
  return <MessageCircle {...props} />;
}

const CONTACT_CLASS = {
  navCta: styles.navCta,
  primary: styles.primary,
  secondary: styles.secondary,
  gold: styles.gold,
  order: styles.order,
} as const;

function ShopContact({
  href,
  label,
  kind,
}: {
  href: string;
  label: string;
  kind: keyof typeof CONTACT_CLASS;
}) {
  const external = href.startsWith("http");
  return (
    <a
      className={CONTACT_CLASS[kind]}
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {label}
    </a>
  );
}
