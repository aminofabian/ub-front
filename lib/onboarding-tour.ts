"use client";

import { APP_ROUTES } from "@/lib/config";

const STORAGE_KEY = "palmart.onboardingTour.v1";

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

/** In-drawer (or page) regions to ring-highlight during a step. */
export const ONBOARDING_EMPHASIS = {
  categoriesSuggestions: "categories-suggestions",
  storefrontToggle: "storefront-toggle",
} as const;

export type OnboardingEmphasisId =
  (typeof ONBOARDING_EMPHASIS)[keyof typeof ONBOARDING_EMPHASIS];

export type OnboardingStepId =
  | "branch"
  | "storefront"
  | "branding"
  | "categories"
  | "itemTypes"
  | "products"
  | "supplier"
  | "supplies"
  | "complete";

export type OnboardingTourStatus =
  | "idle"
  | "pending"
  | "active"
  | "completed"
  | "dismissed";

export type OnboardingTourState = {
  status: OnboardingTourStatus;
  stepId: OnboardingStepId | null;
  updatedAt: string;
};

export type OnboardingTourStep = {
  id: OnboardingStepId;
  route: string;
  target: OnboardingTargetId | null;
  title: string;
  keyMessage: string;
  instructions: readonly string[];
  optional?: boolean;
  /** Query param value for `?onboarding=` — pages can react (e.g. open a drawer). */
  routeOnboardingParam?: string;
  /**
   * `page-left` — card sits in the dimmed page area (drawer steps).
   * `near-target` — card beside the highlight (default).
   */
  cardAnchor?: "near-target" | "page-left";
  /** Extra ring inside a drawer (e.g. suggested categories bulk picker). */
  emphasisTarget?: OnboardingEmphasisId;
};

export const ONBOARDING_TOUR_STEPS: readonly OnboardingTourStep[] = [
  {
    id: "branch",
    route: APP_ROUTES.branches,
    target: ONBOARDING_TARGETS.addBranch,
    routeOnboardingParam: "add-branch",
    title: "Add your shop location",
    keyMessage: "Tell us where you sell. You can add more locations later.",
    instructions: [
      "Type your shop name in the highlighted form below.",
      "Add an address if you want — it's optional.",
      "Click Create to save your first location.",
    ],
  },
  {
    id: "storefront",
    route: APP_ROUTES.business,
    target: ONBOARDING_TARGETS.settingsDrawer,
    routeOnboardingParam: "storefront",
    cardAnchor: "page-left",
    emphasisTarget: ONBOARDING_EMPHASIS.storefrontToggle,
    title: "Sell online? (optional)",
    keyMessage:
      "Turn on a web shop so customers can browse and order from you.",
    optional: true,
    instructions: [
      "Toggle Storefront on in the drawer (look for the highlighted switch).",
      "Pick which branch shows on the web, then click Save.",
      "Only selling in person? Tap Skip step below.",
    ],
  },
  {
    id: "branding",
    route: APP_ROUTES.businessBranding,
    target: ONBOARDING_TARGETS.brandingDrawer,
    routeOnboardingParam: "branding",
    cardAnchor: "page-left",
    title: "Your logo and colors",
    keyMessage: "Make receipts and your shop look like your brand.",
    instructions: [
      "Upload your logo in the drawer — square images work best.",
      "Pick a primary color and accent color from the palette.",
      "Add your shop display name, then click Save branding.",
    ],
  },
  {
    id: "categories",
    route: APP_ROUTES.categories,
    target: ONBOARDING_TARGETS.categoriesDrawer,
    routeOnboardingParam: "create-category",
    cardAnchor: "page-left",
    emphasisTarget: ONBOARDING_EMPHASIS.categoriesSuggestions,
    title: "Group your products",
    keyMessage:
      "The fastest start is suggested categories — ready-made lists you can tick and add in bulk.",
    instructions: [
      "Try a starter kit — Full grocery, Mini mart, or Fresh market.",
      "Tap a department to select it, then fine-tune with the chips below.",
      "Hit Create when you’re happy — or type your own names at the top.",
    ],
  },
  {
    id: "itemTypes",
    route: APP_ROUTES.itemTypes,
    target: ONBOARDING_TARGETS.itemTypesDrawer,
    routeOnboardingParam: "create-item-type",
    cardAnchor: "page-left",
    title: "Set up item types",
    keyMessage:
      "Types help you track different kinds of stock — like cereals, fruits, or drinks.",
    instructions: [
      "Type a name you'll recognize — e.g. 'Cereals', 'Drinks', 'Snacks'.",
      "Click Create. Repeat for each type your shop needs.",
      "Every product needs a type, but you can always add more later.",
    ],
  },
  {
    id: "products",
    route: APP_ROUTES.products,
    target: ONBOARDING_TARGETS.productsDrawer,
    routeOnboardingParam: "create-product",
    cardAnchor: "page-left",
    title: "Add a product",
    keyMessage:
      "This is what you sell — name it, price it, and say how much you have.",
    instructions: [
      "Fill in the product name, selling price, and current stock quantity.",
      "Pick a category and item type from the dropdowns.",
      "Click Create to save your first product.",
    ],
  },
  {
    id: "supplier",
    route: APP_ROUTES.suppliers,
    target: ONBOARDING_TARGETS.supplierDrawer,
    routeOnboardingParam: "create-supplier",
    cardAnchor: "page-left",
    title: "Add a supplier (optional)",
    keyMessage:
      "A supplier is who you buy stock from. Add one before you log deliveries.",
    optional: true,
    instructions: [
      "Enter the supplier's name in the drawer — that's enough to start.",
      "Phone number and payment details can wait until later.",
      "Don't have supplier info yet? Tap Skip step.",
    ],
  },
  {
    id: "supplies",
    route: APP_ROUTES.purchasingAddSupplies,
    target: ONBOARDING_TARGETS.suppliesDrawer,
    routeOnboardingParam: "create-supply",
    cardAnchor: "page-left",
    title: "Log stock you received (optional)",
    keyMessage:
      "When goods arrive from a supplier, record them here so your stock stays right.",
    optional: true,
    instructions: [
      "Pick your supplier from the dropdown, then add each item you received.",
      "Enter the quantity and buying price for each line.",
      "Click Post to update your stock levels automatically.",
    ],
  },
  {
    id: "complete",
    route: APP_ROUTES.overview,
    target: null,
    title: "You're ready!",
    keyMessage:
      "Your shop is set up. You can change any of this later from the menu.",
    instructions: [],
  },
] as const;

/** Drawer panels used by the tour — derived from steps with `cardAnchor: "page-left"`. */
export const ONBOARDING_DRAWER_TARGETS = ONBOARDING_TOUR_STEPS.filter(
  (s) => s.cardAnchor === "page-left" && s.target !== null,
)
  .map((s) => s.target!)
  .filter((v, i, a) => a.indexOf(v) === i) as readonly OnboardingTargetId[];

export function isOnboardingDrawerTarget(target: OnboardingTargetId): boolean {
  return (ONBOARDING_DRAWER_TARGETS as readonly string[]).includes(target);
}

// ── Analytics ────────────────────────────────────────────────────

export type OnboardingTourEvent =
  | { kind: "step-entered"; stepId: OnboardingStepId; stepNumber: number }
  | { kind: "step-completed"; stepId: OnboardingStepId; stepNumber: number }
  | { kind: "step-skipped"; stepId: OnboardingStepId; stepNumber: number }
  | { kind: "tour-completed" }
  | { kind: "tour-dismissed"; lastStepId: OnboardingStepId };

export type OnboardingTourAnalyticsHandler = (
  event: OnboardingTourEvent,
) => void;

let analyticsHandler: OnboardingTourAnalyticsHandler | null = null;

export function setOnboardingTourAnalytics(
  handler: OnboardingTourAnalyticsHandler | null,
): void {
  analyticsHandler = handler;
}

export function emitOnboardingTourEvent(event: OnboardingTourEvent): void {
  try {
    analyticsHandler?.(event);
  } catch {
    // Analytics must never break the tour.
  }
}

const ONBOARDING_STEP_IDS = new Set(ONBOARDING_TOUR_STEPS.map((s) => s.id));

function isOnboardingStepId(id: unknown): id is OnboardingStepId {
  return (
    typeof id === "string" && ONBOARDING_STEP_IDS.has(id as OnboardingStepId)
  );
}

const DEFAULT_STATE: OnboardingTourState = {
  status: "idle",
  stepId: null,
  updatedAt: "",
};

function readState(): OnboardingTourState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<OnboardingTourState>;
    const status = parsed.status ?? "idle";
    if (
      status !== "idle" &&
      status !== "pending" &&
      status !== "active" &&
      status !== "completed" &&
      status !== "dismissed"
    ) {
      return DEFAULT_STATE;
    }
    return {
      status,
      stepId:
        parsed.stepId != null && isOnboardingStepId(parsed.stepId)
          ? parsed.stepId
          : null,
      updatedAt: parsed.updatedAt ?? "",
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(next: OnboardingTourState): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...next,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function getOnboardingTourState(): OnboardingTourState {
  return readState();
}

export function markOnboardingTourPending(): void {
  writeState({
    status: "pending",
    stepId: ONBOARDING_TOUR_STEPS[0]?.id ?? "branch",
    updatedAt: new Date().toISOString(),
  });
}

export function shouldStartOnboardingTour(): boolean {
  const { status } = readState();
  return status === "pending" || status === "active";
}

export function isOnboardingTourFinished(): boolean {
  const { status } = readState();
  return status === "completed" || status === "dismissed";
}

export function activateOnboardingTour(stepId?: OnboardingStepId): void {
  writeState({
    status: "active",
    stepId: stepId ?? readState().stepId ?? "branch",
    updatedAt: new Date().toISOString(),
  });
}

export function setOnboardingTourStep(stepId: OnboardingStepId): void {
  const current = readState();
  writeState({
    status: current.status === "pending" ? "active" : current.status,
    stepId,
    updatedAt: new Date().toISOString(),
  });
}

export function completeOnboardingTour(): void {
  writeState({
    status: "completed",
    stepId: null,
    updatedAt: new Date().toISOString(),
  });
}

export function dismissOnboardingTour(): void {
  writeState({
    status: "dismissed",
    stepId: null,
    updatedAt: new Date().toISOString(),
  });
}

export function resetOnboardingTourForDev(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function onboardingTargetSelector(target: OnboardingTargetId): string {
  return `[data-onboarding-target="${target}"]`;
}

export function onboardingEmphasisSelector(id: OnboardingEmphasisId): string {
  return `[data-onboarding-emphasis="${id}"]`;
}

export function stepById(id: OnboardingStepId): OnboardingTourStep | undefined {
  return ONBOARDING_TOUR_STEPS.find((s) => s.id === id);
}

export function nextStepId(current: OnboardingStepId): OnboardingStepId | null {
  const idx = ONBOARDING_TOUR_STEPS.findIndex((s) => s.id === current);
  if (idx < 0 || idx >= ONBOARDING_TOUR_STEPS.length - 1) {
    return null;
  }
  return ONBOARDING_TOUR_STEPS[idx + 1]?.id ?? null;
}

export function prevStepId(current: OnboardingStepId): OnboardingStepId | null {
  const idx = ONBOARDING_TOUR_STEPS.findIndex((s) => s.id === current);
  if (idx <= 0) {
    return null;
  }
  return ONBOARDING_TOUR_STEPS[idx - 1]?.id ?? null;
}

export function stepIndex(id: OnboardingStepId): number {
  return ONBOARDING_TOUR_STEPS.findIndex((s) => s.id === id);
}

export function tourRouteForStep(step: OnboardingTourStep): string {
  if (!step.routeOnboardingParam) {
    return step.route;
  }
  const sep = step.route.includes("?") ? "&" : "?";
  return `${step.route}${sep}onboarding=${encodeURIComponent(step.routeOnboardingParam)}`;
}

/** True when the user must add or select a branch before dashboard data can load. */
export function needsBranchSetup(
  branches: readonly { id: string }[],
  branchId: string,
): boolean {
  if (branches.length === 0) {
    return true;
  }
  const id = branchId.trim();
  if (!id) {
    return true;
  }
  return !branches.some((b) => b.id === id);
}
