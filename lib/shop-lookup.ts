/**
 * Mirrors backend {@code PublicHostResolverService#nameToSlug} so landing
 * shop-finder previews match the subdomain we will look up.
 * Keeps hyphens. New shop addresses use {@link suggestShopHandle} instead.
 */
export function businessNameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Legal and glue words dropped only when the full address would be hard to spell. */
const SHOP_HANDLE_GLUE = new Set([
  "and",
  "the",
  "of",
  "for",
  "co",
  "ltd",
  "limited",
  "plc",
  "company",
  "enterprise",
  "enterprises",
  "holdings",
  "group",
  "international",
]);

/** Words offered as a shorter chip, kept in the address while it still fits. */
const SHOP_HANDLE_TRIM = new Set([
  "shop",
  "shops",
  "store",
  "stores",
  "supermarket",
  "minimart",
  "mart",
  "mini",
  "market",
  "general",
  "traders",
  "trading",
  "kiosk",
  "duka",
  "groceries",
  "grocery",
  "hardware",
  "pharmacy",
  "chemist",
  "chemists",
  "services",
  "service",
]);

/** Past this, the suggested address drops glue words, then extra words. */
const SHOP_HANDLE_SOFT_MAX = 16;

export function shopHandleWords(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
}

/**
 * Default shop address from a business name. Words run together.
 * A hyphen is never inserted — the owner types one if they want it.
 * Long names keep the part people will actually say.
 */
export function suggestShopHandle(name: string): string {
  const parts = shopHandleWords(name);
  if (parts.length === 0) {
    return "";
  }
  const compact = parts.join("");
  if (compact.length <= SHOP_HANDLE_SOFT_MAX) {
    return compact;
  }
  const withoutGlue = parts.filter((word) => !SHOP_HANDLE_GLUE.has(word));
  const body = withoutGlue.length > 0 ? withoutGlue : parts;
  const glued = body.join("");
  if (glued.length >= 2 && glued.length <= SHOP_HANDLE_SOFT_MAX) {
    return glued;
  }
  const head = body.slice(0, 2).join("");
  if (head.length >= 2 && head.length <= SHOP_HANDLE_SOFT_MAX) {
    return head;
  }
  const first = body[0] ?? compact;
  return first.slice(0, SHOP_HANDLE_SOFT_MAX);
}

/** Shorter addresses the owner can tap. Never includes a hyphen. */
export function shorterShopHandles(name: string, current: string): string[] {
  const parts = shopHandleWords(name);
  const needle = current.trim().toLowerCase();
  if (parts.length === 0 || needle.length < 2) {
    return [];
  }
  const spoken = parts.filter(
    (word) => !SHOP_HANDLE_GLUE.has(word) && !SHOP_HANDLE_TRIM.has(word) && word.length > 1,
  );
  const candidates: string[] = [];
  const push = (value: string) => {
    const handle = value.replace(/[^a-z0-9]/g, "");
    if (handle.length < 2 || handle === needle || handle.length >= needle.length) {
      return;
    }
    if (candidates.includes(handle)) {
      return;
    }
    candidates.push(handle);
  };

  if (spoken.length > 0) {
    push(spoken.join(""));
  }
  if (spoken.length >= 2) {
    push(spoken.slice(0, 2).join(""));
  }
  const lead = spoken[0] ?? parts.find((word) => word.length > 1) ?? "";
  if (lead) {
    push(lead);
  }
  const last = spoken.length > 1 ? spoken[spoken.length - 1] : "";
  if (last) {
    push(last);
  }
  return candidates.slice(0, 3);
}

/**
 * One line of coaching beside the address field.
 * Mentions a hyphen only before one exists, or after the owner typed one.
 */
export function shopAddressAdvice(businessName: string, shopSlug: string): string {
  const name = businessName.trim();
  const slug = shopSlug.trim().toLowerCase();
  if (!name || slug.length < 2) {
    return "We’ll build an address from the name. A hyphen appears only if you type one.";
  }
  if (slug.includes("-")) {
    return "The hyphen stays, because you typed it.";
  }
  const raw = shopHandleWords(name).join("");
  const options = shorterShopHandles(name, slug);
  if (raw.length > SHOP_HANDLE_SOFT_MAX && slug.length < raw.length) {
    return "That’s a long name to spell on a phone. This keeps the part people will remember.";
  }
  if (options.length > 0) {
    return "Say it out loud. If you stumble, pick a shorter one.";
  }
  return "Easy to say, easy to type, and easy to send on WhatsApp.";
}

/** What the address field keeps while the owner is typing. Hyphens stay if typed. */
export function keepTypedShopAddress(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** Handle sent when creating a shop. Typed hyphens survive; the name is the fallback. */
export function shopAddressToSubmit(shopSlug: string, businessName: string): string {
  return businessNameToSlug(shopSlug) || suggestShopHandle(businessName);
}

/**
 * Accepts a business name, slug, or pasted shop host/URL and returns a
 * lookup query suitable for {@code resolve-by-shop}.
 */
export function normalizeShopLookupQuery(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  let candidate = trimmed;
  if (/^https?:\/\//i.test(candidate)) {
    try {
      candidate = new URL(candidate).hostname;
    } catch {
      /* keep raw */
    }
  }

  const hostOnly = candidate
    .replace(/^www\./i, "")
    .split("/")[0]
    ?.trim()
    .toLowerCase();

  if (hostOnly && hostOnly.includes(".")) {
    const left = hostOnly.split(".")[0]?.trim() ?? "";
    return left || hostOnly;
  }

  return trimmed;
}
