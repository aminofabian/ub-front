"use client";

import { Check, ChevronLeft, Package } from "lucide-react";
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
import { TemplatePicker } from "@/components/storefront/template-picker";
import {
  BRANCH_COUNT_OPTIONS,
  ONLINE_STORE_OPTIONS,
  QUESTIONNAIRE_STEP_COUNT,
  STORE_TYPE_OPTIONS,
  branchCountToNumber,
  branchLocalityPlaceholder,
  formatBranchDisplayName,
  storeTypesSectionLabels,
  formatStoreTypesLabel,
  suggestDisplayName,
  type BranchCountChoice,
  type OnboardingQuestionnaireAnswers,
  type OnboardingQuestionnaireFinishExtras,
  type OnlineStoreChoice,
  type StoreTypeChoice,
} from "@/lib/onboarding-questionnaire";
import {
  DEFAULT_LANDING_TEMPLATE_ID,
  DEFAULT_STORE_THEME_ID,
} from "@/lib/storefront-templates";
import { cn } from "@/lib/utils";
import type { OnboardingSuggestedPackPreview } from "@/lib/onboarding-suggested-pack";

const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = "image/png,image/jpeg,image/webp,image/svg+xml";

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
  /** ISO country for locality placeholders (defaults to KE examples). */
  countryCode?: string | null;
  currency?: string | null;
  /** When true, step 6 shows empty-catalog copy instead of browse CTA. */
  catalogShellEmpty?: boolean;
  catalogLabel?: string | null;
  suggestedPack?: OnboardingSuggestedPackPreview | null;
  packLoading?: boolean;
};

function QuestionnaireProgress({ step }: { step: number }) {
  const answerSteps = QUESTIONNAIRE_STEP_COUNT - 1;
  const clamped = Math.min(step, answerSteps);
  const percent =
    step >= QUESTIONNAIRE_STEP_COUNT
      ? 100
      : Math.round((clamped / answerSteps) * 100);

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-[11px] sm:text-xs">
        <span className="font-medium text-[#374151]">
          {step >= QUESTIONNAIRE_STEP_COUNT
            ? "Last step — stock your shelves"
            : `${percent}% done`}
        </span>
        <span className="tabular-nums text-[#9CA3AF]">
          {step >= QUESTIONNAIRE_STEP_COUNT
            ? "Final"
            : `${step} / ${answerSteps}`}
        </span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-[#E5E7EB] sm:h-1.5"
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
      <div className="flex gap-1 pt-0.5 sm:hidden" aria-hidden>
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
      onClick={onClick}
      className={cn(
        "w-full rounded-none border text-left transition-[border-color,background-color,transform,box-shadow]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40",
        "active:scale-[0.985] touch-manipulation",
        compact
          ? "min-h-14 px-3 py-3 text-[14px] sm:min-h-[3.25rem] sm:px-4 sm:text-[15px]"
          : "min-h-[3.25rem] px-4 py-3.5 text-[15px]",
        selected
          ? "border-[#0D9488] bg-[#F0FDFA] text-[#134E4A] shadow-[0_1px_0_0_rgba(13,148,136,0.12)]"
          : "border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#D1D5DB] hover:bg-[#FAFAFA]",
      )}
    >
      {children}
    </button>
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
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-none border px-3.5 py-2 text-sm transition-[border-color,background-color,transform] touch-manipulation active:scale-[0.97]",
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
    <div className="space-y-2 text-left">
      <h1 className="text-[1.375rem] font-semibold tracking-tight text-[#1F2937] sm:text-2xl sm:text-center">
        {title}
      </h1>
      <p className="text-[15px] leading-relaxed text-[#6B7280] sm:text-center sm:text-sm">
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
  countryCode = null,
  currency = null,
  catalogShellEmpty = false,
  catalogLabel = null,
  suggestedPack = null,
  packLoading = false,
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
  const logoInputRef = useRef<HTMLInputElement>(null);
  /** When true, skip auto-select-all so Clear stays empty. */
  const departmentsClearedRef = useRef(false);
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
      prevStoreTypesKeyRef.current = storeTypesKey;
      return;
    }
    if (prevStoreTypesKeyRef.current === storeTypesKey) {
      return;
    }
    prevStoreTypesKeyRef.current = storeTypesKey;
    departmentsClearedRef.current = false;
    setSelectedDepartments([]);
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
          });
        } else {
          if (!landingTemplateId) return;
          onContinue({
            landingTemplateId,
            storeThemeId: storeThemeId || DEFAULT_STORE_THEME_ID,
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
    }
  };

  const storeTypesLabel = formatStoreTypesLabel(storeTypes);

  const scrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const primaryCtaClass = cn(
    "flex h-12 w-full items-center justify-center rounded-2xl text-[15px] font-semibold transition touch-manipulation active:scale-[0.985] sm:rounded-xl",
  );

  return (
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#FBF9F5] text-[#1F2937]">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-24 top-0 size-72 rounded-full bg-[#99F6E4]/25 blur-3xl" />
        <div className="absolute -right-16 top-40 size-64 rounded-full bg-[#FED7AA]/35 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/80 to-transparent" />
      </div>

      <header className="relative z-20 shrink-0 border-b border-[#E8E4DC]/80 bg-[#FBF9F5]/92 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-6">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3">
          {step > 1 && step < QUESTIONNAIRE_STEP_COUNT ? (
            <button
              type="button"
              onClick={onBack}
              disabled={submitting}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-none border border-[#E5E7EB] bg-white text-[#374151] shadow-sm transition active:scale-95 disabled:opacity-50 sm:hidden"
              aria-label="Back"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
          ) : (
            <span className="size-10 shrink-0 sm:hidden" aria-hidden />
          )}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:items-stretch">
            <div className="flex w-full items-center justify-center gap-2.5 sm:justify-between">
              <KioskLogoMark size={36} variant="auth" className="sm:hidden" />
              <KioskLogoMark size={40} variant="auth" className="hidden sm:block" />
              {countryCode || currency ? (
                <p className="hidden border border-[#E5E7EB] bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#6B7280] sm:inline-flex">
                  {[countryCode?.toUpperCase(), currency?.toUpperCase()]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
            <QuestionnaireProgress step={step} />
          </div>
          <button
            type="button"
            onClick={step === QUESTIONNAIRE_STEP_COUNT ? onFinishLater : onSkip}
            disabled={submitting}
            className="inline-flex h-10 shrink-0 items-center justify-center px-2 text-xs font-medium text-[#6B7280] transition active:scale-95 disabled:opacity-40 sm:hidden"
          >
            Skip
          </button>
        </div>
      </header>

      <main
        ref={scrollRef}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-6 sm:py-8"
      >
        <div className="mx-auto w-full max-w-lg">
          <div
            key={step}
            className="space-y-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2 motion-safe:duration-300 sm:space-y-6"
          >
            {step === 1 ? (
              <>
                <StepHeading
                  title="Your shop locations"
                  description="How many branches do you have, and what do you call each one?"
                />
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-1 sm:gap-2.5">
                  {BRANCH_COUNT_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      compact
                      selected={branchCount === opt.value}
                      onClick={() => setBranchCount(opt.value)}
                    >
                      <span className="block text-center font-medium sm:text-left">
                        {opt.label}
                      </span>
                    </OptionButton>
                  ))}
                </div>
                {branchSlots > 0 ? (
                  <div className="space-y-3 border border-[#E8E4DC] bg-white/80 p-3.5 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-2">
                    <p className="text-xs font-medium text-[#6B7280]">
                      Name each branch (area or suburb)
                    </p>
                    {branchLocalities.map((locality, index) => {
                      const preview = formatBranchDisplayName(
                        locality ||
                          branchLocalityPlaceholder(index, countryCode),
                      );
                      return (
                        <label key={index} className="block">
                          <span className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-medium text-[#6B7280]">
                            <span>Branch {index + 1}</span>
                            <span className="truncate font-normal text-[#9CA3AF]">
                              → {preview}
                            </span>
                          </span>
                          <div className="flex h-12 items-center overflow-hidden rounded-none border border-[#E5E7EB] bg-white focus-within:border-[#0D9488] focus-within:ring-2 focus-within:ring-[#0D9488]/20">
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
                            />
                            <span className="shrink-0 border-l border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#6B7280]">
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
                <div className="space-y-2.5">
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
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-none border transition",
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
                      className="h-12 min-w-0 flex-1 rounded-none border border-[#E5E7EB] bg-white px-3 text-base text-[#1F2937] outline-none transition focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 sm:h-10 sm:text-sm"
                      placeholder="e.g. Deli, Frozen Foods"
                      enterKeyHint="done"
                    />
                    <button
                      type="button"
                      onClick={addCustomDepartment}
                      className="h-12 shrink-0 rounded-none border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#374151] transition active:scale-[0.98] hover:bg-[#F9FAFB] sm:h-10"
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
                      onClick={() => setOnlineStore(opt.value)}
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
                      ? "Pick how your online shop looks. You can switch themes later in Settings."
                      : "Pick a public page for your shop link while you stay in-store only. You can change this later."
                  }
                />
                <TemplatePicker
                  kind={onlineStore === "yes" ? "store" : "landing"}
                  value={
                    onlineStore === "yes" ? storeThemeId : landingTemplateId
                  }
                  onChange={(id) => {
                    if (onlineStore === "yes") {
                      setStoreThemeId(id);
                    } else {
                      setLandingTemplateId(id);
                    }
                  }}
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
                      className="h-12 w-full rounded-none border border-[#E5E7EB] bg-white px-4 text-base text-[#1F2937] outline-none transition focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 sm:text-[15px]"
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

                  <div className="rounded-none border border-dashed border-[#E5E7EB] bg-white/70 p-4">
                    <p className="mb-1 text-xs font-medium text-[#6B7280]">
                      Logo{" "}
                      <span className="font-normal text-[#9CA3AF]">
                        (optional)
                      </span>
                    </p>
                    <p className="mb-3 text-xs text-[#9CA3AF]">
                      Skip for now if you don&apos;t have one — we use a
                      generated mark from your shop name.
                    </p>
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                      <TenantLogo
                        brand={
                          displayName.trim() || businessName || "Your shop"
                        }
                        logoUrl={uploadedLogoUrl}
                        primaryColor={primaryColor}
                        variant="upload"
                      />
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
                          disabled={submitting}
                          onClick={() => logoInputRef.current?.click()}
                          className="h-11 rounded-none border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-[#374151] transition active:scale-[0.98] hover:bg-[#F9FAFB] sm:h-auto sm:py-2"
                        >
                          {logoFile
                            ? "Replace logo"
                            : "Upload logo (optional)"}
                        </button>
                        {logoFile ? (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoFile(null);
                              setLogoError("");
                            }}
                            className="min-h-10 text-xs text-[#6B7280] active:opacity-70"
                          >
                            Use generated logo instead
                          </button>
                        ) : (
                          <p className="text-xs text-[#9CA3AF]">
                            Optional — a generated mark is used until you
                            upload one.
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

            {step === 7 ? (
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
                      "Import ready-made products for shops like yours — with barcodes already filled in."
                    )
                  }
                />
                {catalogShellEmpty ? (
                  <div className="space-y-3 rounded-none border border-[#E8E4DC] bg-white/90 p-4">
                    <div className="flex size-12 items-center justify-center rounded-none bg-[#F3F4F6] text-[#9CA3AF]">
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
                ) : packLoading ? (
                  <div className="rounded-none border border-[#E5E7EB] bg-white/90 px-4 py-10 text-center text-sm text-[#6B7280]">
                    Finding a pack for your shop…
                  </div>
                ) : suggestedPack ? (
                  <div className="overflow-hidden rounded-none border border-[#99F6E4]/80 bg-white shadow-[0_12px_40px_-28px_rgba(13,148,136,0.45)]">
                    <div className="bg-gradient-to-br from-[#F0FDFA] to-white px-4 pb-3 pt-4">
                      <div className="flex items-start gap-3">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-none bg-[#0D9488] text-white shadow-sm">
                          <Package className="size-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-semibold tracking-tight text-[#134E4A]">
                            {suggestedPack.name}
                          </p>
                          <p className="mt-0.5 text-xs text-[#0F766E]/90">
                            Matched to your shop type
                          </p>
                        </div>
                        <span className="shrink-0 rounded-none bg-[#CCFBF1] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[#0F766E]">
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
                              className="max-w-full truncate rounded-none bg-[#F3F4F6] px-2.5 py-1 text-[11px] text-[#4B5563]"
                            >
                              {name}
                            </span>
                          ))}
                          {suggestedPack.productCount >
                          suggestedPack.sampleNames.length ? (
                            <span className="rounded-none bg-[#F3F4F6] px-2.5 py-1 text-[11px] text-[#9CA3AF]">
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
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-3 rounded-none border border-[#E8E4DC] bg-white/90 p-4">
                    <div className="flex size-12 items-center justify-center rounded-none bg-[#F0FDFA] text-[#0D9488]">
                      <Package className="size-6" aria-hidden />
                    </div>
                    <p className="text-sm text-[#6B7280]">
                      Browse the catalogue and choose products to import.
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {errorMessage ? (
            <p
              className="mt-4 rounded-none border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
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
              {canBrowseGlobalCatalog && !catalogShellEmpty ? (
                <button
                  type="button"
                  onClick={onOpenCatalogDrawer}
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
                onClick={onFinishLater}
                className={cn(
                  primaryCtaClass,
                  canBrowseGlobalCatalog || catalogShellEmpty
                    ? "border border-transparent bg-transparent text-[#6B7280] hover:text-[#1F2937]"
                    : "bg-[#0D9488] text-white shadow-[0_8px_24px_-12px_rgba(13,148,136,0.7)] hover:bg-[#0F766E]",
                )}
              >
                {canBrowseGlobalCatalog || catalogShellEmpty
                  ? "Skip for now"
                  : "Continue to dashboard"}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!canContinue || submitting}
              onClick={handleContinue}
              className={cn(
                primaryCtaClass,
                canContinue && !submitting
                  ? "bg-[#0D9488] text-white shadow-[0_8px_24px_-12px_rgba(13,148,136,0.7)] hover:bg-[#0F766E]"
                  : "cursor-not-allowed bg-[#E5E7EB] text-white",
              )}
            >
              {submitting
                ? "Setting up your shop…"
                : step === 6
                  ? "Create my shop"
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
              <button
                type="button"
                onClick={onSkip}
                disabled={submitting}
                className="min-h-10 text-[#9CA3AF] transition hover:text-[#6B7280] disabled:opacity-50"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
