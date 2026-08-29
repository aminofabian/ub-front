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

const SP = "/help/setup-progress";

export const SETUP_GUIDES: Record<string, SetupGuide | Record<string, SetupGuide>> = {
  stock_shelf: {
    quick: {
      title: "How to add a product",
      doItUrl: "/products",
      shots: [
        {
          src: `${SP}/stock-01-products-nav.png`,
          alt: "Products page in Kiosk",
          caption: "Open **Products** from the sidebar.",
        },
        {
          src: `${SP}/stock-02-add-button.jpg`,
          alt: "Add product button",
          caption: "Tap **Add product** in the top right.",
        },
        {
          src: `${SP}/stock-03-form.jpg`,
          alt: "Product form with name, price, and stock",
          caption:
            "Enter the product name, selling price, and stock count. Tap **Save**.",
        },
        {
          src: `${SP}/stock-04-shelf.png`,
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
          src: `${SP}/stock-01-products-nav.png`,
          alt: "Global product catalogue",
          caption:
            "Browse the global catalogue — products come with barcodes and suggested prices.",
        },
        {
          src: `${SP}/stock-catalog-02-select.png`,
          alt: "Selecting products to import",
          caption: "Tick the products you sell, then tap **Import**.",
        },
        {
          src: `${SP}/stock-catalog-03-review.png`,
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
          src: `${SP}/stock-variant-01-family.jpg`,
          alt: "Create product as a family",
          caption:
            "When creating a product, choose **Family** — same item, different sizes.",
        },
        {
          src: `${SP}/stock-variant-02-variants.jpg`,
          alt: "Variant rows under a family",
          caption:
            "Add variants under the family (e.g. 500ml, 1L). Each gets its own price and stock.",
        },
        {
          src: `${SP}/stock-variant-03-shelf.jpg`,
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
        src: `${SP}/supplier-01-create.png`,
        alt: "New supplier form",
        caption: "Open **Suppliers** → **New supplier**. Enter name and phone.",
      },
      {
        src: `${SP}/supplier-02-link.png`,
        alt: "Linking a product to a supplier",
        caption: "Open a product → **Suppliers** tab → **Link supplier**.",
      },
      {
        src: `${SP}/supplier-03-supply.png`,
        alt: "New supply drawer",
        caption:
          "To receive stock: **Supplies** → **New supply** → pick supplier and products.",
      },
      {
        src: `${SP}/supplier-04-posted.png`,
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
        src: `${SP}/phone-01-settings.png`,
        alt: "Business settings alerts panel",
        caption: "Open **Business settings** → **Alerts & notifications**.",
      },
      {
        src: `${SP}/phone-02-enter.png`,
        alt: "Enter phone number",
        caption:
          "Enter your shop phone number. This receives sale alerts and login codes.",
      },
      {
        src: `${SP}/phone-03-verify.png`,
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
        src: `${SP}/cashier-01-invite.png`,
        alt: "Invite user form",
        caption: "Open **Users** → **Invite user**.",
      },
      {
        src: `${SP}/cashier-02-pin.png`,
        alt: "Till PIN credential option",
        caption: "Choose **Till PIN** so they can log in without email.",
      },
      {
        src: `${SP}/cashier-03-login.png`,
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
        src: `${SP}/sale-01-shift.png`,
        alt: "Open shift float count",
        caption: "Open a shift — count the float in the till.",
      },
      {
        src: `${SP}/sale-02-till.png`,
        alt: "Till with a product selected",
        caption: "Tap a product, take payment (cash or M-Pesa).",
      },
      {
        src: `${SP}/sale-03-receipt.png`,
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
        src: `${SP}/golive-01-enable.png`,
        alt: "Enable storefront toggle",
        caption: "Open **Business settings** → turn on **Storefront**.",
      },
      {
        src: `${SP}/golive-02-preview.png`,
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
