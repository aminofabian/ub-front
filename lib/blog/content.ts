import {
  GROW_MINI_MART_ARTICLES,
  GROW_MINI_MART_PILLAR_SLUG,
} from "./cluster-grow-mini-mart";
import {
  KIOSK_VS_ODOO_ARTICLES,
  KIOSK_VS_ODOO_PILLAR_SLUG,
  PILLAR_SLUG,
} from "./cluster-kiosk-vs-odoo";
import {
  TOP_10_POS_KENYA_ARTICLES,
  TOP_10_POS_KENYA_PILLAR_SLUG,
} from "./cluster-top-10-pos-kenya";
import type { BlogArticle } from "./types";

export {
  GROW_MINI_MART_PILLAR_SLUG,
  KIOSK_VS_ODOO_PILLAR_SLUG,
  PILLAR_SLUG,
  TOP_10_POS_KENYA_PILLAR_SLUG,
};

export const CLUSTER_PILLAR_SLUGS = [
  GROW_MINI_MART_PILLAR_SLUG,
  KIOSK_VS_ODOO_PILLAR_SLUG,
  TOP_10_POS_KENYA_PILLAR_SLUG,
] as const;

export function isClusterPillar(slug: string): boolean {
  return (CLUSTER_PILLAR_SLUGS as readonly string[]).includes(slug);
}

export const BLOG_ARTICLES: BlogArticle[] = [
  ...GROW_MINI_MART_ARTICLES,
  ...TOP_10_POS_KENYA_ARTICLES,
  ...KIOSK_VS_ODOO_ARTICLES,
];
