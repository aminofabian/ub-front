"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Drumstick,
  LayoutGrid,
  Leaf,
  Loader2,
  MessageCircle,
  Package,
  ShoppingCart,
  Sparkles,
  Store,
  Shapes,
  Smartphone,
  Wine,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { OnboardingBrandingColorPicker } from "@/components/onboarding/onboarding-branding-color-picker";
import { OnboardingBrandingPreviewModal } from "@/components/onboarding/onboarding-branding-preview-modal";
import { useLogoObjectUrl } from "@/components/onboarding/onboarding-branding-preview";
import {
  getContrastSafeBrandingPresets,
  meetsBrandingContrast,
} from "@/lib/branding-color-presets";
import { KioskLogoMark } from "@/components/brand/kiosk-logo-mark";
import { TenantLogo } from "@/components/brand/tenant-logo";
import { AiLogoGenerator } from "@/components/brand/ai-logo-generator";
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
  other: Shapes,
};

const FIELD_CLASS =
  "h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-base text-[#1F2937] outline-none transition focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 sm:rounded-xl sm:text-[15px]";

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
] as const;

function QuestionnaireProgress({ step }: { step: number }) {
  const answerSteps = QUESTIONNAIRE_STEP_COUNT - 1;
  const clamped = Math.min(step, answerSteps);
  const isFinal = step >= QUESTIONNAIRE_STEP_COUNT;
  const percent = isFinal ? 100 : Math.round((clamped / answerSteps) * 100);
  const stepLabel = isFinal ? "Stock" : (STEP_LABELS[clamped - 1] ?? "");

  return (
    <div className="w-full space-y-1.5">
      {/* Mobile: named steps + dots — position at a glance, no duplicate bar. */}
      <div className="flex items-center justify-between gap-3 text-[11px] sm:hidden">
        <span className="font-semibold text-[#374151]">
          {isFinal ? "Last step" : `Step ${clamped} of ${answerSteps}`}
        </span>
        <span className="truncate text-[#9CA3AF]">{stepLabel}</span>
      </div>
      <div
        className="flex gap-1 sm:hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Setup progress: ${percent} percent`}
      >
        {Array.from({ length: answerSteps }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < clamped ? "bg-[#0D9488]" : "bg-[#E5E7EB]",
            )}
          />
        ))}
      </div>
      {/* Desktop: percent bar. */}
      <div className="hidden space-y-1.5 sm:block">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-medium text-[#374151]">
            {isFinal
              ? "Last step — stock your shelves"
              : `${percent}% done`}
          </span>
          <span className="tabular-nums text-[#9CA3AF]">
            {isFinal ? "Final" : `${step} / ${answerSteps}`}
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Setup progress: ${percent} percent`}
        >
          <div
            className="h-full rounded-full bg-[#0D9488] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
  compact,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        hapticTap(8);
        onClick();
      }}
      className={cn(
        "w-full rounded-2xl border text-left transition-[border-color,background-color,transform,box-shadow] sm:rounded-xl",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40",
        "active:scale-[0.985] touch-manipulation",
        compact
          ? "min-h-14 px-3 py-3 text-[14px] sm:min-h-[3.25rem] sm:px-4 sm:text-[15px]"
          : "min-h-[3.25rem] px-4 py-3.5 text-[15px]",
        selected
          ? "border-[#0D9488] bg-[#F0FDFA] text-[#134E4A] shadow-[0_8px_20px_-16px_rgba(13,148,136,0.7)]"
          : "border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#D1D5DB] hover:bg-[#FAFAFA]",
      )}
    >
      {children}
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
    <div className="mx-auto w-full max-w-[240px] sm:max-w-[280px]">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#1F2937] bg-[#111827] shadow-[0_24px_48px_-28px_rgba(17,24,39,0.85)] sm:rounded-[2rem]">
        <div className="flex items-center justify-center pt-2">
          <span className="h-1.5 w-16 rounded-full bg-[#374151]" />
        </div>
        <div className="space-y-2 px-3 pb-4 pt-3">
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.18em] text-[#9CA3AF]">
            Tomorrow morning
          </p>
          <div className="space-y-1.5 rounded-2xl bg-[#1F2937] px-3 py-2.5">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
                <MessageCircle className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-white">{who}</p>
                <p className="truncate text-[11px] text-[#D1D5DB]">
                  Hi — do you still have chicken?
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5 rounded-2xl bg-[#1F2937] px-3 py-2.5">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0D9488] text-white">
                <Smartphone className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-white">Kiosk</p>
                <p className="text-[11px] text-[#D1D5DB]">
                  3 items below reorder at {who}
                </p>
              </div>
            </div>
          </div>
          {phoneLabel ? (
            <p className="pt-1 text-center text-[11px] tabular-nums text-[#99F6E4]">
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
      onClick={() => {
        hapticTap(6);
        onToggle();
      }}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-[border-color,background-color,transform] touch-manipulation active:scale-[0.97]",
        selected
          ? "border-[#0D9488] bg-[#F0FDFA] text-[#134E4A]"
          : "border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#D1D5DB]",
      )}
    >
      {selected ? <Check className="size-3.5 shrink-0" aria-hidden /> : null}
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
    <div className="space-y-1.5 text-left sm:space-y-2">
      <h1 className="text-[1.5rem] font-semibold leading-[1.15] tracking-tight text-[#1F2937] sm:text-center sm:text-2xl">
        {title}
      </h1>
      <p className="max-w-[36ch] text-[15px] leading-relaxed text-[#6B7280] sm:mx-auto sm:text-center sm:text-sm">
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
  const [logoError, setLogoError] = useState("");
  const [logoGenerating, setLogoGenerating] = useState(false);
  const [productSource, setProductSource] = useState<ProductSourceChoice | "">(
    initialAnswers.productSource ?? "",
  );
  const logoInputRef = useRef<HTMLInputElement>(null);
  /** When true, skip auto-select-all so Clear stays empty. */
  const departmentsClearedRef = useRef(false);
  /** One-shot note after changing shop types: department picks were reset. */
  const [departmentsResetNote, setDepartmentsResetNote] = useState(false);
  const uploadedLogoUrl = useLogoObjectUrl(logoFile);

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
          { logoFile },
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
          { logoFile },
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
    "flex h-12 w-full items-center justify-center rounded-2xl text-[15px] font-semibold transition touch-manipulation active:scale-[0.985] sm:rounded-xl",
  );

  const shellStyle =
    keyboardInset > 0
      ? {
          height: `calc(100dvh - ${keyboardInset}px)`,
          maxHeight: `calc(100dvh - ${keyboardInset}px)`,
        }
      : undefined;

  return (
    <div
      className="relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#FBF9F5] text-[#1F2937]"
      style={shellStyle}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-24 top-0 size-72 rounded-full bg-[#99F6E4]/25 blur-3xl" />
        <div className="absolute -right-16 top-40 size-64 rounded-full bg-[#FED7AA]/35 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/80 to-transparent" />
      </div>

      <header className="relative z-20 shrink-0 border-b border-[#E8E4DC]/80 bg-[#FBF9F5]/92 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-6">
        <div className="mx-auto w-full max-w-lg space-y-2.5">
          <div className="flex items-center gap-2 sm:justify-between">
            {step > 1 && step < QUESTIONNAIRE_STEP_COUNT ? (
              <button
                type="button"
                onClick={onBack}
                disabled={submitting}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white text-[#374151] shadow-sm transition active:scale-95 disabled:opacity-50 sm:hidden"
                aria-label="Back"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
            ) : (
              <span className="size-11 shrink-0 sm:hidden" aria-hidden />
            )}
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:justify-between">
              <KioskLogoMark size={32} variant="auth" className="sm:hidden" />
              <KioskLogoMark size={40} variant="auth" className="hidden sm:block" />
              {countryCode || currency ? (
                <p className="hidden rounded-full border border-[#E5E7EB] bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#6B7280] sm:inline-flex">
                  {[countryCode?.toUpperCase(), currency?.toUpperCase()]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
            {step === QUESTIONNAIRE_PHONE_STEP ? (
              <span className="inline-flex size-11 shrink-0 sm:hidden" aria-hidden />
            ) : (
              <button
                type="button"
                onClick={step === QUESTIONNAIRE_STEP_COUNT ? onFinishLater : onSkip}
                disabled={submitting}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl px-2 text-xs font-medium text-[#6B7280] transition active:scale-95 disabled:opacity-40 sm:hidden"
              >
                Skip
              </button>
            )}
          </div>
          <QuestionnaireProgress step={step} />
        </div>
      </header>

      <main
        ref={scrollRef}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-6 sm:py-8"
      >
        <div className="mx-auto w-full max-w-lg">
          <div
            key={step}
            className={cn(
              "space-y-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 sm:space-y-6",
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
                <div className="grid grid-cols-5 gap-1.5 sm:hidden">
                  {BRANCH_COUNT_OPTIONS.map((opt) => {
                    const countLabel =
                      opt.value === "5plus" ? "5+" : opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setBranchCount(opt.value)}
                        className={cn(
                          "flex h-16 flex-col items-center justify-center rounded-2xl border transition touch-manipulation active:scale-[0.97]",
                          branchCount === opt.value
                            ? "border-[#0D9488] bg-[#0D9488] text-white shadow-[0_8px_18px_-12px_rgba(13,148,136,0.8)]"
                            : "border-[#E5E7EB] bg-white text-[#4B5563]",
                        )}
                      >
                        <span className="text-lg font-semibold tabular-nums leading-none">
                          {countLabel}
                        </span>
                        <span
                          className={cn(
                            "mt-1 text-[10px]",
                            branchCount === opt.value
                              ? "text-white/80"
                              : "text-[#9CA3AF]",
                          )}
                        >
                          {opt.value === "1" ? "shop" : "shops"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="hidden grid-cols-1 gap-2.5 sm:grid">
                  {BRANCH_COUNT_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      compact
                      selected={branchCount === opt.value}
                      onClick={() => setBranchCount(opt.value)}
                    >
                      <span className="block font-medium">{opt.label}</span>
                    </OptionButton>
                  ))}
                </div>
                {branchSlots > 0 ? (
                  <div className="space-y-3 rounded-2xl border border-[#E8E4DC] bg-white/80 p-3.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:pt-2">
                    <p className="text-xs font-medium text-[#6B7280]">
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
                          <span className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-medium text-[#6B7280]">
                            <span>
                              {branchSlots === 1 ? "Area" : `Branch ${index + 1}`}
                            </span>
                            <span className="truncate font-normal text-[#9CA3AF]">
                              {preview}
                            </span>
                          </span>
                          <div className="flex h-12 items-center overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white focus-within:border-[#0D9488] focus-within:ring-2 focus-within:ring-[#0D9488]/20 sm:rounded-xl">
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
                              className="min-w-0 flex-1 bg-transparent px-4 text-base text-[#1F2937] outline-none sm:text-[15px]"
                              placeholder={branchLocalityPlaceholder(
                                index,
                                countryCode,
                              )}
                              aria-label={`Branch ${index + 1} area name`}
                              autoComplete="address-level2"
                              enterKeyHint="next"
                              list="onboarding-locality-suggestions"
                            />
                            <span className="hidden shrink-0 border-l border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#6B7280] sm:inline">
                              branch
                            </span>
                          </div>
                        </label>
                      );
                    })}
                    {branchCount === "5plus" ? (
                      <p className="text-xs text-[#9CA3AF]">
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
                      butchery. Mini mart and mixed shop can import starter
                      products at the end.
                    </>
                  }
                />
                <div className="grid grid-cols-2 gap-2.5 sm:hidden">
                  {STORE_TYPE_OPTIONS.map((opt) => {
                    const Icon = STORE_TYPE_ICONS[opt.value];
                    const selected = storeTypes.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          hapticTap(8);
                          toggleStoreType(opt.value);
                        }}
                        className={cn(
                          "flex min-h-[5.5rem] flex-col items-start gap-2 rounded-2xl border p-3 text-left transition touch-manipulation active:scale-[0.98]",
                          selected
                            ? "border-[#0D9488] bg-[#F0FDFA] text-[#134E4A]"
                            : "border-[#E5E7EB] bg-white text-[#4B5563]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center rounded-xl",
                            selected
                              ? "bg-[#0D9488] text-white"
                              : "bg-[#F3F4F6] text-[#0D9488]",
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="text-sm font-semibold leading-tight">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="hidden space-y-2.5 sm:block">
                  {STORE_TYPE_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      selected={storeTypes.includes(opt.value)}
                      onClick={() => toggleStoreType(opt.value)}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block font-medium">{opt.label}</span>
                          <span className="mt-0.5 block text-xs leading-snug text-[#9CA3AF]">
                            {opt.hint}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition",
                            storeTypes.includes(opt.value)
                              ? "border-[#0D9488] bg-[#0D9488] text-white"
                              : "border-[#D1D5DB] bg-white",
                          )}
                          aria-hidden
                        >
                          {storeTypes.includes(opt.value) ? (
                            <Check className="size-3" />
                          ) : null}
                        </span>
                      </span>
                    </OptionButton>
                  ))}
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  {storeTypes.length === 0
                    ? "Select at least one shop type to continue."
                    : `${storeTypes.length} selected`}
                </p>
                {departmentsResetNote ? (
                  <p className="text-xs font-medium text-[#0D9488]">
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
                {availableDepartments.length > 0 ? (
                  <div className="flex items-center gap-3 text-sm">
                    <button
                      type="button"
                      onClick={selectAllDepartments}
                      className="min-h-10 font-medium text-[#0D9488] active:opacity-70"
                    >
                      Select all
                    </button>
                    <span className="text-[#D1D5DB]">·</span>
                    <button
                      type="button"
                      onClick={clearDepartments}
                      className="min-h-10 text-[#6B7280] active:opacity-70"
                    >
                      Clear
                    </button>
                  </div>
                ) : null}
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
                <div>
                  <label
                    htmlFor="onboarding-custom-department"
                    className="block text-xs font-medium text-[#6B7280]"
                  >
                    Add custom section
                  </label>
                  <div className="mt-1.5 flex gap-2">
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
                      className="h-12 shrink-0 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#374151] transition active:scale-[0.98] hover:bg-[#F9FAFB] sm:h-12 sm:rounded-xl"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  {selectedDepartments.length === 0
                    ? "No sections selected yet. You can continue and add them later."
                    : `${selectedDepartments.length} selected`}
                </p>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <StepHeading
                  title="Would you like to sell online?"
                  description="Turn on a web shop so customers can browse and order from your website. You can change this later in Settings."
                />
                <div className="space-y-2.5">
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
                    >
                      <span className="block font-medium">{opt.label}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-[#9CA3AF]">
                        {opt.value === "yes"
                          ? businessSlug
                            ? `Customers can shop at your storefront (/${businessSlug}).`
                            : "Customers can browse and order from your web shop."
                          : "Stay in-store only for now — turn online selling on anytime."}
                      </span>
                    </OptionButton>
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
                <div className="mx-auto hidden w-40 sm:block">
                  <ThemeTryOnPhone
                    item={selectedThemeMeta}
                    kind={themeKind}
                    storeName={displayName || businessName || "Your shop"}
                    brandPrimary={primaryColor}
                    size="sm"
                    frame="card"
                  />
                </div>
                <p className="hidden text-center text-sm font-semibold text-[#1F2937] sm:block">
                  {selectedThemeMeta.name}
                </p>
                <div
                  ref={themeStripRef}
                  data-no-swipe-back
                  className={cn(
                    "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                    "sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0",
                    seeAllThemes ? "sm:grid-cols-2" : "sm:grid-cols-3",
                  )}
                >
                  {onboardingVisibleThemes.map((item) => {
                    const selected = item.id === selectedThemeId;
                    return (
                      <button
                        key={item.id}
                        type="button"
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
                          "w-[42vw] max-w-[11.5rem] shrink-0 snap-center overflow-hidden rounded-2xl border text-left transition sm:w-auto sm:max-w-none sm:rounded-xl",
                          selected
                            ? "border-[#0D9488] ring-2 ring-[#0D9488]/30 sm:border-[#1F2937] sm:ring-1 sm:ring-[#1F2937]"
                            : "border-[#E5E7EB] hover:border-[#9CA3AF]",
                        )}
                      >
                        <ThemeTryOnPhone
                          item={item}
                          kind={themeKind}
                          storeName={displayName || businessName || "Your shop"}
                          brandPrimary={primaryColor}
                          size="sm"
                          frame="card"
                        />
                        <span className="flex items-center justify-between gap-1 px-2 py-2">
                          <span className="truncate text-[12px] font-semibold text-[#1F2937] sm:text-[11px]">
                            {item.name}
                          </span>
                          {selected ? (
                            <Check className="size-3.5 shrink-0 text-[#0D9488] sm:size-3" aria-hidden />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-center text-sm font-semibold text-[#1F2937] sm:hidden">
                  {selectedThemeMeta.name}
                </p>
                {!seeAllThemes ? (
                  <button
                    type="button"
                    onClick={() => setSeeAllThemes(true)}
                    className="min-h-11 text-sm font-medium text-[#1F2937] underline underline-offset-2"
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
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-[#6B7280]">
                      Display name
                    </span>
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
                        className="mt-2 min-h-10 text-left text-xs text-[#0D9488] active:opacity-70"
                      >
                        Use suggested:{" "}
                        <span className="font-medium">
                          {suggestedDisplayName}
                        </span>
                      </button>
                    ) : suggestedDisplayName ? (
                      <p className="mt-2 text-xs text-[#9CA3AF]">
                        Suggested from your business name
                      </p>
                    ) : null}
                  </label>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[#6B7280]">
                      Colours &amp; preview
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
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
                        logoPreviewUrl={uploadedLogoUrl}
                      />
                    </div>
                    {!meetsBrandingContrast(primaryColor, accentColor) ? (
                      <p className="text-xs text-amber-700" role="status">
                        Colours need more contrast — tap Pick colours to adjust.
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white/70 p-4 sm:rounded-xl">
                    <p className="mb-1 text-xs font-medium text-[#6B7280]">
                      Logo{" "}
                      <span className="font-normal text-[#9CA3AF]">
                        (optional)
                      </span>
                    </p>
                    <p className="mb-3 text-xs text-[#9CA3AF]">
                      Skip if you don&apos;t have one. We&apos;ll use a mark
                      from your shop name, or you can describe one for AI to
                      draw.
                    </p>
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                      <div className="relative">
                        <TenantLogo
                          brand={
                            displayName.trim() || businessName || "Your shop"
                          }
                          logoUrl={uploadedLogoUrl}
                          primaryColor={primaryColor}
                          variant="upload"
                        />
                        {logoGenerating ? (
                          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70">
                            <Loader2
                              className="size-6 animate-spin text-[#0D9488]"
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
                          className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-[#374151] transition active:scale-[0.98] hover:bg-[#F9FAFB] sm:h-auto sm:rounded-xl sm:py-2"
                        >
                          {logoFile
                            ? "Replace logo"
                            : "Upload logo (optional)"}
                        </button>
                        <AiLogoGenerator
                          variant="onboarding"
                          shopName={displayName.trim() || businessName || ""}
                          shopType={storeTypesLabel}
                          primaryColor={primaryColor}
                          accentColor={accentColor}
                          disabled={submitting}
                          onBusyChange={setLogoGenerating}
                          onGenerated={(file) => {
                            if (file.size > MAX_LOGO_BYTES) {
                              setLogoError("Logo must be 4 MB or smaller.");
                              return;
                            }
                            setLogoError("");
                            setLogoFile(file);
                            hapticTap();
                          }}
                        />
                        {logoFile ? (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoFile(null);
                              setLogoError("");
                            }}
                            className="min-h-10 text-xs text-[#6B7280] active:opacity-70"
                          >
                            Use name mark instead
                          </button>
                        ) : (
                          <p className="text-xs text-[#9CA3AF]">
                            Optional. A name mark is used until you upload or
                            generate one.
                          </p>
                        )}
                        {logoError ? (
                          <p className="text-xs text-red-600">{logoError}</p>
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
                <div className="flex flex-col gap-5">
                  <label className="order-1 block sm:order-2">
                    <span className="mb-1.5 block text-xs font-medium text-[#6B7280]">
                      Shop line
                    </span>
                    <div className="flex h-12 items-center overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white focus-within:border-[#0D9488] focus-within:ring-2 focus-within:ring-[#0D9488]/20 sm:rounded-xl">
                      <span className="shrink-0 border-r border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm font-medium tabular-nums text-[#374151]">
                        {dialCode}
                      </span>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent px-4 text-base tabular-nums text-[#1F2937] outline-none sm:text-[15px]"
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
                  <div className="order-2 sm:order-1">
                    <ShopLinePreview
                      shopName={displayName || businessName || ""}
                      phoneLabel={ownerPhone.trim()}
                    />
                  </div>
                  <p className="order-3 text-xs text-[#9CA3AF]">
                    {looksLikeOwnerPhone(ownerPhone, countryCode)
                      ? "We'll save this on your account and on the online shop's WhatsApp button."
                      : countryCode?.toUpperCase() === "KE"
                        ? "Use a Kenyan mobile — 07… or 2547…"
                        : "Enter a mobile number we can actually reach."}
                  </p>
                </div>
              </>
            ) : null}

            {step === QUESTIONNAIRE_STOCK_STEP ? (
              <>
                <StepHeading
                  title={
                    catalogShellEmpty
                      ? "Add products when you’re ready"
                      : "Stock your shelves"
                  }
                  description={
                    catalogShellEmpty ? (
                      catalogLabel
                        ? `${catalogLabel} has no starter pack yet. You can add products yourself anytime.`
                        : "No starter pack for your country yet. You can add products yourself anytime."
                    ) : (
                      "How do you want to stock? Pick one — we’ll match the tips that follow."
                    )
                  }
                />
                {celebrate ? (
                  <div
                    className="flex items-center gap-2.5 rounded-2xl border border-[#99F6E4] bg-[#F0FDFA] px-3.5 py-2.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-300"
                    role="status"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0D9488] text-white">
                      <Check className="size-3" aria-hidden />
                    </span>
                    <p className="text-sm font-medium text-[#0F766E]">
                      Your shop is set up — now fill the shelves.
                    </p>
                  </div>
                ) : null}
                {!catalogShellEmpty ? (
                  <div className="space-y-2">
                    {PRODUCT_SOURCE_OPTIONS.map((opt) => {
                      const selected = productSource === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            hapticTap(8);
                            setProductSource(opt.value);
                            onProductSourceChange?.(opt.value);
                          }}
                          className={cn(
                            "flex w-full flex-col items-start gap-0.5 rounded-2xl border px-4 py-3.5 text-left transition touch-manipulation active:scale-[0.99] sm:rounded-xl sm:py-3",
                            selected
                              ? "border-[#0D9488] bg-[#F0FDFA]"
                              : "border-[#E8E4DC] bg-white/90 hover:border-[#99F6E4]",
                          )}
                        >
                          <span className="text-sm font-semibold text-[#134E4A]">
                            {opt.label}
                          </span>
                          <span className="text-xs text-[#6B7280]">{opt.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {catalogShellEmpty ? (
                  <div className="space-y-3 rounded-2xl border border-[#E8E4DC] bg-white/90 p-4 sm:rounded-xl">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#9CA3AF]">
                      <Package className="size-6" aria-hidden />
                    </div>
                    <ul className="space-y-2.5 text-sm text-[#4B5563]">
                      <li className="flex items-start gap-2.5">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-[#0D9488]"
                          aria-hidden
                        />
                        Add products from Products
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-[#0D9488]"
                          aria-hidden
                        />
                        Check back when packs arrive for your region
                      </li>
                    </ul>
                  </div>
                ) : productSource === "spreadsheet" ||
                  productSource === "other_pos" ? (
                  <div className="flex flex-col items-start gap-3 rounded-2xl border border-[#E8E4DC] bg-white/90 p-4 sm:rounded-xl">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#F0FDFA] text-[#0D9488]">
                      <Package className="size-6" aria-hidden />
                    </div>
                    <p className="text-sm text-[#6B7280]">
                      Import your list first. After that, use the Global catalog
                      only for gaps — and group sizes as families so stock stays
                      honest.
                    </p>
                  </div>
                ) : packLoading ? (
                  <div className="rounded-2xl border border-[#E5E7EB] bg-white/90 px-4 py-10 text-center text-sm text-[#6B7280] sm:rounded-xl">
                    Finding a pack for your shop…
                  </div>
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
                    className="block w-full overflow-hidden rounded-2xl border border-[#99F6E4]/80 bg-white text-left shadow-[0_12px_40px_-28px_rgba(13,148,136,0.45)] transition-[transform,box-shadow] touch-manipulation active:scale-[0.99] sm:rounded-xl"
                  >
                    <div className="bg-gradient-to-br from-[#F0FDFA] to-white px-4 pb-3 pt-4">
                      <div className="flex items-start gap-3">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#0D9488] text-white shadow-sm">
                          <Package className="size-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-semibold tracking-tight text-[#134E4A]">
                            {suggestedPack.name}
                          </p>
                          <p className="mt-0.5 text-xs text-[#0F766E]/90">
                            Most shops start here — matched to your shop type
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#CCFBF1] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[#0F766E]">
                          {suggestedPack.productCount} items
                        </span>
                      </div>
                    </div>
                    {suggestedPack.sampleNames.length > 0 ? (
                      <div className="border-t border-[#E0F2F1] px-4 py-3">
                        <p className="mb-2 text-[11px] font-medium text-[#6B7280]">
                          Sample products inside
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestedPack.sampleNames.slice(0, 4).map((name) => (
                            <span
                              key={name}
                              className="max-w-full truncate rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] text-[#4B5563]"
                            >
                              {name}
                            </span>
                          ))}
                          {suggestedPack.productCount >
                          suggestedPack.sampleNames.length ? (
                            <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] text-[#9CA3AF]">
                              +
                              {suggestedPack.productCount -
                                Math.min(4, suggestedPack.sampleNames.length)}{" "}
                              more
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <div className="border-t border-[#E0F2F1] bg-[#F8FFFD] px-4 py-3">
                      <ul className="space-y-1.5 text-xs text-[#4B5563]">
                        <li className="flex items-center gap-2">
                          <Check
                            className="size-3.5 shrink-0 text-[#0D9488]"
                            aria-hidden
                          />
                          Barcodes &amp; names ready
                        </li>
                        <li className="flex items-center gap-2">
                          <Check
                            className="size-3.5 shrink-0 text-[#0D9488]"
                            aria-hidden
                          />
                          Pick what to keep before importing
                        </li>
                        <li className="flex items-center gap-2">
                          <Check
                            className="size-3.5 shrink-0 text-[#0D9488]"
                            aria-hidden
                          />
                          Shown on your online store by default
                        </li>
                      </ul>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-[#E0F2F1] bg-white px-4 py-2.5 text-xs font-semibold text-[#0F766E]">
                      <span>Tap to open and pick your products</span>
                      <ChevronRight className="size-4 shrink-0" aria-hidden />
                    </div>
                  </button>
                ) : productSource === "new" || !productSource ? (
                  <div className="flex flex-col items-start gap-3 rounded-2xl border border-[#E8E4DC] bg-white/90 p-4 sm:rounded-xl">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#F0FDFA] text-[#0D9488]">
                      <Package className="size-6" aria-hidden />
                    </div>
                    <p className="text-sm text-[#6B7280]">
                      Browse the catalogue and choose products to import.
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          {errorMessage ? (
            <p
              className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
        </div>
      </main>

      <footer className="relative z-20 shrink-0 border-t border-[#E8E4DC]/80 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6">
        <div className="mx-auto w-full max-w-lg space-y-2.5">
          {step === QUESTIONNAIRE_STEP_COUNT ? (
            <>
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
                  className={cn(
                    primaryCtaClass,
                    "bg-[#0D9488] text-white shadow-[0_8px_24px_-12px_rgba(13,148,136,0.7)] hover:bg-[#0F766E]",
                  )}
                >
                  Import spreadsheet
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
                  className={cn(
                    primaryCtaClass,
                    "bg-[#0D9488] text-white shadow-[0_8px_24px_-12px_rgba(13,148,136,0.7)] hover:bg-[#0F766E]",
                  )}
                >
                  {suggestedPack
                    ? `Open ${suggestedPack.name}`
                    : "Open catalogue"}
                </button>
              ) : null}
              {catalogShellEmpty ? (
                <button
                  type="button"
                  onClick={onAddProductsManually}
                  className={cn(
                    primaryCtaClass,
                    "bg-[#0D9488] text-white shadow-[0_8px_24px_-12px_rgba(13,148,136,0.7)] hover:bg-[#0F766E]",
                  )}
                >
                  Add products manually
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (!productSource && !catalogShellEmpty) {
                    onProductSourceChange?.("new");
                  }
                  onFinishLater?.();
                }}
                className={cn(
                  primaryCtaClass,
                  canBrowseGlobalCatalog ||
                    catalogShellEmpty ||
                    productSource === "spreadsheet" ||
                    productSource === "other_pos"
                    ? "border border-transparent bg-transparent text-[#6B7280] hover:text-[#1F2937]"
                    : "bg-[#0D9488] text-white shadow-[0_8px_24px_-12px_rgba(13,148,136,0.7)] hover:bg-[#0F766E]",
                )}
              >
                {canBrowseGlobalCatalog ||
                catalogShellEmpty ||
                productSource === "spreadsheet" ||
                productSource === "other_pos"
                  ? "Skip for now"
                  : "Continue to dashboard"}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!canContinue || submitting || logoGenerating}
              onClick={handleContinue}
              className={cn(
                primaryCtaClass,
                canContinue && !submitting && !logoGenerating
                  ? "bg-[#0D9488] text-white shadow-[0_8px_24px_-12px_rgba(13,148,136,0.7)] hover:bg-[#0F766E]"
                  : "cursor-not-allowed bg-[#E5E7EB] text-white",
              )}
            >
              {submitting
                ? "Setting up your shop…"
                : logoGenerating
                  ? "Generating logo…"
                  : step === QUESTIONNAIRE_PHONE_STEP
                    ? "That’s my number"
                    : step === 5
                      ? "Use this look"
                      : "Continue"}
            </button>
          )}

          {step === QUESTIONNAIRE_STEP_COUNT ? (
            <div className="hidden justify-end text-sm sm:flex">
              <button
                type="button"
                onClick={onFinishLater}
                disabled={submitting}
                className="min-h-10 text-[#9CA3AF] transition hover:text-[#6B7280] disabled:opacity-50"
              >
                Skip for now
              </button>
            </div>
          ) : (
            <div className="hidden items-center justify-between text-sm sm:flex">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={submitting}
                  className="min-h-10 text-[#6B7280] transition hover:text-[#1F2937] disabled:opacity-50"
                >
                  Back
                </button>
              ) : (
                <span />
              )}
              {step === QUESTIONNAIRE_PHONE_STEP ? (
                <span />
              ) : (
                <button
                  type="button"
                  onClick={onSkip}
                  disabled={submitting}
                  className="min-h-10 text-[#9CA3AF] transition hover:text-[#6B7280] disabled:opacity-50"
                >
                  Skip for now
                </button>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
