"use client";

import type { CSSProperties, ReactNode } from "react";

import type {
  StorefrontTemplateMeta,
  ThemePhoneLayout,
  ThemePhoneSkin,
} from "@/lib/storefront-templates";
import { tryOnMoneyLabel, type ThemeTryOnProduct } from "@/lib/theme-try-on";
import { cn } from "@/lib/utils";

/**
 * "Try it on" miniature — the selected theme dressed with the merchant's own
 * name, logo, brand colour and stock, inside a phone frame. Every dimension is
 * `em`-relative to a root font size so the same component powers the sticky
 * pane, compare strip, and gallery cards.
 */

const FONT_FAMILIES: Record<ThemePhoneSkin["font"], string> = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  display:
    "'Baloo 2', 'Trebuchet MS', ui-rounded, 'Segoe UI', system-ui, sans-serif",
  serif: "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
};

const RADIUS_CARD: Record<ThemePhoneSkin["radius"], string> = {
  sharp: "rounded-[0.35em]",
  soft: "rounded-[0.85em]",
  round: "rounded-[1.3em]",
};

const RADIUS_PILL: Record<ThemePhoneSkin["radius"], string> = {
  sharp: "rounded-[0.3em]",
  soft: "rounded-[0.6em]",
  round: "rounded-full",
};

function lineColor(skin: ThemePhoneSkin): string {
  return skin.dark
    ? "color-mix(in srgb, #ffffff 16%, transparent)"
    : "color-mix(in srgb, #101418 12%, transparent)";
}

function productAt(
  products: readonly ThemeTryOnProduct[] | undefined,
  index: number,
): ThemeTryOnProduct | undefined {
  return products?.[index];
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-[1.15em] pt-[0.85em] text-[0.7em] font-semibold leading-none">
      <span>9:41</span>
      <span className="flex items-center gap-[0.45em]">
        <span className="flex items-end gap-[0.14em]" aria-hidden>
          <span className="h-[0.4em] w-[0.16em] rounded-[0.05em] bg-current opacity-60" />
          <span className="h-[0.65em] w-[0.16em] rounded-[0.05em] bg-current opacity-80" />
          <span className="h-[0.9em] w-[0.16em] rounded-[0.05em] bg-current" />
        </span>
        <span className="h-[0.65em] w-[0.95em] rounded-[0.3em] border-[0.14em] border-current opacity-80" aria-hidden>
          <span className="ml-auto block h-full w-[55%] bg-current opacity-60" />
        </span>
      </span>
    </div>
  );
}

function Face({
  product,
  skin,
  index,
  className,
}: {
  product?: ThemeTryOnProduct;
  skin: ThemePhoneSkin;
  index: number;
  className?: string;
}) {
  if (product?.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- merchant catalog thumbs; decorative miniature
      <img
        src={product.imageUrl}
        alt=""
        className={cn("object-cover", className)}
      />
    );
  }
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${skin.accent} ${30 + index * 7}%, ${skin.card}), color-mix(in srgb, ${skin.accent} 55%, ${skin.card}))`,
      }}
    />
  );
}

function ShopHeader({
  skin,
  storeName,
  logoUrl,
  brand,
  cartLabel = "Cart",
  cartActive = false,
}: {
  skin: ThemePhoneSkin;
  storeName: string;
  logoUrl?: string | null;
  brand: string;
  cartLabel?: string;
  cartActive?: boolean;
}) {
  const card = RADIUS_CARD[skin.radius];
  const pill = RADIUS_PILL[skin.radius];
  return (
    <div className="flex items-center gap-[0.55em] px-[1.1em] pb-[0.2em] pt-[0.75em]">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- merchant logo in decorative miniature
        <img
          src={logoUrl}
          alt=""
          className={cn("size-[1.5em] shrink-0 bg-transparent object-contain", card)}
        />
      ) : (
        <span
          className={cn(
            "flex size-[1.5em] shrink-0 items-center justify-center text-[0.85em] font-bold leading-none",
            card,
          )}
          style={{ backgroundColor: brand, color: skin.dark ? skin.surface : "#fff" }}
          aria-hidden
        >
          {(storeName || "S").trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className="truncate text-[0.95em] font-bold leading-none">
        {storeName || "Your shop"}
      </span>
      <span
        className={cn(
          "ml-auto inline-flex h-[1.45em] items-center px-[0.7em] text-[0.62em] font-bold leading-none",
          pill,
        )}
        style={{
          backgroundColor: cartActive ? skin.ink : skin.accent,
          color: cartActive ? skin.surface : skin.onAccent,
        }}
      >
        {cartLabel}
      </span>
    </div>
  );
}

function Cta({
  skin,
  children,
}: {
  skin: ThemePhoneSkin;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[1.5em] items-center px-[0.85em] text-[0.68em] font-bold leading-none",
        RADIUS_PILL[skin.radius],
      )}
      style={{ backgroundColor: skin.accent, color: skin.onAccent }}
    >
      {children}
    </span>
  );
}

function AisleTile({
  skin,
  product,
  index,
  border,
}: {
  skin: ThemePhoneSkin;
  product?: ThemeTryOnProduct;
  index: number;
  border: boolean;
}) {
  const card = RADIUS_CARD[skin.radius];
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-[0.45em] p-[0.55em]",
        card,
        border && "border-[0.11em]",
      )}
      style={{
        backgroundColor: skin.card,
        borderColor: skin.dark
          ? "color-mix(in srgb, #ffffff 22%, transparent)"
          : "color-mix(in srgb, #101418 14%, transparent)",
      }}
    >
      <Face
        product={product}
        skin={skin}
        index={index}
        className={cn("aspect-square w-full", card)}
      />
      <span
        className="block h-[0.5em] w-[78%] truncate rounded-full text-[0.5em] font-semibold leading-none"
        style={{
          backgroundColor: product?.name
            ? "transparent"
            : `color-mix(in srgb, ${skin.ink} 55%, transparent)`,
          color: skin.ink,
        }}
      >
        {product?.name ?? ""}
      </span>
      <span
        className={cn(
          "inline-flex h-[1.15em] w-[3.2em] items-center justify-center text-[0.62em] font-bold leading-none",
          RADIUS_PILL[skin.radius],
        )}
        style={{ backgroundColor: skin.accent, color: skin.onAccent }}
      >
        Add
      </span>
    </div>
  );
}

function heroStyle(
  item: StorefrontTemplateMeta,
  heroUrl?: string | null,
): CSSProperties {
  if (heroUrl) {
    return {
      backgroundImage: `linear-gradient(to top, rgba(2,6,23,0.62), transparent 58%), url(${heroUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return {
    background: `linear-gradient(135deg, ${item.previewFrom}, ${item.previewTo})`,
  };
}

function StoreBody({
  item,
  skin,
  storeName,
  brand,
  products,
  heroUrl,
}: {
  item: StorefrontTemplateMeta;
  skin: ThemePhoneSkin;
  storeName: string;
  brand: string;
  products: readonly ThemeTryOnProduct[];
  heroUrl?: string | null;
}) {
  const layout: ThemePhoneLayout = skin.layout;
  const card = RADIUS_CARD[skin.radius];
  const border = Boolean(skin.border);
  const p0 = productAt(products, 0);
  const p1 = productAt(products, 1);
  const p2 = productAt(products, 2);

  if (layout === "hero-cut") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[0.85em] pb-[0.8em] pt-[0.4em]">
        <div
          className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden border-[0.18em] p-[0.45em]", card)}
          style={{ borderColor: skin.ink }}
        >
          <Face
            product={p0}
            skin={skin}
            index={0}
            className="min-h-0 flex-1"
          />
          <div className="absolute inset-x-[0.6em] bottom-[0.6em] flex items-end justify-between gap-[0.4em]">
            <p className="min-w-0 truncate text-[0.95em] font-bold leading-tight">
              {p0?.name || "Today's cut"}
            </p>
            <span
              className="shrink-0 px-[0.55em] py-[0.3em] text-[0.58em] font-bold leading-none"
              style={{ backgroundColor: skin.ink, color: skin.surface }}
            >
              /kg
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (layout === "rail") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-[0.45em] px-[0.9em] pb-[0.8em] pt-[0.35em]">
        <p
          className="text-[0.62em] font-bold leading-none"
          style={{ color: skin.muted }}
        >
          Today next door
        </p>
        {[p0, p1, p2].map((product, i) => (
          <div
            key={i}
            className={cn("flex items-center gap-[0.55em] border-[0.12em] p-[0.4em]", card)}
            style={{ borderColor: skin.ink, backgroundColor: skin.card }}
          >
            <Face
              product={product}
              skin={skin}
              index={i}
              className={cn("size-[2.4em] shrink-0", card)}
            />
            <span className="min-w-0 flex-1 truncate text-[0.62em] font-bold">
              {product?.name || "Everyday essentials"}
            </span>
            <span
              className={cn(
                "size-[1.2em] shrink-0 text-center text-[0.7em] font-bold leading-[1.2em]",
                RADIUS_PILL[skin.radius],
              )}
              style={{ backgroundColor: skin.accent, color: skin.onAccent }}
            >
              +
            </span>
          </div>
        ))}
        <span
          className={cn(
            "mt-auto flex h-[1.8em] items-center justify-center text-[0.68em] font-bold",
            RADIUS_PILL[skin.radius],
          )}
          style={{ backgroundColor: skin.accent, color: skin.onAccent }}
        >
          Message us
        </span>
      </div>
    );
  }

  if (layout === "editorial") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[0.9em] pb-[0.8em] pt-[0.3em]">
        <p className="text-center text-[0.52em] font-bold uppercase tracking-[0.22em]">
          The edit
        </p>
        <Face
          product={p0}
          skin={skin}
          index={0}
          className="mt-[0.45em] min-h-[9em] w-full"
        />
        <p className="mt-[0.5em] truncate text-center text-[0.85em] font-bold leading-tight">
          {p0?.name || storeName}
        </p>
        <div className="mt-[0.45em] flex justify-center gap-[0.3em]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-[0.32em] rounded-full"
              style={{ backgroundColor: i === 0 ? skin.accent : skin.muted }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (layout === "scent") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center px-[1em] pb-[0.8em] pt-[0.4em]">
        <p
          className="text-[0.55em] font-bold uppercase tracking-[0.2em]"
          style={{ color: skin.accent }}
        >
          {storeName || "The house"}
        </p>
        <Face
          product={p0}
          skin={skin}
          index={0}
          className={cn("mt-[0.55em] h-[8.5em] w-[4.4em]", card)}
        />
        <p className="mt-[0.5em] truncate text-[0.78em] font-bold">
          {p0?.name || "Signature scent"}
        </p>
        <div className="mt-[0.55em] flex w-full gap-[0.4em]">
          {[p1, p2].map((product, i) => (
            <Face
              key={i}
              product={product}
              skin={skin}
              index={i + 1}
              className={cn("h-[2.2em] flex-1", card)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (layout === "pastry") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <p
          className="px-[0.8em] py-[0.38em] text-center text-[0.48em] font-semibold tracking-wide"
          style={{ backgroundColor: brand, color: skin.onAccent }}
        >
          Call / WhatsApp
        </p>
        <div
          className={cn(
            "relative mx-[0.65em] mt-[0.35em] min-h-[7.4em] flex-1 overflow-hidden",
            card,
          )}
          style={
            heroUrl
              ? {
                  backgroundImage: `url(${heroUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {heroUrl ? null : (
            <Face
              product={p0}
              skin={skin}
              index={0}
              className="h-full w-full"
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(43,21,32,0.48) 0%, transparent 46%)",
            }}
            aria-hidden
          />
          <p className="absolute inset-x-[0.55em] top-[0.5em] truncate text-center text-[0.78em] font-bold leading-tight text-white">
            {storeName || "The case"}
          </p>
        </div>
        <div className="mt-[0.45em] flex justify-center gap-[0.4em] px-[0.7em] pb-[0.7em]">
          {[p0, p1, p2].map((product, i) => (
            <Face
              key={i}
              product={product}
              skin={skin}
              index={i}
              className={cn("size-[2.35em] shrink-0", card)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (layout === "shelf-row") {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-[0.5em] px-[0.7em] pb-[0.9em] pt-[0.4em]">
        <p
          className="px-[0.3em] text-[0.58em] italic leading-snug"
          style={{ color: skin.muted }}
        >
          Lit boxes, not a crowd.
        </p>
        <div className="grid grid-cols-2 gap-[0.45em]">
          {[p0, p1].map((product, i) => (
            <div
              key={i}
              className={cn("overflow-hidden", card)}
              style={{ backgroundColor: skin.card }}
            >
              <Face
                product={product}
                skin={skin}
                index={i}
                className="h-[5.2em] w-full"
              />
              <p className="truncate px-[0.45em] py-[0.4em] text-[0.55em] font-semibold">
                {product?.name || "Selected"}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === "cellar") {
    return (
      <div className="flex min-h-0 flex-1 items-end justify-center gap-[0.55em] px-[1em] pb-[1.1em] pt-[0.5em]">
        {[p0, p1, p2].map((product, i) => (
          <div key={i} className="flex flex-col items-center gap-[0.3em]">
            <Face
              product={product}
              skin={skin}
              index={i}
              className="h-[9.5em] w-[2.5em] rounded-[0.2em_0.2em_0.15em_0.15em]"
            />
            <span
              className="h-[0.12em] w-[2.6em]"
              style={{ backgroundColor: skin.accent }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (layout === "warehouse") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[0.85em] pb-[0.7em] pt-[0.3em]">
        <div
          className="mb-[0.4em] flex items-center justify-between border-b-[0.14em] py-[0.35em] text-[0.55em] font-bold uppercase"
          style={{ borderColor: skin.ink }}
        >
          <span>Archive</span>
          <span style={{ color: skin.accent }}>REF</span>
        </div>
        {[p0, p1, p2].map((product, i) => (
          <div
            key={i}
            className="flex items-center gap-[0.5em] border-b-[0.08em] py-[0.45em]"
            style={{ borderColor: lineColor(skin) }}
          >
            <Face
              product={product}
              skin={skin}
              index={i}
              className="size-[1.8em] shrink-0"
            />
            <span className="min-w-0 flex-1 truncate text-[0.58em] font-semibold">
              {product?.name || `SKU-00${i + 1}`}
            </span>
            <span className="text-[0.52em]" style={{ color: skin.accent }}>
              ●
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (layout === "pots") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-[0.5em] px-[0.9em] pb-[0.8em] pt-[0.4em]">
        <div
          className={cn("flex items-center gap-[0.5em] px-[0.7em] py-[0.55em]", card)}
          style={{ backgroundColor: brand, color: "#fff" }}
        >
          <span className="text-[0.58em] font-bold">Formula of the week</span>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-[0.5em]">
          {[p0, p1].map((product, i) => (
            <div
              key={i}
              className={cn("flex flex-col overflow-hidden", card)}
              style={{ backgroundColor: skin.card }}
            >
              <Face
                product={product}
                skin={skin}
                index={i}
                className="h-[5.5em] w-full"
              />
              <p className="truncate px-[0.45em] py-[0.4em] text-[0.55em] font-semibold">
                {product?.name || "Tint"}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === "slips") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-[0.45em] px-[0.9em] pb-[0.8em] pt-[0.45em]">
        {[p0, p1, p2].map((product, i) => (
          <div
            key={i}
            className="relative border-[0.12em] px-[0.7em] py-[0.65em]"
            style={{
              borderColor: skin.ink,
              backgroundColor: i === 0 ? skin.card : `color-mix(in srgb, ${skin.card} 80%, ${skin.surface})`,
              marginLeft: `${i * 0.25}em`,
            }}
          >
            <p className="truncate text-[0.62em] font-bold">{product?.name || "Duplicate slip"}</p>
            <span
              className="mt-[0.25em] inline-block text-[0.5em] font-bold uppercase"
              style={{ color: "#B42318" }}
            >
              Copy {i + 1}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (layout === "console") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[0.75em] pb-[0.7em] pt-[0.3em]">
        <div
          className="mb-[0.4em] grid grid-cols-3 gap-[0.3em] border-[0.12em] p-[0.35em] text-center text-[0.48em] font-bold uppercase"
          style={{ borderColor: lineColor(skin) }}
        >
          <span>Rack</span>
          <span style={{ color: skin.accent }}>Live</span>
          <span>Lab</span>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-[0.4em]">
          {[p0, p1, p2, p0].slice(0, 4).map((product, i) => (
            <div
              key={i}
              className="flex flex-col gap-[0.3em] border-[0.1em] p-[0.35em]"
              style={{ borderColor: lineColor(skin), backgroundColor: skin.card }}
            >
              <Face
                product={i < 3 ? product : p2}
                skin={skin}
                index={i}
                className="h-[3.2em] w-full"
              />
              <span className="truncate text-[0.48em] font-semibold">
                {(i < 3 ? product?.name : p2?.name) || `VIAL ${i + 1}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === "poster") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[0.9em] pb-[0.8em] pt-[0.25em]">
        <p className="text-[1.35em] font-bold leading-[0.95]">
          {storeName || "Prints"}
        </p>
        <p className="mt-[0.25em] text-[0.55em]" style={{ color: skin.muted }}>
          Small-batch, on paper.
        </p>
        <Face
          product={p0}
          skin={skin}
          index={0}
          className={cn("mt-[0.6em] min-h-0 flex-1", card)}
        />
        <div className="mt-[0.5em] flex items-center justify-between">
          <span className="truncate text-[0.6em] font-semibold">
            {p0?.name || "Featured print"}
          </span>
          <Cta skin={skin}>Add</Cta>
        </div>
      </div>
    );
  }

  if (layout === "sparse") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[0.7em] px-[1.4em] pb-[1.2em]">
        <Face
          product={p0}
          skin={skin}
          index={0}
          className="h-[9em] w-[9em]"
        />
        <p className="truncate text-[0.62em] font-semibold tracking-tight">
          {p0?.name || "001"}
        </p>
      </div>
    );
  }

  // aisles (mart) — supermarket hero + 3-up tiles
  return (
    <>
      <div
        className={cn(
          "relative mx-[0.9em] mt-[0.6em] flex min-h-[6.4em] flex-col justify-end overflow-hidden",
          card,
        )}
        style={heroStyle(item, heroUrl)}
      >
        {!heroUrl ? (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(2,6,23,0.68) 0%, rgba(2,6,23,0.16) 58%, transparent 100%)",
            }}
            aria-hidden
          />
        ) : null}
        <div className="relative z-10 px-[0.85em] pb-[0.75em]">
          <p className="truncate text-[1.05em] font-bold leading-tight text-white">
            {storeName || "Welcome in"}
          </p>
          <span
            className={cn(
              "mt-[0.55em] inline-flex h-[1.5em] items-center px-[0.85em] text-[0.68em] font-bold leading-none",
              RADIUS_PILL[skin.radius],
            )}
            style={{ backgroundColor: skin.accent, color: skin.onAccent }}
          >
            Shop now
          </span>
        </div>
      </div>
      <div
        className={cn(
          "mx-[0.9em] mt-[0.55em] flex items-center justify-center px-[0.7em] py-[0.5em] text-[0.6em] font-semibold leading-none",
          card,
        )}
        style={{
          backgroundColor: `color-mix(in srgb, ${brand} 16%, transparent)`,
        }}
      >
        <span className="truncate">Order online · Pay by M-Pesa</span>
      </div>
      <div className="grid flex-1 grid-cols-3 content-start gap-[0.5em] px-[0.9em] pb-[0.7em] pt-[0.55em]">
        {[0, 1, 2].map((i) => (
          <AisleTile
            key={i}
            skin={skin}
            product={productAt(products, i)}
            index={i}
            border={border}
          />
        ))}
      </div>
    </>
  );
}

function LandingBody({
  layout,
  skin,
  storeName,
  hours,
  address,
  products,
}: {
  layout: ThemePhoneLayout;
  skin: ThemePhoneSkin;
  storeName: string;
  hours?: string | null;
  address?: string | null;
  products: readonly ThemeTryOnProduct[];
}) {
  const card = RADIUS_CARD[skin.radius];
  const hoursText = hours?.trim() || "Mon – Sat · 8am – 6pm";
  const addressText = address?.trim() || "Moi Avenue · Nairobi";
  const p0 = productAt(products, 0);

  if (layout === "logo-poster") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[0.8em] px-[1.4em] text-center">
        <p className="max-w-full text-[1.6em] font-bold leading-[0.95]">
          {storeName || "Your shop"}
        </p>
        <p className="text-[0.62em]" style={{ color: skin.muted }}>
          Opening the door soon.
        </p>
      </div>
    );
  }

  if (layout === "noticeboard") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-[0.55em] px-[1em] pb-[1em] pt-[0.6em]">
        <p className="text-center text-[0.95em] font-bold">{storeName}</p>
        <div
          className={cn("border-[0.12em] px-[0.7em] py-[0.7em]", card)}
          style={{ borderColor: skin.ink, backgroundColor: skin.card }}
        >
          <p className="text-[0.58em] font-bold">Hours</p>
          <p className="mt-[0.25em] text-[0.62em] leading-snug">{hoursText}</p>
        </div>
        <div
          className={cn("border-[0.12em] px-[0.7em] py-[0.7em]", card)}
          style={{ borderColor: skin.ink, backgroundColor: skin.card }}
        >
          <p className="text-[0.58em] font-bold">Find us</p>
          <p className="mt-[0.25em] truncate text-[0.62em]">{addressText}</p>
        </div>
        <Cta skin={skin}>WhatsApp</Cta>
      </div>
    );
  }

  if (layout === "market-stall") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[0.9em] pb-[0.8em] pt-[0.4em]">
        <Face
          product={p0}
          skin={skin}
          index={0}
          className={cn("h-[7em] w-full", card)}
        />
        <p className="mt-[0.55em] text-[0.95em] font-bold leading-tight">
          {storeName}
        </p>
        <p className="mt-[0.25em] text-[0.58em]" style={{ color: skin.muted }}>
          This week&apos;s stall
        </p>
        <p className="mt-[0.55em] text-[0.62em] font-semibold">{hoursText}</p>
      </div>
    );
  }

  if (layout === "cuts-list") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[1em] pb-[0.9em] pt-[0.5em]">
        <p className="text-[1.05em] font-bold">{storeName}</p>
        <ul className="mt-[0.6em] flex-1 space-y-[0.45em] text-[0.62em] font-semibold">
          {[0, 1, 2].map((i) => {
            const product = productAt(products, i);
            return (
              <li
                key={i}
                className="flex items-center justify-between border-b-[0.08em] pb-[0.35em]"
                style={{ borderColor: lineColor(skin) }}
              >
                <span className="truncate">{product?.name || "By the cut"}</span>
                <span style={{ color: skin.accent }}>Order</span>
              </li>
            );
          })}
        </ul>
        <Cta skin={skin}>Call to order</Cta>
      </div>
    );
  }

  if (layout === "hours-map") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[0.7em] px-[1.2em] text-center">
        <p className="text-[1.05em] font-bold">{storeName}</p>
        <p className="text-[0.85em] font-semibold">{hoursText}</p>
        <p className="text-[0.62em]" style={{ color: skin.muted }}>
          {addressText}
        </p>
        <Cta skin={skin}>Reach us</Cta>
      </div>
    );
  }

  if (layout === "shop-window") {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col justify-end overflow-hidden px-[1.1em] pb-[1.1em]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 90% 70% at 50% 18%, color-mix(in srgb, ${skin.accent} 32%, ${skin.card}), ${skin.surface} 72%)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-[0.55em] border"
          style={{ borderColor: "color-mix(in srgb, white 18%, transparent)" }}
        />
        <p className="relative text-[1.35em] font-bold leading-[0.95] tracking-tight">
          {storeName}
        </p>
        <p
          className="relative mt-[0.45em] text-[0.62em] leading-snug"
          style={{ color: skin.muted }}
        >
          {addressText}
        </p>
        <div className="relative mt-[0.7em]">
          <Cta skin={skin}>Visit us</Cta>
        </div>
      </div>
    );
  }

  if (layout === "locked-shelf") {
    const peek = products.slice(0, 4);
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[0.85em] pb-[0.7em] pt-[0.35em]">
        <div className="flex items-center justify-between gap-[0.4em]">
          <p className="min-w-0 truncate text-[0.72em] font-bold">{storeName}</p>
          <span
            className="shrink-0 px-[0.45em] py-[0.18em] text-[0.48em] font-bold"
            style={{ backgroundColor: skin.ink, color: skin.surface }}
          >
            Soon
          </span>
        </div>
        {peek.length > 0 ? (
          <div className="mt-[0.45em] grid min-h-0 flex-1 grid-cols-2 gap-[0.28em]">
            {peek.map((product, i) => (
              <div
                key={`${product.name}-${i}`}
                className={cn("relative min-h-0 overflow-hidden", card)}
                style={{ backgroundColor: skin.card }}
              >
                <Face
                  product={product}
                  skin={skin}
                  index={i}
                  className="h-full min-h-[3.2em] w-full"
                />
                {product.price ? (
                  <span
                    className="absolute bottom-[0.28em] left-[0.28em] px-[0.28em] py-[0.08em] text-[0.48em] font-bold"
                    style={{ backgroundColor: skin.surface, color: skin.ink }}
                  >
                    {product.price}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-[0.45em] grid flex-1 grid-cols-2 gap-[0.28em]">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn("min-h-[3.2em]", card)}
                style={{
                  backgroundColor: `color-mix(in srgb, ${skin.accent} 12%, ${skin.card})`,
                }}
              />
            ))}
          </div>
        )}
        <div
          className="mt-[0.45em] flex items-center justify-between gap-[0.4em] px-[0.2em] py-[0.35em]"
          style={{ backgroundColor: skin.ink, color: skin.surface }}
        >
          <span className="text-[0.52em] font-bold">Bag locked</span>
          <Cta skin={skin}>Notify</Cta>
        </div>
      </div>
    );
  }

  // coming-soon editorial
  const peek = products.slice(0, 4);
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[0.55em] px-[1.2em] pb-[1em] pt-[0.5em] text-center">
      <p
        className="text-[0.62em] font-bold uppercase tracking-[0.2em]"
        style={{ color: skin.muted }}
      >
        Opening soon
      </p>
      <p className="max-w-full text-[1.25em] font-bold leading-tight">
        {storeName || "Your shop"}
      </p>
      {peek.length > 0 ? (
        <div className="mt-[0.2em] grid w-full grid-cols-2 gap-[0.28em]">
          {peek.map((product, i) => (
            <div
              key={`${product.name}-${i}`}
              className={cn("aspect-[4/3] overflow-hidden", card)}
              style={{ backgroundColor: skin.card }}
            >
              <Face
                product={product}
                skin={skin}
                index={i}
                className="h-full w-full"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="max-w-full text-[0.72em] leading-snug" style={{ color: skin.muted }}>
          Your products will fill this door.
        </p>
      )}
      <Cta skin={skin}>Notify me</Cta>
    </div>
  );
}

export type ThemeTryOnScreen = "home" | "product" | "cart";
/** @deprecated Use {@link ThemeTryOnScreen}. */
export type ThemeTryOnView = ThemeTryOnScreen;

function PriceTag({
  skin,
  layout,
  label,
  className,
}: {
  skin: ThemePhoneSkin;
  layout: ThemePhoneLayout;
  label?: string | null;
  className?: string;
}) {
  const text = label?.trim();
  if (!text) return null;
  if (layout === "slips") {
    return (
      <span
        className={cn(
          "shrink-0 px-[0.5em] py-[0.22em] text-[0.56em] font-bold uppercase leading-none",
          className,
        )}
        style={{ backgroundColor: "#B42318", color: "#fff" }}
      >
        {text}
      </span>
    );
  }
  if (layout === "hero-cut") {
    return (
      <span
        className={cn(
          "shrink-0 px-[0.55em] py-[0.3em] text-[0.6em] font-bold leading-none",
          className,
        )}
        style={{ backgroundColor: skin.ink, color: skin.surface }}
      >
        {text}
      </span>
    );
  }
  if (layout === "console" || layout === "warehouse") {
    return (
      <span
        className={cn(
          "shrink-0 text-[0.62em] font-bold tracking-wide",
          className,
        )}
        style={{ color: skin.accent }}
      >
        {text}
      </span>
    );
  }
  return (
    <span
      className={cn("shrink-0 text-[0.75em] font-bold leading-none", className)}
      style={{ color: skin.ink }}
    >
      {text}
    </span>
  );
}

function productCta(layout: ThemePhoneLayout): string {
  if (layout === "rail") return "Message us";
  if (layout === "hero-cut") return "Add";
  if (layout === "console") return "Dispense";
  if (layout === "poster") return "Enquire";
  if (layout === "pastry") return "Add to bag";
  if (layout === "locked-shelf") return "Notify";
  return "Add";
}

function cartCta(layout: ThemePhoneLayout): string {
  if (layout === "rail") return "Message us";
  if (layout === "hero-cut") return "Order";
  if (layout === "console") return "Dispense";
  if (layout === "warehouse" || layout === "slips") return "Request";
  if (layout === "editorial" || layout === "scent") return "Request";
  if (layout === "poster") return "Enquire";
  if (layout === "pastry") return "Order";
  if (layout === "locked-shelf") return "Notify";
  return "Pay";
}

function ProductBody({
  skin,
  storeName,
  product,
}: {
  skin: ThemePhoneSkin;
  storeName: string;
  product?: ThemeTryOnProduct;
}) {
  const layout = skin.layout;
  const card = RADIUS_CARD[skin.radius];
  const name = product?.name || "A product of yours";
  const cta = productCta(layout);
  const price = (
    <PriceTag skin={skin} layout={layout} label={product?.price} />
  );

  if (layout === "hero-cut") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[0.85em] pb-[0.8em] pt-[0.35em]">
        <div
          className={cn("relative min-h-0 flex-1 overflow-hidden border-[0.18em]", card)}
          style={{ borderColor: skin.ink }}
        >
          <Face product={product} skin={skin} index={0} className="h-full w-full" />
        </div>
        <div className="mt-[0.5em] flex items-end justify-between gap-[0.4em]">
          <p className="min-w-0 truncate text-[0.85em] font-bold leading-tight">
            {name}
          </p>
          {price}
        </div>
        <span
          className={cn(
            "mt-[0.45em] flex h-[1.7em] items-center justify-center text-[0.68em] font-bold",
            RADIUS_PILL[skin.radius],
          )}
          style={{ backgroundColor: skin.accent, color: skin.onAccent }}
        >
          {cta}
        </span>
      </div>
    );
  }

  if (layout === "rail") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-[0.5em] px-[0.9em] pb-[0.8em] pt-[0.35em]">
        <div
          className={cn("overflow-hidden border-[0.12em]", card)}
          style={{ borderColor: skin.ink, backgroundColor: skin.card }}
        >
          <Face
            product={product}
            skin={skin}
            index={0}
            className="h-[8em] w-full"
          />
          <div className="flex items-center justify-between gap-[0.4em] px-[0.55em] py-[0.5em]">
            <p className="min-w-0 truncate text-[0.72em] font-bold">{name}</p>
            {price}
          </div>
        </div>
        <span
          className={cn(
            "mt-auto flex h-[1.8em] items-center justify-center text-[0.68em] font-bold",
            RADIUS_PILL[skin.radius],
          )}
          style={{ backgroundColor: skin.accent, color: skin.onAccent }}
        >
          {cta}
        </span>
      </div>
    );
  }

  if (layout === "editorial" || layout === "scent") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center px-[1em] pb-[0.8em] pt-[0.3em]">
        <p
          className="text-[0.5em] font-bold uppercase tracking-[0.2em]"
          style={{ color: layout === "scent" ? skin.accent : skin.ink }}
        >
          {layout === "scent" ? storeName || "The house" : "The edit"}
        </p>
        <Face
          product={product}
          skin={skin}
          index={0}
          className={cn(
            "mt-[0.5em] min-h-0 flex-1",
            layout === "scent" ? "w-[5.2em]" : "w-full",
            card,
          )}
        />
        <p className="mt-[0.5em] truncate text-center text-[0.78em] font-bold">
          {name}
        </p>
        {price}
        <Cta skin={skin}>{cta}</Cta>
      </div>
    );
  }

  if (layout === "pastry") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[0.85em] pb-[0.75em] pt-[0.25em]">
        <Face
          product={product}
          skin={skin}
          index={0}
          className={cn("min-h-0 flex-1", card)}
        />
        <p className="mt-[0.5em] truncate text-center text-[0.78em] font-bold">
          {name}
        </p>
        <div className="mt-[0.2em] flex justify-center">{price}</div>
        <span
          className={cn(
            "mt-[0.45em] flex h-[1.65em] items-center justify-center text-[0.62em] font-bold",
            RADIUS_PILL[skin.radius],
          )}
          style={{ backgroundColor: skin.accent, color: skin.onAccent }}
        >
          {cta}
        </span>
      </div>
    );
  }

  if (layout === "console") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[0.8em] pb-[0.7em] pt-[0.3em]">
        <p
          className="text-[0.48em] font-bold uppercase tracking-[0.16em]"
          style={{ color: skin.accent }}
        >
          Vial
        </p>
        <div
          className="mt-[0.4em] min-h-0 flex-1 border-[0.1em] p-[0.4em]"
          style={{ borderColor: lineColor(skin), backgroundColor: skin.card }}
        >
          <Face product={product} skin={skin} index={0} className="h-full w-full" />
        </div>
        <div className="mt-[0.4em] flex items-center justify-between gap-[0.4em]">
          <p className="min-w-0 truncate text-[0.62em] font-semibold">{name}</p>
          {price}
        </div>
        <span
          className="mt-[0.4em] flex h-[1.6em] items-center justify-center border-[0.1em] text-[0.62em] font-bold"
          style={{ borderColor: skin.accent, color: skin.accent }}
        >
          {cta}
        </span>
      </div>
    );
  }

  if (layout === "warehouse" || layout === "slips") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[0.85em] pb-[0.7em] pt-[0.3em]">
        <div
          className="mb-[0.4em] flex items-center justify-between border-b-[0.12em] py-[0.3em] text-[0.52em] font-bold uppercase"
          style={{ borderColor: skin.ink }}
        >
          <span>{layout === "slips" ? "Slip" : "Spec"}</span>
          <span style={{ color: skin.accent }}>
            {layout === "slips" ? "Copy" : "REF"}
          </span>
        </div>
        <Face
          product={product}
          skin={skin}
          index={0}
          className={cn("h-[7em] w-full", layout === "warehouse" ? "" : card)}
        />
        <div className="mt-[0.45em] flex items-center justify-between gap-[0.4em]">
          <p className="min-w-0 truncate text-[0.68em] font-bold">{name}</p>
          {price}
        </div>
        <span
          className="mt-auto flex h-[1.6em] items-center justify-center text-[0.62em] font-bold"
          style={{ backgroundColor: skin.ink, color: skin.surface }}
        >
          {cta}
        </span>
      </div>
    );
  }

  if (layout === "poster" || layout === "sparse") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center px-[1.1em] pb-[0.9em] pt-[0.35em]">
        {layout === "poster" ? (
          <p className="w-full text-[1.15em] font-bold leading-[0.95]">
            {name}
          </p>
        ) : null}
        <Face
          product={product}
          skin={skin}
          index={0}
          className={cn(
            "mt-[0.55em] min-h-0 flex-1",
            layout === "sparse" ? "w-[9em]" : cn("w-full", card),
          )}
        />
        {layout === "sparse" ? (
          <p className="mt-[0.5em] truncate text-[0.62em] font-semibold tracking-tight">
            {name}
          </p>
        ) : (
          <div className="mt-[0.5em] flex w-full items-center justify-between gap-[0.4em]">
            {price}
            <Cta skin={skin}>{cta}</Cta>
          </div>
        )}
      </div>
    );
  }

  if (layout === "cellar") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center px-[1.2em] pb-[0.9em] pt-[0.4em]">
        <Face
          product={product}
          skin={skin}
          index={0}
          className="h-[11em] w-[3.4em] rounded-[0.2em_0.2em_0.15em_0.15em]"
        />
        <span
          className="mt-[0.35em] h-[0.12em] w-[3.5em]"
          style={{ backgroundColor: skin.accent }}
        />
        <p className="mt-[0.4em] truncate text-[0.68em] font-bold">{name}</p>
        {price}
        <Cta skin={skin}>{cta}</Cta>
      </div>
    );
  }

  if (layout === "pots") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center gap-[0.5em] px-[1em] pb-[0.8em] pt-[0.4em]">
        <Face
          product={product}
          skin={skin}
          index={0}
          className={cn("h-[8.5em] w-[8.5em]", card)}
        />
        <p className="truncate text-[0.72em] font-bold">{name}</p>
        {price}
        <span
          className={cn(
            "flex h-[1.7em] w-full items-center justify-center text-[0.68em] font-bold",
            RADIUS_PILL[skin.radius],
          )}
          style={{ backgroundColor: skin.accent, color: skin.onAccent }}
        >
          {cta}
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[0.9em] pb-[0.75em] pt-[0.35em]">
      <Face
        product={product}
        skin={skin}
        index={0}
        className={cn("min-h-[8.5em] w-full", card)}
      />
      <div className="mt-[0.5em] flex items-end justify-between gap-[0.4em]">
        <p className="min-w-0 truncate text-[0.78em] font-bold leading-tight">
          {name}
        </p>
        {price}
      </div>
      <div
        className={cn(
          "mt-[0.4em] flex items-center justify-center px-[0.5em] py-[0.4em] text-[0.55em] font-semibold",
          card,
        )}
        style={{
          backgroundColor: `color-mix(in srgb, ${skin.accent} 16%, transparent)`,
        }}
      >
        Pay by M-Pesa
      </div>
      <span
        className={cn(
          "mt-[0.45em] flex h-[1.7em] items-center justify-center text-[0.68em] font-bold",
          RADIUS_PILL[skin.radius],
        )}
        style={{ backgroundColor: skin.accent, color: skin.onAccent }}
      >
        Add to cart
      </span>
    </div>
  );
}

function CartLine({
  skin,
  product,
  index,
  fallback,
}: {
  skin: ThemePhoneSkin;
  product?: ThemeTryOnProduct;
  index: number;
  fallback: string;
}) {
  const card = RADIUS_CARD[skin.radius];
  return (
    <div
      className="flex items-center gap-[0.5em] py-[0.4em]"
      style={{ borderBottom: `0.08em solid ${lineColor(skin)}` }}
    >
      <Face
        product={product}
        skin={skin}
        index={index}
        className={cn("size-[2.2em] shrink-0", card)}
      />
      <span className="min-w-0 flex-1 truncate text-[0.58em] font-semibold">
        {product?.name || fallback}
      </span>
      {product?.price ? (
        <span className="shrink-0 text-[0.52em] font-bold">{product.price}</span>
      ) : (
        <span className="text-[0.52em] font-bold" style={{ color: skin.muted }}>
          1
        </span>
      )}
    </div>
  );
}

function CartBody({
  skin,
  products,
  currency,
}: {
  skin: ThemePhoneSkin;
  products: readonly ThemeTryOnProduct[];
  currency?: string | null;
}) {
  const layout = skin.layout;
  const card = RADIUS_CARD[skin.radius];
  const p0 = productAt(products, 0);
  const p1 = productAt(products, 1);
  const cta = cartCta(layout);
  const lines = [p0, p1].filter((p, i) => p || i === 0);
  const priced = lines.filter((p) => p?.priceValue != null);
  const total =
    priced.length === lines.filter(Boolean).length && priced.length > 0
      ? priced.reduce((sum, p) => sum + (p?.priceValue ?? 0), 0)
      : null;
  const totalLabel =
    total != null ? tryOnMoneyLabel(total, currency ?? "KES") : null;

  if (layout === "rail") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-[0.4em] px-[0.9em] pb-[0.8em] pt-[0.3em]">
        <p
          className="text-[0.58em] font-bold leading-none"
          style={{ color: skin.muted }}
        >
          Your list
        </p>
        {lines.map((product, i) => (
          <div
            key={i}
            className={cn("flex items-center gap-[0.5em] border-[0.12em] p-[0.4em]", card)}
            style={{ borderColor: skin.ink, backgroundColor: skin.card }}
          >
            <Face
              product={product}
              skin={skin}
              index={i}
              className={cn("size-[2.2em] shrink-0", card)}
            />
            <span className="min-w-0 flex-1 truncate text-[0.58em] font-bold">
              {product?.name || "Your items land here"}
            </span>
            {product?.price ? (
              <span className="shrink-0 text-[0.5em] font-bold">
                {product.price}
              </span>
            ) : null}
          </div>
        ))}
        <span
          className={cn(
            "mt-auto flex h-[1.8em] items-center justify-center text-[0.68em] font-bold",
            RADIUS_PILL[skin.radius],
          )}
          style={{ backgroundColor: skin.accent, color: skin.onAccent }}
        >
          {cta}
        </span>
      </div>
    );
  }

  if (layout === "hero-cut") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[0.85em] pb-[0.8em] pt-[0.3em]">
        <p className="text-[0.62em] font-bold">Today&apos;s order</p>
        {lines.map((product, i) => (
          <div
            key={i}
            className="mt-[0.4em] flex items-center gap-[0.5em] border-b-[0.1em] pb-[0.4em]"
            style={{ borderColor: skin.ink }}
          >
            <Face
              product={product}
              skin={skin}
              index={i}
              className="size-[2.4em] shrink-0"
            />
            <span className="min-w-0 flex-1 truncate text-[0.62em] font-bold">
              {product?.name || "A cut of yours"}
            </span>
            {product?.price ? (
              <span className="shrink-0 text-[0.5em] font-bold">
                {product.price}
              </span>
            ) : (
              <span className="text-[0.5em] font-bold">/kg</span>
            )}
          </div>
        ))}
        <span
          className="mt-auto flex h-[1.7em] items-center justify-center text-[0.68em] font-bold"
          style={{ backgroundColor: skin.ink, color: skin.surface }}
        >
          {cta}
        </span>
      </div>
    );
  }

  if (layout === "console") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[0.8em] pb-[0.7em] pt-[0.3em]">
        <div
          className="mb-[0.35em] grid grid-cols-3 gap-[0.3em] border-[0.12em] p-[0.3em] text-center text-[0.48em] font-bold uppercase"
          style={{ borderColor: lineColor(skin) }}
        >
          <span>Rack</span>
          <span style={{ color: skin.accent }}>Bag</span>
          <span>Lab</span>
        </div>
        {lines.map((product, i) => (
          <div
            key={i}
            className="flex items-center gap-[0.45em] border-b-[0.08em] py-[0.4em]"
            style={{ borderColor: lineColor(skin) }}
          >
            <Face
              product={product}
              skin={skin}
              index={i}
              className="size-[1.8em] shrink-0"
            />
            <span className="min-w-0 flex-1 truncate text-[0.52em] font-semibold">
              {product?.name || `VIAL ${i + 1}`}
            </span>
          </div>
        ))}
        <span
          className="mt-auto flex h-[1.6em] items-center justify-center border-[0.1em] text-[0.62em] font-bold"
          style={{ borderColor: skin.accent, color: skin.accent }}
        >
          {cta}
        </span>
      </div>
    );
  }

  if (layout === "editorial" || layout === "scent") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[1em] pb-[0.8em] pt-[0.35em]">
        <p
          className="text-[0.5em] font-bold uppercase tracking-[0.18em]"
          style={{ color: layout === "scent" ? skin.accent : skin.ink }}
        >
          The bag
        </p>
        {lines.map((product, i) => (
          <CartLine
            key={i}
            skin={skin}
            product={product}
            index={i}
            fallback="A piece from the edit"
          />
        ))}
        <div className="mt-auto flex justify-center pt-[0.5em]">
          <Cta skin={skin}>{cta}</Cta>
        </div>
      </div>
    );
  }

  if (layout === "pastry") {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[0.85em] pb-[0.75em] pt-[0.3em]">
        <p
          className="text-[0.5em] font-bold uppercase tracking-[0.16em]"
          style={{ color: skin.accent }}
        >
          Your bag
        </p>
        {lines.map((product, i) => (
          <div
            key={i}
            className="mt-[0.4em] flex items-center gap-[0.45em]"
          >
            <Face
              product={product}
              skin={skin}
              index={i}
              className={cn("size-[2.1em] shrink-0", card)}
            />
            <span className="min-w-0 flex-1 truncate text-[0.58em] font-semibold">
              {product?.name || "A cake from the case"}
            </span>
          </div>
        ))}
        <span
          className={cn(
            "mt-auto flex h-[1.65em] items-center justify-center text-[0.62em] font-bold",
            RADIUS_PILL[skin.radius],
          )}
          style={{ backgroundColor: skin.accent, color: skin.onAccent }}
        >
          {cta}
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[0.9em] pb-[0.75em] pt-[0.3em]">
      {lines.map((product, i) => (
        <CartLine
          key={i}
          skin={skin}
          product={product}
          index={i}
          fallback="Your items land here"
        />
      ))}
      {layout === "aisles" ? (
        <div
          className={cn(
            "mt-[0.45em] flex items-center justify-center px-[0.5em] py-[0.4em] text-[0.55em] font-semibold",
            card,
          )}
          style={{
            backgroundColor: `color-mix(in srgb, ${skin.accent} 16%, transparent)`,
          }}
        >
          Pay by M-Pesa
        </div>
      ) : null}
      {totalLabel ? (
        <div className="mt-[0.35em] flex items-center justify-between">
          <span className="text-[0.52em] font-semibold" style={{ color: skin.muted }}>
            Total
          </span>
          <span className="text-[0.68em] font-bold">{totalLabel}</span>
        </div>
      ) : null}
      <span
        className={cn(
          "mt-auto flex h-[1.7em] items-center justify-center text-[0.68em] font-bold",
          RADIUS_PILL[skin.radius],
        )}
        style={{ backgroundColor: skin.accent, color: skin.onAccent }}
      >
        {cta}
      </span>
    </div>
  );
}

export function ThemeTryOnPhone({
  item,
  kind,
  storeName,
  logoUrl,
  brandPrimary,
  landingContent,
  products,
  heroUrl,
  size = "md",
  frame = "phone",
  screen,
  view,
  currency,
  className,
}: {
  item: StorefrontTemplateMeta;
  kind: "store" | "landing";
  storeName: string;
  logoUrl?: string | null;
  brandPrimary?: string | null;
  landingContent?: {
    hours?: string | null;
    address?: string | null;
  } | null;
  products?: readonly ThemeTryOnProduct[];
  heroUrl?: string | null;
  size?: "md" | "sm";
  /** Phone bezel, or a crop used as gallery-card art. */
  frame?: "phone" | "card";
  /** Home / product / cart — pane only. Gallery cards stay on home. */
  screen?: ThemeTryOnScreen;
  /** @deprecated Use {@link screen}. */
  view?: ThemeTryOnScreen;
  currency?: string | null;
  className?: string;
}) {
  const skin = item.phone;
  const rootPx = size === "md" ? 9.5 : 6.5;
  const brand = brandPrimary || skin.accent;
  const stock = products ?? [];
  const isCard = frame === "card";
  const page = kind === "store" && !isCard ? (screen ?? view ?? "home") : "home";
  const cartCount = Math.max(stock.length, 1);

  return (
    <div
      className={cn(
        isCard
          ? "w-full overflow-hidden rounded-[1.15em] border border-black/15 shadow-sm"
          : "mx-auto w-full max-w-60 rounded-[2.1em] border border-black/70 bg-[#15161a] p-[0.55em] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]",
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden",
          isCard ? "aspect-[4/5] rounded-[0.2em]" : "aspect-[9/19.2] rounded-[1.7em]",
        )}
        style={{
          backgroundColor: skin.surface,
          color: skin.ink,
          fontFamily: FONT_FAMILIES[skin.font],
          fontSize: `${rootPx}px`,
        }}
      >
        <StatusBar />
        {kind === "store" ? (
          <>
            {skin.layout === "pastry" && page !== "home" ? (
              <p
                className="px-[0.8em] py-[0.32em] text-center text-[0.48em] font-semibold tracking-wide"
                style={{ backgroundColor: brand, color: skin.onAccent }}
              >
                Call / WhatsApp
              </p>
            ) : null}
            {!(skin.layout === "pastry" && page === "home") ? (
              <ShopHeader
                skin={skin}
                storeName={storeName}
                logoUrl={logoUrl}
                brand={brand}
                cartLabel={
                  page === "cart"
                    ? String(cartCount)
                    : skin.layout === "console"
                      ? "+"
                      : skin.layout === "pastry"
                        ? "Bag"
                        : "Cart"
                }
                cartActive={page === "cart"}
              />
            ) : null}
            {page === "product" ? (
              <ProductBody
                skin={skin}
                storeName={storeName}
                product={productAt(stock, 0)}
              />
            ) : page === "cart" ? (
              <CartBody skin={skin} products={stock} currency={currency} />
            ) : (
              <StoreBody
                item={item}
                skin={skin}
                storeName={storeName}
                brand={brand}
                products={stock}
                heroUrl={heroUrl}
              />
            )}
          </>
        ) : (
          <LandingBody
            layout={skin.layout}
            skin={skin}
            storeName={storeName}
            hours={landingContent?.hours}
            address={landingContent?.address}
            products={stock}
          />
        )}
      </div>
    </div>
  );
}
