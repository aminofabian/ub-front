"use client";

import { Clock, ImageIcon, MapPin, MessageCircle, Phone } from "lucide-react";
import { useMemo, useRef, type CSSProperties } from "react";

import { buildStorefrontSignInHref } from "@/components/storefront/storefront-sign-in-sheet";
import { useStorefrontLiveDesign, useStorefrontStaffEditOptional } from "@/components/storefront/storefront-staff-edit";
import { formatMoney } from "@/lib/money";
import { menuSections, platesToShow, type PublicMenu, type PublicMenuDish } from "@/lib/public-menu";
import { colourPreviewVars, landingPrice } from "@/lib/service-landing";
import type { StorefrontDesign } from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

import styles from "./shop-restaurant-landing.module.css";

/** Below this, a heading stays one column. Two columns with two or three dishes leaves a blank half. */
const DISHES_BEFORE_TWO_COLUMNS = 4;

/**
 * The storefront home of a restaurant or bar that has put its menu on its web page: the place, the
 * menu as it would be printed (headings, dishes, prices, pictures where the house has taken any)
 * and how to find or call it. Nothing is ordered here; it is the card in the window.
 */
export function ShopRestaurantLanding({
  menu,
  storeName,
  design,
  ownHeroUrl,
  tagline,
  phone,
  whatsapp,
  address,
  hours,
  mapUrl,
  primaryHex,
}: {
  menu: PublicMenu;
  storeName: string;
  design: StorefrontDesign | null;
  /** The restaurant's own photograph of the place, when it has one. */
  ownHeroUrl: string | null;
  tagline: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  /** Opening hours as the restaurant wrote them. */
  hours: string | null;
  mapUrl: string | null;
  primaryHex: string | null;
}) {
  const staff = useStorefrontStaffEditOptional();
  const liveDesign = useStorefrontLiveDesign(design);
  const menuRef = useRef<HTMLElement | null>(null);
  const visitRef = useRef<HTMLElement | null>(null);

  const sections = useMemo(() => menuSections(menu), [menu]);
  const plates = useMemo(() => platesToShow(menu.dishes, 3), [menu.dishes]);
  const money = (amount: number) => landingPrice(amount, menu.currency, formatMoney);

  const heroUrl = liveDesign?.photos?.hero?.url?.trim() || ownHeroUrl?.trim() || null;
  const focal = liveDesign?.photos?.hero;
  // With no photograph of the place, the best-looking plate stands at the top instead.
  const lead = heroUrl ? null : (plates[0] ?? null);
  const morePlates = lead ? plates.slice(1) : plates;

  const oneBranch = menu.branches.length === 1;
  const where = address?.trim() || (oneBranch ? menu.branches[0]?.address?.trim() : "") || "";
  const telHref = phone?.trim() ? `tel:${phone.replace(/[^0-9+]/g, "")}` : null;
  // wa.me wants the country code: a local 07… number is a Kenyan one.
  const waRaw = (whatsapp ?? "").replace(/[^0-9]/g, "");
  const waDigits = waRaw.length === 10 && waRaw.startsWith("0") ? `254${waRaw.slice(1)}` : waRaw;
  const waHref = waDigits.length >= 9 ? `https://wa.me/${waDigits}` : null;
  const directions = mapUrl && /^https:\/\//i.test(mapUrl.trim()) ? mapUrl.trim() : null;

  const go = (target: HTMLElement | null) => {
    const calm = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
  };

  const pageStyle = (primaryHex ? colourPreviewVars(primaryHex) : undefined) as CSSProperties | undefined;

  return (
    <div className={styles.page} style={pageStyle} data-restaurant-landing>
      <nav className={styles.nav} aria-label={storeName}>
        <p className={styles.navName}>{storeName}</p>
        <div className={styles.navLinks}>
          <button type="button" className={styles.navLink} onClick={() => go(menuRef.current)}>
            Menu
          </button>
          <button type="button" className={styles.navLink} onClick={() => go(visitRef.current)}>
            Find us
          </button>
          <a className={styles.navStaff} href={buildStorefrontSignInHref({ path: "/", door: "staff" })}>
            Staff
          </a>
          {telHref ? (
            <a className={styles.navCall} href={telHref}>
              <Phone className="size-4" aria-hidden /> Call
            </a>
          ) : null}
        </div>
      </nav>

      <header className={cn(styles.hero, !heroUrl && !lead && styles.heroPlain)}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>{storeName}</h1>
          <p className={styles.heroLine}>{tagline?.trim() || (menu.dishes.length > 0 ? "Cooked to order. Have a look at what is on today." : "Cooked to order. Our menu will be here shortly.")}</p>
          <div className={styles.heroActions}>
            <button type="button" className={styles.cta} onClick={() => go(menu.dishes.length > 0 ? menuRef.current : visitRef.current)}>
              {menu.dishes.length > 0 ? "See the menu" : "Find us"}
            </button>
            {telHref ? (
              <a className={styles.ctaGhost} href={telHref}>
                <Phone className="size-4" aria-hidden /> {phone!.trim()}
              </a>
            ) : waHref ? (
              <a className={styles.ctaGhost} href={waHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" aria-hidden /> WhatsApp us
              </a>
            ) : null}
          </div>
        </div>

        {heroUrl ? (
          <figure className={styles.heroFigure}>
            {/* eslint-disable-next-line @next/next/no-img-element -- the restaurant's own photograph from any allowed host */}
            <img
              className={styles.heroPhoto}
              src={heroUrl}
              alt=""
              style={focal ? { objectPosition: `${focal.focalX}% ${focal.focalY}%` } : undefined}
              fetchPriority="high"
            />
          </figure>
        ) : lead ? (
          <figure className={styles.heroFigure}>
            {/* eslint-disable-next-line @next/next/no-img-element -- the restaurant's own picture of the dish */}
            <img className={styles.heroPhoto} src={lead.imageUrl!} alt={lead.name} fetchPriority="high" />
            <figcaption className={styles.heroCaption}>
              <span>{lead.name}</span>
              <span className={styles.captionPrice}>{money(lead.price)}</span>
            </figcaption>
          </figure>
        ) : (
          <TodayCard dishes={sections.flatMap((s) => s.dishes)} money={money} />
        )}

        {staff?.canEdit ? (
          <button type="button" className={styles.tool} onClick={() => staff.openHeroPhoto()}>
            <ImageIcon className="size-4" aria-hidden /> {heroUrl ? "Change photo" : "Add a photo of the place"}
          </button>
        ) : null}
      </header>

      {where || hours?.trim() || menu.dishes.length > 0 ? (
        <div className={styles.strip}>
          {hours?.trim() ? (
            <span className={styles.fact}>
              <Clock className="size-4" aria-hidden />
              {hours.trim()}
            </span>
          ) : null}
          {where ? (
            <span className={styles.fact}>
              <MapPin className="size-4" aria-hidden />
              {where}
            </span>
          ) : null}
          {menu.dishes.length > 0 ? (
            <span className={styles.fact}>
              {menu.dishes.length} on the menu
              {sections.length > 1 ? ` under ${sections.length} headings` : ""}
            </span>
          ) : null}
        </div>
      ) : null}

      {morePlates.length >= 2 ? (
        <section className={styles.plates} aria-label="From the kitchen">
          {morePlates.map((dish) => (
            <figure key={dish.id} className={styles.plate}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the restaurant's own picture of the dish */}
              <img src={dish.imageUrl!} alt={dish.name} loading="lazy" decoding="async" className={styles.platePhoto} />
              <figcaption className={styles.plateCaption}>
                <span>{dish.name}</span>
                <span className={styles.captionPrice}>{money(dish.price)}</span>
              </figcaption>
            </figure>
          ))}
        </section>
      ) : null}

      <section ref={menuRef} className={styles.menu} aria-labelledby="rl-menu">
        <div className={styles.menuHead}>
          <h2 id="rl-menu" className={styles.h2}>
            The menu
          </h2>
          <p className={styles.lede}>Prices in {menu.currency === "KES" ? "Kenya shillings" : menu.currency}. Ask us about anything you do not see.</p>
        </div>

        {sections.length > 1 ? (
          <div className={styles.tabs} role="navigation" aria-label="Menu headings">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={styles.tab}
                onClick={() => go(document.getElementById(section.id))}
              >
                {section.title}
              </button>
            ))}
          </div>
        ) : null}

        {sections.length === 0 ? (
          <p className={styles.menuSoon}>The menu is being written. Call us, or come by, to hear what is on today.</p>
        ) : null}

        {sections.map((section) => {
          const oneColumn = section.dishes.length < DISHES_BEFORE_TWO_COLUMNS;
          return (
            <section
              key={section.id}
              id={section.id}
              className={cn(styles.section, oneColumn && styles.sectionNarrow)}
              aria-label={section.title ?? "Menu"}
            >
              {section.title ? (
                <h3 className={styles.h3}>
                  <span>{section.title}</span>
                  <span className={styles.count}>{section.dishes.length}</span>
                </h3>
              ) : null}
              <ul className={cn(styles.dishes, oneColumn && styles.dishesStack)}>
                {section.dishes.map((dish) => (
                  <li key={dish.id} className={cn(styles.dish, !dish.servedNow && styles.dishOff)}>
                    {dish.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- the restaurant's own picture of the dish
                      <img src={dish.imageUrl} alt="" loading="lazy" decoding="async" className={styles.dishPhoto} />
                    ) : null}
                    <div className={styles.dishBody}>
                      <p className={styles.dishTop}>
                        <span className={styles.dishName}>{dish.name}</span>
                        <span className={styles.leader} aria-hidden />
                        <span className={styles.dishPrice}>{money(dish.price)}</span>
                      </p>
                      {dish.description ? <p className={styles.dishLine}>{dish.description}</p> : null}
                      {!dish.servedNow ? <p className={styles.dishNote}>Not being served right now</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </section>

      <section ref={visitRef} className={styles.visit} aria-labelledby="rl-visit">
        <h2 id="rl-visit" className={styles.h2}>
          Find us
        </h2>
        <div className={styles.visitGrid}>
          <div>
            {oneBranch || menu.branches.length === 0 ? (
              // With no address written down, the branch's own name still says where.
              <p className={styles.visitWhere}>{where || menu.branches[0]?.name || storeName}</p>
            ) : (
              <ul className={styles.branches}>
                {menu.branches.map((branch) => (
                  <li key={branch.name}>
                    <span className={styles.branchName}>{branch.name}</span>
                    {branch.address?.trim() ? <span className={styles.branchWhere}>{branch.address.trim()}</span> : null}
                  </li>
                ))}
              </ul>
            )}
            {hours?.trim() ? <p className={styles.visitHours}>{hours.trim()}</p> : null}
          </div>
          <div className={styles.contact}>
            {telHref ? (
              <a className={styles.contactLink} href={telHref}>
                <Phone className="size-4" aria-hidden /> Call {phone!.trim()}
              </a>
            ) : null}
            {waHref ? (
              <a className={styles.contactLink} href={waHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            ) : null}
            {directions ? (
              <a className={styles.contactLink} href={directions} target="_blank" rel="noopener noreferrer">
                <MapPin className="size-4" aria-hidden /> Directions
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          © {new Date().getFullYear()} {storeName}
        </p>
      </footer>
    </div>
  );
}

/** With no photograph at all, the top of the page carries a slip of what is on: real dishes, real prices. */
function TodayCard({ dishes, money }: { dishes: PublicMenuDish[]; money: (amount: number) => string }) {
  const first = dishes.filter((d) => d.servedNow).slice(0, 5);
  if (first.length === 0) return null;
  return (
    <aside className={styles.card} aria-label="On the menu">
      <p className={styles.cardHead}>On the menu</p>
      <ul className={styles.cardList}>
        {first.map((dish) => (
          <li key={dish.id} className={styles.cardRow}>
            <span>{dish.name}</span>
            <span className={styles.leader} aria-hidden />
            <span className={styles.dishPrice}>{money(dish.price)}</span>
          </li>
        ))}
      </ul>
      {dishes.length > first.length ? <p className={styles.cardMore}>and {dishes.length - first.length} more below</p> : null}
    </aside>
  );
}
