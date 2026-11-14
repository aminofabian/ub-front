"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { useDashboard } from "@/components/dashboard-provider";

/**
 * The questionnaire (2.1k lines) and the catalogue drawer are rendered only
 * from inside the `active && mounted` portal below — never on first paint. They
 * are the bulk of the onboarding module graph, so they load when the flow opens
 * instead of shipping with every dashboard page.
 */
const OnboardingQuestionnaire = dynamic(
  () =>
    import("@/components/onboarding/onboarding-questionnaire").then(
      (m) => m.OnboardingQuestionnaire,
    ),
  { ssr: false },
);
const OnboardingCatalogDrawer = dynamic(
  () =>
    import("@/components/onboarding/onboarding-catalog-drawer").then(
      (m) => m.OnboardingCatalogDrawer,
    ),
  { ssr: false },
);
import { APP_ROUTES } from "@/lib/config";
import { cashierFirstSaleActivateHref } from "@/lib/first-sale-activate";
import {
  isButcheryOnlyBusiness,
  isCatalogEligibleStoreTypes,
  isServiceBusiness,
  SERVICE_STORE_TYPES,
} from "@/lib/business-store-type";
import { getContrastSafeBrandingPresets } from "@/lib/branding-color-presets";
import {
  DEFAULT_LANDING_TEMPLATE_ID,
  DEFAULT_STORE_THEME_ID,
} from "@/lib/storefront-templates";
import { hasPermission, Permission } from "@/lib/permissions";
import { isOwnerOrAdminRole } from "@/lib/post-auth-destination";
import {
  applyOnboardingQuestionnaire,
  formatApplyFailureMessage,
} from "@/lib/onboarding-questionnaire-apply";
import {
  fetchCatalogListStats,
  fetchGlobalCatalogMeta,
  fetchGlobalCatalogPack,
  type GlobalProductPackRecord,
  type GlobalProductRecord,
} from "@/lib/api";
import { isGlobalCatalogShellEmpty } from "@/lib/global-catalog-empty";
import { pickSuggestedOnboardingPack } from "@/lib/onboarding-suggested-pack";
import type { OnboardingSuggestedPackPreview } from "@/lib/onboarding-suggested-pack";
import {
  activateOnboardingQuestionnaire,
  completeOnboardingQuestionnaire,
  continueSignupAfterVerification,
  getOnboardingQuestionnaireState,
  hydrateOnboardingQuestionnaireFromServer,
  looksLikeOwnerPhone,
  markOnboardingAwaitingStock,
  resumeOnboardingQuestionnaire,
  saveQuestionnaireProgress,
  shopAwaitsFirstWalkthrough,
  shopLooksAlreadyConfigured,
  shouldStartOnboardingQuestionnaire,
  softSkipOnboardingQuestionnaire,
  QUESTIONNAIRE_PHONE_STEP,
  QUESTIONNAIRE_RECEIVE_STEP,
  QUESTIONNAIRE_STOCK_STEP,
  QUESTIONNAIRE_STEP_COUNT,
  type OnboardingQuestionnaireAnswers,
  type OnboardingQuestionnaireFinishExtras,
  type ProductSourceChoice,
} from "@/lib/onboarding-questionnaire";
import { claimBackNavigation } from "@/lib/onboarding-back";

type OnboardingQuestionnaireContextValue = {
  active: boolean;
  reopen: () => void;
};

const OnboardingQuestionnaireContext =
  createContext<OnboardingQuestionnaireContextValue>({
    active: false,
    reopen: () => undefined,
  });

export function useOnboardingQuestionnaire() {
  return useContext(OnboardingQuestionnaireContext);
}

/**
 * A business that only sells services (a kinyozi, a salon). It has no product sections, and
 * picking a storefront theme and brand colours can wait, so the questionnaire goes straight from
 * shop type to the shop phone number; chairs, team, services and pay are set up afterwards on
 * the service set-up page.
 */
function isServiceOnlyStoreTypes(storeTypes: readonly string[] | null | undefined): boolean {
  return (
    Array.isArray(storeTypes) &&
    storeTypes.length > 0 &&
    storeTypes.every((type) => (SERVICE_STORE_TYPES as readonly string[]).includes(type))
  );
}

function isCompleteAnswers(
  answers: Partial<OnboardingQuestionnaireAnswers>,
  countryCode?: string | null,
): answers is OnboardingQuestionnaireAnswers {
  const hasTemplate =
    answers.onlineStore === "yes"
      ? Boolean(answers.storeThemeId)
      : Boolean(answers.landingTemplateId);
  return (
    Boolean(answers.branchCount) &&
    Array.isArray(answers.branchLocalities) &&
    answers.branchLocalities.length > 0 &&
    answers.branchLocalities.every((loc) => loc.trim().length > 0) &&
    Array.isArray(answers.storeTypes) &&
    answers.storeTypes.length > 0 &&
    Array.isArray(answers.selectedDepartments) &&
    Boolean(answers.onlineStore) &&
    hasTemplate &&
    Boolean(answers.displayName?.trim()) &&
    Boolean(answers.primaryColor?.trim()) &&
    Boolean(answers.accentColor?.trim()) &&
    looksLikeOwnerPhone(answers.ownerPhone ?? "", countryCode)
  );
}

function buildPackPreview(
  pack: GlobalProductPackRecord,
  currency: string,
  products: GlobalProductRecord[],
): OnboardingSuggestedPackPreview {
  const samples = products.slice(0, 4);
  return {
    id: pack.id,
    name: pack.name,
    description: pack.description,
    productCount: pack.productCount,
    currency,
    sampleNames: samples.map((p) => p.name).filter(Boolean),
    samplePriceLabel: null,
  };
}

export function OnboardingQuestionnaireProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const {
    me,
    business,
    branches,
    branchId,
    refreshBranches,
    refreshItemTypes,
    refreshSession,
    setBranchId,
  } = useDashboard();

  const canGlobalCatalog = hasPermission(
    me?.permissions,
    Permission.CatalogGlobalRead,
  );
  const canAdoptCatalog = hasPermission(
    me?.permissions,
    Permission.CatalogGlobalAdopt,
  );

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<
    Partial<OnboardingQuestionnaireAnswers>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [catalogShellEmpty, setCatalogShellEmpty] = useState(false);
  const [catalogLabel, setCatalogLabel] = useState<string | null>(null);
  const [suggestedPack, setSuggestedPack] =
    useState<OnboardingSuggestedPackPreview | null>(null);
  const [packLoading, setPackLoading] = useState(false);
  const [catalogDrawerOpen, setCatalogDrawerOpen] = useState(false);
  /** Mobile selection sheet inside the catalogue drawer — lifted so back can close it. */
  const [catalogManifestOpen, setCatalogManifestOpen] = useState(false);
  /** One-time success note on the stock step after the shop setup applied. */
  const [celebrate, setCelebrate] = useState(false);
  /** Mirrors the drawer's importing flag so back never abandons an import. */
  const drawerImportingRef = useRef(false);
  const activeRef = useRef(false);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const catalogEligible = isCatalogEligibleStoreTypes(answers.storeTypes);

  useEffect(() => {
    if (step !== QUESTIONNAIRE_STOCK_STEP || !canGlobalCatalog || !catalogEligible) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setPackLoading(true);
      try {
        const meta = await fetchGlobalCatalogMeta();
        if (cancelled) return;
        const empty = isGlobalCatalogShellEmpty({
          meta,
          productCount: 0,
          totalElements: 0,
          search: "",
          categoryId: null,
          packId: null,
        });
        setCatalogShellEmpty(empty);
        setCatalogLabel(meta.catalogName?.trim() || meta.catalogCode || null);

        if (empty) {
          setSuggestedPack(null);
          return;
        }

        const storeTypes = answers.storeTypes ?? [];
        const pick = pickSuggestedOnboardingPack(meta.packs, storeTypes);
        if (!pick) {
          setSuggestedPack(null);
          return;
        }

        try {
          const detail = await fetchGlobalCatalogPack(pick.id, {
            onlyNotImported: false,
          });
          if (cancelled) return;
          setSuggestedPack(
            buildPackPreview(pick, meta.currency, detail.products),
          );
        } catch {
          if (!cancelled) {
            setSuggestedPack(
              buildPackPreview(pick, meta.currency, []),
            );
          }
        }
      } catch {
        if (!cancelled) {
          setCatalogShellEmpty(false);
          setCatalogLabel(null);
          setSuggestedPack(null);
        }
      } finally {
        if (!cancelled) {
          setPackLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, canGlobalCatalog, catalogEligible, answers.storeTypes]);

  /** Primitive so a refreshed `me` object does not re-run the start check. */
  const meRoleKey = me?.role?.key ?? "";

  const startQuestionnaire = useCallback(() => {
    const stored = getOnboardingQuestionnaireState();
    activateOnboardingQuestionnaire();
    setStep(stored.step || 1);
    setAnswers(stored.answers);
    setActive(true);
    setErrorMessage("");
    setCelebrate(false);
  }, []);

  const reopenQuestionnaire = useCallback(() => {
    const before = getOnboardingQuestionnaireState();
    const reopenAtStock =
      before.status === "completed" ||
      before.step >= QUESTIONNAIRE_STOCK_STEP;
    resumeOnboardingQuestionnaire();
    if (reopenAtStock) {
      markOnboardingAwaitingStock(before.answers);
    }
    const stored = getOnboardingQuestionnaireState();
    setStep(stored.step || 1);
    setAnswers(stored.answers);
    setActive(true);
    setErrorMessage("");
    setCelebrate(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const hydrated = await hydrateOnboardingQuestionnaireFromServer();
      if (cancelled) {
        return;
      }

      const configured = shopLooksAlreadyConfigured({
        onboardingStatus: business?.onboarding?.status,
        onboardingStep: business?.onboarding?.step ?? null,
        onboardingAnswers: business?.onboarding?.answers ?? null,
        storeTypes: business?.profile?.storeTypes ?? null,
        storeType: business?.profile?.storeType ?? null,
      });

      // A shop that already finished onboarding does not need a catalog
      // aggregation on every cold load just to prove it has stock.
      if (configured) {
        const configuredStatus =
          business?.onboarding?.status?.trim().toLowerCase() ??
          getOnboardingQuestionnaireState().status;
        if (
          configuredStatus === "pending" ||
          configuredStatus === "active"
        ) {
          completeOnboardingQuestionnaire(
            getOnboardingQuestionnaireState().answers,
          );
        }
        return;
      }

      const stats = await fetchCatalogListStats(undefined).catch(() => null);
      if (cancelled) {
        return;
      }
      const sellable = stats
        ? stats.parents + stats.variants + stats.standalones
        : 0;

      if (sellable > 0) {
        const status =
          business?.onboarding?.status?.trim().toLowerCase() ??
          getOnboardingQuestionnaireState().status;
        if (status === "pending" || status === "active") {
          completeOnboardingQuestionnaire(
            getOnboardingQuestionnaireState().answers,
          );
        }
        return;
      }

      const isOwnerAdmin =
        meRoleKey.length > 0 &&
        isOwnerOrAdminRole({ role: { key: meRoleKey } });

      // Email verification lands on the shop host (or a new tab), which never
      // saw the signup tab's fresh-signup flag. Pick the signup back up here.
      if (meRoleKey) {
        continueSignupAfterVerification(isOwnerAdmin);
      }

      // The shop's own record is the durable signal: `pending` means the
      // walkthrough has never opened for this business, whichever device or
      // tab the owner is on. Opening it moves the shop to `active`, so this
      // fires once per shop; after that the hub's Resume banner takes over.
      if (
        shopAwaitsFirstWalkthrough(hydrated?.status, isOwnerAdmin) ||
        shouldStartOnboardingQuestionnaire()
      ) {
        startQuestionnaire();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    startQuestionnaire,
    meRoleKey,
    business?.onboarding?.status,
    business?.onboarding?.step,
    business?.onboarding?.answers,
    business?.profile?.storeTypes,
    business?.profile?.storeType,
  ]);

  const finish = useCallback(() => {
    setActive(false);
    setCelebrate(false);
    router.replace(
      isButcheryOnlyBusiness(business) ? APP_ROUTES.butcher : APP_ROUTES.business,
    );
  }, [router, business]);

  const handleOpenCatalogDrawer = useCallback(() => {
    setCatalogManifestOpen(false);
    setCatalogDrawerOpen(true);
  }, []);

  const handleAddProductsManually = useCallback(() => {
    softSkipOnboardingQuestionnaire();
    setActive(false);
    router.replace(APP_ROUTES.products);
  }, [router]);

  const handleFinishLater = useCallback(() => {
    softSkipOnboardingQuestionnaire();
    finish();
  }, [finish]);

  const handleProductSourceChange = useCallback(
    (source: ProductSourceChoice) => {
      const merged = { ...answers, productSource: source };
      setAnswers(merged);
      saveQuestionnaireProgress(QUESTIONNAIRE_STOCK_STEP, merged);
    },
    [answers],
  );

  const handleOpenImport = useCallback(() => {
    const source = answers.productSource;
    const merged =
      source === "spreadsheet" || source === "other_pos"
        ? answers
        : { ...answers, productSource: "spreadsheet" as const };
    if (merged !== answers) {
      setAnswers(merged);
      saveQuestionnaireProgress(QUESTIONNAIRE_STOCK_STEP, merged);
    }
    softSkipOnboardingQuestionnaire();
    setActive(false);
    router.replace(APP_ROUTES.businessImport);
  }, [answers, router]);

  const handleCatalogImportSuccess = useCallback(() => {
    completeOnboardingQuestionnaire(answers);
    setCatalogDrawerOpen(false);
    setActive(false);
    setCelebrate(false);
    // Stock is on the shelf — push straight into till registration + shift gate.
    router.replace(cashierFirstSaleActivateHref());
  }, [answers, router]);

  const dismissLayer = useCallback(() => {
    softSkipOnboardingQuestionnaire();
    setActive(false);
  }, []);

  const handleSkip = useCallback(() => {
    dismissLayer();
    // A button skip leaves the guard entry current in history — pop it so the
    // next hardware back doesn't dead-end on a no-op entry.
    if (window.history.state?.__kioskOnboardingGuard) {
      window.history.back();
    }
  }, [dismissLayer]);

  const handleBack = useCallback(() => {
    setStep((s) =>
      // A service-only business skipped the retail steps on the way in; skip them going back too.
      s === QUESTIONNAIRE_PHONE_STEP && isServiceOnlyStoreTypes(answers.storeTypes)
        ? 2
        : Math.max(1, s - 1),
    );
    setErrorMessage("");
  }, [answers.storeTypes]);

  const handleContinue = useCallback(
    async (
      patch: Partial<OnboardingQuestionnaireAnswers>,
      extras?: OnboardingQuestionnaireFinishExtras,
    ) => {
      const merged = { ...answers, ...patch };
      setAnswers(merged);
      setErrorMessage("");

      if (step === 2 && isServiceOnlyStoreTypes(merged.storeTypes)) {
        // No product sections, no storefront choice, default look: fill in what the apply step
        // needs and go straight to the shop phone number.
        const preset = getContrastSafeBrandingPresets()[0];
        const prepared = {
          ...merged,
          selectedDepartments: [],
          onlineStore: "no" as const,
          landingTemplateId: merged.landingTemplateId || DEFAULT_LANDING_TEMPLATE_ID,
          storeThemeId: merged.storeThemeId || DEFAULT_STORE_THEME_ID,
          displayName:
            merged.displayName?.trim() ||
            business?.branding?.displayName?.trim() ||
            business?.name?.trim() ||
            "My shop",
          // Keep colours the shop already has; only fall back to the default preset.
          primaryColor:
            merged.primaryColor?.trim() ||
            business?.branding?.primaryColor?.trim() ||
            preset?.primary ||
            "#0D9488",
          accentColor:
            merged.accentColor?.trim() ||
            business?.branding?.accentColor?.trim() ||
            preset?.accent ||
            "#5EEAD4",
        };
        setAnswers(prepared);
        saveQuestionnaireProgress(QUESTIONNAIRE_PHONE_STEP, prepared);
        setStep(QUESTIONNAIRE_PHONE_STEP);
        return;
      }

      if (step < QUESTIONNAIRE_PHONE_STEP) {
        const nextStep = step + 1;
        saveQuestionnaireProgress(nextStep, merged);
        setStep(nextStep);
        return;
      }

      if (step === QUESTIONNAIRE_PHONE_STEP) {
        if (!isCompleteAnswers(merged, business?.countryCode)) {
          setErrorMessage("Add a working phone number so we can reach the shop.");
          return;
        }

        setSubmitting(true);
        try {
          const result = await applyOnboardingQuestionnaire(merged, {
            business,
            logoFile: extras?.logoFile ?? null,
            logoDarkFile: extras?.logoDarkFile ?? null,
            faviconFile: extras?.faviconFile ?? null,
            ogImageFile: extras?.ogImageFile ?? null,
            appIconFile: extras?.appIconFile ?? null,
          });
          await Promise.all([
            refreshBranches(),
            refreshItemTypes(),
            refreshSession(),
          ]);
          if (result.firstBranchId) {
            setBranchId(result.firstBranchId);
          }
          if (!result.completed) {
            setErrorMessage(formatApplyFailureMessage(result));
            return;
          }
          // Entities applied — optional M-Pesa receive next, then stock.
          markOnboardingAwaitingStock(merged);
          setCelebrate(true);
          setStep(QUESTIONNAIRE_RECEIVE_STEP);
          saveQuestionnaireProgress(QUESTIONNAIRE_RECEIVE_STEP, merged);
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not finish setup. Try again.",
          );
        } finally {
          setSubmitting(false);
        }
        return;
      }
    },
    [
      answers,
      step,
      business,
      refreshBranches,
      refreshItemTypes,
      refreshSession,
      setBranchId,
      router,
    ],
  );

  const advanceAfterReceive = useCallback(() => {
    const merged = answers;
    setStep(QUESTIONNAIRE_STOCK_STEP);
    saveQuestionnaireProgress(QUESTIONNAIRE_STOCK_STEP, merged);
    if (
      !isCatalogEligibleStoreTypes(merged.storeTypes) &&
      isServiceBusiness({ profile: { storeTypes: merged.storeTypes } })
    ) {
      // Chairs, team, services and pay come next for a service business. It has no shelves to
      // stock, so the questionnaire is finished here rather than left waiting on products.
      completeOnboardingQuestionnaire(merged);
      setActive(false);
      router.replace(APP_ROUTES.servicesSetup);
      return;
    }
    if (!isCatalogEligibleStoreTypes(merged.storeTypes)) {
      softSkipOnboardingQuestionnaire();
      setActive(false);
      router.replace(
        isButcheryOnlyBusiness({
          profile: { storeTypes: merged.storeTypes },
          onboarding: { answers: merged },
        })
          ? APP_ROUTES.butcher
          : APP_ROUTES.business,
      );
    }
  }, [answers, router]);

  /**
   * Hardware/browser back-button guard. While onboarding covers the screen,
   * back walks the flow instead of the dashboard route behind the layer:
   * selection sheet → catalogue drawer → previous step → exit.
   * The latest-ref pattern keeps the effect stable across step changes so the
   * history entry is armed exactly once per activation.
   */
  const popActionRef = useRef<() => boolean>(() => true);
  useEffect(() => {
    popActionRef.current = () => {
      if (submitting) {
        return true; // never abandon an in-flight apply
      }
      if (catalogDrawerOpen) {
        if (drawerImportingRef.current) {
          return true; // never abandon an in-flight import
        }
        if (catalogManifestOpen) {
          setCatalogManifestOpen(false);
        } else {
          setCatalogDrawerOpen(false);
        }
        return true;
      }
      if (step > 1 && step < QUESTIONNAIRE_STEP_COUNT) {
        handleBack();
        return true;
      }
      if (step >= QUESTIONNAIRE_STEP_COUNT) {
        finish();
        return false;
      }
      dismissLayer();
      return false;
    };
  });

  useEffect(() => {
    if (!active || !mounted) {
      return;
    }
    const pushGuardState = () => {
      // Carry the current route state (Next.js reads it on popstate) plus our
      // marker so we can recognise the entry later.
      window.history.pushState(
        { ...(window.history.state ?? {}), __kioskOnboardingGuard: true },
        "",
      );
    };
    if (!window.history.state?.__kioskOnboardingGuard) {
      pushGuardState();
    }
    const onPopState = () => {
      if (!activeRef.current) {
        return;
      }
      // The system edge gesture can fire popstate and the in-page swipe
      // handler for one physical gesture — claim so only one acts, but always
      // re-arm so the guard stays between the user and the route behind.
      const claimed = claimBackNavigation();
      const keepGuard = claimed ? popActionRef.current() : true;
      if (keepGuard) {
        pushGuardState();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [active, mounted]);

  const contextValue = useMemo(
    () => ({ active, reopen: reopenQuestionnaire }),
    [active, reopenQuestionnaire],
  );

  const openingBranchId =
    branchId.trim() ||
    branches.find((b) => b.active)?.id?.trim() ||
    branches[0]?.id?.trim() ||
    "";

  const layer =
    active && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[600] overflow-hidden bg-[#F4F1EA]">
            <OnboardingQuestionnaire
              step={step}
              initialAnswers={answers}
              businessName={business?.name}
              businessSlug={business?.slug}
              brandingDisplayName={business?.branding?.displayName}
              countryCode={business?.countryCode}
              currency={business?.currency}
              accountPhone={me?.phone}
              catalogShellEmpty={catalogShellEmpty}
              catalogLabel={catalogLabel}
              suggestedPack={suggestedPack}
              packLoading={packLoading}
              celebrate={celebrate}
              submitting={submitting}
              errorMessage={errorMessage}
              onContinue={(patch, extras) => {
                void handleContinue(patch, extras);
              }}
              onBack={handleBack}
              onSkip={handleSkip}
              canBrowseGlobalCatalog={canGlobalCatalog && catalogEligible}
              onOpenCatalogDrawer={handleOpenCatalogDrawer}
              onAddProductsManually={handleAddProductsManually}
              onFinishLater={handleFinishLater}
              onProductSourceChange={handleProductSourceChange}
              onOpenImport={handleOpenImport}
              onReceiveSkip={advanceAfterReceive}
              onReceiveDone={advanceAfterReceive}
            />
            <OnboardingCatalogDrawer
              open={catalogDrawerOpen}
              onOpenChange={setCatalogDrawerOpen}
              manifestOpen={catalogManifestOpen}
              onManifestOpenChange={setCatalogManifestOpen}
              importingRef={drawerImportingRef}
              suggestedPackId={suggestedPack?.id ?? null}
              storeTypes={answers.storeTypes ?? []}
              openingBranchId={openingBranchId}
              currency={business?.currency}
              canAdopt={canAdoptCatalog}
              onSuccess={handleCatalogImportSuccess}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <OnboardingQuestionnaireContext.Provider value={contextValue}>
      {children}
      {layer}
    </OnboardingQuestionnaireContext.Provider>
  );
}
