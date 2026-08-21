"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DesktopBootShell } from "@/components/desktop/desktop-boot-shell";
import { fetchDesktopMediaStatus, type DesktopMediaStatus } from "@/lib/desktop-api";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  WORLD_COUNTRY_DEFAULTS,
  WORLD_REGION_DEFAULTS,
} from "@/lib/world-region-defaults";

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

/** Unique currencies / timezones from the world region catalog (+ UTC). */
const CURRENCIES = Array.from(
  new Set(WORLD_REGION_DEFAULTS.map((r) => r.currency)),
).sort();

const TIMEZONES = Array.from(
  new Set(["UTC", ...WORLD_REGION_DEFAULTS.map((r) => r.timezone)]),
).sort();

const COUNTRIES = WORLD_REGION_DEFAULTS.map((r) => ({
  code: r.countryCode,
  label: r.label,
}));

/** Mirrors backend RegionDefaults for desktop default fill (override still allowed). */
const COUNTRY_DEFAULTS = WORLD_COUNTRY_DEFAULTS;

export default function DesktopSetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "connect">("create");
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [countryCode, setCountryCode] = useState("KE");
  const [timezone, setTimezone] = useState("Africa/Nairobi");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  // Connect-to-existing-shop fields.
  const [cloudOrigin, setCloudOrigin] = useState(
    "https://kiosk.zelisline.com",
  );
  const [cloudEmail, setCloudEmail] = useState("");
  const [cloudPassword, setCloudPassword] = useState("");

  // Photo-download progress shown after a successful connect.
  const [mediaStatus, setMediaStatus] = useState<DesktopMediaStatus | null>(null);
  const [mediaSkipped, setMediaSkipped] = useState(false);

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
      // New-shop setup has no product photos to download — go straight to login.
      setTimeout(() => router.replace("/login/staff"), 600);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not reach the backend";
      setSubmitState({ kind: "error", message });
    }
  }

  async function onSubmitConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitState({ kind: "submitting" });
    try {
      const res = await fetch("/api/v1/desktop/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          origin: cloudOrigin.trim(),
          email: cloudEmail.trim(),
          password: cloudPassword,
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
          `Connect failed (${res.status})`;
        setSubmitState({ kind: "error", message });
        return;
      }
      setSubmitState({ kind: "success" });
      // Start polling the background photo download; redirect when it finishes
      // (or immediately when there are no photos to download).
      void pollConnectMedia();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not reach the backend";
      setSubmitState({ kind: "error", message });
    }
  }

  async function pollConnectMedia() {
    try {
      const s = await fetchDesktopMediaStatus();
      setMediaStatus(s);
      if (s.downloading) {
        window.setTimeout(() => void pollConnectMedia(), 1500);
        return;
      }
    } catch {
      // If we can't read progress, just proceed to sign-in.
    }
    window.setTimeout(() => router.replace("/login/staff"), 400);
  }

  function skipMedia() {
    setMediaSkipped(true);
    router.replace("/login/staff");
  }

  const submitting = submitState.kind === "submitting";
  const showConnectProgress =
    mode === "connect" &&
    submitState.kind === "success" &&
    mediaStatus?.downloading === true &&
    !mediaSkipped;

  return (
    <DesktopBootShell
      title="Welcome to Kiosk Desktop"
      message={
        showConnectProgress
          ? "Shop connected. Downloading your products…"
          : submitState.kind === "success"
            ? mode === "connect"
              ? "Shop connected. Taking you to sign in…"
              : "Shop created. Taking you to sign in…"
            : submitting
              ? mode === "connect"
                ? "Connecting your online shop…"
                : "Creating your shop…"
              : mode === "connect"
                ? "Sign in with your kiosk.ke account to copy your shop onto this PC."
                : "Set up your shop on this PC — nothing is uploaded to the cloud."
      }
      status={
        showConnectProgress
          ? "loading"
          : submitState.kind === "success"
            ? "success"
            : submitting
              ? "loading"
              : undefined
      }
    >
      <div className="w-full space-y-4 rounded-2xl border border-border/60 bg-card/95 p-6 text-left shadow-sm backdrop-blur-sm">
        <div
          role="tablist"
          aria-label="Setup mode"
          className="grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-muted/50 p-1 text-sm"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "create"}
            className={`rounded-md px-3 py-2 font-medium transition ${
              mode === "create"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setMode("create");
              setSubmitState({ kind: "idle" });
            }}
          >
            New shop
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "connect"}
            className={`rounded-md px-3 py-2 font-medium transition ${
              mode === "connect"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setMode("connect");
              setSubmitState({ kind: "idle" });
            }}
          >
            I already have a shop
          </button>
        </div>

        {mode === "create" ? (
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
                  onChange={(e) => {
                    const next = e.target.value;
                    setCountryCode(next);
                    const defaults = COUNTRY_DEFAULTS[next];
                    if (defaults) {
                      setCurrency(defaults.currency);
                      setTimezone(defaults.timezone);
                    }
                  }}
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
        ) : showConnectProgress ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">
                Downloading your products
              </h2>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Kiosk is copying your product photos onto this PC so the
                counter keeps working fully offline. Keep this PC online until
                it finishes.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span>
                  {mediaStatus
                    ? `${mediaStatus.done} of ${mediaStatus.total} photos`
                    : "Starting…"}
                </span>
                <span>
                  {mediaStatus && mediaStatus.total > 0
                    ? Math.round((mediaStatus.done / mediaStatus.total) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${
                      mediaStatus && mediaStatus.total > 0
                        ? Math.round((mediaStatus.done / mediaStatus.total) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              className="h-10 w-full rounded-md border border-border text-sm font-medium text-muted-foreground transition hover:text-foreground"
              onClick={skipMedia}
            >
              Skip for now
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmitConnect}>
            <fieldset className="space-y-3" disabled={submitting}>
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Your online shop
              </legend>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Sign in with the email and password you use on{" "}
                <span className="font-medium text-foreground">kiosk.ke</span>.
                Kiosk will copy your products, prices and settings onto this PC
                so the counter keeps working offline.
              </p>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-foreground">
                  Kiosk website
                </span>
                <input
                  className={inputClass}
                  type="url"
                  value={cloudOrigin}
                  onChange={(e) => setCloudOrigin(e.target.value)}
                  autoComplete="url"
                  required
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
                  value={cloudEmail}
                  onChange={(e) => setCloudEmail(e.target.value)}
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
                  value={cloudPassword}
                  onChange={(e) => setCloudPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
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
              {submitting ? "Connecting…" : "Connect my online shop"}
            </button>
          </form>
        )}
      </div>
    </DesktopBootShell>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30";
