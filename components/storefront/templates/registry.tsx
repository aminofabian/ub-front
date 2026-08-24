import type { ComponentType } from "react";

import { BrandPosterLanding } from "@/components/storefront/templates/landing/brand-poster";
import { ButcheryCutLanding } from "@/components/storefront/templates/landing/butchery-cut";
import { ComingSoonEditorialLanding } from "@/components/storefront/templates/landing/coming-soon-editorial";
import { FreshMarketLanding } from "@/components/storefront/templates/landing/fresh-market";
import { FrontWindowLanding } from "@/components/storefront/templates/landing/front-window";
import { MinimartHoursLanding } from "@/components/storefront/templates/landing/minimart-hours";
import { NeighborhoodBoardLanding } from "@/components/storefront/templates/landing/neighborhood-board";
import { BeautyEditStoreHome } from "@/components/storefront/templates/store/beauty-edit-home";
import { BoutiqueShelfStoreHome } from "@/components/storefront/templates/store/boutique-shelf-home";
import { ButcherBoardStoreHome } from "@/components/storefront/templates/store/butcher-board-home";
import { CarbonDeskStoreHome } from "@/components/storefront/templates/store/carbon-desk-home";
import { ChemLabStoreHome } from "@/components/storefront/templates/store/chem-lab-home";
import { MartStoreHome } from "@/components/storefront/templates/store/mart-home";
import { MilkRunStoreHome } from "@/components/storefront/templates/store/milk-run-home";
import { OxideStoreHome } from "@/components/storefront/templates/store/oxide-home";
import { ScentStoryStoreHome } from "@/components/storefront/templates/store/scent-story-home";
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
  "beauty-edit": BeautyEditStoreHome,
  "scent-story": ScentStoryStoreHome,
  "spirits-cellar": SpiritsCellarStoreHome,
  oxide: OxideStoreHome,
  "tint-lab": TintLabStoreHome,
  "milk-run": MilkRunStoreHome,
  "carbon-desk": CarbonDeskStoreHome,
  "chem-lab": ChemLabStoreHome,
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
  "front-window": FrontWindowLanding,
};

export type StoreChromeVariant =
  | "default"
  | "dark"
  | "soft"
  | "oxide"
  | "tint-lab"
  | "milk-run"
  | "butcher-board"
  | "carbon-desk"
  | "boutique-shelf"
  | "beauty-edit"
  | "scent-story"
  | "chem-lab"
  | "spirits-cellar";

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
    case "milk-run":
      return "milk-run";
    case "butcher-board":
      return "butcher-board";
    case "carbon-desk":
      return "carbon-desk";
    case "boutique-shelf":
      return "boutique-shelf";
    case "beauty-edit":
      return "beauty-edit";
    case "scent-story":
      return "scent-story";
    case "chem-lab":
      return "chem-lab";
    case "spirits-cellar":
      return "spirits-cellar";
    default:
      return "default";
  }
}
