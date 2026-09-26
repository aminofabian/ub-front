"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import {
  GoogleAuthButton,
} from "@/components/auth/google-auth-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { onboardBusiness, registerAccount, resendVerificationEmail, verifyEmailAddress, loginWithPassword } from "@/lib/api";
import {
  getSessionTenantId,
  persistSessionTenantHost,
  setSessionTenantId,
} from "@/lib/auth";
import { APP_ROUTES, slugDerivedShopUrl } from "@/lib/config";
import {
  markOnboardingQuestionnairePending,
  prepareOnboardingForGoogleSignup,
} from "@/lib/onboarding-questionnaire";
import {
  clearPendingOnboardDraft,
  readPendingOnboardDraft,
  savePendingOnboardDraft,
} from "@/lib/pending-onboard-draft";
import { businessNameToSlug } from "@/lib/shop-lookup";
import {
  handleRegistrationResult,
  resolveDestinationAfterAuth,
} from "@/lib/post-registration-auth";
import { completeAuthAndNavigate } from "@/lib/post-auth-navigation";
import { isAccountExistsError } from "@/lib/problem";
import { useResendCooldown } from "@/lib/resend-cooldown";
import { cn } from "@/lib/utils";

import { LandingOnboarding } from "./landing-onboarding";
import {
  goldCtaClass,
  landingRootStyle,
  sectionLabelPillClass,
} from "./landing-styles";
import { useSelfServeCountries } from "@/hooks/use-selfserve-countries";
import { DEFAULT_SELFSERVE_COUNTRY_CODE } from "@/lib/selfserve-countries";

type LandingSignupModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  host: string;
};

type SignupStep = 1 | 2;

const landingInputClass =
  "w-full rounded-xl border border-[rgba(20,20,18,0.14)] bg-white px-4 py-3.5 text-base text-[#141412] shadow-[inset_0_1px_2px_rgba(20,20,18,0.04)] placeholder:text-[#8A8782] outline-none transition-colors focus:border-[rgba(40,167,69,0.45)] focus:ring-2 focus:ring-[rgba(40,167,69,0.14)]";

export function LandingSignupModal({
  open,
  onOpenChange,
  host,
}: LandingSignupModalProps) {
  const [step, setStep] = useState<SignupStep>(1);
  const [businessName, setBusinessName] = useState("");
  const [shopSlug, setShopSlug] = useState("");
  const [slugLocked, setSlugLocked] = useState(false);
  const [countryCode, setCountryCode] = useState(DEFAULT_SELFSERVE_COUNTRY_CODE);
  const [tenantSlug, setTenantSlug] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [verifyPending, setVerifyPending] = useState(false);
  /** Duplicate email on this shop — offer verify / sign-in, not a dead end. */
  const [accountExists, setAccountExists] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLink, setVerifyLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { countries } = useSelfServeCountries();
  const resendCooldown = useResendCooldown();

  const clearEphemeralFields = () => {
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setErrorMessage("");
    setSuccessMessage("");
    setVerifyPending(false);
    setAccountExists(false);
    setVerifyCode("");
    setVerifyLink(null);
    setIsSubmitting(false);
    resendCooldown.reset();
  };

  const hydrateFromDraft = () => {
    const draft = readPendingOnboardDraft();
    if (!draft) {
      return false;
    }
    setBusinessName(draft.name);
    setShopSlug(draft.slug);
    setSlugLocked(true);
    setCountryCode(draft.countryCode || DEFAULT_SELFSERVE_COUNTRY_CODE);
    setTenantSlug(draft.slug);
    setSessionTenantId(draft.tenantId);
    const createdShopUrl = slugDerivedShopUrl(draft.slug);
    if (createdShopUrl) {
      try {
        persistSessionTenantHost(new URL(createdShopUrl).hostname);
      } catch {
        /* ignore */
      }
    }
    setStep(2);
    return true;
  };

  const resetToFreshSignup = () => {
    clearPendingOnboardDraft();
    setStep(1);
    setBusinessName("");
    setShopSlug("");
    setSlugLocked(false);
    setCountryCode(DEFAULT_SELFSERVE_COUNTRY_CODE);
    setTenantSlug("");
    clearEphemeralFields();
  };

  useEffect(() => {
    if (!open) {
      // Keep the pending shop draft — closing mid-flow must not orphan the tenant.
      clearEphemeralFields();
      return;
    }
    if (!hydrateFromDraft()) {
      setStep(1);
      clearEphemeralFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-only hydrate
  }, [open]);

  const shopUrl = tenantSlug ? slugDerivedShopUrl(tenantSlug) : null;
  const shopHostLabel = shopUrl
    ? (() => {
        try {
          return new URL(shopUrl).hostname;
        } catch {
          return `${tenantSlug}.kiosk.ke`;
        }
      })()
    : null;

  const onStep1Submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (tenantSlug) {
        setStep(2);
        return;
      }

      const handle = businessNameToSlug(shopSlug) || businessNameToSlug(businessName);
      const result = await onboardBusiness(
        host,
        businessName,
        countryCode,
        handle,
      );
      if (!result?.tenantId) {
        setErrorMessage(
          "Could not create business. Please try a different name.",
        );
        return;
      }

      setSessionTenantId(result.tenantId);
      setTenantSlug(result.slug);
      savePendingOnboardDraft({
        tenantId: result.tenantId,
        slug: result.slug,
        name: businessName.trim() || result.tenantName || result.slug,
        countryCode: result.countryCode || countryCode,
      });

      const createdShopUrl = slugDerivedShopUrl(result.slug);
      if (createdShopUrl) {
        try {
          persistSessionTenantHost(new URL(createdShopUrl).hostname);
        } catch {
          /* ignore */
        }
      }

      setStep(2);
      prepareOnboardingForGoogleSignup();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not create business. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onStep2Submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setAccountExists(false);

    try {
      const result = await registerAccount(name.trim(), email.trim(), password);
      markOnboardingQuestionnairePending();
      clearPendingOnboardDraft();

      const flow = await handleRegistrationResult({
        result,
        email,
        password,
        tenantSlug,
        shopUrl,
      });

      if (flow === "signed_in" || flow === "verify_redirect") {
        return;
      }

      setVerifyPending(true);
      const link = result.verificationUrl?.trim();
      if (link) {
        setVerifyLink(link);
      }
      setSuccessMessage(
        `Account created. Check ${email.trim()} for the link and 6-digit code — check spam if it’s not there.`,
      );
      setErrorMessage("");
    } catch (error) {
      if (isAccountExistsError(error)) {
        setAccountExists(true);
        // Shop already has this email — draft is no longer useful.
        clearPendingOnboardDraft();
      }
      setErrorMessage(
        error instanceof Error ? error.message : "Sign up failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    const code = verifyCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setErrorMessage("Enter the 6-digit code from your email.");
      return;
    }
    setIsSubmitting(true);
    try {
      const signedIn = await verifyEmailAddress(code, {
        toast: false,
        email: email.trim(),
      });
      if (!signedIn) {
        try {
          await loginWithPassword(email.trim(), password);
        } catch {
          setErrorMessage(
            "Your email is verified. Sign in with your password to continue.",
          );
          setVerifyPending(false);
          return;
        }
      }
      clearPendingOnboardDraft();
      const { dest, slug } = await resolveDestinationAfterAuth({
        tenantSlug: tenantSlug || undefined,
      });
      await completeAuthAndNavigate(dest, slug, {
        preferAssignedSubdomain: true,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "That code did not work. Check your email, or resend a new one.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResendVerification = async () => {
    if (resendCooldown.coolingDown || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setErrorMessage("");
    setVerifyLink(null);
    try {
      const out = await resendVerificationEmail(email.trim());
      const link = out.verificationUrl?.trim();
      if (link) {
        setSuccessMessage(`A new code is ready for ${email.trim()}.`);
        setVerifyLink(link);
      } else {
        setSuccessMessage(
          `If ${email.trim()} has a pending signup, we sent a fresh code. Check inbox and spam.`,
        );
      }
      setVerifyCode("");
      resendCooldown.start();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not resend.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "landing-page max-h-[min(92dvh,760px)] w-[calc(100vw-2rem)] max-w-lg gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none",
          "[&>button]:right-4 [&>button]:top-4 [&>button]:size-9 [&>button]:rounded-full [&>button]:border [&>button]:border-[rgba(20,20,18,0.1)] [&>button]:bg-white [&>button]:text-[#6B6863] [&>button]:shadow-sm",
          "[&>button]:hover:bg-[#F6F5F2] [&>button]:hover:text-[#141412]",
        )}
        overlayClassName="bg-[rgba(20,20,18,0.62)] backdrop-blur-[3px]"
        style={landingRootStyle()}
      >
        <div className="overflow-y-auto rounded-2xl border border-[rgba(20,20,18,0.12)] bg-white shadow-[0_28px_80px_-24px_rgba(20,20,18,0.42)]">
          <div className="h-1 bg-gradient-to-r from-[#20863B] via-[#28A745] to-[#32B85A]" />

          <div className="p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2">
              <span
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  step >= 1 ? "bg-[#28A745]" : "bg-[rgba(20,20,18,0.08)]",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  step >= 2 ? "bg-[#28A745]" : "bg-[rgba(20,20,18,0.08)]",
                )}
                aria-hidden
              />
            </div>

            {step === 1 ? (
              <>
                <DialogHeader className="gap-3 text-left">
                  <p className={sectionLabelPillClass}>Step 1 of 2</p>
                  <DialogTitle className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#141412] sm:text-[2rem]">
                    Name your business
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed text-[#5F5D58] sm:text-[15px]">
                    Pick a name and a shop address. You&apos;ll create your
                    owner account on the next step.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6">
                  <LandingOnboarding
                    businessName={businessName}
                    shopSlug={shopSlug}
                    countryCode={countryCode}
                    countries={countries}
                    errorMessage={errorMessage}
                    isSubmitting={isSubmitting}
                    onBusinessNameChange={(value) => {
                      setBusinessName(value);
                      if (!slugLocked) {
                        setShopSlug(businessNameToSlug(value));
                      }
                    }}
                    onShopSlugChange={(value) => {
                      setSlugLocked(true);
                      setShopSlug(value);
                    }}
                    onCountryCodeChange={setCountryCode}
                    onSubmit={onStep1Submit}
                    onBack={() => onOpenChange(false)}
                  />
                </div>
              </>
            ) : verifyPending ? (
              <>
                <DialogHeader className="gap-3 text-left">
                  <p className={sectionLabelPillClass}>Check your email</p>
                  <DialogTitle className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#141412] sm:text-[2rem]">
                    Confirm your account
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed text-[#5F5D58] sm:text-[15px]">
                    Open the link or enter the 6-digit code. If you verify on
                    another device, come back and sign in on this one.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-6 space-y-4">
                  {successMessage ? (
                    <AuthAlert variant="success">{successMessage}</AuthAlert>
                  ) : null}
                  {errorMessage ? (
                    <AuthAlert variant="error">{errorMessage}</AuthAlert>
                  ) : null}
                  {verifyLink ? (
                    <a
                      href={verifyLink}
                      className="block break-all text-sm font-medium text-[#20863B] underline underline-offset-2"
                    >
                      Open verification link
                    </a>
                  ) : null}
                  <form className="space-y-4" onSubmit={(e) => void onVerifySubmit(e)}>
                    <div>
                      <label
                        htmlFor="landing-signup-verify-code"
                        className="mb-2 block text-sm font-medium text-[#141412]"
                      >
                        6-digit code
                      </label>
                      <input
                        id="landing-signup-verify-code"
                        className={cn(
                          landingInputClass,
                          "text-center text-2xl font-semibold tracking-[0.35em]",
                        )}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="••••••"
                        value={verifyCode}
                        onChange={(e) =>
                          setVerifyCode(
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        autoFocus
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`${goldCtaClass} w-full py-3.5 text-base`}
                    >
                      {isSubmitting ? "Verifying…" : "Verify & continue"}
                    </button>
                  </form>
                  <div className="flex flex-col gap-2 text-center text-sm">
                    {resendCooldown.coolingDown ? (
                      <p className="text-[#8A8782]">
                        Resend in {resendCooldown.remaining}s
                      </p>
                    ) : (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void onResendVerification()}
                        className="font-medium text-[#20863B] underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        Resend code
                      </button>
                    )}
                    <a
                      href={`${APP_ROUTES.verifyEmail}?email=${encodeURIComponent(email.trim())}`}
                      className="text-[#8A8782] underline-offset-2 hover:text-[#5F5D58] hover:underline"
                    >
                      Open full verification page
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <>
                <DialogHeader className="gap-3 text-left">
                  <p className={sectionLabelPillClass}>Step 2 of 2</p>
                  <DialogTitle className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#141412] sm:text-[2rem]">
                    Create your account
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed text-[#5F5D58] sm:text-[15px]">
                    {shopHostLabel ? (
                      <>
                        Continue setting up{" "}
                        <span className="font-medium text-[#141412]">
                          {businessName.trim() || "your shop"}
                        </span>{" "}
                        at{" "}
                        <span className="font-medium text-[#20863B]">
                          {shopHostLabel}
                        </span>
                        . Confirm your email, then sign in to your dashboard.
                      </>
                    ) : (
                      <>
                        Finish your owner account for{" "}
                        <span className="font-medium text-[#141412]">
                          {businessName.trim() || "your shop"}
                        </span>
                        .
                      </>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6 space-y-4">
                  <GoogleAuthButton
                    intent="sign_up"
                    businessId={getSessionTenantId()}
                    next={APP_ROUTES.business}
                    label="Continue with Google"
                    withDivider
                  />
                </div>

                <form className="space-y-4" onSubmit={onStep2Submit}>
                  <div>
                    <label
                      htmlFor="landing-signup-name"
                      className="mb-2 block text-sm font-medium text-[#141412]"
                    >
                      Full name
                    </label>
                    <input
                      id="landing-signup-name"
                      className={landingInputClass}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="landing-signup-email"
                      className="mb-2 block text-sm font-medium text-[#141412]"
                    >
                      Email
                    </label>
                    <input
                      id="landing-signup-email"
                      className={landingInputClass}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="landing-signup-password"
                      className="mb-2 block text-sm font-medium text-[#141412]"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="landing-signup-password"
                        className={cn(landingInputClass, "pr-12")}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#8A8782] transition hover:bg-[rgba(20,20,18,0.04)] hover:text-[#141412]"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-[#8A8782]">
                      At least 8 characters.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`${goldCtaClass} w-full py-3.5 text-base`}
                  >
                    {isSubmitting ? "Creating account…" : "Create account"}
                  </button>
                </form>

                <button
                  type="button"
                  className="mt-5 w-full text-center text-sm text-[#8A8782] transition-colors hover:text-[#5F5D58]"
                  onClick={() => {
                    resetToFreshSignup();
                  }}
                >
                  Start over with a different shop name
                </button>

                {errorMessage ? (
                  <div className="mt-4 space-y-3">
                    <AuthAlert variant="error">{errorMessage}</AuthAlert>
                    {accountExists ? (
                      <div className="space-y-3">
                        <a
                          href={`${APP_ROUTES.verifyEmail}?email=${encodeURIComponent(email.trim())}`}
                          className={`${goldCtaClass} flex w-full items-center justify-center py-3 text-sm`}
                        >
                          Open verification page
                        </a>
                        <p className="text-center text-sm text-[#8A8782]">
                          Already verified?{" "}
                          <a
                            href={`${APP_ROUTES.staffLogin}?mode=office&email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(APP_ROUTES.business)}`}
                            className="font-medium text-[#20863B] underline-offset-2 hover:underline"
                          >
                            Continue to your account
                          </a>
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
