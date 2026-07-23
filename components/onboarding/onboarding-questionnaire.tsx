"use client";

import { Check, Package } from "lucide-react";
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
  onBrowseCatalog?: () => void;
  onImportSuggestedPack?: () => void;
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
  const label =
    step >= QUESTIONNAIRE_STEP_COUNT
      ? "Last step — stock your shelves"
      : `You're ${percent}% done`;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-[#374151]">{label}</span>
        <span className="tabular-nums text-[#9CA3AF]">
          {step >= QUESTIONNAIRE_STEP_COUNT
            ? "Final step"
            : `Step ${step} of ${answerSteps}`}
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
          className="h-full rounded-full bg-[#0D9488] transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-4 py-3.5 text-left text-[15px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40",
        selected
          ? "border-[#0D9488] bg-[#F0FDFA] text-[#134E4A] shadow-sm"
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
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
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
  onBrowseCatalog,
  onImportSuggestedPack,
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

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-y-auto bg-white px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <svg
          className="absolute -left-8 -top-6 h-40 w-40 text-[#FED7AA]/60"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M20 120C60 40 120 20 180 60"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        <svg
          className="absolute -bottom-8 -right-6 h-44 w-44 text-[#FED7AA]/50"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M30 80C80 140 140 160 170 100"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-md pb-8">
        <div className="mb-8 flex w-full max-w-md flex-col items-center gap-4">
          <KioskLogoMark size={44} variant="auth" />
          {countryCode || currency ? (
            <p className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-[11px] font-medium text-[#6B7280]">
              {[countryCode?.toUpperCase(), currency?.toUpperCase()]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          <QuestionnaireProgress step={step} />
        </div>

        <div className="space-y-6 text-center">
          {step === 1 ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight text-[#1F2937] sm:text-2xl">
                Your shop locations
              </h1>
              <p className="text-sm text-[#6B7280]">
                How many branches do you have, and what do you call each one?
              </p>
              <div className="space-y-2.5 pt-2 text-left">
                {BRANCH_COUNT_OPTIONS.map((opt) => (
                  <OptionButton
                    key={opt.value}
                    selected={branchCount === opt.value}
                    onClick={() => setBranchCount(opt.value)}
                  >
                    {opt.label}
                  </OptionButton>
                ))}
              </div>
              {branchSlots > 0 ? (
                <div className="space-y-3 border-t border-[#F3F4F6] pt-4 text-left">
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
                          <span className="font-normal text-[#9CA3AF]">
                            → {preview}
                          </span>
                        </span>
                        <div className="flex h-12 items-center overflow-hidden rounded-xl border border-[#E5E7EB] bg-white focus-within:border-[#0D9488] focus-within:ring-2 focus-within:ring-[#0D9488]/20">
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
                            className="min-w-0 flex-1 bg-transparent px-4 text-[15px] text-[#1F2937] outline-none"
                            placeholder={branchLocalityPlaceholder(
                              index,
                              countryCode,
                            )}
                            aria-label={`Branch ${index + 1} area name`}
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
              <h1 className="text-xl font-semibold tracking-tight text-[#1F2937] sm:text-2xl">
                What kind of shop is this?
              </h1>
              <p className="text-sm text-[#6B7280]">
                Select all that apply — a mini mart can also include a butchery.
                We use this to suggest starter products at the end.
              </p>
              <div className="space-y-2.5 pt-2 text-left">
                {STORE_TYPE_OPTIONS.map((opt) => (
                  <OptionButton
                    key={opt.value}
                    selected={storeTypes.includes(opt.value)}
                    onClick={() => toggleStoreType(opt.value)}
                  >
                    <span className="block font-medium">{opt.label}</span>
                    <span className="mt-0.5 block text-xs text-[#9CA3AF]">
                      {opt.hint}
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
              <h1 className="text-xl font-semibold tracking-tight text-[#1F2937] sm:text-2xl">
                Choose your product sections
              </h1>
              <p className="text-sm text-[#6B7280]">
                Suggested for {storeTypesLabel.toLowerCase()}. These group items
                at the till and in reports — pick what you sell now, add your
                own, or continue and edit later.
              </p>
              <div className="flex items-center justify-center gap-3 pt-1 text-xs">
                <button
                  type="button"
                  onClick={selectAllDepartments}
                  className="font-medium text-[#0D9488] hover:underline"
                >
                  Select all
                </button>
                <span className="text-[#D1D5DB]">·</span>
                <button
                  type="button"
                  onClick={clearDepartments}
                  className="text-[#6B7280] hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2 text-left">
                {visibleDepartments.map((dept) => (
                  <DepartmentChip
                    key={dept}
                    label={dept}
                    selected={isDepartmentSelected(dept)}
                    onToggle={() => toggleDepartment(dept)}
                  />
                ))}
              </div>
              <div className="pt-2 text-left">
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
                    onChange={(event) => setCustomDepartmentName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCustomDepartment();
                      }
                    }}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#1F2937] outline-none transition focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20"
                    placeholder="e.g. Deli, Frozen Foods, Ready-to-Eat"
                  />
                  <button
                    type="button"
                    onClick={addCustomDepartment}
                    className="rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
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
              <h1 className="text-xl font-semibold tracking-tight text-[#1F2937] sm:text-2xl">
                Would you like to sell online?
              </h1>
              <p className="text-sm text-[#6B7280]">
                Turn on a web shop so customers can browse and order from your
                website. You can change this later in Settings.
              </p>
              <div className="space-y-2.5 pt-2 text-left">
                {ONLINE_STORE_OPTIONS.map((opt) => (
                  <OptionButton
                    key={opt.value}
                    selected={onlineStore === opt.value}
                    onClick={() => setOnlineStore(opt.value)}
                  >
                    <span className="block font-medium">{opt.label}</span>
                    <span className="mt-0.5 block text-xs text-[#9CA3AF]">
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
              <h1 className="text-xl font-semibold tracking-tight text-[#1F2937] sm:text-2xl">
                Brand your shop
              </h1>
              <p className="text-sm text-[#6B7280]">
                Set your display name and colours. Logo is optional — you can add
                one later in settings.
              </p>
              <div className="space-y-4 pt-2 text-left">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[#6B7280]">
                    Display name
                  </span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-[15px] text-[#1F2937] outline-none transition focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20"
                    placeholder={
                      suggestedDisplayName || "Your shop name"
                    }
                  />
                  {suggestedDisplayName &&
                  displayName.trim() !== suggestedDisplayName ? (
                    <button
                      type="button"
                      onClick={() => setDisplayName(suggestedDisplayName)}
                      className="mt-2 text-left text-xs text-[#0D9488] hover:underline"
                    >
                      Use suggested:{" "}
                      <span className="font-medium">{suggestedDisplayName}</span>
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
                  <div className="grid grid-cols-2 gap-3">
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

                <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA]/80 p-4">
                  <p className="mb-1 text-xs font-medium text-[#6B7280]">
                    Logo{" "}
                    <span className="font-normal text-[#9CA3AF]">(optional)</span>
                  </p>
                  <p className="mb-3 text-xs text-[#9CA3AF]">
                    Skip for now if you don&apos;t have one — we use a generated
                    mark from your shop name.
                  </p>
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                    <TenantLogo
                      brand={displayName.trim() || businessName || "Your shop"}
                      logoUrl={uploadedLogoUrl}
                      primaryColor={primaryColor}
                      variant="upload"
                    />
                    <div className="flex flex-col gap-2 text-center sm:text-left">
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
                        className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                      >
                        {logoFile ? "Replace logo" : "Upload logo (optional)"}
                      </button>
                      {logoFile ? (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoError("");
                          }}
                          className="text-xs text-[#6B7280] hover:underline"
                        >
                          Use generated logo instead
                        </button>
                      ) : (
                        <p className="text-xs text-[#9CA3AF]">
                          Optional — a generated mark is used until you upload
                          one.
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

          {step === 6 ? (
            <>
              <h2 className="text-center text-[22px] font-semibold tracking-tight text-[#1F2937]">
                Import products we already have
              </h2>
              {catalogShellEmpty ? (
                <>
                  <p className="mt-2 text-center text-sm leading-relaxed text-[#6B7280]">
                    {catalogLabel
                      ? `${catalogLabel} does not have starter products yet.`
                      : "No starter products for your country yet."}{" "}
                    Add products manually, or check back soon.
                  </p>
                  <div className="mt-8 flex size-16 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] mx-auto">
                    <Package className="size-8 text-[#9CA3AF]" aria-hidden />
                  </div>
                  <ul className="mt-6 space-y-2 text-sm text-[#4B5563]">
                    <li className="flex items-start gap-2">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-[#0D9488]"
                        aria-hidden
                      />
                      Add products one by one from Products
                    </li>
                    <li className="flex items-start gap-2">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-[#0D9488]"
                        aria-hidden
                      />
                      Come back to the catalog later when templates arrive
                    </li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="mt-2 text-center text-sm leading-relaxed text-[#6B7280]">
                    Skip typing every item — import products shops like yours
                    already sell, with barcodes and prices filled in. They will
                    be ready to sell as soon as you import.
                  </p>
                  {packLoading ? (
                    <div className="mt-6 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center text-sm text-[#6B7280]">
                      Finding a starter pack for you…
                    </div>
                  ) : suggestedPack ? (
                    <div className="mt-6 rounded-2xl border border-[#99F6E4] bg-[#F0FDFA] p-4 text-left">
                      <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#0D9488] shadow-sm">
                          <Package className="size-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-[#0F766E]">
                            Suggested for your shop
                          </p>
                          <p className="mt-0.5 text-base font-semibold text-[#134E4A]">
                            {suggestedPack.name}
                          </p>
                          <p className="mt-1 text-xs text-[#0F766E]/80">
                            {suggestedPack.productCount} products
                            {suggestedPack.samplePriceLabel
                              ? ` · ${suggestedPack.samplePriceLabel}`
                              : ""}
                          </p>
                          {suggestedPack.sampleNames.length > 0 ? (
                            <p className="mt-2 line-clamp-2 text-xs text-[#4B5563]">
                              Includes {suggestedPack.sampleNames.join(", ")}
                              {suggestedPack.productCount >
                              suggestedPack.sampleNames.length
                                ? ", …"
                                : ""}
                            </p>
                          ) : suggestedPack.description ? (
                            <p className="mt-2 line-clamp-2 text-xs text-[#4B5563]">
                              {suggestedPack.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8 flex size-16 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F0FDFA] mx-auto">
                      <Package className="size-8 text-[#0D9488]" aria-hidden />
                    </div>
                  )}
                </>
              )}
            </>
          ) : null}
        </div>

        {errorMessage ? (
          <p className="mt-4 text-center text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-8 space-y-3">
          {step === 6 ? (
            <>
              {canBrowseGlobalCatalog && !catalogShellEmpty ? (
                <>
                  <button
                    type="button"
                    onClick={onImportSuggestedPack ?? onBrowseCatalog}
                    className="h-12 w-full rounded-xl bg-[#0D9488] text-[15px] font-semibold text-white shadow-md transition hover:bg-[#0F766E] active:scale-[0.99]"
                  >
                    {suggestedPack
                      ? `Import ${suggestedPack.name} to sell`
                      : "Browse product catalog"}
                  </button>
                  {suggestedPack ? (
                    <button
                      type="button"
                      onClick={onBrowseCatalog}
                      className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white text-[14px] font-medium text-[#374151] transition hover:bg-[#FAFAFA] active:scale-[0.99]"
                    >
                      Browse all products
                    </button>
                  ) : null}
                </>
              ) : null}
              {catalogShellEmpty ? (
                <button
                  type="button"
                  onClick={onAddProductsManually ?? onBrowseCatalog}
                  className="h-12 w-full rounded-xl bg-[#0D9488] text-[15px] font-semibold text-white shadow-md transition hover:bg-[#0F766E] active:scale-[0.99]"
                >
                  Add products manually
                </button>
              ) : null}
              <button
                type="button"
                onClick={onFinishLater}
                className={cn(
                  "h-12 w-full rounded-xl border text-[15px] font-semibold transition active:scale-[0.99]",
                  canBrowseGlobalCatalog && !catalogShellEmpty
                    ? "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#FAFAFA]"
                    : catalogShellEmpty
                      ? "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#FAFAFA]"
                      : "bg-[#0D9488] text-white shadow-md hover:bg-[#0F766E]",
                )}
              >
                {canBrowseGlobalCatalog || catalogShellEmpty
                  ? "I'll add products later"
                  : "Continue to dashboard"}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!canContinue || submitting}
              onClick={handleContinue}
              className={cn(
                "h-12 w-full rounded-xl text-[15px] font-semibold transition active:scale-[0.99]",
                canContinue && !submitting
                  ? "bg-[#0D9488] text-white shadow-md hover:bg-[#0F766E]"
                  : "cursor-not-allowed bg-[#E5E7EB] text-white",
              )}
            >
              {submitting
                ? "Setting up your shop…"
                : step === 5
                  ? "Create my shop"
                  : "Continue"}
            </button>
          )}

          {step === 6 ? null : (
          <div className="flex items-center justify-between text-sm">
            {step > 1 ? (
              <button
                type="button"
                onClick={onBack}
                disabled={submitting}
                className="text-[#6B7280] transition hover:text-[#1F2937] disabled:opacity-50"
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
              className="text-[#9CA3AF] transition hover:text-[#6B7280] disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
