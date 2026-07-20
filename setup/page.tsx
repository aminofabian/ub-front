"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DesktopBootShell } from "@/components/desktop/desktop-boot-shell";
import { IS_DESKTOP } from "@/lib/runtime";

/**
 * First-run setup wizard for the desktop SKU
 * (see {@code DESKTOP_INSTALLATION.md} §9).
 *
 * <p>The form is intentionally minimal: business name + currency / country /
 * timezone + owner name / email / password. Tax rate, receipt headers,
 * hardware tier, license key and CSV import are all post-MVP — they're
 * already reachable from {@code Settings} once the owner is logged in.
 *
 * <p>The page guards against being opened in a cloud bundle (e.g. someone
 * deep-links to {@code /setup} on the production site): {@link IS_DESKTOP} is
 * a build-time constant, so the {@code !IS_DESKTOP} branch is dead-coded out
 * of the desktop bundle and surfaces a 404-ish redirect on cloud.
 *
 * <p>The backing endpoint {@code POST /api/v1/desktop/setup} is exposed only
 * when {@code spring.profiles.active=desktop}, and is permitted without a JWT
 * by {@code DesktopWebConfig#desktopUiSecurityChain}. Idempotent: the second
 * call returns 409.
 */
type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "success" };

const TIMEZONES = [
  "Africa/Nairobi",
  "Africa/Kampala",
  "Africa/Dar_es_Salaam",
  "Africa/Kigali",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "UTC",
];

const CURRENCIES = ["KES", "UGX", "TZS", "RWF", "NGN", "ZAR", "USD", "EUR"];

const COUNTRIES = [
  { code: "KE", label: "Kenya" },
  { code: "UG", label: "Uganda" },
  { code: "TZ", label: "Tanzania" },
  { code: "RW", label: "Rwanda" },
  { code: "NG", label: "Nigeria" },
  { code: "ZA", label: "South Africa" },
];

export default function DesktopSetupPage() {
  const router = useRouter();
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [countryCode, setCountryCode] = useState("KE");
  const [timezone, setTimezone] = useState("Africa/Nairobi");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  // Defensive redirect — should be unreachable on a desktop bundle because
  // this page is only routed to from <DesktopRootRedirect>, but if a cloud
  // user types /setup we want them out, not stranded on a non-functional form.
  useEffect(() => {
    if (!IS_DESKTOP) {
      router.replace("/");
    }
  }, [router]);

  if (!IS_DESKTOP) {
    return null;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitState({ kind: "submitting" });
    try {
      const res = await fetch("/api/v1/desktop/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          businessName: businessName.trim(),
          currency,
          countryCode,
          timezone,
          ownerName: ownerName.trim(),
          ownerEmail: ownerEmail.trim(),
          ownerPassword,
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { detail?: string; title?: string; message?: string }
          | null;
        const message =
          body?.detail ||
          body?.message ||
          body?.title ||
          `Setup failed (${res.status})`;
        setSubmitState({ kind: "error", message });
        return;
      }
      setSubmitState({ kind: "success" });
      // Tiny pause so the user sees the success state before the page shifts.
      setTimeout(() => router.replace("/login/staff"), 600);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not reach the backend";
      setSubmitState({ kind: "error", message });
    }
  }

  const submitting = submitState.kind === "submitting";

  return (
    <DesktopBootShell
      title="Welcome to Kiosk Desktop"
      message={
        submitState.kind === "success"
          ? "Shop created. Taking you to sign in…"
          : submitting
            ? "Creating your shop…"
            : "Set up your shop on this PC — nothing is uploaded to the cloud."
      }
      status={
        submitState.kind === "success"
          ? "success"
          : submitting
            ? "loading"
            : undefined
      }
    >
      <div className="w-full space-y-4 rounded-2xl border border-border/60 bg-card/95 p-6 text-left shadow-sm backdrop-blur-sm">
        <form className="space-y-4" onSubmit={onSubmit}>
          <fieldset className="space-y-3" disabled={submitting}>
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your shop
            </legend>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-foreground">
                Business name
              </span>
              <input
                className={inputClass}
                placeholder="Acme Mini Mart"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                autoComplete="organization"
                required
                maxLength={191}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-foreground">
                  Country
                </span>
                <select
                  className={inputClass}
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-foreground">
                  Currency
                </span>
                <select
                  className={inputClass}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-foreground">
                Timezone
              </span>
              <select
                className={inputClass}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset className="space-y-3" disabled={submitting}>
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Owner account
            </legend>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-foreground">Name</span>
              <input
                className={inputClass}
                placeholder="Jane Doe"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                autoComplete="name"
                required
                maxLength={191}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-foreground">
                Email
              </span>
              <input
                className={inputClass}
                type="email"
                placeholder="you@shop.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                autoComplete="email"
                required
                maxLength={191}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-foreground">
                Password
              </span>
              <input
                className={inputClass}
                type="password"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={100}
              />
              <span className="block text-[11px] text-muted-foreground">
                At least 8 characters.
              </span>
            </label>
          </fieldset>

          {submitState.kind === "error" ? (
            <div
              role="alert"
              className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100"
            >
              {submitState.message}
            </div>
          ) : null}

          <button
            type="submit"
            className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
            disabled={submitting || submitState.kind === "success"}
          >
            {submitting ? "Setting up…" : "Create my shop"}
          </button>
        </form>
      </div>
    </DesktopBootShell>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30";
