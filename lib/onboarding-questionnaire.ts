"use client";

import {
  fetchOnboardingState,
  patchOnboardingState,
  type OnboardingStateRecord,
} from "@/lib/api";
import { STORE_SECTION_STARTER_KITS } from "@/lib/item-type-suggestions";

const STORAGE_KEY = "palmart.onboardingQuestionnaire.v1";

export type BranchCountChoice = "1" | "2" | "3" | "4" | "5plus";

export type StoreTypeChoice =
  | "butchery"
  | "mini-mart"
  | "full-grocery"
  | "fresh-market"
  | "mixed-shop";

export type OnlineStoreChoice = "yes" | "no";

export type OnboardingQuestionnaireAnswers = {
  branchCount: BranchCountChoice;
  /** Area/locality only — formatted as "{name} branch" when saved. */
  branchLocalities: string[];
  /** One or more shop formats, e.g. mini mart plus butchery. */
  storeTypes: StoreTypeChoice[];
  /** Department labels the tenant chose (item types). */
  selectedDepartments: string[];
  onlineStore: OnlineStoreChoice;
  displayName: string;
  primaryColor: string;
  accentColor: string;
};

/** In-memory only (not persisted to localStorage). */
export type OnboardingQuestionnaireFinishExtras = {
  logoFile?: File | null;
};

export type OnboardingQuestionnaireStatus =
  | "idle"
  | "pending"
  | "active"
  | "completed"
  | "dismissed";

export type OnboardingQuestionnaireState = {
  status: OnboardingQuestionnaireStatus;
  step: number;
  answers: Partial<OnboardingQuestionnaireAnswers>;
  updatedAt: string;
};

export const QUESTIONNAIRE_STEP_COUNT = 6;

export const BRANCH_COUNT_OPTIONS: readonly {
  value: BranchCountChoice;
  label: string;
}[] = [
  { value: "1", label: "1 location" },
  { value: "2", label: "2 locations" },
  { value: "3", label: "3 locations" },
  { value: "4", label: "4 locations" },
  { value: "5plus", label: "5 or more" },
];

/** Example locality names for branch inputs (Kenya-style areas). */
export const BRANCH_LOCALITY_PLACEHOLDERS = [
  "Mirema",
  "Kasarani",
  "Ongata Rongai",
  "Westlands",
  "Karen",
] as const;

export const STORE_TYPE_OPTIONS: readonly {
  value: StoreTypeChoice;
  label: string;
  hint: string;
}[] = [
  {
    value: "butchery",
    label: "Butchery",
    hint: "Meat, poultry, fish, eggs, and value-added products",
  },
  {
    value: "mini-mart",
    label: "Mini mart",
    hint: "Snacks, drinks, and everyday staples",
  },
  {
    value: "full-grocery",
    label: "Full grocery",
    hint: "Wide range across all departments",
  },
  {
    value: "fresh-market",
    label: "Fresh market",
    hint: "Produce, dairy, and protein focus",
  },
  {
    value: "mixed-shop",
    label: "Mixed shop",
    hint: "Groceries plus general retail",
  },
];

export const ONLINE_STORE_OPTIONS: readonly {
  value: OnlineStoreChoice;
  label: string;
}[] = [
  {
    value: "yes",
    label: "Yes — set up my online store",
  },
  {
    value: "no",
    label: "Not right now — in-store only",
  },
];

export function storeTypeSectionLabels(
  storeType: StoreTypeChoice,
): readonly string[] {
  if (storeType === "fresh-market") {
    return (
      STORE_SECTION_STARTER_KITS.find((k) => k.id === "produce-shop")?.sections ??
      []
    );
  }
  const kit = STORE_SECTION_STARTER_KITS.find((k) => k.id === storeType);
  return kit?.sections ?? [];
}

/** Merges department suggestions from multiple shop formats, deduped by label. */
export function storeTypesSectionLabels(
  storeTypes: readonly StoreTypeChoice[],
): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const storeType of storeTypes) {
    for (const label of storeTypeSectionLabels(storeType)) {
      const trimmed = label.trim();
      const key = trimmed.toLowerCase();
      if (!trimmed || seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out;
}

export function formatStoreTypesLabel(
  storeTypes: readonly StoreTypeChoice[],
): string {
  if (storeTypes.length === 0) {
    return "your shop";
  }
  const labels = storeTypes.map(
    (value) =>
      STORE_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
      value,
  );
  if (labels.length === 1) {
    return labels[0]!;
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

export function branchCountToNumber(count: BranchCountChoice): number {
  if (count === "5plus") {
    return 5;
  }
  return Number.parseInt(count, 10);
}

export function branchLocalityPlaceholder(index: number): string {
  return (
    BRANCH_LOCALITY_PLACEHOLDERS[index % BRANCH_LOCALITY_PLACEHOLDERS.length] ??
    `Area ${index + 1}`
  );
}

/** Formats a locality as a branch name, e.g. "Mirema" → "Mirema branch". */
export function formatBranchDisplayName(locality: string): string {
  const trimmed = locality.trim();
  if (!trimmed) {
    return "";
  }
  if (/\bbranch$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} branch`;
}

/** Strips a trailing " branch" so inputs can store locality only. */
export function parseBranchLocality(value: string): string {
  return value.replace(/\s+branch$/i, "").trim();
}

export function defaultBranchLocality(index: number): string {
  return branchLocalityPlaceholder(index);
}

/** True when the string looks like a URL slug rather than a human shop name. */
export function looksLikeSlug(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  if (/\s/.test(trimmed)) {
    return false;
  }
  return /^[a-z0-9]+([-_][a-z0-9]+)*$/i.test(trimmed);
}

/** Turns `sunrise-bakery` into `Sunrise Bakery`. */
export function slugToDisplayName(slug: string): string {
  return slug
    .trim()
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Suggests a customer-facing display name from business name, slug, or first branch.
 */
export function suggestDisplayName(opts: {
  businessName?: string | null;
  slug?: string | null;
  branchLocalities?: readonly string[];
  existingBrandingDisplayName?: string | null;
}): string {
  const fromBranding = opts.existingBrandingDisplayName?.trim();
  if (fromBranding) {
    return fromBranding;
  }

  const name = opts.businessName?.trim() ?? "";
  if (name && !looksLikeSlug(name)) {
    return name;
  }

  const slug = opts.slug?.trim() ?? "";
  if (slug) {
    return slugToDisplayName(slug);
  }

  if (name) {
    return slugToDisplayName(name);
  }

  const firstLocality = opts.branchLocalities?.[0]?.trim();
  if (firstLocality) {
    return firstLocality.charAt(0).toUpperCase() + firstLocality.slice(1);
  }

  return "";
}

/** @deprecated Use branchLocalities + formatBranchDisplayName */
export function defaultBranchName(index: number): string {
  return formatBranchDisplayName(defaultBranchLocality(index));
}

const DEFAULT_STATE: OnboardingQuestionnaireState = {
  status: "idle",
  step: 1,
  answers: {},
  updatedAt: "",
};

function normalizeStoredAnswers(
  raw: Partial<OnboardingQuestionnaireAnswers> & {
    branchNames?: string[];
    storeType?: StoreTypeChoice;
  },
): Partial<OnboardingQuestionnaireAnswers> {
  const out: Partial<OnboardingQuestionnaireAnswers> = { ...raw };
  if (!out.branchLocalities?.length && raw.branchNames?.length) {
    out.branchLocalities = raw.branchNames.map(parseBranchLocality);
  }
  if (!out.storeTypes?.length && raw.storeType) {
    out.storeTypes = [raw.storeType];
  }
  delete (out as { branchNames?: string[]; storeType?: StoreTypeChoice })
    .branchNames;
  delete (out as { storeType?: StoreTypeChoice }).storeType;
  return out;
}

function readState(): OnboardingQuestionnaireState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<OnboardingQuestionnaireState>;
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
    const step =
      typeof parsed.step === "number" &&
      parsed.step >= 1 &&
      parsed.step <= QUESTIONNAIRE_STEP_COUNT
        ? parsed.step
        : 1;
    return {
      status,
      step,
      answers: normalizeStoredAnswers(
        (parsed.answers ?? {}) as Partial<OnboardingQuestionnaireAnswers> & {
          branchNames?: string[];
        },
      ),
      updatedAt: parsed.updatedAt ?? "",
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(next: OnboardingQuestionnaireState): void {
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

export function getOnboardingQuestionnaireState(): OnboardingQuestionnaireState {
  return readState();
}

function mapServerOnboarding(
  remote: OnboardingStateRecord,
): OnboardingQuestionnaireState {
  const status = remote.status as OnboardingQuestionnaireStatus;
  const answers = (remote.answers ?? {}) as Partial<OnboardingQuestionnaireAnswers>;
  return {
    status:
      status === "pending" ||
      status === "active" ||
      status === "completed" ||
      status === "dismissed"
        ? status
        : "idle",
    step:
      typeof remote.step === "number" &&
      remote.step >= 1 &&
      remote.step <= QUESTIONNAIRE_STEP_COUNT
        ? remote.step
        : 1,
    answers,
    updatedAt: remote.updatedAt ?? new Date().toISOString(),
  };
}

/** Loads onboarding progress from the API into localStorage (server wins). */
export async function hydrateOnboardingQuestionnaireFromServer(): Promise<OnboardingQuestionnaireState | null> {
  try {
    const remote = await fetchOnboardingState();
    if (remote.status === "idle") {
      return null;
    }
    const local = mapServerOnboarding(remote);
    writeState(local);
    return local;
  } catch {
    return null;
  }
}

async function persistOnboardingQuestionnaireToServer(patch: {
  status?: OnboardingQuestionnaireStatus;
  step?: number;
  answers?: Partial<OnboardingQuestionnaireAnswers>;
}): Promise<void> {
  try {
    await patchOnboardingState(patch);
  } catch {
    // Offline or unauthenticated — local cache remains source of truth until next sync.
  }
}

export function markOnboardingQuestionnairePending(): void {
  const next: OnboardingQuestionnaireState = {
    status: "pending",
    step: 1,
    answers: {},
    updatedAt: new Date().toISOString(),
  };
  writeState(next);
  void persistOnboardingQuestionnaireToServer({
    status: "pending",
    step: 1,
    answers: {},
  });
}

export function shouldStartOnboardingQuestionnaire(): boolean {
  const { status } = readState();
  return status === "pending" || status === "active";
}

export function isOnboardingQuestionnaireFinished(): boolean {
  const { status } = readState();
  return status === "completed" || status === "dismissed";
}

export function activateOnboardingQuestionnaire(): void {
  const current = readState();
  const next: OnboardingQuestionnaireState = {
    status: "active",
    step: current.step || 1,
    answers: current.answers,
    updatedAt: new Date().toISOString(),
  };
  writeState(next);
  void persistOnboardingQuestionnaireToServer({
    status: "active",
    step: next.step,
    answers: next.answers,
  });
}

export function saveQuestionnaireProgress(
  step: number,
  answers: Partial<OnboardingQuestionnaireAnswers>,
): void {
  const current = readState();
  const mergedAnswers = { ...current.answers, ...answers };
  const status =
    current.status === "pending" ? "active" : current.status;
  writeState({
    status,
    step,
    answers: mergedAnswers,
    updatedAt: new Date().toISOString(),
  });
  void persistOnboardingQuestionnaireToServer({
    status: status === "idle" ? "active" : status,
    step,
    answers: mergedAnswers,
  });
}

export function completeOnboardingQuestionnaire(
  answers?: Partial<OnboardingQuestionnaireAnswers>,
): void {
  const finalAnswers = answers ?? readState().answers;
  writeState({
    status: "completed",
    step: QUESTIONNAIRE_STEP_COUNT,
    answers: finalAnswers,
    updatedAt: new Date().toISOString(),
  });
  void persistOnboardingQuestionnaireToServer({
    status: "completed",
    step: QUESTIONNAIRE_STEP_COUNT,
    answers: finalAnswers,
  });
}

export function dismissOnboardingQuestionnaire(): void {
  writeState({
    status: "dismissed",
    step: 1,
    answers: {},
    updatedAt: new Date().toISOString(),
  });
  void persistOnboardingQuestionnaireToServer({
    status: "dismissed",
    step: 1,
    answers: {},
  });
}

export function resetOnboardingQuestionnaireForDev(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
