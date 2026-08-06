import type { ComponentType } from "react";

import { BrandPosterLanding } from "@/components/storefront/templates/landing/brand-poster";
import { ButcheryCutLanding } from "@/components/storefront/templates/landing/butchery-cut";
import { ComingSoonEditorialLanding } from "@/components/storefront/templates/landing/coming-soon-editorial";
import { FreshMarketLanding } from "@/components/storefront/templates/landing/fresh-market";
import { MinimartHoursLanding } from "@/components/storefront/templates/landing/minimart-hours";
import { NeighborhoodBoardLanding } from "@/components/storefront/templates/landing/neighborhood-board";
import { BoutiqueShelfStoreHome } from "@/components/storefront/templates/store/boutique-shelf-home";
import { ButcherBoardStoreHome } from "@/components/storefront/templates/store/butcher-board-home";
import { MartStoreHome } from "@/components/storefront/templates/store/mart-home";
import { OxideStoreHome } from "@/components/storefront/templates/store/oxide-home";
import { SpiritsCellarStoreHome } from "@/components/storefront/templates/store/spirits-cellar-home";
import { TintLabStoreHome } from "@/components/storefront/templates/store/tint-lab-home";
import type {
  LandingTemplateProps,
  StoreHomeTemplateProps,
} from "@/components/storefront/templates/types";
import {
  normalizeLandingTemplateId,
  normalizeStoreThemeId,
  type LandingTemplateId,
  type StoreThemeId,
} from "@/lib/storefront-templates";

const STORE_HOMES: Record<
  StoreThemeId,
  ComponentType<StoreHomeTemplateProps>
> = {
  mart: MartStoreHome,
  "butcher-board": ButcherBoardStoreHome,
  "boutique-shelf": BoutiqueShelfStoreHome,
  "spirits-cellar": SpiritsCellarStoreHome,
  oxide: OxideStoreHome,
  "tint-lab": TintLabStoreHome,
};

const LANDING_PAGES: Record<
  LandingTemplateId,
  ComponentType<LandingTemplateProps>
> = {
  "coming-soon-editorial": ComingSoonEditorialLanding,
  "neighborhood-board": NeighborhoodBoardLanding,
  "fresh-market": FreshMarketLanding,
  "butchery-cut": ButcheryCutLanding,
  "minimart-hours": MinimartHoursLanding,
  "brand-poster": BrandPosterLanding,
};

export type StoreChromeVariant =
  | "default"
  | "dark"
  | "soft"
  | "oxide"
  | "tint-lab";

export function resolveStoreHome(
  themeId: string | null | undefined,
): ComponentType<StoreHomeTemplateProps> {
  return STORE_HOMES[normalizeStoreThemeId(themeId)];
}

export function resolveLandingPage(
  templateId: string | null | undefined,
): ComponentType<LandingTemplateProps> {
  return LANDING_PAGES[normalizeLandingTemplateId(templateId)];
}

export function resolveStoreChromeVariant(
  themeId: string | null | undefined,
): StoreChromeVariant {
  switch (normalizeStoreThemeId(themeId)) {
    case "oxide":
      return "oxide";
    case "tint-lab":
      return "tint-lab";
    case "butcher-board":
    case "spirits-cellar":
      return "dark";
    case "boutique-shelf":
      return "soft";
    default:
      return "default";
  }
}
