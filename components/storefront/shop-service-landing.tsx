"use client";

import { ArrowRight, CalendarDays, Clock, ImageIcon, MapPin, MessageCircle, PencilLine, Phone, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useMemo, useRef, useState, type CSSProperties } from "react";

import { ShopBookingView } from "@/components/storefront/shop-booking-view";
import { StorefrontAccountLink, useStorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { buildStorefrontSignInHref } from "@/components/storefront/storefront-sign-in-sheet";
import { useStorefrontLiveDesign, useStorefrontStaffEditOptional } from "@/components/storefront/storefront-staff-edit";
import { updateMyBranding } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { clockLabel, upcomingDays, weekdayKey, type PublicBookingInfo } from "@/lib/public-booking";
import {
  colourPreviewVars,
  isHexColour,
  landingPrice,
  SERVICE_COLOUR_CHOICES,
  SERVICE_STARTER_PHOTOS,
  serviceLookFor,
  weekHours,
} from "@/lib/service-landing";
import { storefrontBookingTextMax, type StorefrontBookingTextKey, type StorefrontDesign } from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

import styles from "./shop-service-landing.module.css";

/**
 * The storefront home of a shop that takes bookings and has no products on show: a photograph,
 * the price list, the team, the booking calendar and how to find the place, in the shop's own
 * colour. Signed-in staff who may edit the shop can change the colour and the photograph here.
 */
export function ShopServiceLanding({
  slug,
  info,
  storeName,
  design,
  ownHeroUrl,
  tagline,
  phone,
  whatsapp,
  address,
  mapUrl,
  primaryHex,
}: {
  slug: string;
  info: PublicBookingInfo;
  storeName: string;
  design: StorefrontDesign | null;
  /** The shop's own photograph when it has one; a starter photograph stands in otherwise. */
  ownHeroUrl: string | null;
  tagline: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  mapUrl: string | null;
  primaryHex: string | null;
}) {
  const router = useRouter();
  const staff = useStorefrontStaffEditOptional();
  const liveDesign = useStorefrontLiveDesign(design);
  const bookRef = useRef<HTMLElement | null>(null);
  const pricesRef = useRef<HTMLElement | null>(null);
  const teamRef = useRef<HTMLElement | null>(null);
  const visitRef = useRef<HTMLElement | null>(null);
  const account = useStorefrontAccountLink();
  const [pick, setPick] = useState<{ serviceId?: string; staffId?: string; nonce: number } | null>(null);

  // Colour: `chosen` repaints the page at once; it is saved to the shop's branding on Save.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [saved, setSaved] = useState<string | null>(primaryHex?.toLowerCase() ?? null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [hexText, setHexText] = useState("");
  const [saving, setSaving] = useState(false);
  const [paletteNote, setPaletteNote] = useState<{ text: string; bad: boolean } | null>(null);

  const photos = useMemo(() => SERVICE_STARTER_PHOTOS[serviceLookFor(info.services.map((s) => s.name))], [info.services]);
  const heroUrl = liveDesign?.photos?.hero?.url?.trim() || ownHeroUrl?.trim() || photos.hero;
  const heroIsOwn = heroUrl !== photos.hero;
  const focal = liveDesign?.photos?.hero;

  const today = upcomingDays(info.timezone, 1)[0] ?? "";
  const branch = info.branches[0] ?? null;
  const oneBranch = info.branches.length === 1;
  const todayKey = today ? weekdayKey(today) : "";
  const todayHours = oneBranch ? branch?.hours?.[todayKey] : undefined;
  const where = address?.trim() || (oneBranch ? branch?.address?.trim() : "") || "";
  // wa.me wants the country code: a local 07… number is a Kenyan one.
  const waRaw = (whatsapp ?? "").replace(/[^0-9]/g, "");
  const waDigits = waRaw.length === 10 && waRaw.startsWith("0") ? `254${waRaw.slice(1)}` : waRaw;

  const go = (target: { current: HTMLElement | null }) => {
    const calm = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.current?.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
  };
  const bookWith = (choice: { serviceId?: string; staffId?: string }) => {
    setPick((prev) => ({ ...choice, nonce: (prev?.nonce ?? 0) + 1 }));
    go(bookRef);
  };

  // Wording: the shop's own where it has set any, the page's usual wording otherwise. While the
  // shop editor is on, each piece can be typed over in place; it is saved with Publish.
  const editing = Boolean(staff?.canEdit && staff.editMode);
  const words = {
    saved: liveDesign?.booking ?? null,
    editing,
    onChange: (key: StorefrontBookingTextKey, value: string) => void staff?.patchBookingText(key, value),
  };

  const preview = chosen ?? (saved !== (primaryHex?.toLowerCase() ?? null) ? saved : null);
  const pageStyle = (preview ? colourPreviewVars(preview) : undefined) as CSSProperties | undefined;

  async function saveColour() {
    if (!chosen || !isHexColour(chosen)) return;
    setSaving(true);
    setPaletteNote(null);
    try {
      await updateMyBranding({ primaryColor: chosen });
      setSaved(chosen);
      setChosen(null);
      setPaletteNote({ text: "Saved. The rest of the shop follows within a minute.", bad: false });
      router.refresh();
    } catch {
      setPaletteNote({ text: "Could not save the colour. Check your connection and try again.", bad: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page} style={pageStyle} data-booking-landing>
      <nav className={styles.nav} aria-label="On this page">
        <ul className={styles.navLinks}>
          <li>
            <button type="button" className={styles.navLink} onClick={() => go(pricesRef)}>
              Prices
            </button>
          </li>
          {info.staff.length > 1 ? (
            <li>
              <button type="button" className={styles.navLink} onClick={() => go(teamRef)}>
                Team
              </button>
            </li>
          ) : null}
          <li>
            <button type="button" className={styles.navLink} onClick={() => go(visitRef)}>
              Find us
            </button>
          </li>
        </ul>
        <div className={styles.navActions}>
          <StorefrontAccountLink className={styles.navSignIn} signUpClassName={styles.navSignUp} signUpLabel="Create account" />
          <button type="button" className={styles.navBook} onClick={() => go(bookRef)}>
            Book a visit
          </button>
        </div>
      </nav>

      <header className={styles.hero}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a merchant or starter photograph from any allowed host */}
        <img
          className={styles.heroPhoto}
          src={heroUrl}
          alt={heroIsOwn ? "" : photos.alt.hero}
          style={focal && heroIsOwn ? { objectPosition: `${focal.focalX}% ${focal.focalY}%` } : undefined}
          fetchPriority="high"
        />
        <div className={styles.scrim} aria-hidden />

        {staff?.canEdit ? (
          <div className={styles.tools}>
            <button
              type="button"
              className={styles.tool}
              aria-expanded={paletteOpen}
              onClick={() => {
                setPaletteOpen((v) => !v);
                setPaletteNote(null);
                setHexText((chosen ?? saved ?? "").toUpperCase());
              }}
            >
              <span className={styles.toolDot} aria-hidden /> Colour
            </button>
            <button type="button" className={styles.tool} onClick={() => staff.openHeroPhoto()}>
              <ImageIcon className="size-4" aria-hidden /> Photo
            </button>
            <button type="button" className={styles.tool} aria-pressed={staff.editMode} onClick={() => staff.setEditMode(!staff.editMode)}>
              <PencilLine className="size-4" aria-hidden /> {staff.editMode ? "Done with text" : "Text"}
            </button>
          </div>
        ) : null}

        {staff?.canEdit && paletteOpen ? (
          <div className={styles.palette} role="group" aria-label="Page colour">
            <p className={styles.paletteTitle}>Your colour</p>
            <p className={styles.paletteHint}>Buttons, the strip under the photo and the calendar take it.</p>
            <div className={styles.swatches}>
              {SERVICE_COLOUR_CHOICES.map((choice) => (
                <button
                  key={choice.hex}
                  type="button"
                  aria-pressed={(chosen ?? saved) === choice.hex}
                  className={cn(styles.swatch, (chosen ?? saved) === choice.hex && styles.swatchOn)}
                  onClick={() => {
                    setChosen(choice.hex);
                    setHexText(choice.hex.toUpperCase());
                    setPaletteNote(null);
                  }}
                >
                  <span className={styles.swatchChip} style={{ background: choice.hex }} aria-hidden />
                  {choice.name}
                </button>
              ))}
            </div>
            <label className={styles.ownColour}>
              Your own
              <input
                type="color"
                value={isHexColour(chosen ?? saved ?? "") ? (chosen ?? saved)! : "#1d4b3b"}
                onChange={(e) => {
                  setChosen(e.target.value.toLowerCase());
                  setHexText(e.target.value.toUpperCase());
                  setPaletteNote(null);
                }}
              />
              <input
                className={styles.hexInput}
                aria-label="Colour code"
                placeholder="#1D4B3B"
                maxLength={7}
                value={hexText}
                onChange={(e) => {
                  const text = e.target.value.trim();
                  setHexText(text);
                  if (isHexColour(text)) setChosen(text.toLowerCase());
                }}
              />
            </label>
            <div className={styles.paletteActions}>
              <button type="button" className={styles.paletteSave} disabled={saving || !chosen || chosen === saved} onClick={() => void saveColour()}>
                {saving ? "Saving…" : "Save colour"}
              </button>
              <button
                type="button"
                className={styles.paletteCancel}
                onClick={() => {
                  setChosen(null);
                  setPaletteOpen(false);
                }}
              >
                {chosen ? "Undo" : "Close"}
              </button>
            </div>
            {paletteNote ? (
              <p role="status" className={cn(styles.paletteNote, paletteNote.bad && styles.paletteError)}>
                {paletteNote.text}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className={styles.heroInner}>
          {editing ? (
            <p className={styles.editHint} role="status">
              Tap any heading or line to change it. Clear one to get the usual wording back. Then press Publish at the top of the page.
            </p>
          ) : null}
          <Words as="h1" k="headline" className={styles.heroTitle} fallback={storeName} {...words} />
          <Words as="p" k="line" className={styles.heroLine} fallback={tagline?.trim() || "Book your visit online. Pay at the shop."} {...words} />
          <div className={styles.heroActions}>
            <button type="button" className={styles.cta} onClick={() => go(bookRef)}>
              <CalendarDays className="size-5" aria-hidden /> Book a visit
            </button>
            <button type="button" className={styles.ctaGhost} onClick={() => go(pricesRef)}>
              See the price list
            </button>
          </div>
        </div>
      </header>

      <div className={styles.strip}>
        {oneBranch && branch?.hours ? (
          <span className={styles.fact}>
            <Clock className="size-4" aria-hidden />
            {todayHours ? `Open for bookings today, ${clockLabel(todayHours.open)} to ${clockLabel(todayHours.close)}` : "No bookings today"}
          </span>
        ) : null}
        {where ? (
          <span className={styles.fact}>
            <MapPin className="size-4" aria-hidden />
            {where}
          </span>
        ) : null}
        {info.staff.length > 1 ? (
          <span className={styles.fact}>
            <Users className="size-4" aria-hidden />
            {info.staff.length} on the team
          </span>
        ) : null}
        <span className={styles.fact}>
          <Wallet className="size-4" aria-hidden />
          Pay at the shop
        </span>
      </div>

      <section ref={pricesRef} className={styles.section} aria-labelledby="sl-prices">
        <div className={cn(styles.menu, info.services.length <= 3 && styles.menuShort)}>
          <div className={cn(styles.photo, styles.menuPhoto, info.services.length <= 3 && styles.menuPhotoShort)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- starter photograph */}
            <img src={photos.menu} alt={photos.alt.menu} loading="lazy" />
          </div>
          <div>
            <div className={styles.sectionHead}>
              <Words as="h2" id="sl-prices" k="pricesTitle" className={styles.h2} fallback="Price list" {...words} />
              <Words as="p" k="pricesLede" className={styles.lede} fallback="Tap a service to pick a day and time for it." {...words} />
            </div>
            <ul className={styles.prices}>
              {info.services.map((service) => (
                <li key={service.id}>
                  <button type="button" className={styles.priceRow} onClick={() => bookWith({ serviceId: service.id })}>
                    <span className={styles.priceTop}>
                      <span className={styles.priceName}>{service.name}</span>
                      <span className={styles.leader} aria-hidden />
                      <span className={styles.priceAmount}>
                        {service.priceIsVariable ? "from " : ""}
                        {landingPrice(service.price, info.currency, formatMoney)}
                      </span>
                    </span>
                    <span className={styles.priceMeta}>
                      <span>
                        {service.durationMinutes} min
                        {service.description ? ` · ${service.description}` : ""}
                      </span>
                      <span className={styles.priceBook}>
                        Book <ArrowRight className="size-4" aria-hidden />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {info.staff.length > 1 ? (
        <section ref={teamRef} className={styles.section} aria-labelledby="sl-team">
          <div className={styles.sectionHead}>
            <Words as="h2" id="sl-team" k="teamTitle" className={styles.h2} fallback="Who you will see" {...words} />
            <Words
              as="p"
              k="teamLede"
              className={styles.lede}
              fallback="Have someone in mind? Book with them. Otherwise take whoever is free first."
              {...words}
            />
          </div>
          <ul className={styles.team}>
            {info.staff.map((person) => (
              <li key={person.id}>
                <button type="button" className={cn(styles.member, "w-full")} onClick={() => bookWith({ staffId: person.id })}>
                  <span className={styles.initial} aria-hidden>
                    {person.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <span className={styles.memberName}>{person.name}</span>
                    <span className={styles.memberBook}>Book with {person.name}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section ref={bookRef} className={styles.section} aria-labelledby="sl-book">
        <div className={styles.sectionHead}>
          <Words as="h2" id="sl-book" k="bookTitle" className={styles.h2} fallback="Pick your day" {...words} />
          <Words as="p" k="bookLede" className={styles.lede} fallback="Days with dots have room. Nothing to pay now, and no account needed." {...words} />
        </div>
        <ShopBookingView slug={slug} initialInfo={info} embedded pick={pick} />
      </section>

      <section ref={visitRef} className={styles.section} aria-labelledby="sl-visit">
        <div className={styles.visit}>
          <div className={cn(styles.photo, styles.visitPhoto)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- starter photograph */}
            <img src={photos.visit} alt={photos.alt.visit} loading="lazy" />
          </div>
          <div>
            <Words as="h2" id="sl-visit" k="visitTitle" className={styles.h2} fallback="Find us" {...words} />
            {where ? (
              <p className={styles.address}>
                <MapPin className="mt-1 size-5 shrink-0" aria-hidden />
                {where}
              </p>
            ) : null}
            {oneBranch && branch?.hours ? (
              <table className={styles.hours}>
                <caption className="sr-only">Hours for booking</caption>
                <tbody>
                  {weekHours(branch.hours, todayKey).map((row) => (
                    <tr key={row.key} className={cn(row.today && styles.hoursToday, !row.hours && styles.hoursClosed)}>
                      <th scope="row">
                        {row.day}
                        {row.today ? " (today)" : ""}
                      </th>
                      <td>{row.hours ?? "Closed"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            <div className={styles.contact}>
              {phone?.trim() ? (
                <a className={styles.contactLink} href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>
                  <Phone className="size-4" aria-hidden /> Call {phone.trim()}
                </a>
              ) : null}
              {waDigits.length >= 9 ? (
                <a className={styles.contactLink} href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" aria-hidden /> WhatsApp
                </a>
              ) : null}
              {mapUrl && /^https:\/\//i.test(mapUrl.trim()) ? (
                <a className={styles.contactLink} href={mapUrl.trim()} target="_blank" rel="noopener noreferrer">
                  <MapPin className="size-4" aria-hidden /> Directions
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <p className={styles.footerName}>{storeName}</p>
            <p className={styles.footerLine}>{liveDesign?.booking?.line?.trim() || tagline?.trim() || "Book your visit online. Pay at the shop."}</p>
            <button type="button" className={styles.footerBook} onClick={() => go(bookRef)}>
              <CalendarDays className="size-5" aria-hidden /> Book a visit
            </button>
          </div>

          <div>
            <h2 className={styles.footerHead}>Visit</h2>
            <ul className={styles.footerList}>
              {where ? <li>{where}</li> : null}
              {oneBranch && branch?.hours ? (
                <li>{todayHours ? `Today ${clockLabel(todayHours.open)} to ${clockLabel(todayHours.close)}` : "No bookings today"}</li>
              ) : null}
              <li>
                <button type="button" className={styles.footerLink} onClick={() => go(visitRef)}>
                  All opening hours
                </button>
              </li>
            </ul>
          </div>

          {phone?.trim() || waDigits.length >= 9 ? (
            <div>
              <h2 className={styles.footerHead}>Contact</h2>
              <ul className={styles.footerList}>
                {phone?.trim() ? (
                  <li>
                    <a className={styles.footerLink} href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>
                      Call {phone.trim()}
                    </a>
                  </li>
                ) : null}
                {waDigits.length >= 9 ? (
                  <li>
                    <a className={styles.footerLink} href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener noreferrer">
                      WhatsApp
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <div>
            <h2 className={styles.footerHead}>Your account</h2>
            <ul className={styles.footerList}>
              <li>
                <a className={styles.footerLink} href={account.href} onClick={account.onActivate}>
                  {account.label}
                </a>
              </li>
              {!account.signedIn ? (
                <li>
                  <a className={styles.footerLink} href={account.signUpHref} onClick={account.onSignUpActivate}>
                    Create account
                  </a>
                </li>
              ) : null}
              <li>
                <button type="button" className={styles.footerLink} onClick={() => go(pricesRef)}>
                  Price list
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>
            © {today.slice(0, 4) || new Date().getFullYear()} {storeName}
          </p>
          {!account.signedIn ? (
            <a className={styles.footerLink} href={buildStorefrontSignInHref({ path: "/", door: "staff" })}>
              Staff sign in
            </a>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

/**
 * One piece of wording on the page. For visitors it is plain text. While the shop editor is on it
 * can be typed over in place, keeping the page's own lettering, and is staged on leaving the field.
 */
function Words({
  as,
  k,
  fallback,
  saved,
  editing,
  onChange,
  className,
  id,
}: {
  as: "h1" | "h2" | "p";
  k: StorefrontBookingTextKey;
  fallback: string;
  saved: Partial<Record<StorefrontBookingTextKey, string>> | null;
  editing: boolean;
  onChange: (key: StorefrontBookingTextKey, value: string) => void;
  className?: string;
  id?: string;
}) {
  const own = saved?.[k]?.trim() || "";
  const text = own || fallback;
  if (!editing) return createElement(as, { className, id }, text);
  const max = storefrontBookingTextMax(k);
  return createElement(
    as,
    { className, id },
    <span
      // Remounts when the wording changes elsewhere (undo, discard), so the field shows what is staged.
      key={text}
      className={styles.editable}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={`Change this wording (at most ${max} characters)`}
      spellCheck
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          e.currentTarget.textContent = text;
          e.currentTarget.blur();
        }
      }}
      onPaste={(e) => {
        // Plain words only: nothing pasted may bring markup with it.
        e.preventDefault();
        const pasted = e.clipboardData.getData("text/plain").replace(/\s+/g, " ");
        document.execCommand("insertText", false, pasted);
      }}
      onBlur={(e) => {
        const typed = (e.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, max);
        if (typed === text) return;
        // Cleared, or typed back to the usual wording: nothing of the shop's own is kept.
        const next = typed === fallback ? "" : typed;
        if (!typed) e.currentTarget.textContent = fallback;
        if (next !== own) onChange(k, next);
      }}
    >
      {text}
    </span>,
  );
}
