"use client";

/**
 * Onboarding "spotlight target" constants.
 *
 * The guided onboarding tour was retired (2026-08-19) — the 7-step
 * questionnaire (`onboarding-questionnaire.ts`) replaced it. These constants
 * are kept because live dashboard pages still set `data-onboarding-target` /
 * `data-onboarding-emphasis` attributes (inert without the tour) and
 * `FormDrawer` references `OnboardingTargetId`.
 */
export const ONBOARDING_TARGETS = {
  addBranch: "add-branch",
  settingsDrawer: "settings-drawer",
  brandingDrawer: "branding-drawer",
  categoriesDrawer: "categories-drawer",
  itemTypesDrawer: "item-types-drawer",
  productsDrawer: "products-drawer",
  supplierDrawer: "supplier-drawer",
  suppliesDrawer: "supplies-drawer",
} as const;

export type OnboardingTargetId =
  (typeof ONBOARDING_TARGETS)[keyof typeof ONBOARDING_TARGETS];

/** In-drawer (or page) regions that the retired tour could ring-highlight. */
export const ONBOARDING_EMPHASIS = {
  categoriesSuggestions: "categories-suggestions",
  itemTypesSuggestions: "item-types-suggestions",
  storefrontToggle: "storefront-toggle",
} as const;

export type OnboardingEmphasisId =
  (typeof ONBOARDING_EMPHASIS)[keyof typeof ONBOARDING_EMPHASIS];
