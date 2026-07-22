"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { onboardBusiness, registerAccount } from "@/lib/api";
import {
  persistSessionTenantHost,
  setSessionTenantId,
} from "@/lib/auth";
import { slugDerivedShopUrl } from "@/lib/config";
import { markOnboardingTourPending } from "@/lib/onboarding-tour";
import { handleRegistrationResult } from "@/lib/post-registration-auth";
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
  const [countryCode, setCountryCode] = useState(DEFAULT_SELFSERVE_COUNTRY_CODE);
  const [tenantSlug, setTenantSlug] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { countries } = useSelfServeCountries();

  const resetState = () => {
    setStep(1);
    setBusinessName("");
    setCountryCode(DEFAULT_SELFSERVE_COUNTRY_CODE);
    setTenantSlug("");
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setErrorMessage("");
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (!open) {
      resetState();
    }
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

      const result = await onboardBusiness(host, businessName, countryCode);
      if (!result?.tenantId) {
        setErrorMessage(
          "Could not create business. Please try a different name.",
        );
        return;
      }

      setSessionTenantId(result.tenantId);
      setTenantSlug(result.slug);

      const createdShopUrl = slugDerivedShopUrl(result.slug);
      if (createdShopUrl) {
        try {
          persistSessionTenantHost(new URL(createdShopUrl).hostname);
        } catch {
          /* ignore */
        }
      }

      setStep(2);
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

    try {
      const result = await registerAccount(name.trim(), email.trim(), password);
      markOnboardingTourPending();

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

      setErrorMessage(
        "Account created. Check your email to verify, then sign in from your shop URL.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Sign up failed.",
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
                    Claim a subdomain and become the owner. You&apos;ll create
                    your account on the next step.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6">
                  <LandingOnboarding
                    businessName={businessName}
                    countryCode={countryCode}
                    countries={countries}
                    errorMessage={errorMessage}
                    isSubmitting={isSubmitting}
                    onBusinessNameChange={setBusinessName}
                    onCountryCodeChange={setCountryCode}
                    onSubmit={onStep1Submit}
                    onBack={() => onOpenChange(false)}
                  />
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
                        You&apos;re setting up{" "}
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

                <form className="mt-6 space-y-4" onSubmit={onStep2Submit}>
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
                    setStep(1);
                    setErrorMessage("");
                  }}
                >
                  &larr; Back
                </button>

                {errorMessage ? (
                  <div className="mt-4">
                    <AuthAlert variant="error">{errorMessage}</AuthAlert>
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
