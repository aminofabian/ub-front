import { PLATFORM_DOMAIN } from "@/lib/config";

export type WorkspaceMode =
  | "overview"
  | "compose"
  | "analytics"
  | "people"
  | "templates"
  | "automations";

export type CampaignNavId =
  | "overview"
  | "all"
  | "drafts"
  | "scheduled"
  | "sending"
  | "sent"
  | "archived"
  | "templates"
  | "audiences"
  | "library"
  | "ai-drafts"
  | "automations"
  | "people";

export type CampaignType =
  | "email"
  | "onboarding"
  | "re-engagement"
  | "feature"
  | "promotional"
  | "educational"
  | "transactional"
  | "announcement"
  | "custom";

export type FilterGroup = "merchant" | "store" | "catalog";

export type AudienceFilter = {
  id: string;
  group: FilterGroup;
  label: string;
  hint: string;
  /** Live email-recipient API segment. */
  segment: string;
};

export type IntentId =
  | "activate"
  | "upgrade"
  | "storefront"
  | "catalog"
  | "feature"
  | "reengage"
  | "custom";

export type EmailBlockKind =
  | "heading"
  | "paragraph"
  | "button"
  | "image"
  | "divider"
  | "features"
  | "product"
  | "announcement"
  | "testimonial"
  | "footer";

export type EmailBlock = {
  id: string;
  kind: EmailBlockKind;
  html: string;
};

export type CampaignTemplate = {
  id: string;
  family: string;
  name: string;
  type: CampaignType;
  subject: string;
  previewText: string;
  body: string;
  cta: string;
  openRate: number;
};

export const VARIABLES = [
  "name",
  "businessName",
  "shopUrl",
  "businessType",
  "plan",
  "productCount",
  "branchCount",
  "lastLogin",
  "setupProgress",
  "customDomain",
  "continueUrl",
  "email",
] as const;

export const TYPES: { id: CampaignType | "all"; label: string }[] = [
  { id: "all", label: "All types" },
  { id: "onboarding", label: "Onboarding" },
  { id: "announcement", label: "Product announcement" },
  { id: "re-engagement", label: "Re-engagement" },
  { id: "feature", label: "Feature announcement" },
  { id: "promotional", label: "Promotional" },
  { id: "educational", label: "Educational" },
  { id: "transactional", label: "Transactional" },
  { id: "custom", label: "Custom" },
];

export const FILTERS: AudienceFilter[] = [
  {
    id: "all",
    group: "merchant",
    label: "All merchants",
    hint: "Every shop — preferred owner or admin contact",
    segment: "selected_tenants",
  },
  {
    id: "individual",
    group: "merchant",
    label: "Individual",
    hint: "Pick one or more specific people",
    segment: "selected_users",
  },
  {
    id: "setup",
    group: "merchant",
    label: "Setup incomplete",
    hint: "Stuck after signup",
    segment: "stuck_signup",
  },
  {
    id: "verified",
    group: "merchant",
    label: "Email unverified",
    hint: "Owner has not confirmed inbox",
    segment: "unverified_owners",
  },
];

/** Default when the composer has no audience chip selected. */
export const DEFAULT_AUDIENCE_FILTER_ID = "setup";

export function resolveAudienceSegment(
  filterIds: string[],
): { filterId: string; segment: string } {
  const match = FILTERS.find((f) => filterIds.includes(f.id));
  if (match) {
    return { filterId: match.id, segment: match.segment };
  }
  const fallback = FILTERS.find((f) => f.id === DEFAULT_AUDIENCE_FILTER_ID)!;
  return { filterId: fallback.id, segment: fallback.segment };
}

export const INTENTS: {
  id: IntentId;
  title: string;
  body: string;
  type: CampaignType;
  defaultFilters: string[];
}[] = [
  {
    id: "activate",
    title: "Activate merchants",
    body: "Get merchants to finish setup.",
    type: "onboarding",
    defaultFilters: ["setup"],
  },
  {
    id: "upgrade",
    title: "Drive upgrades",
    body: "Encourage a move to a paid plan.",
    type: "promotional",
    defaultFilters: ["setup"],
  },
  {
    id: "storefront",
    title: "Grow online stores",
    body: "Get merchants to publish their storefront.",
    type: "announcement",
    defaultFilters: ["setup"],
  },
  {
    id: "catalog",
    title: "Improve product catalogs",
    body: "Encourage merchants to add products.",
    type: "educational",
    defaultFilters: ["setup"],
  },
  {
    id: "feature",
    title: "Promote a feature",
    body: "Announce something new.",
    type: "feature",
    defaultFilters: ["verified"],
  },
  {
    id: "reengage",
    title: "Re-engage inactive merchants",
    body: "Bring idle shops back to the till.",
    type: "re-engagement",
    defaultFilters: ["setup"],
  },
  {
    id: "custom",
    title: "Custom campaign",
    body: "Start from scratch.",
    type: "custom",
    defaultFilters: ["all"],
  },
];

export const TEMPLATES: CampaignTemplate[] = [
  { id: "welcome", family: "Onboarding", name: "Welcome to Kiosk", type: "onboarding", subject: "Welcome to Kiosk, {{businessName}}", previewText: "Your till, stock, and shop — one place.", body: "Hi {{name}},\n\nYou're in. Kiosk is the POS, inventory, and storefront for {{businessName}} — one stock count across the counter and the online shop.\n\nFinish setup to add products, connect M-Pesa, and publish your storefront.\n", cta: "Open your hub", openRate: 0.61 },
  { id: "finish-setup", family: "Onboarding", name: "Finish your setup", type: "onboarding", subject: "Your Kiosk store is almost ready", previewText: "Products, M-Pesa, and your online shop are waiting.", body: "Hi {{name}},\n\nYou're only a few steps away from having {{businessName}} live on Kiosk.\n\nFinish setting up and you can start selling with your own online storefront, connect M-Pesa, add your products, customize the shop, and even use your own domain.\n", cta: "Continue setup", openRate: 0.52 },
  { id: "first-products", family: "Onboarding", name: "Add your first products", type: "educational", subject: "Stock {{businessName}} so the till can sell", previewText: "A catalog is the difference between a demo and a shop.", body: "Hi {{name}},\n\n{{businessName}} has a till. It still needs a catalog.\n\nAdd products (or import a starter pack) so cashiers can scan, M-Pesa can fire, and your storefront has something to show.\n", cta: "Add products", openRate: 0.47 },
  { id: "connect-mpesa", family: "Onboarding", name: "Connect M-Pesa", type: "feature", subject: "Take M-Pesa at {{businessName}}", previewText: "STK at the counter and on the storefront.", body: "Hi {{name}},\n\nKenyan customers expect to pay on their phone. Connect M-Pesa once and Kiosk can STK from the till and the online shop — same ledger.\n", cta: "Connect M-Pesa", openRate: 0.44 },
  { id: "publish-store", family: "Activation", name: "Publish your storefront", type: "announcement", subject: "Your products are ready. Put them online.", previewText: "{{productCount}} items waiting on a live shop.", body: "Hi {{name}},\n\n{{businessName}} already has products in the catalog. Publishing the storefront puts that same stock in front of customers — prices, M-Pesa, one count.\n", cta: "Publish storefront", openRate: 0.49 },
  { id: "custom-domain", family: "Growth", name: "Add your custom domain", type: "promotional", subject: "Put {{businessName}} on your own domain", previewText: "Keep the shop. Change the address.", body: "Hi {{name}},\n\nYour storefront is live. Point your own domain at it so customers don't have to remember a kiosk.ke subdomain.\n", cta: "Add domain", openRate: 0.38 },
  { id: "almost-ready", family: "Activation", name: "Your store is almost ready", type: "onboarding", subject: "You're only minutes from selling online", previewText: "Setup is the last gap.", body: "Hi {{name}},\n\nMost of {{businessName}} is already in Kiosk. Finish the remaining setup steps and you can sell at the till and online from the same catalog.\n", cta: "Finish setup", openRate: 0.55 },
  { id: "whats-new", family: "Engagement", name: "What's new at Kiosk", type: "feature", subject: "New on Kiosk this month", previewText: "Till, stock, shop — what shipped.", body: "Hi {{name}},\n\nA short note on what landed: storefront themes, supplier portal, and tighter M-Pesa receipts. Open the hub when you have a quiet minute.\n", cta: "See what's new", openRate: 0.41 },
  {
    id: "hybrid-pos-guide",
    family: "Feature guides",
    name: "Hybrid POS — find products faster",
    type: "feature",
    subject: "New on the till: find products by code, not pictures",
    previewText: "A short guide for {{businessName}} — scan, search, frequently sold.",
    body: `Hi {{name}},

We've added a new way to find products on the till at **{{businessName}}**.

**Grid** is still there for visual retail — drinks, bread, snacks, anything cashiers pick by looking.

**Hybrid** is better when you sell hardware, hooks, electrical, stationery, spare parts, or anything with many similar SKUs. Cashiers look up codes and sizes — not pictures.

You choose once for the business. Your team doesn't relearn the till — they just get a faster path to the exact item.

**How to turn it on (1 minute)**

1. Open Business → Configuration (or Till settings on the cashier screen).
2. Under Cashier capabilities, find **Product shelf layout**.
3. Choose **Hybrid**.
4. Save, then open or refresh the cashier till.

Your shop stays on Grid until you switch. Payments, stock, and receipts do not change — only how products are found.

**How cashiers should use Hybrid**

Think of four speeds. Use the fastest one that works:

**1. Scan** (fastest)
Scan the barcode. If it matches one product, it goes straight into the cart.

**2. Search**
Type a name, SKU, or fragment — for example drybr, dry brass, or drybr-10.
Results show as a compact list: SKU, name, stock, price, and Add.
No hunting through picture cards.

**3. Frequently sold**
Under search you'll see chips like **Dry Hook #10** with the SKU smaller underneath.
Tap a chip → add 1.
This list is based on this cashier's recent sales on that till.
Up to 8 chips show first — tap + More for the rest.

**4. Browse**
Use aisles when the customer isn't sure of the exact code.
In Hybrid, aisle items also use the list layout.

**Variant sizes (important)**

If products are linked as variants (Dry Brass Hook #8, #10, #12…), search won't dump nine almost-identical tiles.

You'll get one group. Tap the size you need. That exact SKU goes into the cart.

Tip: link real size variants under one parent in your catalog. Unlinked lookalikes stay separate — Hybrid still helps via search and chips, but grouping only works when variants are linked.

**Grid or Hybrid?**

Use **Grid** when cashiers pick by looking at the product, you have few SKUs, and photos are strong.

Use **Hybrid** when cashiers know (or search) a code or size, or you have hundreds of similar SKUs.

If your team at {{businessName}} looks up codes more than pictures, start on Hybrid. You can switch back anytime.

**Quick tips**

Keep names and sizes clear on products (Dry Hook + size 10 beats a cryptic code-only name).
Put barcodes on sellable SKUs — scan stays #1 in both modes.
Link size variants to a parent so cashiers pick from one table.
After a few shifts, check Frequently sold — it gets faster the more the till is used.

**One line for your staff**

Scan if you can. Search if you know part of the name or code. Tap Frequently sold for repeats. Browse only when you're exploring.

That's the whole Hybrid workflow for {{businessName}}.
`,
    cta: "Turn on Hybrid POS",
    openRate: 0.48,
  },
  { id: "upgrade", family: "Growth", name: "Upgrade your plan", type: "promotional", subject: "{{businessName}} is outgrowing the free catalog", previewText: "{{productCount}} products on a starter limit.", body: "Hi {{name}},\n\n{{businessName}} already carries a serious catalog. A paid plan lifts product and cashier limits so the till doesn't stall as you grow.\n", cta: "Review plans", openRate: 0.33 },
  { id: "we-miss-you", family: "Re-engagement", name: "We haven't seen you in a while", type: "re-engagement", subject: "{{businessName}} is waiting on Kiosk", previewText: "Your catalog and till are still here.", body: "Hi {{name}},\n\nIt's been a while since anyone signed into {{businessName}}. Your products, branches, and storefront are still on Kiosk — pick up where you left off.\n", cta: "Open dashboard", openRate: 0.29 },
];

export const AI_SUGGESTIONS = [
  {
    id: "all",
    title: "All merchants",
    why: "Live selected_tenants segment (every shop contact)",
    filters: ["all"],
  },
  {
    id: "setup",
    title: "Merchants who have not finished setup",
    why: "Live stuck_signup segment",
    filters: ["setup"],
  },
  {
    id: "verified",
    title: "Owners who have not verified email",
    why: "Live unverified_owners segment",
    filters: ["verified"],
  },
  {
    id: "individual",
    title: "A specific merchant or owner",
    why: "Pick people with selected_users",
    filters: ["individual"],
  },
];

export function estimateAudience(liveCount: number | null): {
  merchants: number;
  modeled: boolean;
} {
  return {
    merchants: liveCount ?? 0,
    modeled: liveCount == null,
  };
}

export const AUTOMATIONS = [
  {
    id: "onboarding",
    name: "New merchant onboarding",
    trigger: "Merchant signs up",
    steps: [
      "Wait 1 day → welcome email",
      "Wait 2 days → if setup incomplete, reminder",
      "Wait 3 days → if products added, storefront email",
      "If still incomplete → final reminder",
    ],
  },
  {
    id: "inactive",
    name: "Inactive merchant",
    trigger: "No login for 30 days",
    steps: [
      "Generate re-engagement email",
      "If opened → follow-up",
      "If clicked → mark engaged",
    ],
  },
  {
    id: "storefront",
    name: "Storefront activation",
    trigger: "Products > 10 and storefront unpublished",
    steps: ["Send “Your store is ready”", "If unpublished after 5 days → reminder"],
  },
];

export function personalize(
  text: string,
  merchant: {
    name: string;
    email: string;
    businessName: string;
    slug?: string | null;
    continueUrl?: string | null;
  } | null,
): string {
  const first = merchant?.name.trim().split(/\s+/)[0] ?? "";
  const shop = merchant?.slug?.trim()
    ? `${merchant.slug.trim()}.${PLATFORM_DOMAIN}`
    : merchant?.businessName
      ? `${merchant.businessName.toLowerCase().replace(/\s+/g, "")}.${PLATFORM_DOMAIN}`
      : "";
  return text
    .replaceAll("{{name}}", first)
    .replaceAll("{{businessName}}", merchant?.businessName ?? "")
    .replaceAll("{{shopUrl}}", shop)
    .replaceAll("{{email}}", merchant?.email ?? "")
    .replaceAll("{{continueUrl}}", merchant?.continueUrl ?? "");
}

export type GeneratedCampaign = {
  subject: string;
  previewText: string;
  body: string;
  cta: string;
};

const KIOSK_CONTEXT =
  "Kiosk is one POS, inventory, and storefront: barcode till, M-Pesa STK, offline sales, branches, staff, suppliers, custom domains, and a published shop from the same catalog.";

export function generateCampaign(prompt: string, intent: IntentId): GeneratedCampaign {
  const p = prompt.toLowerCase();
  const setup = /setup|finish|onboard|signed up/.test(p) || intent === "activate";
  const store = /storefront|online store|publish/.test(p) || intent === "storefront";
  const catalog = /product|catalog/.test(p) || intent === "catalog";
  const idle = /inactive|login|haven't seen|re-engage/.test(p) || intent === "reengage";
  const upgrade = /upgrade|paid|plan/.test(p) || intent === "upgrade";

  if (setup) {
    return {
      subject: "Your Kiosk store is almost ready",
      previewText: "Your products, M-Pesa and online store are waiting for you.",
      body: `Hi {{name}},\n\nYou're only a few steps away from having {{businessName}} live on Kiosk.\n\n${KIOSK_CONTEXT}\n\nFinish setting up your store and you can start selling with your own online storefront, connect M-Pesa, add your products, customize the shop, and even use your own domain.\n`,
      cta: "Continue setup",
    };
  }
  if (store) {
    return {
      subject: "Your products are ready. Put them online.",
      previewText: "Same catalog as the till — live for customers.",
      body: `Hi {{name}},\n\n{{businessName}} already has products. Publishing the storefront puts that catalog in front of customers with M-Pesa at checkout — one stock count with the till.\n`,
      cta: "Publish storefront",
    };
  }
  if (catalog) {
    return {
      subject: "Stock the till so {{businessName}} can sell",
      previewText: "Cashiers need a catalog. So does the shop.",
      body: `Hi {{name}},\n\nAdd products to {{businessName}} — scan at the counter, alert on low stock, and fill the storefront from the same list.\n`,
      cta: "Add products",
    };
  }
  if (idle) {
    return {
      subject: "{{businessName}} is waiting on Kiosk",
      previewText: "Your till and catalog are still here.",
      body: `Hi {{name}},\n\nIt's been quiet on {{businessName}}. Your inventory, branches, and storefront are still on Kiosk. Sign in when you're ready — nothing was deleted.\n`,
      cta: "Open dashboard",
    };
  }
  if (upgrade) {
    return {
      subject: "{{businessName}} is outgrowing the free plan",
      previewText: "More products and cashiers when you need them.",
      body: `Hi {{name}},\n\n{{businessName}} is carrying real volume. A paid plan lifts catalog and cashier limits so the till doesn't stall as you grow.\n`,
      cta: "Review plans",
    };
  }
  return {
    subject: "A note from Kiosk",
    previewText: "POS, inventory, and storefront — one system.",
    body: `Hi {{name}},\n\n${KIOSK_CONTEXT}\n\nOpen {{businessName}} when you have a minute.\n`,
    cta: "Open hub",
  };
}

export function rewriteBody(
  body: string,
  mode:
    | "shorter"
    | "friendlier"
    | "professional"
    | "persuasive"
    | "urgency"
    | "simplify"
    | "kenyan"
    | "regenerate",
): string {
  const first = body.trim();
  if (mode === "shorter") {
    return first
      .split("\n\n")
      .slice(0, 2)
      .join("\n\n")
      .replace(/\s+/g, " ")
      .slice(0, 280) + "\n";
  }
  if (mode === "friendlier") {
    return first.replace("Hi {{name}},", "Hey {{name}},") + "\nWe're here if you get stuck — just reply.\n";
  }
  if (mode === "professional") {
    return first.replace("Hey {{name}},", "Hi {{name}},").replace("You're", "You are");
  }
  if (mode === "persuasive") {
    return first + "\nShops that finish setup typically take their first sale the same day.\n";
  }
  if (mode === "urgency") {
    return first + "\nThis takes a few minutes. The longer the catalog waits, the longer the till stays quiet.\n";
  }
  if (mode === "simplify") {
    return "Hi {{name}},\n\nFinish setup for {{businessName}} on Kiosk: add products, connect M-Pesa, publish your shop.\n";
  }
  if (mode === "kenyan") {
    return first.replace("customers", "customers (M-Pesa on the phone, cash at the counter)");
  }
  return generateCampaign(first, "custom").body;
}

export function interpretAsk(query: string): {
  summary: string;
  filters: string[];
  intent: IntentId;
} {
  const q = query.toLowerCase();
  if (/\ball\b|everyone|every merchant|entire/.test(q)) {
    return {
      summary: "All merchants — preferred owner or admin on every shop.",
      filters: ["all"],
      intent: "custom",
    };
  }
  if (/individual|specific|one person|single|this merchant/.test(q)) {
    return {
      summary: "Pick one or more specific people.",
      filters: ["individual"],
      intent: "custom",
    };
  }
  if (/unverif/.test(q)) {
    return {
      summary: "Owners who have not verified their email.",
      filters: ["verified"],
      intent: "activate",
    };
  }
  if (/setup|onboard|signed up/.test(q)) {
    return {
      summary: "Merchants who signed up but have not finished setup.",
      filters: ["setup"],
      intent: "activate",
    };
  }
  return {
    summary: "All merchants, or narrow to incomplete setup / unverified owners.",
    filters: ["all"],
    intent: "custom",
  };
}

export function mapApiStatus(status: string): "draft" | "scheduled" | "sending" | "sent" | "archived" {
  const s = status.toUpperCase();
  if (s === "COMPLETED") return "sent";
  if (s === "RUNNING") return "sending";
  if (s === "FAILED") return "draft";
  if (s === "QUEUED" || s === "SCHEDULED") return "scheduled";
  return "draft";
}

export function typeFromSegment(segment: string): CampaignType {
  if (segment.includes("stuck") || segment.includes("unverified")) return "onboarding";
  return "email";
}
