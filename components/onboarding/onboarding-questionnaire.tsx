"use client";

import { SERVICE_STORE_TYPES } from "@/lib/business-store-type";
import { IS_DESKTOP } from "@/lib/runtime";

import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Drumstick,
  LayoutGrid,
  Leaf,
  Loader2,
  MessageCircle,
  Package,
  Pill,
  ShoppingCart,
  Sparkles,
  Store,
  Shapes,
  Smartphone,
  Wine,
  Bath,
  Hand,
  Heart,
  Scissors,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { OnboardingReceiveMpesaStep } from "@/components/onboarding/onboarding-receive-mpesa-step";
import { SetupSlip, type SetupSlipLine } from "@/components/onboarding/setup-slip";
import {
  EASE,
  FIELD_CLASS,
  FIELD_LABEL,
  FIELD_SHELL,
  FOCUS_RING,
  KEY_BASE,
  KEY_OFF,
  KEY_ON,
  NOTE,
  QUIET_BUTTON,
  SETUP_GRID,
} from "@/components/onboarding/setup-ui";
import { OnboardingBrandingColorPicker } from "@/components/onboarding/onboarding-branding-color-picker";
import { OnboardingBrandingPreviewModal } from "@/components/onboarding/onboarding-branding-preview-modal";
import { useLogoObjectUrl } from "@/components/onboarding/onboarding-branding-preview";
import {
  getContrastSafeBrandingPresets,
  meetsBrandingContrast,
} from "@/lib/branding-color-presets";
import { KioskLogoMark } from "@/components/brand/kiosk-logo-mark";
import { TenantLogo } from "@/components/brand/tenant-logo";
import { AiLogoGenerator, type GeneratedBrandKit } from "@/components/brand/ai-logo-generator";
import { ThemeTryOnPhone } from "@/components/business/theme-try-on-phone";
import {
  MilkRunWhatsAppDialog,
  milkRunNeedsWhatsApp,
} from "@/components/storefront/milk-run-whatsapp-dialog";
import {
  BRANCH_COUNT_OPTIONS,
  ONLINE_STORE_OPTIONS,
  PRODUCT_SOURCE_OPTIONS,
  QUESTIONNAIRE_STEP_COUNT,
  STORE_TYPE_OPTIONS,
  branchCountToNumber,
  branchLocalityPlaceholder,
  formatBranchDisplayName,
  localityPlaceholdersForCountry,
  looksLikeOwnerPhone,
  storeTypesSectionLabels,
  formatStoreTypesLabel,
  suggestDisplayName,
  QUESTIONNAIRE_PHONE_STEP,
  QUESTIONNAIRE_RECEIVE_STEP,
  QUESTIONNAIRE_STOCK_STEP,
  type BranchCountChoice,
  type OnboardingQuestionnaireAnswers,
  type OnboardingQuestionnaireFinishExtras,
  type OnlineStoreChoice,
  type ProductSourceChoice,
  type StoreTypeChoice,
} from "@/lib/onboarding-questionnaire";
import {
  DEFAULT_LANDING_TEMPLATE_ID,
  DEFAULT_STORE_THEME_ID,
  LANDING_TEMPLATE_META,
  STORE_THEME_META,
  landingTemplateMeta,
  shortlistLandingTemplateIds,
  shortlistStoreThemeIds,
  storeThemeMeta,
} from "@/lib/storefront-templates";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/haptics";
import { claimBackNavigation } from "@/lib/onboarding-back";
import type { OnboardingSuggestedPackPreview } from "@/lib/onboarding-suggested-pack";
import { useSelfServeCountries } from "@/hooks/use-selfserve-countries";
import { findSelfServeCountry } from "@/lib/selfserve-countries";

const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const MAX_FAVICON_BYTES = 512 * 1024;
const ACCEPTED_LOGO_TYPES = "image/png,image/jpeg,image/webp,image/svg+xml";

const STORE_TYPE_ICONS: Record<
  StoreTypeChoice,
  typeof Store
> = {
  butchery: Drumstick,
  "mini-mart": Store,
  "full-grocery": ShoppingCart,
  "fresh-market": Leaf,
  "mixed-shop": LayoutGrid,
  cosmetics: Sparkles,
  "wines-spirits": Wine,
  pharmacy: Pill,
  other: Shapes,
  barbershop: Scissors,
  salon: Sparkles,
  spa: Bath,
  "nail-studio": Hand,
  "beauty-parlour": Heart,
};

/**
 * Service shop types are not offered on the desktop app: its sync does not carry tips,
 * performers or staff earnings yet.
 */
const SHOWN_STORE_TYPE_OPTIONS = IS_DESKTOP
  ? STORE_TYPE_OPTIONS.filter(
      (opt) => !(SERVICE_STORE_TYPES as readonly string[]).includes(opt.value),
    )
  : STORE_TYPE_OPTIONS;

function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }
    const update = () => {
      const overlap = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      setInset(overlap > 48 ? overlap : 0);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

type Props = {
  step: number;
  initialAnswers: Partial<OnboardingQuestionnaireAnswers>;
  businessName?: string;
  businessSlug?: string;
  brandingDisplayName?: string | null;
  submitting: boolean;
  errorMessage?: string;
  onContinue: (
    answers: Partial<OnboardingQuestionnaireAnswers>,
    extras?: OnboardingQuestionnaireFinishExtras,
  ) => void;
  onBack: () => void;
  onSkip: () => void;
  canBrowseGlobalCatalog?: boolean;
  /** Opens the in-flow starter catalogue drawer (final stock step). */
  onOpenCatalogDrawer?: () => void;
  onAddProductsManually?: () => void;
  onFinishLater?: () => void;
  /** Persist product-source choice on the stock step (powers M1 persona). */
  onProductSourceChange?: (source: ProductSourceChoice) => void;
  /** Open spreadsheet import after choosing migrating path. */
  onOpenImport?: () => void;
  /** Optional till/paybill receive step — skip or finish advances to stock. */
  onReceiveSkip?: () => void;
  onReceiveDone?: () => void;
  /** ISO country for locality placeholders (defaults to KE examples). */
  countryCode?: string | null;
  currency?: string | null;
  /** Prefill from the signed-in user's existing phone. */
  accountPhone?: string | null;
  /** When true, step 6 shows empty-catalog copy instead of browse CTA. */
  catalogShellEmpty?: boolean;
  catalogLabel?: string | null;
  suggestedPack?: OnboardingSuggestedPackPreview | null;
  packLoading?: boolean;
  /** True right after the shop setup applied — shows a one-time success note on the stock step. */
  celebrate?: boolean;
};

const STEP_LABELS = [
  "Locations",
  "Shop type",
  "Sections",
  "Selling online",
  "Look",
  "Branding",
  "Shop line",
  "Receive M-Pesa",
] as const;

function QuestionnaireProgress({ step }: { step: number }) {
  const answerSteps = QUESTIONNAIRE_STEP_COUNT - 1;
  const clamped = Math.min(step, answerSteps);
  const isFinal = step >= QUESTIONNAIRE_STEP_COUNT;
  const percent = isFinal ? 100 : Math.round((clamped / answerSteps) * 100);
  const stepLabel = isFinal ? "Shelves" : (STEP_LABELS[clamped - 1] ?? "");

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[13px] font-medium text-[#121A16]">
          {stepLabel}
        </span>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#556159]">
          {isFinal ? "Last step" : `${clamped} of ${answerSteps}`}
        </span>
      </div>
      {/* One tick per question: the ledger line fills as the shop takes shape. */}
      <div
        className="mt-2 flex gap-1"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Setup progress: ${percent} percent`}
      >
        {Array.from({ length: answerSteps }, (_, i) => (
          <span
            key={i}
            className="relative h-[3px] flex-1 overflow-hidden bg-[rgba(18,26,22,0.12)]"
          >
            <span
              className={cn(
                "absolute inset-0 origin-left bg-[#1D4B3B] transition-transform duration-500",
                EASE,
                isFinal || i < clamped ? "scale-x-100" : "scale-x-0",
              )}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

function StoreTypeButton({
  label,
  hint,
  icon: Icon,
  clay,
  selected,
  onClick,
}: {
  label: string;
  hint: string;
  icon: typeof Store;
  /** The one terracotta stamp on this step. Every other key stays forest. */
  clay?: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => {
        hapticTap(8);
        onClick();
      }}
      className={cn(
        "relative flex min-h-11 items-center gap-2 rounded-[2px] border py-1.5 pl-2 pr-6 text-left sm:min-h-12 sm:gap-2.5 sm:py-2 sm:pl-2.5 sm:pr-7",
        "transition-[background-color,border-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4B3B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1EA]",
        "motion-safe:active:scale-[0.985]",
        selected
          ? "border-[#1D4B3B] bg-[#1D4B3B] text-[#F4F1EA] hover:bg-[#163B2E]"
          : "border-[rgba(18,26,22,0.12)] bg-[#FCFAF5] text-[#121A16] hover:border-[rgba(18,26,22,0.22)] hover:bg-[#F4F1EA]",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-[2px] sm:size-8",
          selected
            ? "bg-[#F4F1EA] text-[#1D4B3B]"
            : clay
              ? "bg-[#F6E7E1] text-[#8F3F2F]"
              : "bg-[#EFEBE2] text-[#1D4B3B]",
        )}
      >
        <Icon className="size-3.5 sm:size-4" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[13px] font-semibold leading-tight tracking-[-0.015em]">
          {label}
        </span>
        <span
          className={cn(
            "mt-0.5 line-clamp-1 text-[11px] leading-snug",
            selected ? "text-[#D7E6DE]" : "text-[#556159]",
          )}
        >
          {hint}
        </span>
      </span>
      <Check
        className={cn(
          "absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 transition-opacity duration-200 sm:right-2",
          selected ? "text-[#F4F1EA] opacity-100" : "opacity-0",
        )}
        strokeWidth={2.5}
        aria-hidden
      />
    </button>
  );
}

function OptionButton({
  selected,
  onClick,
  title,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => {
        hapticTap(8);
        onClick();
      }}
      className={cn(
        KEY_BASE,
        "relative flex min-h-14 w-full flex-col justify-center gap-0.5 py-3 pl-4 pr-11",
        selected ? KEY_ON : KEY_OFF,
      )}
    >
      <span className="text-[15px] font-semibold leading-snug tracking-[-0.01em]">
        {title}
      </span>
      {hint ? (
        <span
          className={cn(
            "text-[13px] leading-snug",
            selected ? "text-[#D7E6DE]" : "text-[#556159]",
          )}
        >
          {hint}
        </span>
      ) : null}
      <Check
        className={cn(
          "absolute right-4 top-1/2 size-4 -translate-y-1/2 transition-opacity duration-200",
          selected ? "opacity-100" : "opacity-0",
        )}
        strokeWidth={2.5}
        aria-hidden
      />
    </button>
  );
}

function ShopLinePreview({
  shopName,
  phoneLabel,
}: {
  shopName: string;
  phoneLabel: string;
}) {
  const who = shopName.trim() || "the shop";
  return (
    <div className="mx-auto w-full max-w-[240px] sm:mx-0 sm:max-w-[264px]">
      <div className="overflow-hidden rounded-[1.75rem] bg-[#0D1713] shadow-[0_28px_44px_-30px_rgba(13,23,19,0.75)]">
        <div className="flex items-center justify-center pt-2.5">
          <span className="h-1.5 w-14 rounded-full bg-[#2A3A32]" />
        </div>
        <div className="space-y-2 px-3 pb-4 pt-3">
          <p className="text-center font-mono text-[10px] text-[#A9B8AE]">
            Tomorrow, 7:42
          </p>
          <div className="rounded-xl bg-[#1A2620] px-3 py-2.5">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#B9D0C0] text-[#0D1713]">
                <MessageCircle className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#F2EDE1]">{who}</p>
                <p className="truncate text-[11px] text-[#C9D3CC]">
                  Hi — do you still have chicken?
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-[#1A2620] px-3 py-2.5">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#B9D0C0] text-[#0D1713]">
                <Smartphone className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#F2EDE1]">Kiosk</p>
                <p className="text-[11px] text-[#C9D3CC]">
                  3 items below reorder at {who}
                </p>
              </div>
            </div>
          </div>
          {phoneLabel ? (
            <p className="pt-1 text-center font-mono text-[11px] tabular-nums text-[#B9D0C0]">
              {phoneLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DepartmentChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => {
        hapticTap(6);
        onToggle();
      }}
      className={cn(
        KEY_BASE,
        "inline-flex min-h-11 items-center gap-1.5 px-3.5 py-2 text-sm font-medium",
        // Many of these are on at once: a tinted tag, not a solid key, so a
        // full shelf of sections does not turn the page into a green wall.
        selected
          ? "border-[#1D4B3B] bg-[#E3EBE5] text-[#163B2E] hover:bg-[#D8E3DC]"
          : cn(KEY_OFF, "text-[#2A332E]"),
      )}
    >
      {selected ? (
        <Check className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
      ) : null}
      {label}
    </button>
  );
}

function StepHeading({
  title,
  description,
}: {
  title: string;
  description: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <h1 className="text-balance font-serif text-[2rem] font-medium leading-[1.05] tracking-[-0.01em] text-[#121A16] sm:text-[2.6rem]">
        {title}
      </h1>
      <p className="max-w-[54ch] text-pretty text-[15px] leading-relaxed text-[#556159]">
        {description}
      </p>
    </div>
  );
}

export function OnboardingQuestionnaire({
  step,
  initialAnswers,
  businessName,
  businessSlug,
  brandingDisplayName,
  submitting,
  errorMessage,
  onContinue,
  onBack,
  onSkip,
  canBrowseGlobalCatalog = false,
  onOpenCatalogDrawer,
  onAddProductsManually,
  onFinishLater,
  onProductSourceChange,
  onOpenImport,
  onReceiveSkip,
  onReceiveDone,
  countryCode = null,
  currency = null,
  accountPhone = null,
  catalogShellEmpty = false,
  catalogLabel = null,
  suggestedPack = null,
  packLoading = false,
  celebrate = false,
}: Props) {
  const [branchCount, setBranchCount] = useState<BranchCountChoice | "">(
    initialAnswers.branchCount ?? "",
  );
  const [branchLocalities, setBranchLocalities] = useState<string[]>(
    initialAnswers.branchLocalities ?? [],
  );
  const [storeTypes, setStoreTypes] = useState<StoreTypeChoice[]>(() => {
    if (initialAnswers.storeTypes?.length) {
      return [...initialAnswers.storeTypes];
    }
    const legacy = (initialAnswers as { storeType?: StoreTypeChoice }).storeType;
    return legacy ? [legacy] : [];
  });
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    initialAnswers.selectedDepartments ?? [],
  );
  const [customDepartmentName, setCustomDepartmentName] = useState("");
  const [onlineStore, setOnlineStore] = useState<OnlineStoreChoice | "">(
    initialAnswers.onlineStore ?? "yes",
  );
  const [storeThemeId, setStoreThemeId] = useState(
    initialAnswers.storeThemeId ?? DEFAULT_STORE_THEME_ID,
  );
  const [landingTemplateId, setLandingTemplateId] = useState(
    initialAnswers.landingTemplateId ?? DEFAULT_LANDING_TEMPLATE_ID,
  );
  const [landingWhatsapp, setLandingWhatsapp] = useState(
    initialAnswers.landingWhatsapp ?? "",
  );
  const [ownerPhone, setOwnerPhone] = useState(
    initialAnswers.ownerPhone ?? accountPhone ?? "",
  );
  const { countries } = useSelfServeCountries();
  const shopDial = findSelfServeCountry(countries, countryCode ?? "KE");
  const dialCode = shopDial?.dialCode ?? "+254";
  const [milkRunWaPromptOpen, setMilkRunWaPromptOpen] = useState(false);
  const [seeAllThemes, setSeeAllThemes] = useState(false);
  const [displayName, setDisplayName] = useState(() => {
    const saved = initialAnswers.displayName?.trim();
    if (saved) {
      return saved;
    }
    return (
      suggestDisplayName({
        businessName,
        slug: businessSlug,
        branchLocalities: initialAnswers.branchLocalities,
        existingBrandingDisplayName: brandingDisplayName,
      }) || ""
    );
  });
  const defaultPreset = getContrastSafeBrandingPresets()[0];
  const [primaryColor, setPrimaryColor] = useState(
    initialAnswers.primaryColor ?? defaultPreset?.primary ?? "#0D9488",
  );
  const [accentColor, setAccentColor] = useState(
    initialAnswers.accentColor ?? defaultPreset?.accent ?? "#5EEAD4",
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoDarkFile, setLogoDarkFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [ogImageFile, setOgImageFile] = useState<File | null>(null);
  const [appIconFile, setAppIconFile] = useState<File | null>(null);
  const [logoDraftPair, setLogoDraftPair] = useState<GeneratedBrandKit | null>(
    null,
  );
  const [logoError, setLogoError] = useState("");
  const [logoGenerating, setLogoGenerating] = useState(false);
  const [logoGeneratorKey, setLogoGeneratorKey] = useState(0);
  const [productSource, setProductSource] = useState<ProductSourceChoice | "">(
    initialAnswers.productSource ?? "",
  );
  const isPharmacyShop = storeTypes.includes("pharmacy");
  const logoInputRef = useRef<HTMLInputElement>(null);
  /** When true, skip auto-select-all so Clear stays empty. */
  const departmentsClearedRef = useRef(false);
  /** One-shot note after changing shop types: department picks were reset. */
  const [departmentsResetNote, setDepartmentsResetNote] = useState(false);

  // Stock step: default chemists (and other catalogue shops) to Global catalog.
  useEffect(() => {
    if (step !== QUESTIONNAIRE_STOCK_STEP) return;
    if (productSource) return;
    if (!canBrowseGlobalCatalog || catalogShellEmpty) return;
    setProductSource("new");
    onProductSourceChange?.("new");
  }, [
    step,
    productSource,
    canBrowseGlobalCatalog,
    catalogShellEmpty,
    onProductSourceChange,
  ]);
  const uploadedLogoUrl = useLogoObjectUrl(logoFile);
  const uploadedLogoDarkUrl = useLogoObjectUrl(logoDarkFile);
  const logoDraftUrl = useLogoObjectUrl(logoDraftPair?.light ?? null);
  const logoDraftDarkUrl = useLogoObjectUrl(logoDraftPair?.dark ?? null);
  const logoPreviewUrl = logoDraftUrl ?? uploadedLogoUrl;
  const logoDarkPreviewUrl = logoDraftDarkUrl ?? uploadedLogoDarkUrl;

  const suggestedDisplayName = useMemo(
    () =>
      suggestDisplayName({
        businessName,
        slug: businessSlug,
        branchLocalities,
        existingBrandingDisplayName: brandingDisplayName,
      }),
    [businessName, businessSlug, branchLocalities, brandingDisplayName],
  );

  useEffect(() => {
    if (step !== 5 || !suggestedDisplayName) {
      return;
    }
    setDisplayName((prev) => {
      const trimmed = prev.trim();
      if (trimmed) {
        return prev;
      }
      return suggestedDisplayName;
    });
  }, [step, suggestedDisplayName]);

  const branchSlots = useMemo(() => {
    if (!branchCount) {
      return 0;
    }
    return branchCountToNumber(branchCount);
  }, [branchCount]);

  const availableDepartments = useMemo(() => {
    if (storeTypes.length === 0) {
      return [] as string[];
    }
    return [...storeTypesSectionLabels(storeTypes)];
  }, [storeTypes]);

  const visibleDepartments = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const label of [...availableDepartments, ...selectedDepartments]) {
      const trimmed = label.trim();
      const key = trimmed.toLowerCase();
      if (!trimmed || seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(trimmed);
    }
    return out;
  }, [availableDepartments, selectedDepartments]);

  useEffect(() => {
    if (branchSlots <= 0) {
      return;
    }
    setBranchLocalities((prev) => {
      const next = [...prev];
      while (next.length < branchSlots) {
        next.push("");
      }
      return next.slice(0, branchSlots);
    });
  }, [branchSlots]);

  const storeTypesKey = storeTypes.join("|");
  const prevStoreTypesKeyRef = useRef(storeTypesKey);

  useEffect(() => {
    if (step !== 2) {
      setDepartmentsResetNote(false);
    }
  }, [step]);

  useEffect(() => {
    if (step !== 2) {
      prevStoreTypesKeyRef.current = storeTypesKey;
      return;
    }
    if (prevStoreTypesKeyRef.current === storeTypesKey) {
      return;
    }
    prevStoreTypesKeyRef.current = storeTypesKey;
    departmentsClearedRef.current = false;
    setSelectedDepartments([]);
    setDepartmentsResetNote(true);
  }, [storeTypesKey, step]);

  useEffect(() => {
    if (step !== 3) {
      departmentsClearedRef.current = false;
      return;
    }
    if (storeTypes.length === 0 || availableDepartments.length === 0) {
      return;
    }
    setSelectedDepartments((prev) => {
      if (departmentsClearedRef.current) {
        return prev;
      }
      if (prev.length > 0) {
        return prev;
      }
      return [...availableDepartments];
    });
  }, [step, storeTypes.length, availableDepartments]);

  const toggleStoreType = (value: StoreTypeChoice) => {
    setStoreTypes((prev) =>
      prev.includes(value)
        ? prev.filter((entry) => entry !== value)
        : [...prev, value],
    );
  };

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return (
          Boolean(branchCount) &&
          branchLocalities.length === branchSlots &&
          branchLocalities.every((loc) => loc.trim().length > 0)
        );
      case 2:
        return storeTypes.length > 0;
      case 3:
        return true;
      case 4:
        return Boolean(onlineStore);
      case 5:
        return onlineStore === "yes"
          ? Boolean(storeThemeId)
          : Boolean(landingTemplateId);
      case 6:
        return (
          displayName.trim().length > 0 &&
          primaryColor.trim().length > 0 &&
          accentColor.trim().length > 0 &&
          meetsBrandingContrast(primaryColor, accentColor)
        );
      case QUESTIONNAIRE_PHONE_STEP:
        return looksLikeOwnerPhone(ownerPhone, countryCode);
      default:
        return false;
    }
  }, [
    step,
    branchCount,
    branchLocalities,
    branchSlots,
    storeTypes,
    onlineStore,
    storeThemeId,
    landingTemplateId,
    displayName,
    primaryColor,
    accentColor,
    ownerPhone,
    countryCode,
  ]);

  const isDepartmentSelected = (label: string) =>
    selectedDepartments.some(
      (dept) => dept.trim().toLowerCase() === label.trim().toLowerCase(),
    );

  const toggleDepartment = (label: string) => {
    departmentsClearedRef.current = false;
    setSelectedDepartments((prev) => {
      const key = label.trim().toLowerCase();
      return prev.some((dept) => dept.trim().toLowerCase() === key)
        ? prev.filter((dept) => dept.trim().toLowerCase() !== key)
        : [...prev, label];
    });
  };

  const addCustomDepartment = () => {
    const typed = customDepartmentName.trim();
    const label =
      availableDepartments.find(
        (dept) => dept.trim().toLowerCase() === typed.toLowerCase(),
      ) ?? typed;
    if (!label) {
      return;
    }
    departmentsClearedRef.current = false;
    setSelectedDepartments((prev) => {
      if (prev.some((dept) => dept.trim().toLowerCase() === label.toLowerCase())) {
        return prev;
      }
      return [...prev, label];
    });
    setCustomDepartmentName("");
  };

  const selectAllDepartments = () => {
    departmentsClearedRef.current = false;
    setSelectedDepartments((prev) => {
      const availableKeys = new Set(
        availableDepartments.map((dept) => dept.trim().toLowerCase()),
      );
      const custom = prev.filter(
        (dept) => !availableKeys.has(dept.trim().toLowerCase()),
      );
      return [...availableDepartments, ...custom];
    });
  };

  const clearDepartments = () => {
    departmentsClearedRef.current = true;
    setSelectedDepartments([]);
  };

  const onLogoPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setLogoError("");
    if (!file) {
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be 4 MB or smaller.");
      return;
    }
    setLogoFile(file);
    setLogoDarkFile(null);
    setFaviconFile(null);
    setOgImageFile(null);
    setLogoDraftPair(null);
  };

  const handleContinue = () => {
    if (logoGenerating) {
      return;
    }
    clearAutoAdvance();
    switch (step) {
      case 1:
        if (!branchCount) return;
        onContinue({
          branchCount,
          branchLocalities: branchLocalities.map((loc) => loc.trim()),
        });
        break;
      case 2:
        if (storeTypes.length === 0) return;
        onContinue({
          storeTypes: [...storeTypes],
          selectedDepartments: [],
        });
        break;
      case 3:
        onContinue({
          selectedDepartments: selectedDepartments
            .map((dept) => dept.trim())
            .filter(Boolean),
        });
        break;
      case 4:
        if (!onlineStore) return;
        onContinue({ onlineStore });
        break;
      case 5:
        if (onlineStore === "yes") {
          if (!storeThemeId) return;
          onContinue({
            storeThemeId,
            landingTemplateId: landingTemplateId || DEFAULT_LANDING_TEMPLATE_ID,
            landingWhatsapp: landingWhatsapp.trim() || undefined,
          });
        } else {
          if (!landingTemplateId) return;
          onContinue({
            landingTemplateId,
            storeThemeId: storeThemeId || DEFAULT_STORE_THEME_ID,
            landingWhatsapp: landingWhatsapp.trim() || undefined,
          });
        }
        break;
      case 6:
        onContinue(
          {
            displayName: displayName.trim(),
            primaryColor: primaryColor.trim(),
            accentColor: accentColor.trim(),
          },
          {
            logoFile: logoFile ?? logoDraftPair?.light ?? null,
            logoDarkFile: logoDarkFile ?? logoDraftPair?.dark ?? null,
            faviconFile: faviconFile ?? logoDraftPair?.favicon ?? null,
            ogImageFile: ogImageFile ?? logoDraftPair?.og ?? null,
            appIconFile: appIconFile ?? logoDraftPair?.appIcon ?? null,
          },
        );
        break;
      case QUESTIONNAIRE_PHONE_STEP:
        if (!looksLikeOwnerPhone(ownerPhone, countryCode)) return;
        onContinue(
          {
            ownerPhone: ownerPhone.trim(),
            landingWhatsapp:
              landingWhatsapp.trim() || ownerPhone.trim() || undefined,
          },
          {
            logoFile: logoFile ?? logoDraftPair?.light ?? null,
            logoDarkFile: logoDarkFile ?? logoDraftPair?.dark ?? null,
            faviconFile: faviconFile ?? logoDraftPair?.favicon ?? null,
            ogImageFile: ogImageFile ?? logoDraftPair?.og ?? null,
            appIconFile: appIconFile ?? logoDraftPair?.appIcon ?? null,
          },
        );
        break;
    }
  };

  const storeTypesLabel = formatStoreTypesLabel(storeTypes);

  const themeKind = onlineStore === "yes" ? "store" : "landing";
  const selectedThemeId =
    themeKind === "store" ? storeThemeId : landingTemplateId;
  const selectedThemeMeta =
    themeKind === "store"
      ? storeThemeMeta(selectedThemeId)
      : landingTemplateMeta(selectedThemeId);
  const themeRecommendInput = {
    name: displayName || businessName,
    profile: {
      storeTypes: storeTypes.flatMap((value) => {
        const label = STORE_TYPE_OPTIONS.find((o) => o.value === value)?.label;
        return label ? [value, label] : [value];
      }),
    },
  };
  const onboardingThemeItems =
    themeKind === "store" ? STORE_THEME_META : LANDING_TEMPLATE_META;
  const onboardingShortlistIds =
    themeKind === "store"
      ? shortlistStoreThemeIds(themeRecommendInput)
      : shortlistLandingTemplateIds(themeRecommendInput);
  const onboardingVisibleThemes = seeAllThemes
    ? onboardingThemeItems
    : onboardingShortlistIds
        .map((id) => onboardingThemeItems.find((item) => item.id === id))
        .filter((item): item is (typeof onboardingThemeItems)[number] =>
          Boolean(item),
        );

  const scrollRef = useRef<HTMLElement | null>(null);
  const themeStripRef = useRef<HTMLDivElement | null>(null);
  const keyboardInset = useKeyboardInset();

  /** Slide direction for the step transition — forward enters from the right, back from the left. */
  const [stepDirection, setStepDirection] = useState<"forward" | "back">(
    "forward",
  );
  const prevStepRef = useRef(step);
  useEffect(() => {
    if (step === prevStepRef.current) {
      return;
    }
    setStepDirection(step > prevStepRef.current ? "forward" : "back");
    prevStepRef.current = step;
  }, [step]);

  /** Step 4 is a single binary question — auto-continue shortly after a pick. */
  const autoAdvanceRef = useRef<number | null>(null);
  const clearAutoAdvance = () => {
    if (autoAdvanceRef.current !== null) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  };
  useEffect(() => clearAutoAdvance, []);
  useEffect(() => {
    clearAutoAdvance();
  }, [step]);

  const scheduleAutoAdvance = (choice: OnlineStoreChoice) => {
    clearAutoAdvance();
    autoAdvanceRef.current = window.setTimeout(() => {
      autoAdvanceRef.current = null;
      hapticTap([8, 40, 8]);
      onContinue({ onlineStore: choice });
    }, 450);
  };

  /** Swipe right anywhere on the content goes back a step (native mobile pattern). */
  const swipeStartRef = useRef<{
    x: number;
    y: number;
    at: number;
    target: EventTarget | null;
  } | null>(null);
  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      at: Date.now(),
      target: event.target,
    };
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || submitting || step <= 1 || step >= QUESTIONNAIRE_STEP_COUNT) {
      return;
    }
    const from = start.target as HTMLElement | null;
    if (
      from?.closest(
        "input, textarea, select, button, a, [role='button'], [data-no-swipe-back]",
      )
    ) {
      return;
    }
    const end = event.changedTouches[0];
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (dx > 72 && Math.abs(dy) < 48 && Date.now() - start.at < 650) {
      // The system edge gesture can also fire popstate for this same swipe —
      // claim so only one channel steps back.
      if (!claimBackNavigation()) {
        return;
      }
      hapticTap(6);
      onBack();
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (step !== 5) {
      return;
    }
    const selectedEl = themeStripRef.current?.querySelector(
      `[data-theme-id="${selectedThemeId}"]`,
    );
    selectedEl?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [step, selectedThemeId]);

  const primaryCtaClass = cn(
    "group flex h-12 w-full items-center justify-center gap-2 rounded-[2px] px-6 text-[15px] font-semibold tracking-[-0.01em] touch-manipulation sm:w-auto sm:min-w-[13.5rem]",
    "transition-[background-color,color,transform] duration-200 motion-safe:active:scale-[0.985]",
    EASE,
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4B3B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCFAF5]",
  );
  const primaryOnClass = "bg-[#1D4B3B] text-[#F4F1EA] hover:bg-[#163B2E]";
  const primaryOffClass = "cursor-not-allowed bg-[#E4DFD3] text-[#626D66]";
  const ctaArrow = (
    <ArrowRight
      className={cn(
        "size-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5",
        EASE,
      )}
      aria-hidden
    />
  );

  const shellStyle =
    keyboardInset > 0
      ? {
          height: `calc(100dvh - ${keyboardInset}px)`,
          maxHeight: `calc(100dvh - ${keyboardInset}px)`,
        }
      : undefined;

  // Beside the receipt (lg+) every step fills the same cell, so the header,
  // content and footer never shift width between steps.
  const columnWidth =
    step === 2 ? "max-w-2xl lg:max-w-none" : "max-w-xl lg:max-w-none";

  const filledLocalities = branchLocalities
    .map((loc) => loc.trim())
    .filter(Boolean);
  // A service-only shop (kinyozi, salon) goes straight from shop type to the
  // shop line, so the retail questions never get asked: say so on the slip
  // instead of printing defaults the owner did not choose.
  const retailSkipped =
    step > 2 &&
    storeTypes.length > 0 &&
    storeTypes.every((type) =>
      (SERVICE_STORE_TYPES as readonly string[]).includes(type),
    );
  const receiptLines: SetupSlipLine[] = [
    {
      label: "Locations",
      value: !branchCount
        ? null
        : filledLocalities.length > 0
          ? filledLocalities.join(", ")
          : branchCount === "5plus"
            ? "5 or more"
            : branchCount,
    },
    {
      label: "Shop",
      value: step >= 2 && storeTypes.length > 0 ? storeTypesLabel : null,
    },
    {
      label: "Sections",
      value:
        !retailSkipped && step >= 3 && selectedDepartments.length > 0
          ? String(selectedDepartments.length)
          : null,
      skipped: retailSkipped || (step > 3 && selectedDepartments.length === 0),
    },
    {
      label: "Online shop",
      value:
        !retailSkipped && step >= 4 && onlineStore
          ? onlineStore === "yes"
            ? "Yes"
            : "In-store only"
          : null,
      skipped: retailSkipped,
    },
    {
      label: "Look",
      value: !retailSkipped && step >= 5 ? selectedThemeMeta.name : null,
      skipped: retailSkipped,
    },
    {
      label: "Colours",
      skipped: retailSkipped,
      value:
        !retailSkipped && step >= 6 ? (
          <span className="inline-flex items-center gap-1 align-middle">
            <span
              className="size-3 rounded-[1px] ring-1 ring-[rgba(18,26,22,0.2)]"
              style={{ backgroundColor: primaryColor }}
            />
            <span
              className="size-3 rounded-[1px] ring-1 ring-[rgba(18,26,22,0.2)]"
              style={{ backgroundColor: accentColor }}
            />
            <span className="sr-only">
              {primaryColor} and {accentColor}
            </span>
          </span>
        ) : null,
    },
    {
      label: "Shop line",
      value:
        step >= QUESTIONNAIRE_PHONE_STEP && ownerPhone.trim()
          ? ownerPhone.trim()
          : null,
    },
  ];
  const receiptMeta = [
    countryCode?.toUpperCase(),
    currency?.toUpperCase(),
    "Setup slip",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="kiosk-setup premium-portal relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#F4F1EA] text-[#121A16]"
      style={shellStyle}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Paper, not a gradient: the same grain as the landing ground. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[url('/textures/paper-grain.png')] opacity-[0.05] mix-blend-multiply"
        aria-hidden
      />

      <header className="relative z-20 shrink-0 border-b border-[rgba(18,26,22,0.1)] bg-[#F4F1EA] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8 sm:pb-4 sm:pt-5">
        <div className={SETUP_GRID}>
          <div className={cn("w-full space-y-3", columnWidth)}>
            <div className="flex items-center gap-2">
              {step > 1 && step < QUESTIONNAIRE_STEP_COUNT ? (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={submitting}
                  className={cn(
                    "inline-flex size-11 shrink-0 items-center justify-center rounded-[2px] border border-[rgba(18,26,22,0.14)] bg-[#FCFAF5] text-[#121A16] transition-transform motion-safe:active:scale-95 disabled:opacity-50 sm:hidden",
                    FOCUS_RING,
                  )}
                  aria-label="Back"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
              ) : (
                <span className="size-11 shrink-0 sm:hidden" aria-hidden />
              )}
              <div className="flex min-w-0 flex-1 items-center justify-center gap-3 sm:justify-between">
                <KioskLogoMark size={32} variant="auth" className="sm:hidden" />
                <KioskLogoMark size={36} variant="auth" className="hidden sm:block" />
                {countryCode || currency ? (
                  <p className="hidden font-mono text-[11px] text-[#556159] sm:block lg:hidden">
                    {[countryCode?.toUpperCase(), currency?.toUpperCase()]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
              {step === QUESTIONNAIRE_PHONE_STEP ||
              step === QUESTIONNAIRE_RECEIVE_STEP ||
              // The last step carries its own "Skip for now" beside the action.
              step === QUESTIONNAIRE_STEP_COUNT ? (
                <span className="inline-flex size-11 shrink-0 sm:hidden" aria-hidden />
              ) : (
                <button
                  type="button"
                  onClick={onSkip}
                  disabled={submitting}
                  className={cn(QUIET_BUTTON, "shrink-0 justify-center px-2 sm:hidden")}
                >
                  Skip
                </button>
              )}
            </div>
            <QuestionnaireProgress step={step} />
          </div>
        </div>
      </header>

      <main
        ref={scrollRef}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-8 sm:py-10 lg:py-12"
      >
        <div className={SETUP_GRID}>
          <div className={cn("w-full", columnWidth)}>
          <div
            key={step}
            className={cn(
              "space-y-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 sm:space-y-7",
              stepDirection === "back"
                ? "motion-safe:slide-in-from-left-2"
                : "motion-safe:slide-in-from-right-2",
            )}
          >
            {step === 1 ? (
              <>
                <StepHeading
                  title="Your shop locations"
                  description="Each location gets its own stock and sales. You can rename them anytime."
                />
                <div
                  className="grid grid-cols-5 gap-1.5 sm:gap-2"
                  role="group"
                  aria-label="How many locations"
                >
                  {BRANCH_COUNT_OPTIONS.map((opt) => {
                    const countLabel = opt.value === "5plus" ? "5+" : opt.value;
                    const selected = branchCount === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={selected}
                        aria-label={opt.label}
                        onClick={() => {
                          hapticTap(8);
                          setBranchCount(opt.value);
                        }}
                        className={cn(
                          KEY_BASE,
                          "flex h-[4.5rem] flex-col items-center justify-center sm:h-24",
                          selected ? KEY_ON : KEY_OFF,
                        )}
                      >
                        <span className="font-serif text-[1.75rem] font-medium tabular-nums leading-none sm:text-[2.25rem]">
                          {countLabel}
                        </span>
                        <span
                          className={cn(
                            "mt-1.5 text-[11px] sm:text-xs",
                            selected ? "text-[#D7E6DE]" : "text-[#556159]",
                          )}
                        >
                          {opt.value === "1" ? "shop" : "shops"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {branchSlots > 0 ? (
                  <div className="space-y-4 border-t border-[rgba(18,26,22,0.1)] pt-5">
                    <p className="text-[15px] font-semibold tracking-[-0.01em] text-[#121A16]">
                      {branchSlots === 1
                        ? "Which area is your shop in?"
                        : "Name each branch (area or suburb)"}
                    </p>
                    <datalist id="onboarding-locality-suggestions">
                      {localityPlaceholdersForCountry(countryCode).map(
                        (place) => (
                          <option key={place} value={place} />
                        ),
                      )}
                    </datalist>
                    {branchLocalities.map((locality, index) => {
                      const preview = formatBranchDisplayName(
                        locality ||
                          branchLocalityPlaceholder(index, countryCode),
                      );
                      return (
                        <label key={index} className="block">
                          <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-[#2A332E]">
                            <span>
                              {branchSlots === 1 ? "Area" : `Branch ${index + 1}`}
                            </span>
                            <span className="truncate font-normal text-[#556159]">
                              {preview}
                            </span>
                          </span>
                          <div
                            className={cn(
                              FIELD_SHELL,
                              "flex h-12 items-center overflow-hidden focus-within:border-[#1D4B3B] focus-within:ring-2 focus-within:ring-[#1D4B3B]/15",
                            )}
                          >
                            <input
                              type="text"
                              value={locality}
                              onChange={(e) => {
                                const value = e.target.value;
                                setBranchLocalities((prev) => {
                                  const next = [...prev];
                                  next[index] = value;
                                  return next;
                                });
                              }}
                              className="h-full min-w-0 flex-1 bg-transparent px-4 text-base text-[#121A16] outline-none placeholder:text-[#626D66] sm:text-[15px]"
                              placeholder={branchLocalityPlaceholder(
                                index,
                                countryCode,
                              )}
                              aria-label={`Branch ${index + 1} area name`}
                              autoComplete="address-level2"
                              enterKeyHint="next"
                              list="onboarding-locality-suggestions"
                            />
                            <span className="hidden h-full shrink-0 items-center border-l border-[rgba(18,26,22,0.12)] bg-[#EFEBE2] px-3 text-sm text-[#556159] sm:flex">
                              branch
                            </span>
                          </div>
                        </label>
                      );
                    })}
                    {branchCount === "5plus" ? (
                      <p className={NOTE}>
                        We&apos;ll set up your first five branches now. Add more
                        later from Branches.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}

            {step === 2 ? (
              <>
                <StepHeading
                  title="What kind of shop is this?"
                  description={
                    <>
                      Select all that apply — a mini mart can also include a
                      butchery. Mini mart, mixed shop, and pharmacy can import
                      starter products at the end.
                    </>
                  }
                />
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
                  {SHOWN_STORE_TYPE_OPTIONS.map((opt) => (
                    <StoreTypeButton
                      key={opt.value}
                      label={opt.label}
                      hint={opt.hint}
                      icon={STORE_TYPE_ICONS[opt.value]}
                      clay={opt.value === "butchery"}
                      selected={storeTypes.includes(opt.value)}
                      onClick={() => toggleStoreType(opt.value)}
                    />
                  ))}
                </div>
                <p className={NOTE}>
                  {storeTypes.length === 0
                    ? "Select at least one shop type to continue."
                    : `${storeTypes.length} selected`}
                </p>
                {departmentsResetNote ? (
                  <p className="text-[13px] font-medium text-[#1D4B3B]" role="status">
                    Departments reset to match your new shop type.
                  </p>
                ) : null}
              </>
            ) : null}

            {step === 3 ? (
              <>
                <StepHeading
                  title="Choose your product sections"
                  description={
                    availableDepartments.length > 0 ? (
                      <>
                        Suggested for {storeTypesLabel.toLowerCase()}. These
                        group items at the till and in reports — pick what you
                        sell now, add your own, or continue and edit later.
                      </>
                    ) : (
                      <>
                        Add the sections that fit{" "}
                        {storeTypesLabel.toLowerCase()}. These group items at
                        the till and in reports — you can edit them later.
                      </>
                    )
                  }
                />
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-[rgba(18,26,22,0.1)] pb-2">
                    <p className="font-mono text-[12px] tabular-nums text-[#556159]">
                      {selectedDepartments.length === 0
                        ? "None selected"
                        : `${selectedDepartments.length} selected`}
                    </p>
                    {availableDepartments.length > 0 ? (
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={selectAllDepartments}
                          className={cn(QUIET_BUTTON, "font-medium text-[#1D4B3B]")}
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={clearDepartments}
                          className={QUIET_BUTTON}
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {visibleDepartments.map((dept) => (
                      <DepartmentChip
                        key={dept}
                        label={dept}
                        selected={isDepartmentSelected(dept)}
                        onToggle={() => toggleDepartment(dept)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="onboarding-custom-department"
                    className={FIELD_LABEL}
                  >
                    Add custom section
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="onboarding-custom-department"
                      type="text"
                      value={customDepartmentName}
                      onChange={(event) =>
                        setCustomDepartmentName(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCustomDepartment();
                        }
                      }}
                      className={cn(FIELD_CLASS, "min-w-0 flex-1")}
                      placeholder="e.g. Deli, Frozen Foods"
                      enterKeyHint="done"
                    />
                    <button
                      type="button"
                      onClick={addCustomDepartment}
                      className={cn(
                        KEY_BASE,
                        KEY_OFF,
                        "h-12 shrink-0 px-5 text-sm font-semibold",
                      )}
                    >
                      Add
                    </button>
                  </div>
                </div>
                {selectedDepartments.length === 0 ? (
                  <p className={NOTE}>
                    No sections selected yet. You can continue and add them
                    later.
                  </p>
                ) : null}
              </>
            ) : null}

            {step === 4 ? (
              <>
                <StepHeading
                  title="Would you like to sell online?"
                  description="Turn on a web shop so customers can browse and order from your website. You can change this later in Settings."
                />
                <div className="space-y-2">
                  {ONLINE_STORE_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      selected={onlineStore === opt.value}
                      onClick={() => {
                        setOnlineStore(opt.value);
                        if (opt.value !== onlineStore) {
                          scheduleAutoAdvance(opt.value);
                        }
                      }}
                      title={opt.label}
                      hint={
                        opt.value === "yes"
                          ? businessSlug
                            ? `Customers can shop at your storefront (/${businessSlug}).`
                            : "Customers can browse and order from your web shop."
                          : "Stay in-store only for now — turn online selling on anytime."
                      }
                    />
                  ))}
                </div>
              </>
            ) : null}

            {step === 5 ? (
              <>
                <StepHeading
                  title={
                    onlineStore === "yes"
                      ? "Choose your store theme"
                      : "Choose your landing page"
                  }
                  description={
                    onlineStore === "yes"
                      ? "Start with one of these. You can change it later."
                      : "Pick a public page for your shop link. You can change it later."
                  }
                />
                <div
                  ref={themeStripRef}
                  data-no-swipe-back
                  className={cn(
                    "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                    "sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0",
                    "sm:grid-cols-3",
                  )}
                >
                  {onboardingVisibleThemes.map((item) => {
                    const selected = item.id === selectedThemeId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={selected}
                        data-theme-id={item.id}
                        onClick={() => {
                          hapticTap(8);
                          if (themeKind === "store") {
                            setStoreThemeId(item.id);
                            if (milkRunNeedsWhatsApp(item.id, landingWhatsapp)) {
                              setMilkRunWaPromptOpen(true);
                            }
                          } else {
                            setLandingTemplateId(item.id);
                          }
                        }}
                        className={cn(
                          "w-[42vw] max-w-[11.5rem] shrink-0 snap-center overflow-hidden rounded-[2px] border bg-[#FCFAF5] text-left sm:w-auto sm:max-w-none",
                          "transition-[border-color,box-shadow,transform] duration-200 motion-safe:active:scale-[0.985]",
                          EASE,
                          FOCUS_RING,
                          selected
                            ? "border-[#1D4B3B] shadow-[0_0_0_1px_#1D4B3B,0_18px_28px_-22px_rgba(18,26,22,0.5)]"
                            : "border-[rgba(18,26,22,0.14)] hover:border-[rgba(18,26,22,0.32)]",
                        )}
                      >
                        <ThemeTryOnPhone
                          item={item}
                          kind={themeKind}
                          storeName={displayName || businessName || "Your shop"}
                          logoUrl={logoPreviewUrl}
                          logoDarkUrl={logoDarkPreviewUrl}
                          brandPrimary={primaryColor}
                          size="sm"
                          frame="card"
                        />
                        <span
                          className={cn(
                            "flex items-center justify-between gap-1 border-t px-2.5 py-2 transition-colors duration-200",
                            selected
                              ? "border-[#1D4B3B] bg-[#1D4B3B] text-[#F4F1EA]"
                              : "border-[rgba(18,26,22,0.1)] text-[#121A16]",
                          )}
                        >
                          <span className="truncate text-[13px] font-semibold">
                            {item.name}
                          </span>
                          {selected ? (
                            <Check
                              className="size-3.5 shrink-0"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!seeAllThemes ? (
                  <button
                    type="button"
                    onClick={() => setSeeAllThemes(true)}
                    className={cn(QUIET_BUTTON, "font-medium text-[#1D4B3B]")}
                  >
                    See all {onboardingThemeItems.length} looks
                  </button>
                ) : null}
                <MilkRunWhatsAppDialog
                  open={milkRunWaPromptOpen}
                  onOpenChange={setMilkRunWaPromptOpen}
                  initialWhatsapp={landingWhatsapp}
                  persist={false}
                  onSaved={(whatsapp) => setLandingWhatsapp(whatsapp)}
                />
              </>
            ) : null}

            {step === 6 ? (
              <>
                <StepHeading
                  title="Brand your shop"
                  description="Set your display name and colours. Logo is optional — you can add one later in settings."
                />
                <div className="space-y-6">
                  <label className="block">
                    <span className={FIELD_LABEL}>Display name</span>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={FIELD_CLASS}
                      placeholder={suggestedDisplayName || "Your shop name"}
                      autoComplete="organization"
                      enterKeyHint="done"
                    />
                    {suggestedDisplayName &&
                    displayName.trim() !== suggestedDisplayName ? (
                      <button
                        type="button"
                        onClick={() => setDisplayName(suggestedDisplayName)}
                        className={cn(QUIET_BUTTON, "mt-1 text-[13px] text-[#1D4B3B]")}
                      >
                        Use suggested:{" "}
                        <span className="font-semibold">
                          {suggestedDisplayName}
                        </span>
                      </button>
                    ) : suggestedDisplayName ? (
                      <p className={cn(NOTE, "mt-2")}>
                        Suggested from your business name
                      </p>
                    ) : null}
                  </label>

                  <div className="space-y-2">
                    <p className={cn(FIELD_LABEL, "mb-0")}>
                      Colours &amp; preview
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <OnboardingBrandingColorPicker
                        layout="tile"
                        showContrastHint={false}
                        primaryColor={primaryColor}
                        accentColor={accentColor}
                        onPrimaryChange={setPrimaryColor}
                        onAccentChange={setAccentColor}
                      />
                      <OnboardingBrandingPreviewModal
                        layout="tile"
                        displayName={displayName}
                        primaryColor={primaryColor}
                        accentColor={accentColor}
                        logoPreviewUrl={logoPreviewUrl}
                      />
                    </div>
                    {!meetsBrandingContrast(primaryColor, accentColor) ? (
                      <p
                        className="flex items-start gap-2 text-[13px] text-[#8F3F2F]"
                        role="status"
                      >
                        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                        Colours need more contrast — tap Pick colours to adjust.
                      </p>
                    ) : null}
                  </div>

                  <div className="border-t border-[rgba(18,26,22,0.1)] pt-5">
                    <p className="text-[15px] font-semibold tracking-[-0.01em] text-[#121A16]">
                      Logo{" "}
                      <span className="font-normal text-[#556159]">
                        (optional)
                      </span>
                    </p>
                    <p className={cn(NOTE, "mb-4 mt-1 max-w-[54ch]")}>
                      Skip if you don&apos;t have one. We&apos;ll use a mark
                      from your shop name, or you can describe one for AI to
                      draw.
                    </p>
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                      <div className="relative">
                        <TenantLogo
                          brand={
                            displayName.trim() || businessName || "Your shop"
                          }
                          logoUrl={logoPreviewUrl}
                          primaryColor={primaryColor}
                          variant="upload"
                        />
                        {logoGenerating ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#FCFAF5]/75">
                            <Loader2
                              className="size-6 animate-spin text-[#1D4B3B]"
                              aria-hidden
                            />
                            <span className="sr-only">Generating logo</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex w-full flex-col gap-2 text-center sm:text-left">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept={ACCEPTED_LOGO_TYPES}
                          className="hidden"
                          onChange={onLogoPick}
                        />
                        <button
                          type="button"
                          disabled={submitting || logoGenerating}
                          onClick={() => logoInputRef.current?.click()}
                          className={cn(
                            KEY_BASE,
                            KEY_OFF,
                            "h-11 px-4 text-center text-sm font-semibold disabled:opacity-50",
                          )}
                        >
                          {logoFile || logoDraftPair
                            ? "Replace logo"
                            : "Upload logo (optional)"}
                        </button>
                        <AiLogoGenerator
                          key={logoGeneratorKey}
                          variant="onboarding"
                          shopName={displayName.trim() || businessName || ""}
                          shopType={storeTypesLabel}
                          primaryColor={primaryColor}
                          accentColor={accentColor}
                          disabled={submitting}
                          onBusyChange={setLogoGenerating}
                          onDraftPair={setLogoDraftPair}
                          onGenerated={(pair) => {
                            if (
                              pair.light.size > MAX_LOGO_BYTES ||
                              pair.dark.size > MAX_LOGO_BYTES ||
                              pair.og.size > MAX_LOGO_BYTES
                            ) {
                              setLogoError("Logo must be 4 MB or smaller.");
                              throw new Error("Logo must be 4 MB or smaller.");
                            }
                            if (pair.favicon.size > MAX_FAVICON_BYTES) {
                              setLogoError("Favicon must be 512 KB or smaller.");
                              throw new Error("Favicon must be 512 KB or smaller.");
                            }
                            setLogoError("");
                            setLogoFile(pair.light);
                            setLogoDarkFile(pair.dark);
                            setFaviconFile(pair.favicon);
                            setOgImageFile(pair.og);
                            setAppIconFile(pair.appIcon);
                            setLogoDraftPair(null);
                            hapticTap();
                          }}
                        />
                        {logoFile || logoDarkFile || logoDraftPair ? (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoFile(null);
                              setLogoDarkFile(null);
                              setFaviconFile(null);
                              setOgImageFile(null);
                              setAppIconFile(null);
                              setLogoDraftPair(null);
                              setLogoError("");
                              setLogoGeneratorKey((key) => key + 1);
                            }}
                            className={cn(QUIET_BUTTON, "justify-center text-[13px] sm:justify-start")}
                          >
                            Use name mark instead
                          </button>
                        ) : (
                          <p className={NOTE}>
                            Optional. A name mark is used until you upload or
                            generate one.
                          </p>
                        )}
                        {logoError ? (
                          <p className="text-[13px] text-[#8F3F2F]" role="alert">
                            {logoError}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {step === QUESTIONNAIRE_PHONE_STEP ? (
              <>
                <StepHeading
                  title="This number is the shop"
                  description="Customers WhatsApp it. We text it when stock is low. M-Pesa and till alerts land here. Not a personal line you never check — the one that sits next to the till."
                />
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="block">
                      <span className={FIELD_LABEL}>Shop line</span>
                      <div
                        className={cn(
                          FIELD_SHELL,
                          "flex h-14 items-center overflow-hidden focus-within:border-[#1D4B3B] focus-within:ring-2 focus-within:ring-[#1D4B3B]/15",
                        )}
                      >
                        <span className="flex h-full shrink-0 items-center border-r border-[rgba(18,26,22,0.12)] bg-[#EFEBE2] px-3.5 font-mono text-sm tabular-nums text-[#2A332E]">
                          {dialCode}
                        </span>
                        <input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={ownerPhone}
                          onChange={(e) => setOwnerPhone(e.target.value)}
                          className="h-full min-w-0 flex-1 bg-transparent px-4 text-lg tabular-nums tracking-[0.01em] text-[#121A16] outline-none placeholder:text-[#626D66]"
                          placeholder={
                            countryCode?.toUpperCase() === "KE"
                              ? "07XX XXX XXX"
                              : "Your mobile number"
                          }
                          aria-label="Shop phone number"
                          enterKeyHint="done"
                        />
                      </div>
                    </label>
                    <p className={NOTE}>
                      {looksLikeOwnerPhone(ownerPhone, countryCode)
                        ? "We'll save this on your account and on the online shop's WhatsApp button."
                        : countryCode?.toUpperCase() === "KE"
                          ? "Use a Kenyan mobile — 07… or 2547…"
                          : "Enter a mobile number we can actually reach."}
                    </p>
                  </div>
                  <ShopLinePreview
                    shopName={displayName || businessName || ""}
                    phoneLabel={ownerPhone.trim()}
                  />
                </div>
              </>
            ) : null}

            {step === QUESTIONNAIRE_RECEIVE_STEP ? (
              <OnboardingReceiveMpesaStep
                ownerPhone={ownerPhone}
                countryCode={countryCode}
                onSkip={() => onReceiveSkip?.()}
                onDone={() => onReceiveDone?.()}
              />
            ) : null}

            {step === QUESTIONNAIRE_STOCK_STEP ? (
              <>
                <StepHeading
                  title={
                    catalogShellEmpty
                      ? "Add products when you’re ready"
                      : isPharmacyShop
                        ? "Stock your pharmacy"
                        : "Stock your shelves"
                  }
                  description={
                    catalogShellEmpty ? (
                      catalogLabel
                        ? `${catalogLabel} has no starter pack yet. You can add products yourself anytime.`
                        : "No starter pack for your country yet. You can add products yourself anytime."
                    ) : isPharmacyShop ? (
                      "Import the pharmacy catalogue now — medicines and OTC matched to chemists — or bring your own list."
                    ) : (
                      "How do you want to stock? Pick one — we’ll match the tips that follow."
                    )
                  }
                />
                {celebrate ? (
                  <p
                    className="flex items-center gap-2.5 border-y border-[rgba(18,26,22,0.1)] py-3 text-[15px] font-medium text-[#121A16] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-300"
                    role="status"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#1D4B3B] text-[#F4F1EA]">
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </span>
                    Your shop is set up — now fill the shelves.
                  </p>
                ) : null}
                {!catalogShellEmpty ? (
                  <div className="space-y-2">
                    {(isPharmacyShop
                      ? ([
                          {
                            value: "new" as const,
                            label: "Start from pharmacy catalogue",
                            hint: "Eastleigh medicines & OTC — pick what you stock",
                          },
                          {
                            value: "spreadsheet" as const,
                            label: "I have a spreadsheet",
                            hint: "Import your file, then fill gaps from the catalogue",
                          },
                          {
                            value: "other_pos" as const,
                            label: "I’m moving from another POS",
                            hint: "Import your list first — don’t retype products",
                          },
                        ] as const)
                      : PRODUCT_SOURCE_OPTIONS
                    ).map((opt) => (
                      <OptionButton
                        key={opt.value}
                        selected={productSource === opt.value}
                        onClick={() => {
                          setProductSource(opt.value);
                          onProductSourceChange?.(opt.value);
                        }}
                        title={opt.label}
                        hint={opt.hint}
                      />
                    ))}
                  </div>
                ) : null}
                {catalogShellEmpty ? (
                  <ul className="divide-y divide-[rgba(18,26,22,0.1)] border-y border-[rgba(18,26,22,0.1)] text-[15px] text-[#121A16]">
                    <li className="flex items-center gap-3 py-3">
                      <Package
                        className="size-4 shrink-0 text-[#1D4B3B]"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      Add products from Products
                    </li>
                    <li className="flex items-center gap-3 py-3">
                      <Check
                        className="size-4 shrink-0 text-[#1D4B3B]"
                        aria-hidden
                      />
                      Check back when packs arrive for your region
                    </li>
                  </ul>
                ) : productSource === "spreadsheet" ||
                  productSource === "other_pos" ? (
                  <p className="flex items-start gap-3 border-y border-[rgba(18,26,22,0.1)] py-4 text-[15px] leading-relaxed text-[#2A332E]">
                    <Package
                      className="mt-1 size-4 shrink-0 text-[#1D4B3B]"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span>
                      Import your list first. After that, use the Global catalog
                      only for gaps — and group sizes as families so stock stays
                      honest.
                    </span>
                  </p>
                ) : packLoading ? (
                  <p
                    className="flex items-center gap-3 border-y border-[rgba(18,26,22,0.1)] py-6 text-[15px] text-[#556159]"
                    role="status"
                  >
                    <Loader2
                      className="size-4 shrink-0 animate-spin text-[#1D4B3B]"
                      aria-hidden
                    />
                    Finding a pack for your shop…
                  </p>
                ) : suggestedPack ? (
                  <button
                    type="button"
                    onClick={() => {
                      hapticTap(8);
                      if (!productSource) {
                        onProductSourceChange?.("new");
                      }
                      onOpenCatalogDrawer?.();
                    }}
                    className={cn(
                      "group block w-full overflow-hidden rounded-[2px] border border-[rgba(18,26,22,0.16)] bg-[#FCFAF5] text-left touch-manipulation",
                      "transition-[border-color,transform] duration-200 hover:border-[#1D4B3B] motion-safe:active:scale-[0.99]",
                      EASE,
                      FOCUS_RING,
                    )}
                  >
                    <div className="flex items-start gap-3.5 px-4 pb-4 pt-4 sm:px-5">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-[2px] bg-[#1D4B3B] text-[#F4F1EA]">
                        <Package className="size-5" strokeWidth={1.75} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-[1.45rem] font-medium leading-[1.1] text-[#121A16]">
                          {suggestedPack.name}
                        </p>
                        <p className="mt-1 text-[13px] text-[#556159]">
                          {isPharmacyShop
                            ? "Matched for chemists — medicines, OTC & supplies"
                            : "Most shops start here — matched to your shop type"}
                        </p>
                      </div>
                      <span className="shrink-0 pt-1 font-mono text-[12px] tabular-nums text-[#2A332E]">
                        {suggestedPack.productCount} items
                      </span>
                    </div>
                    {suggestedPack.sampleNames.length > 0 ? (
                      <div className="border-t border-[rgba(18,26,22,0.1)] px-4 py-3.5 sm:px-5">
                        <p className="mb-2 text-[13px] font-medium text-[#2A332E]">
                          Sample products inside
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestedPack.sampleNames.slice(0, 4).map((name) => (
                            <span
                              key={name}
                              className="max-w-full truncate rounded-[2px] bg-[#EFEBE2] px-2 py-1 text-[12px] text-[#2A332E]"
                            >
                              {name}
                            </span>
                          ))}
                          {suggestedPack.productCount >
                          suggestedPack.sampleNames.length ? (
                            <span className="px-1 py-1 font-mono text-[12px] tabular-nums text-[#556159]">
                              +
                              {suggestedPack.productCount -
                                Math.min(4, suggestedPack.sampleNames.length)}{" "}
                              more
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <ul className="space-y-1.5 border-t border-[rgba(18,26,22,0.1)] px-4 py-3.5 text-[13px] text-[#2A332E] sm:px-5">
                      <li className="flex items-center gap-2">
                        <Check
                          className="size-3.5 shrink-0 text-[#1D4B3B]"
                          aria-hidden
                        />
                        {isPharmacyShop
                          ? "Trade prices ready to adjust"
                          : "Barcodes & names ready"}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check
                          className="size-3.5 shrink-0 text-[#1D4B3B]"
                          aria-hidden
                        />
                        {isPharmacyShop
                          ? "Expiry tracking on by default"
                          : "Pick what to keep before importing"}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check
                          className="size-3.5 shrink-0 text-[#1D4B3B]"
                          aria-hidden
                        />
                        {isPharmacyShop
                          ? "Pick what you stock before importing"
                          : "Shown on your online store by default"}
                      </li>
                    </ul>
                    <div className="flex items-center justify-between gap-2 border-t border-[rgba(18,26,22,0.1)] bg-[#EFEBE2] px-4 py-3 text-[13px] font-semibold text-[#1D4B3B] sm:px-5">
                      <span>Tap to open and pick your products</span>
                      <ChevronRight
                        className="size-4 shrink-0 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </div>
                  </button>
                ) : productSource === "new" || !productSource ? (
                  <p className="flex items-start gap-3 border-y border-[rgba(18,26,22,0.1)] py-4 text-[15px] leading-relaxed text-[#2A332E]">
                    <Package
                      className="mt-1 size-4 shrink-0 text-[#1D4B3B]"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span>
                      {isPharmacyShop
                        ? "Your pharmacy starter pack will appear here once the catalogue is ready. You can also add medicines from Products anytime."
                        : "Browse the catalogue and choose products to import."}
                    </span>
                  </p>
                ) : null}
              </>
            ) : null}
          </div>

          {errorMessage ? (
            <p
              className="mt-5 flex items-start gap-2.5 border-y border-[#A55237]/35 py-3 text-[15px] leading-relaxed text-[#8F3F2F]"
              role="alert"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{errorMessage}</span>
            </p>
          ) : null}
          </div>

          <SetupSlip
            shopName={displayName.trim() || businessName?.trim() || "Your shop"}
            meta={receiptMeta}
            lines={receiptLines}
            stamped={step >= QUESTIONNAIRE_RECEIVE_STEP}
          />
        </div>
      </main>

      <footer
        className={cn(
          "relative z-20 shrink-0 border-t border-[rgba(18,26,22,0.1)] bg-[#FCFAF5] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-4",
          // On a phone this step's actions live in the step itself.
          step === QUESTIONNAIRE_RECEIVE_STEP ? "hidden sm:block" : "",
        )}
      >
        <div className={SETUP_GRID}>
          <div
            className={cn(
              "flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
              columnWidth,
            )}
          >
            <div className="hidden sm:block">
              {step > 1 && step < QUESTIONNAIRE_STEP_COUNT ? (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={submitting}
                  className={QUIET_BUTTON}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Back
                </button>
              ) : null}
            </div>

            {step === QUESTIONNAIRE_STEP_COUNT ? (
              <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center sm:gap-5">
                {!catalogShellEmpty &&
                (productSource === "spreadsheet" ||
                  productSource === "other_pos") ? (
                  <button
                    type="button"
                    onClick={() => {
                      const source =
                        productSource === "other_pos" ? "other_pos" : "spreadsheet";
                      onProductSourceChange?.(source);
                      onOpenImport?.();
                    }}
                    className={cn(primaryCtaClass, primaryOnClass)}
                  >
                    Import spreadsheet
                    {ctaArrow}
                  </button>
                ) : null}
                {canBrowseGlobalCatalog &&
                !catalogShellEmpty &&
                productSource !== "spreadsheet" &&
                productSource !== "other_pos" ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!productSource) {
                        onProductSourceChange?.("new");
                      }
                      onOpenCatalogDrawer?.();
                    }}
                    className={cn(primaryCtaClass, primaryOnClass)}
                  >
                    {suggestedPack
                      ? `Open ${suggestedPack.name}`
                      : "Open catalogue"}
                    {ctaArrow}
                  </button>
                ) : null}
                {catalogShellEmpty ? (
                  <button
                    type="button"
                    onClick={onAddProductsManually}
                    className={cn(primaryCtaClass, primaryOnClass)}
                  >
                    Add products manually
                    {ctaArrow}
                  </button>
                ) : null}
                {canBrowseGlobalCatalog ||
                catalogShellEmpty ||
                productSource === "spreadsheet" ||
                productSource === "other_pos" ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      if (!productSource && !catalogShellEmpty) {
                        onProductSourceChange?.("new");
                      }
                      onFinishLater?.();
                    }}
                    className={cn(QUIET_BUTTON, "justify-center")}
                  >
                    Skip for now
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!productSource && !catalogShellEmpty) {
                        onProductSourceChange?.("new");
                      }
                      onFinishLater?.();
                    }}
                    className={cn(primaryCtaClass, primaryOnClass)}
                  >
                    Continue to dashboard
                    {ctaArrow}
                  </button>
                )}
              </div>
            ) : step === QUESTIONNAIRE_RECEIVE_STEP ? (
              <span className={NOTE}>Optional — skip anytime above</span>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center sm:gap-5">
                <button
                  type="button"
                  disabled={!canContinue || submitting || logoGenerating}
                  onClick={handleContinue}
                  className={cn(
                    primaryCtaClass,
                    canContinue && !submitting && !logoGenerating
                      ? primaryOnClass
                      : primaryOffClass,
                  )}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {submitting
                    ? "Setting up your shop…"
                    : logoGenerating
                      ? "Generating logo…"
                      : step === QUESTIONNAIRE_PHONE_STEP
                        ? "That’s my number"
                        : step === 5
                          ? "Use this look"
                          : "Continue"}
                  {canContinue && !submitting && !logoGenerating ? ctaArrow : null}
                </button>
                {step === QUESTIONNAIRE_PHONE_STEP ? null : (
                  <button
                    type="button"
                    onClick={onSkip}
                    disabled={submitting}
                    className={cn(QUIET_BUTTON, "hidden sm:inline-flex")}
                  >
                    Skip for now
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
