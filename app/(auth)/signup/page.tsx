"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { authInputClassName, AuthSplitShell } from "@/components/auth/auth-split-shell";
import { useOptionalTenant } from "@/components/providers/tenant-provider";
import { Button } from "@/components/ui/button";
import {
  clearSessionTenantId,
  getSessionTokens,
  setSessionTenantId,
} from "@/lib/auth";
import {
  AUTH_TENANT_RESOLVE_ERROR,
  useTenantIdPrefill,
} from "@/lib/auth-tenant-prefill";
import { registerAccount } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

const primaryCtaClass =
  "inline-flex h-12 w-full items-center justify-center rounded-2xl text-[15px] font-semibold shadow-md transition hover:brightness-[0.97] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50";

function SignupPageContent() {
  const tenant = useOptionalTenant();
  const [, ensureTenantResolved] = useTenantIdPrefill();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (getSessionTokens()) {
      router.replace(APP_ROUTES.business);
    }
  }, [router]);

  const persistTenantId = (raw: string) => {
    const id = raw.trim();
    if (id.length > 0) {
      setSessionTenantId(id);
    } else {
      clearSessionTenantId();
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    setVerificationLink(null);

    try {
      const id = await ensureTenantResolved();
      if (!id?.trim()) {
        setErrorMessage(AUTH_TENANT_RESOLVE_ERROR);
        return;
      }
      persistTenantId(id);
      const result = await registerAccount(name.trim(), email.trim(), password);
      if (result.status.toLowerCase() === "active") {
        setVerificationLink(null);
        setSuccessMessage(`Account ready for ${result.email}. You can sign in.`);
      } else {
        const link = result.verificationUrl?.trim();
        if (link) {
          setSuccessMessage(
            `Verify your email for ${result.email}. Use the link below (shown because the API is configured to return it when mail is unavailable).`,
          );
          setVerificationLink(link);
        } else {
          const base = `You're almost done. We sent a link to ${result.email}. Open it to verify, then sign in.`;
          const localHint =
            process.env.NODE_ENV === "development"
              ? " Locally, if the API has no SMTP, the link is only in the backend terminal (yellow WARN + INFO with the verify URL), not in your inbox."
              : "";
          setSuccessMessage(base + localHint);
          setVerificationLink(null);
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sign up failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitShell tenant={tenant}>
      <AuthPageHeader
        title="Create an account"
        description={
          <>
            Join this shop as a teammate — you&apos;ll get the{" "}
            <strong className="font-semibold text-foreground">viewer</strong> role until an owner
            updates it.
          </>
        }
      />
      <p className="mt-1 text-sm text-muted-foreground">
        Sign up and start using your workspace right away after email verification.
      </p>

      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="signup-name">
            Full name
          </label>
          <input
            id="signup-name"
            className={authInputClassName}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            className={authInputClassName}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="signup-password">
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              className={cn(authInputClassName, "pr-12")}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/10"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <button
          type="submit"
          className={primaryCtaClass}
          disabled={isSubmitting}
          style={{ backgroundColor: "var(--auth-accent)", color: "var(--auth-accent-ink)" }}
        >
          {isSubmitting ? "Creating account…" : "Submit"}
        </button>
      </form>

      {successMessage ? (
        <div className="mt-6 space-y-3">
          <AuthAlert variant="success">{successMessage}</AuthAlert>
          {verificationLink ? (
            <div className="rounded-2xl border border-black/[0.06] bg-white/70 p-4 text-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
              <p className="font-semibold text-foreground">Verification link</p>
              <a
                href={verificationLink}
                className="mt-2 block break-all font-medium text-[var(--auth-accent)] underline underline-offset-2 hover:opacity-90"
              >
                Open in this browser
              </a>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{verificationLink}</p>
            </div>
          ) : null}
          <Button variant="outline" className="h-12 w-full rounded-2xl border-2" asChild>
            <Link href={APP_ROUTES.login}>Go to sign in</Link>
          </Button>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-5">
          <AuthAlert variant="error">{errorMessage}</AuthAlert>
        </div>
      ) : null}

      <div className="mt-10 flex items-center justify-between gap-4 border-t border-black/[0.06] pt-6 text-sm dark:border-white/10">
        <span className="text-muted-foreground">Have an account?</span>
        <Link
          href={APP_ROUTES.login}
          className="font-semibold underline decoration-[var(--auth-accent)] decoration-2 underline-offset-4 hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    </AuthSplitShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}
