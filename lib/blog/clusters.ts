import { GROW_MINI_MART_PILLAR_SLUG } from "./cluster-grow-mini-mart";
import { KIOSK_VS_ODOO_PILLAR_SLUG } from "./cluster-kiosk-vs-odoo";
import { TOP_10_POS_KENYA_PILLAR_SLUG } from "./cluster-top-10-pos-kenya";
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
    spokeSlugs: ["building-systems-for-your-mini-mart"],
  },
  {
    id: "top-10-pos-kenya",
    code: "02",
    title: "Top 10 POS Systems in Kenya",
    shortTitle: "Top 10 Kenya",
    description:
      "Ranked on setup speed, native M-Pesa, eTIMS compliance, and local shop-floor fit.",
    pillarSlug: TOP_10_POS_KENYA_PILLAR_SLUG,
    spokeSlugs: [],
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
    ],
  },
];
