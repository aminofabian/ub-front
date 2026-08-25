import { GROW_MINI_MART_PILLAR_SLUG } from "./cluster-grow-mini-mart";
import { BARCODE_LOOKUP_PILLAR_SLUG } from "./cluster-barcode-lookup";
import {
  ETIMS_TAX_PILLAR_SLUG,
  ETIMS_TAX_SPOKE_SLUGS,
} from "./cluster-etims-tax";
import {
  KOPOKOPO_PILLAR_SLUG,
  KOPOKOPO_SPOKE_SLUGS,
} from "./cluster-kopokopo";
import { KIOSK_VS_ODOO_PILLAR_SLUG } from "./cluster-kiosk-vs-odoo";
import {
  TOP_10_POS_KENYA_PILLAR_SLUG,
  TOP_10_SPOKE_SLUGS,
} from "./cluster-top-10-pos-kenya";
import type { BlogArticleRef } from "./types";

export type BlogClusterDef = {
  id: string;
  code: string;
  title: string;
  shortTitle: string;
  description: string;
  pillarSlug: string;
  spokeSlugs: string[];
};

export type BlogCluster = BlogClusterDef & {
  href: string;
  articleCount: number;
  publishedCount: number;
  pillar: BlogArticleRef | null;
  spokes: BlogArticleRef[];
};

export const BLOG_CLUSTER_DEFS: BlogClusterDef[] = [
  {
    id: "grow-mini-mart",
    code: "01",
    title: "Grow a Mini-Mart in Kenya",
    shortTitle: "Grow a Mini-Mart",
    description:
      "From one shop to a real business — stock, systems, hires, and routines that scale.",
    pillarSlug: GROW_MINI_MART_PILLAR_SLUG,
    spokeSlugs: [
      "how-to-start-a-mini-mart-in-kenya",
      "building-systems-for-your-mini-mart",
    ],
  },
  {
    id: "top-10-pos-kenya",
    code: "02",
    title: "Top 10 POS Systems in Kenya",
    shortTitle: "Top 10 Kenya",
    description:
      "Ranked on setup speed, native M-Pesa, eTIMS readiness, and local shop-floor fit — plus buying guides.",
    pillarSlug: TOP_10_POS_KENYA_PILLAR_SLUG,
    spokeSlugs: [...TOP_10_SPOKE_SLUGS],
  },
  {
    id: "kiosk-vs-odoo",
    code: "03",
    title: "Kiosk.ke vs Odoo",
    shortTitle: "Kiosk vs Odoo",
    description:
      "Turnkey local retail versus full ERP — and the guides that help you choose.",
    pillarSlug: KIOSK_VS_ODOO_PILLAR_SLUG,
    spokeSlugs: [
      "5-signs-youve-outgrown-your-pos",
      "why-m-pesa-integration-matters",
      "erp-vs-pos-do-you-need-the-full-suite",
      "set-up-a-pos-in-30-minutes",
      "the-real-cost-of-free-software",
      "from-stall-to-store-a-retailers-journey",
      "what-hardware-do-you-actually-need",
      "online-physical-one-inventory",
      "why-kiosk-beats-odoo-for-kenyan-shops",
    ],
  },
  {
    id: "barcode-lookup",
    code: "04",
    title: "Barcode Lookup in Kenya",
    shortTitle: "Barcode Lookup",
    description:
      "Look up any product by barcode or name — EAN-13, UPC, GTIN — and check Kenyan store prices in seconds.",
    pillarSlug: BARCODE_LOOKUP_PILLAR_SLUG,
    spokeSlugs: [],
  },
  {
    id: "kopokopo-pos",
    code: "05",
    title: "Kopo Kopo & M-Pesa Payments",
    shortTitle: "Kopo Kopo",
    description:
      "How Kopo Kopo connects to a POS — Buy Goods tills, STK Push, webhooks, reconciliation, and fees — so every M-Pesa payment matches a sale automatically.",
    pillarSlug: KOPOKOPO_PILLAR_SLUG,
    spokeSlugs: [...KOPOKOPO_SPOKE_SLUGS],
  },
  {
    id: "etims-tax",
    code: "06",
    title: "eTIMS & Taxes for Mini-Marts",
    shortTitle: "eTIMS & Taxes",
    description:
      "Everything a mini-mart owner in Kenya needs to know about tax — eTIMS, VAT, turnover tax, income tax, PAYE, excise, and the records that keep KRA happy.",
    pillarSlug: ETIMS_TAX_PILLAR_SLUG,
    spokeSlugs: [...ETIMS_TAX_SPOKE_SLUGS],
  },
];
