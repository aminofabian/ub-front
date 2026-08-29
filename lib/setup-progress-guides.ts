export type SetupGuideShot = {
  src: string;
  alt: string;
  caption: string;
};

export type SetupGuide = {
  title: string;
  shots: SetupGuideShot[];
  doItUrl: string;
};

const ONBOARDING = "/help/onboarding";

export const SETUP_GUIDES: Record<string, SetupGuide | Record<string, SetupGuide>> = {
  stock_shelf: {
    quick: {
      title: "How to add a product",
      doItUrl: "/products",
      shots: [
        {
          src: `${ONBOARDING}/m1-fill-shelf.svg`,
          alt: "Products page in Kiosk",
          caption: "Open **Products** from the sidebar.",
        },
        {
          src: `${ONBOARDING}/m2-sizes.svg`,
          alt: "Add product button",
          caption: "Tap **Add product** in the top right.",
        },
        {
          src: `${ONBOARDING}/m2-variant.svg`,
          alt: "Product form with name, price, and stock",
          caption:
            "Enter the product name, selling price, and stock count. Tap **Save**.",
        },
        {
          src: `${ONBOARDING}/m1-fill-shelf.svg`,
          alt: "Product on the shelf",
          caption: "Your product appears on the shelf — you can sell from the till.",
        },
      ],
    },
    catalog: {
      title: "How to import from the catalogue",
      doItUrl: "/products/catalog?from=setup",
      shots: [
        {
          src: `${ONBOARDING}/m1-fill-shelf.svg`,
          alt: "Global product catalogue",
          caption:
            "Browse the global catalogue — products come with barcodes and suggested prices.",
        },
        {
          src: `${ONBOARDING}/m4-fallback.svg`,
          alt: "Selecting products to import",
          caption: "Tick the products you sell, then tap **Import**.",
        },
        {
          src: `${ONBOARDING}/m1-fill-shelf.svg`,
          alt: "Imported products on the shelf",
          caption: "Review prices, then confirm. Your shelf is stocked.",
        },
      ],
    },
    variant: {
      title: "How to create a family + variant",
      doItUrl: "/products",
      shots: [
        {
          src: `${ONBOARDING}/m2-sizes.svg`,
          alt: "Create product as a family",
          caption:
            "When creating a product, choose **Family** — same item, different sizes.",
        },
        {
          src: `${ONBOARDING}/m2-variant.svg`,
          alt: "Variant rows under a family",
          caption:
            "Add variants under the family (e.g. 500ml, 1L). Each gets its own price and stock.",
        },
        {
          src: `${ONBOARDING}/m2-variant.svg`,
          alt: "Variants on the till",
          caption: "Variants show as one row on the till with a size picker.",
        },
      ],
    },
  },
  supplier_loop: {
    title: "How to add a supplier & link products",
    doItUrl: "/suppliers",
    shots: [
      {
        src: `${ONBOARDING}/m3-supplier.svg`,
        alt: "New supplier form",
        caption: "Open **Suppliers** → **New supplier**. Enter name and phone.",
      },
      {
        src: `${ONBOARDING}/m3-money-loop.svg`,
        alt: "Linking a product to a supplier",
        caption: "Open a product → **Suppliers** tab → **Link supplier**.",
      },
      {
        src: `${ONBOARDING}/m3-money-loop.svg`,
        alt: "New supply drawer",
        caption:
          "To receive stock: **Supplies** → **New supply** → pick supplier and products.",
      },
      {
        src: `${ONBOARDING}/m3-money-loop.svg`,
        alt: "Posted supply",
        caption: "Tap **Post supply** — stock counts update automatically.",
      },
    ],
  },
  phone_verified: {
    title: "How to add your shop phone",
    doItUrl: "/business/settings",
    shots: [
      {
        src: `${ONBOARDING}/m5-go-live.svg`,
        alt: "Business settings alerts panel",
        caption: "Open **Business settings** → **Alerts & notifications**.",
      },
      {
        src: `${ONBOARDING}/m5-go-live.svg`,
        alt: "Enter phone number",
        caption:
          "Enter your shop phone number. This receives sale alerts and login codes.",
      },
      {
        src: `${ONBOARDING}/m5-go-live.svg`,
        alt: "Verify phone code",
        caption: "Enter the code we send you. Green tick = verified.",
      },
    ],
  },
  invite_cashier: {
    title: "How to invite a cashier",
    doItUrl: "/users",
    shots: [
      {
        src: `${ONBOARDING}/m6-team.svg`,
        alt: "Invite user form",
        caption: "Open **Users** → **Invite user**.",
      },
      {
        src: `${ONBOARDING}/m6-team.svg`,
        alt: "Till PIN credential option",
        caption: "Choose **Till PIN** so they can log in without email.",
      },
      {
        src: `${ONBOARDING}/m6-team.svg`,
        alt: "Staff login link",
        caption: "Share the staff login link. They set a PIN on first visit.",
      },
    ],
  },
  first_sale: {
    title: "How to make your first sale",
    doItUrl: "/cashier",
    shots: [
      {
        src: `${ONBOARDING}/m4-first-sale.svg`,
        alt: "Open shift float count",
        caption: "Open a shift — count the float in the till.",
      },
      {
        src: `${ONBOARDING}/m4-first-sale.svg`,
        alt: "Till with a product selected",
        caption: "Tap a product, take payment (cash or M-Pesa).",
      },
      {
        src: `${ONBOARDING}/w-week-checkin.svg`,
        alt: "Sale complete on business pulse",
        caption: "Sale complete — your pulse updates with real numbers.",
      },
    ],
  },
  go_live: {
    title: "How to turn on your online shop",
    doItUrl: "/business/settings",
    shots: [
      {
        src: `${ONBOARDING}/m5-go-live.svg`,
        alt: "Enable storefront toggle",
        caption: "Open **Business settings** → turn on **Storefront**.",
      },
      {
        src: `${ONBOARDING}/m5-go-live.svg`,
        alt: "Storefront phone preview",
        caption: "Preview your shop on a phone — customers can browse and order.",
      },
    ],
  },
};

export function resolveSetupGuide(
  stepKey: string,
  recommendedSubKey?: string | null,
): SetupGuide | null {
  const entry = SETUP_GUIDES[stepKey];
  if (!entry) return null;
  if ("shots" in entry) {
    return entry as SetupGuide;
  }
  const variants = entry as Record<string, SetupGuide>;
  const key = recommendedSubKey?.trim() || "quick";
  return variants[key] ?? variants.quick ?? Object.values(variants)[0] ?? null;
}

/** Render caption with **bold** markers as React nodes (caller supplies element factory). */
export function splitGuideCaption(caption: string): Array<string | { bold: string }> {
  const parts: Array<string | { bold: string }> = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(caption)) !== null) {
    if (match.index > last) {
      parts.push(caption.slice(last, match.index));
    }
    parts.push({ bold: match[1] });
    last = match.index + match[0].length;
  }
  if (last < caption.length) {
    parts.push(caption.slice(last));
  }
  return parts.length > 0 ? parts : [caption];
}
