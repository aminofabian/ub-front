import { spokePlaceholderBody } from "./article-helpers";
import type { BlogArticle } from "./types";

export const KIOSK_VS_ODOO_PILLAR_SLUG =
  "choosing-the-right-pos-kiosk-vs-odoo";

/** @deprecated Use KIOSK_VS_ODOO_PILLAR_SLUG */
export const PILLAR_SLUG = KIOSK_VS_ODOO_PILLAR_SLUG;

const PILLAR_TITLE =
  "Choosing the Right POS for Your Business: Kiosk.ke vs. Odoo";

const TOP_10_SLUG = "top-10-pos-systems-kenya-2026";

const PILLAR_ARTICLE: BlogArticle = {
  slug: KIOSK_VS_ODOO_PILLAR_SLUG,
  title: PILLAR_TITLE,
  description:
    "A clear guide to deciding between Kiosk.ke — a turnkey local retail POS — and Odoo, a full enterprise ERP suite. Compare setup time, payments, and who each platform fits.",
  category: "Comparison",
  publishedAt: "2026-07-23",
  updatedAt: "2026-07-23",
  tags: ["POS", "Kiosk.ke", "Odoo", "Retail", "Comparison"],
  author: "Kiosk",
  relatedSlugs: [
    "top-10-pos-systems-kenya-2026",
    "how-to-grow-a-mini-mart-in-kenya",
    "5-signs-youve-outgrown-your-pos",
    "why-m-pesa-integration-matters",
    "erp-vs-pos-do-you-need-the-full-suite",
    "set-up-a-pos-in-30-minutes",
    "the-real-cost-of-free-software",
    "from-stall-to-store-a-retailers-journey",
    "what-hardware-do-you-actually-need",
    "online-physical-one-inventory",
  ],
  body: [
    {
      type: "paragraph",
      text: "Selecting the right point-of-sale (POS) and inventory system is one of the most consequential decisions a growing business makes. It shapes how quickly you can sell, how well you track stock, and how much friction your team deals with every day.",
    },
    {
      type: "paragraph",
      text: "In the modern retail landscape, business owners often find themselves torn between two very different philosophies: a hyper-local, turnkey solution like Kiosk.ke, and a massive, globally recognized enterprise suite like Odoo.",
    },
    {
      type: "paragraph",
      text: "Both platforms can process transactions and track stock — but they're built for completely different types of operations. Here's a clear guide to help you decide which one fits your business.",
    },
    {
      type: "heading",
      text: "1. What Is Kiosk.ke?",
    },
    {
      type: "paragraph",
      text: "Kiosk.ke is a lightweight, mobile-first digital storefront and cashier platform built specifically for micro-merchants and local retail shops.",
    },
    {
      type: "paragraph",
      text: "Core features:",
    },
    {
      type: "list",
      items: [
        "Instant digital storefront — Merchants can immediately claim a branded online store (e.g., yourshop.kiosk.ke) to showcase products.",
        "Localized omnichannel selling — A digital cashier interface processes in-person cash or mobile money payments while automatically syncing stock with the live web shop.",
        "Rapid setup — A built-in global product search and barcode lookup tool let you build a full inventory catalog in minutes, not days.",
      ],
    },
    {
      type: "heading",
      text: "2. What Is Odoo?",
    },
    {
      type: "paragraph",
      text: "Odoo is an all-in-one Enterprise Resource Planning (ERP) platform made up of thousands of integrated modules, including a robust point-of-sale system.",
    },
    {
      type: "paragraph",
      text: "Core features:",
    },
    {
      type: "list",
      items: [
        "Modular architecture — Start with a basic POS app, then seamlessly activate modules for accounting, HR, manufacturing, and CRM as your business grows.",
        "Hardware flexibility — The POS app can run on dedicated touchscreen terminals and kitchen display systems for high-volume environments.",
        "Global customization — An open-source framework that can be heavily customized to fit complex corporate structures and international supply chains.",
      ],
    },
    {
      type: "heading",
      text: "3. Side-by-Side Comparison",
    },
    {
      type: "table",
      headers: ["Feature / Metric", "Kiosk.ke", "Odoo"],
      rows: [
        [
          "Primary scope",
          "Turnkey retail storefront + digital cashier",
          "Full-scale business management suite (ERP)",
        ],
        [
          "Target audience",
          "Micro-merchants, local retail shops, startups",
          "Growing small-to-medium businesses and enterprises",
        ],
        [
          "Setup speed",
          "Minutes (plug-and-play)",
          "Weeks to months (requires IT implementation)",
        ],
        [
          "Payment integration",
          "Native, built-in mobile money support",
          "Requires third-party local payment modules",
        ],
        [
          "Advanced operations",
          "Basic inventory and barcode lookup",
          "HR, accounting, manufacturing, advanced warehouse tracking",
        ],
      ],
    },
    {
      type: "heading",
      text: "4. The Verdict: Which One Should You Choose?",
    },
    {
      type: "paragraph",
      text: "Choose Kiosk.ke if:",
    },
    {
      type: "list",
      items: [
        "You want speed and simplicity. You need an online store and a way to track daily counter sales up and running now — no software overhead.",
        "You operate locally. You rely heavily on mobile payments and want a tool built around local commercial dynamics.",
        "You run a single shop. It's a great fit for boutiques, small groceries, and independent retail stalls looking to digitize quickly.",
      ],
    },
    {
      type: "paragraph",
      text: "Choose Odoo if:",
    },
    {
      type: "list",
      items: [
        "You need an all-in-one corporate system. You want sales data to automatically feed into accounting, payroll, and supplier purchasing.",
        "Your supply chain is complex. You manage multiple warehouses, manufacture finished products from raw materials, or track extensive employee shifts.",
        "You have an IT budget. You have the time and resources to configure, customize, and maintain a full enterprise framework.",
      ],
    },
    {
      type: "heading",
      text: "Bottom Line",
    },
    {
      type: "callout",
      tone: "tip",
      text: "Kiosk.ke wins on speed, simplicity, and local relevance — ideal if you want to start selling today. Odoo wins on depth and scale — ideal if you're ready to run your entire business, not just your storefront, from one system. The right choice comes down to where your business is today, not where you hope it'll be in five years.",
    },
  ],
};

function spoke(
  article: Omit<BlogArticle, "author" | "listedOnly" | "body"> & {
    teaser: string;
  },
): BlogArticle {
  const { teaser, ...rest } = article;
  return {
    ...rest,
    author: "Kiosk",
    listedOnly: true,
    body: spokePlaceholderBody(teaser, PILLAR_TITLE),
  };
}

const SPOKE_ARTICLES: BlogArticle[] = [
  spoke({
    slug: "5-signs-youve-outgrown-your-pos",
    title: "5 Signs You've Outgrown Your POS",
    description:
      "Stock mismatches, slow checkouts, and spreadsheet workarounds — the clear signals it's time to upgrade your point of sale.",
    category: "Guides",
    publishedAt: "2026-07-22",
    updatedAt: "2026-07-22",
    tags: ["POS", "Growth", "Retail"],
    relatedSlugs: [
      KIOSK_VS_ODOO_PILLAR_SLUG,
      "erp-vs-pos-do-you-need-the-full-suite",
      "the-real-cost-of-free-software",
    ],
    teaser:
      "When your till starts fighting you — wrong stock counts, slow payments, or endless spreadsheet fixes — you've probably outgrown the tool, not just the shop.",
  }),
  spoke({
    slug: "why-m-pesa-integration-matters",
    title: "Why M-Pesa Integration Matters",
    description:
      "Why native mobile money at the till beats bolted-on payment plugins for Kenyan retail shops.",
    category: "Payments",
    publishedAt: "2026-07-21",
    updatedAt: "2026-07-21",
    tags: ["M-Pesa", "Payments", "Kenya"],
    relatedSlugs: [
      KIOSK_VS_ODOO_PILLAR_SLUG,
      "set-up-a-pos-in-30-minutes",
      "what-hardware-do-you-actually-need",
      TOP_10_SLUG,
    ],
    teaser:
      "In Kenya, mobile money isn't optional — it's how customers pay. A POS without native M-Pesa support adds friction every time the till rings.",
  }),
  spoke({
    slug: "erp-vs-pos-do-you-need-the-full-suite",
    title: "ERP vs. POS: Do You Need the Full Suite?",
    description:
      "When a lean POS is enough — and when manufacturing, HR, and multi-warehouse ERP modules actually earn their keep.",
    category: "Comparison",
    publishedAt: "2026-07-20",
    updatedAt: "2026-07-20",
    tags: ["ERP", "POS", "Comparison"],
    relatedSlugs: [
      KIOSK_VS_ODOO_PILLAR_SLUG,
      "5-signs-youve-outgrown-your-pos",
      "the-real-cost-of-free-software",
      TOP_10_SLUG,
    ],
    teaser:
      "An ERP can run your whole company. A POS needs to run your counter. Knowing which problem you have today saves months of implementation.",
  }),
  spoke({
    slug: "set-up-a-pos-in-30-minutes",
    title: "Set Up a POS in 30 Minutes",
    description:
      "A practical walkthrough for getting a digital till and storefront live the same afternoon — without an IT project.",
    category: "Getting started",
    publishedAt: "2026-07-19",
    updatedAt: "2026-07-19",
    tags: ["Setup", "POS", "Getting started"],
    relatedSlugs: [
      KIOSK_VS_ODOO_PILLAR_SLUG,
      "what-hardware-do-you-actually-need",
      "online-physical-one-inventory",
    ],
    teaser:
      "You shouldn't need a consultant to start selling. Here's what a plug-and-play till setup looks like when the software is built for local shops.",
  }),
  spoke({
    slug: "the-real-cost-of-free-software",
    title: "The Real Cost of 'Free' Software",
    description:
      "Hidden fees, add-on modules, and implementation hours — what 'free' POS and ERP tools often cost in practice.",
    category: "Guides",
    publishedAt: "2026-07-18",
    updatedAt: "2026-07-18",
    tags: ["Pricing", "POS", "ERP"],
    relatedSlugs: [
      KIOSK_VS_ODOO_PILLAR_SLUG,
      "erp-vs-pos-do-you-need-the-full-suite",
      "5-signs-youve-outgrown-your-pos",
      TOP_10_SLUG,
    ],
    teaser:
      "Free rarely means free once you add payment modules, training, and the time your team spends fighting the tool every day.",
  }),
  spoke({
    slug: "from-stall-to-store-a-retailers-journey",
    title: "From Stall to Store: A Retailer's Journey",
    description:
      "How a small retailer moves from cash-only stall sales to a synced till and online shop without losing the plot.",
    category: "Stories",
    publishedAt: "2026-07-17",
    updatedAt: "2026-07-17",
    tags: ["Stories", "Retail", "Growth"],
    relatedSlugs: [
      KIOSK_VS_ODOO_PILLAR_SLUG,
      "how-to-grow-a-mini-mart-in-kenya",
      "set-up-a-pos-in-30-minutes",
      "online-physical-one-inventory",
    ],
    teaser:
      "Growth isn't always a bigger ERP. Sometimes it's one shop, one till, and an online storefront that finally matches what's on the shelf.",
  }),
  spoke({
    slug: "what-hardware-do-you-actually-need",
    title: "What Hardware Do You Actually Need?",
    description:
      "Phone, scanner, printer — a no-nonsense hardware checklist for a Kenyan retail counter, without the enterprise kit.",
    category: "Hardware",
    publishedAt: "2026-07-16",
    updatedAt: "2026-07-16",
    tags: ["Hardware", "POS", "Setup"],
    relatedSlugs: [
      KIOSK_VS_ODOO_PILLAR_SLUG,
      "set-up-a-pos-in-30-minutes",
      "why-m-pesa-integration-matters",
    ],
    teaser:
      "You don't need a wall of terminals to sell. Most shops need a phone or tablet, a scanner, and a receipt printer — and software that works with them.",
  }),
  spoke({
    slug: "online-physical-one-inventory",
    title: "Online + Physical: One Inventory",
    description:
      "How a single stock count across your web shop and counter stops overselling and late-night spreadsheet reconciliations.",
    category: "Inventory",
    publishedAt: "2026-07-15",
    updatedAt: "2026-07-15",
    tags: ["Inventory", "Omnichannel", "Retail"],
    relatedSlugs: [
      KIOSK_VS_ODOO_PILLAR_SLUG,
      "set-up-a-pos-in-30-minutes",
      "from-stall-to-store-a-retailers-journey",
    ],
    teaser:
      "Two channels, one stock number. When the till and the web shop share inventory, you stop selling what you don't have.",
  }),
];

export const KIOSK_VS_ODOO_ARTICLES: BlogArticle[] = [
  PILLAR_ARTICLE,
  ...SPOKE_ARTICLES,
];
