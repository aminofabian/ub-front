import { readableInkOn } from "./color-contrast";
import { clockLabel } from "./public-booking";

/**
 * What the service landing page (the storefront home of a shop that takes bookings and has no
 * products on show) needs besides the booking data: starter photographs, colour choices and the
 * week's hours laid out for reading.
 */

export type ServiceLook = "barber" | "salon" | "spa" | "nails";

export type ServiceLandingPhotos = {
  /** Wide, behind the headline. */
  hero: string;
  /** Tall, beside the price list. */
  menu: string;
  /** Beside the hours and address. */
  visit: string;
  alt: { hero: string; menu: string; visit: string };
};

const unsplash = (id: string, width: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=70`;

/**
 * Starter photographs (Unsplash, free to use) so a new shop's page is not bare. They are stand-ins:
 * the shop's own hero photo replaces the first one as soon as it is set in the shop editor.
 */
export const SERVICE_STARTER_PHOTOS: Record<ServiceLook, ServiceLandingPhotos> = {
  barber: {
    hero: unsplash("1585747860715-2ba37e788b70", 1800),
    menu: unsplash("1621605815971-fbc98d665033", 1000),
    visit: unsplash("1622286342621-4bd786c2447c", 1000),
    alt: {
      hero: "Barber chairs facing a row of mirrors under warm lamps",
      menu: "Clippers, scissors and a comb laid out on a wooden counter",
      visit: "A barber combing a fresh fade",
    },
  },
  salon: {
    hero: unsplash("1560066984-138dadb4c035", 1800),
    menu: unsplash("1522337360788-8b13dee7a37e", 1000),
    visit: unsplash("1560066984-138dadb4c035", 1000),
    alt: {
      hero: "A bright salon with styling chairs along tall windows",
      menu: "Long styled hair seen from behind",
      visit: "Styling chairs along tall windows",
    },
  },
  spa: {
    hero: unsplash("1544161515-4ab6ce6db874", 1800),
    menu: unsplash("1544161515-4ab6ce6db874", 1000),
    visit: unsplash("1560066984-138dadb4c035", 1000),
    alt: {
      hero: "A therapist pouring oil before a massage",
      menu: "A therapist pouring oil before a massage",
      visit: "A bright, calm treatment room",
    },
  },
  nails: {
    hero: unsplash("1604654894610-df63bc536371", 1800),
    menu: unsplash("1604654894610-df63bc536371", 1000),
    visit: unsplash("1560066984-138dadb4c035", 1000),
    alt: {
      hero: "A hand with glossy black and tortoiseshell nails",
      menu: "A hand with glossy black and tortoiseshell nails",
      visit: "A bright studio with chairs along tall windows",
    },
  },
};

const LOOK_WORDS: [ServiceLook, RegExp][] = [
  ["nails", /\b(nail|nails|manicure|pedicure|gel|acrylic)/i],
  ["spa", /\b(spa|massage|facial|scrub|sauna|steam|wax)/i],
  ["salon", /\b(braid|braids|weave|wig|blow ?dry|relax|retouch|locs|dreadlock|salon|wash and set|cornrow)/i],
  ["barber", /\b(haircut|cut|shave|beard|fade|trim|kinyozi|barber)/i],
];

/** Which starter photographs suit the shop, judged from what it sells. Barber when nothing says otherwise. */
export function serviceLookFor(serviceNames: readonly string[]): ServiceLook {
  const score: Record<ServiceLook, number> = { barber: 0, salon: 0, spa: 0, nails: 0 };
  for (const name of serviceNames) {
    for (const [look, words] of LOOK_WORDS) {
      if (words.test(name)) score[look] += 1;
    }
  }
  let best: ServiceLook = "barber";
  for (const look of ["salon", "spa", "nails"] as const) {
    if (score[look] > score[best]) best = look;
  }
  return best;
}

/** Colours offered first when a shop dresses its page; any other colour can be typed or picked. */
export const SERVICE_COLOUR_CHOICES: { name: string; hex: string }[] = [
  { name: "Forest", hex: "#1d4b3b" },
  { name: "Ink", hex: "#16181d" },
  { name: "Navy", hex: "#1b2f52" },
  { name: "Oxblood", hex: "#6e1f2a" },
  { name: "Terracotta", hex: "#a55237" },
  { name: "Plum", hex: "#4a2545" },
  { name: "Teal", hex: "#0f5c63" },
  { name: "Mustard", hex: "#c79a2b" },
];

export const isHexColour = (value: string): boolean => /^#[0-9a-f]{6}$/i.test(value.trim());

/**
 * The CSS variables that repaint the page in a colour straight away, before the shop's saved
 * branding has been read again. Text on the colour is dark or light, whichever reads.
 */
export function colourPreviewVars(hex: string): Record<string, string> {
  const colour = hex.trim().toLowerCase();
  if (!isHexColour(colour)) return {};
  const ink = readableInkOn(colour);
  return {
    "--storefront-brand": colour,
    "--primary": colour,
    "--primary-foreground": ink,
    "--ring": colour,
  };
}

const DAY_ROWS: [string, string][] = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
];

/** The week as a table to read: each day with its hours, or closed. */
export function weekHours(
  hours: Record<string, { open: string; close: string }> | undefined,
  todayKey: string,
): { key: string; day: string; hours: string | null; today: boolean }[] {
  return DAY_ROWS.map(([key, day]) => {
    const h = hours?.[key];
    return { key, day, hours: h ? `${clockLabel(h.open)} to ${clockLabel(h.close)}` : null, today: key === todayKey };
  });
}

/** "Ksh 300" from 300; cents stay when there are any. */
export function landingPrice(amount: number, currency: string, format: (n: number, c: string) => string): string {
  return format(amount, currency).replace(/\.00$/, "");
}
