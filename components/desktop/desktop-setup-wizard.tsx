"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CloudDownload,
  Loader2,
  Search,
  Store,
} from "lucide-react";

import { DesktopBootShell } from "@/components/desktop/desktop-boot-shell";
import {
  fetchDesktopMediaStatus,
  type DesktopMediaStatus,
} from "@/lib/desktop-api";
import {
  findDesktopShopByQuery,
  findDesktopShopsByEmail,
  type DesktopFoundShop,
} from "@/lib/desktop-shop-lookup";
import { REMOTE_API_ORIGIN } from "@/lib/config";
import {
  WORLD_COUNTRY_DEFAULTS,
  WORLD_REGION_DEFAULTS,
} from "@/lib/world-region-defaults";
import { cn } from "@/lib/utils";

type Path = "choose" | "connect" | "create";
type ConnectStep = "find" | "pick" | "unlock" | "progress";
type FindTab = "email" | "shop";

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "success" };

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

const COUNTRY_DEFAULTS = WORLD_COUNTRY_DEFAULTS;
const CLOUD_API = REMOTE_API_ORIGIN.replace(/\/$/, "");

const inputClass =
  "h-11 w-full rounded-xl border border-black/[0.1] bg-[#fafbfa] px-3 text-sm text-foreground outline-none transition placeholder:text-[#8a968c] focus:border-[#1f7a3a]/50 focus:bg-white focus:ring-2 focus:ring-[#1f7a3a]/15";

export function DesktopSetupWizard() {
  const router = useRouter();
  const [path, setPath] = useState<Path>("choose");
  const [connectStep, setConnectStep] = useState<ConnectStep>("find");
  const [findTab, setFindTab] = useState<FindTab>("email");
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [countryCode, setCountryCode] = useState("KE");
  const [timezone, setTimezone] = useState("Africa/Nairobi");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupShop, setLookupShop] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [foundShops, setFoundShops] = useState<DesktopFoundShop[]>([]);
  const [selectedShop, setSelectedShop] = useState<DesktopFoundShop | null>(null);
  const [cloudPassword, setCloudPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unlockEmail, setUnlockEmail] = useState("");

  const [mediaStatus, setMediaStatus] = useState<DesktopMediaStatus | null>(null);

  const submitting = submitState.kind === "submitting";

  function goChoose() {
    setPath("choose");
    setConnectStep("find");
    setSubmitState({ kind: "idle" });
    setFoundShops([]);
    setSelectedShop(null);
    setCloudPassword("");
  }

  async function onFindByEmail(e: React.FormEvent) {
    e.preventDefault();
    setLookingUp(true);
    setSubmitState({ kind: "idle" });
    try {
      const shops = await findDesktopShopsByEmail(lookupEmail);
      if (shops.length === 0) {
        setSubmitState({
          kind: "error",
          message:
            "No shop found for that email. Check the spelling, or try searching by shop name.",
        });
        setFoundShops([]);
        return;
      }
      setFoundShops(shops);
      setUnlockEmail(lookupEmail.trim().toLowerCase());
      if (shops.length === 1) {
        setSelectedShop(shops[0]!);
        setConnectStep("unlock");
      } else {
        setConnectStep("pick");
      }
    } finally {
      setLookingUp(false);
    }
  }

  async function onFindByShop(e: React.FormEvent) {
    e.preventDefault();
    setLookingUp(true);
    setSubmitState({ kind: "idle" });
    try {
      const shop = await findDesktopShopByQuery(lookupShop);
      if (!shop) {
        setSubmitState({
          kind: "error",
          message:
            "We could not find that shop. Try the name on your till receipt, or your shop.kiosk.ke address.",
        });
        setFoundShops([]);
        return;
      }
      setFoundShops([shop]);
      setSelectedShop(shop);
      setConnectStep("unlock");
    } finally {
      setLookingUp(false);
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
      /* proceed */
    }
    window.setTimeout(() => router.replace("/login/staff"), 400);
  }

  async function onConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedShop) return;
    const emailForConnect = (unlockEmail || lookupEmail).trim().toLowerCase();
    if (!emailForConnect) {
      setSubmitState({
        kind: "error",
        message: "Enter the owner or staff email for this shop.",
      });
      return;
    }
    setSubmitState({ kind: "submitting" });
    try {
      const res = await fetch("/api/v1/desktop/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          origin: selectedShop.apiOrigin || CLOUD_API,
          email: emailForConnect,
          password: cloudPassword,
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { detail?: string; title?: string; message?: string }
          | null;
        setSubmitState({
          kind: "error",
          message:
            body?.detail ||
            body?.message ||
            body?.title ||
            `Could not connect (${res.status})`,
        });
        return;
      }
      setSubmitState({ kind: "success" });
      setConnectStep("progress");
      void pollConnectMedia();
    } catch (err) {
      setSubmitState({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Could not reach the backend",
      });
    }
  }

  async function onSubmitCreate(e: React.FormEvent<HTMLFormElement>) {
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
        setSubmitState({
          kind: "error",
          message:
            body?.detail ||
            body?.message ||
            body?.title ||
            `Setup failed (${res.status})`,
        });
        return;
      }
      setSubmitState({ kind: "success" });
      setTimeout(() => router.replace("/login/staff"), 600);
    } catch (err) {
      setSubmitState({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Could not reach the backend",
      });
    }
  }

  const shellTitle =
    path === "choose"
      ? "Set up this till"
      : path === "connect"
        ? connectStep === "progress"
          ? "Almost ready"
          : connectStep === "unlock"
            ? "Confirm it\u2019s you"
            : connectStep === "pick"
              ? "Which shop?"
              : "Find your shop"
        : "New shop on this PC";

  const shellMessage =
    path === "choose"
      ? "Most shops already sell on kiosk.ke \u2014 find yours and we\u2019ll copy it onto this computer."
      : path === "connect"
        ? connectStep === "progress"
          ? "Downloading your products so the counter works offline."
          : connectStep === "unlock"
            ? selectedShop
              ? `Sign in to ${selectedShop.name} with the same password you use online.`
              : "Enter your online password."
            : connectStep === "pick"
              ? "Pick the shop you want on this till."
              : "Use the email you sign in with on kiosk.ke, or search by shop name."
        : "Creates a shop that lives only on this PC \u2014 nothing is uploaded.";

  const shellStatus =
    submitState.kind === "submitting" || connectStep === "progress"
      ? "loading"
      : submitState.kind === "success" && path === "create"
        ? "success"
        : "idle";

  return (
    <DesktopBootShell
      wide
      title={shellTitle}
      message={shellMessage}
      status={shellStatus}
    >
      <div className="w-full text-left">
        {path === "choose" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setPath("connect");
                setConnectStep("find");
                setSubmitState({ kind: "idle" });
              }}
              className={cn(
                "group flex w-full items-start gap-4 rounded-2xl border border-[#1f7a3a]/25 bg-white p-5 text-left shadow-[0_8px_30px_-12px_rgba(31,122,58,0.35)]",
                "transition-[transform,box-shadow,border-color] duration-200 ease-out",
                "hover:-translate-y-0.5 hover:border-[#1f7a3a]/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a3a]/35",
              )}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ea] text-[#1f7a3a]">
                <CloudDownload className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block text-base font-semibold tracking-tight text-foreground"
                  style={{ fontFamily: "var(--font-heading), sans-serif" }}
                >
                  I already have a shop on kiosk.ke
                </span>
                <span className="mt-1 block text-sm leading-snug text-[#3d4a40]">
                  Find it by email or shop name, then copy products and staff onto
                  this till.
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#1f7a3a]">
                  Find my shop
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPath("create");
                setSubmitState({ kind: "idle" });
              }}
              className={cn(
                "group flex w-full items-start gap-4 rounded-2xl border border-black/[0.08] bg-white/80 p-5 text-left",
                "transition hover:border-black/15 hover:bg-white",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a3a]/25",
              )}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#f0f2f0] text-[#3d4a40]">
                <Building2 className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  Start a new shop on this PC only
                </span>
                <span className="mt-1 block text-sm leading-snug text-[#5a665e]">
                  Offline-first. You can connect an online shop later from Settings.
                </span>
              </span>
            </button>
          </div>
        ) : null}

        {path === "connect" && connectStep === "find" ? (
          <Panel>
            <BackLink onClick={goChoose} label="All options" />
            <div
              role="tablist"
              aria-label="How to find your shop"
              className="grid grid-cols-2 gap-1 rounded-xl bg-[#eef3ef] p-1"
            >
              {(
                [
                  { id: "email" as const, label: "My email" },
                  { id: "shop" as const, label: "Shop name" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={findTab === tab.id}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition",
                    findTab === tab.id
                      ? "bg-white text-foreground shadow-sm"
                      : "text-[#5a665e] hover:text-foreground",
                  )}
                  onClick={() => {
                    setFindTab(tab.id);
                    setSubmitState({ kind: "idle" });
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {findTab === "email" ? (
              <form className="space-y-3" onSubmit={onFindByEmail}>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Email you use on kiosk.ke
                  </span>
                  <input
                    className={inputClass}
                    type="email"
                    autoFocus
                    autoComplete="email"
                    placeholder="you@shop.com"
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    required
                  />
                </label>
                <ErrorBox
                  message={
                    submitState.kind === "error" ? submitState.message : null
                  }
                />
                <PrimaryButton disabled={lookingUp} busy={lookingUp}>
                  {lookingUp ? "Looking\u2026" : "Find my shops"}
                </PrimaryButton>
              </form>
            ) : (
              <form className="space-y-3" onSubmit={onFindByShop}>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Shop name or address
                  </span>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#5a665e]"
                      aria-hidden
                    />
                    <input
                      className={cn(inputClass, "pl-9")}
                      autoFocus
                      placeholder="Palmart or palmart.kiosk.ke"
                      value={lookupShop}
                      onChange={(e) => setLookupShop(e.target.value)}
                      required
                    />
                  </div>
                  <span className="block text-xs text-[#5a665e]">
                    Same name customers see on your online shop.
                  </span>
                </label>
                <ErrorBox
                  message={
                    submitState.kind === "error" ? submitState.message : null
                  }
                />
                <PrimaryButton disabled={lookingUp} busy={lookingUp}>
                  {lookingUp ? "Looking\u2026" : "Find this shop"}
                </PrimaryButton>
              </form>
            )}
          </Panel>
        ) : null}

        {path === "connect" && connectStep === "pick" ? (
          <Panel>
            <BackLink
              onClick={() => {
                setConnectStep("find");
                setSubmitState({ kind: "idle" });
              }}
              label="Change search"
            />
            <p className="text-sm text-[#3d4a40]">
              <span className="font-medium text-foreground">{lookupEmail}</span>{" "}
              is linked to {foundShops.length} shops. Pick the one for this till.
            </p>
            <ul className="max-h-[min(50dvh,280px)] space-y-2 overflow-y-auto">
              {foundShops.map((shop) => (
                <li key={shop.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedShop(shop);
                      setConnectStep("unlock");
                      setSubmitState({ kind: "idle" });
                    }}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl border border-black/[0.08] bg-[#fafbfa] px-3.5 py-3 text-left",
                      "transition hover:border-[#1f7a3a]/40 hover:bg-[#e8f2ea]/50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a3a]/30",
                    )}
                  >
                    <ShopAvatar shop={shop} />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate font-semibold text-foreground"
                        style={{
                          fontFamily: "var(--font-heading), sans-serif",
                        }}
                      >
                        {shop.name}
                      </span>
                      <span className="block truncate text-xs text-[#5a665e]">
                        {shop.host}
                      </span>
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 text-[#1f7a3a] opacity-70 transition group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {path === "connect" && connectStep === "unlock" && selectedShop ? (
          <Panel>
            <BackLink
              onClick={() => {
                setConnectStep(foundShops.length > 1 ? "pick" : "find");
                setSubmitState({ kind: "idle" });
              }}
              label="Different shop"
            />
            <div className="flex items-center gap-3 rounded-xl border border-[#1f7a3a]/20 bg-[#e8f2ea]/60 px-3.5 py-3">
              <ShopAvatar shop={selectedShop} />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-semibold text-foreground"
                  style={{ fontFamily: "var(--font-heading), sans-serif" }}
                >
                  {selectedShop.name}
                </p>
                <p className="truncate text-xs text-[#3d4a40]">
                  {selectedShop.host}
                </p>
              </div>
              <CheckCircle2
                className="size-5 shrink-0 text-[#1f7a3a]"
                aria-hidden
              />
            </div>

            <form className="space-y-3" onSubmit={onConnect}>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">
                  Owner or staff email
                </span>
                <input
                  className={inputClass}
                  type="email"
                  autoComplete="email"
                  placeholder="you@shop.com"
                  value={unlockEmail}
                  onChange={(e) => setUnlockEmail(e.target.value)}
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">
                  Online password
                </span>
                <div className="relative">
                  <input
                    className={cn(inputClass, "pr-16")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={cloudPassword}
                    onChange={(e) => setCloudPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-xs font-medium text-[#1f7a3a]"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              <ErrorBox
                message={
                  submitState.kind === "error" ? submitState.message : null
                }
              />
              <PrimaryButton disabled={submitting} busy={submitting}>
                {submitting ? "Copying your shop\u2026" : "Connect this shop"}
              </PrimaryButton>
            </form>
          </Panel>
        ) : null}

        {path === "connect" && connectStep === "progress" ? (
          <Panel>
            <div className="flex items-start gap-3">
              <Store
                className="mt-0.5 size-5 shrink-0 text-[#1f7a3a]"
                aria-hidden
              />
              <div>
                <p className="font-semibold text-foreground">
                  {selectedShop?.name ?? "Your shop"} is connected
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#3d4a40]">
                  Copying product photos onto this PC so the counter keeps
                  working offline. Keep this computer online until it finishes.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-foreground">
                <span>
                  {mediaStatus
                    ? `${mediaStatus.done} of ${mediaStatus.total} photos`
                    : "Starting\u2026"}
                </span>
                <span>
                  {mediaStatus && mediaStatus.total > 0
                    ? Math.round((mediaStatus.done / mediaStatus.total) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#eef3ef]">
                <div
                  className="h-full rounded-full bg-[#1f7a3a] transition-all duration-500"
                  style={{
                    width: `${
                      mediaStatus && mediaStatus.total > 0
                        ? Math.round(
                            (mediaStatus.done / mediaStatus.total) * 100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              className="h-10 w-full rounded-xl text-sm font-medium text-[#5a665e] transition hover:text-foreground"
              onClick={() => router.replace("/login/staff")}
            >
              Skip photos \u2014 sign in now
            </button>
          </Panel>
        ) : null}

        {path === "create" ? (
          <form
            className="space-y-4 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_10px_40px_-18px_rgba(15,20,16,0.35)]"
            onSubmit={onSubmitCreate}
          >
            <BackLink onClick={goChoose} label="All options" />
            <fieldset className="space-y-3" disabled={submitting}>
              <legend className="text-xs font-semibold uppercase tracking-wide text-[#5a665e]">
                Your shop
              </legend>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Business name</span>
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
                  <span className="text-sm font-medium">Country</span>
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
                  <span className="text-sm font-medium">Currency</span>
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
                <span className="text-sm font-medium">Timezone</span>
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
              <legend className="text-xs font-semibold uppercase tracking-wide text-[#5a665e]">
                Owner account
              </legend>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Name</span>
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
                <span className="text-sm font-medium">Email</span>
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
                <span className="text-sm font-medium">Password</span>
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
                <span className="text-xs text-[#5a665e]">
                  At least 8 characters.
                </span>
              </label>
            </fieldset>
            <ErrorBox
              message={
                submitState.kind === "error" ? submitState.message : null
              }
            />
            <PrimaryButton
              disabled={submitting || submitState.kind === "success"}
              busy={submitting}
            >
              {submitting ? "Setting up\u2026" : "Create my shop"}
            </PrimaryButton>
          </form>
        ) : null}
      </div>
    </DesktopBootShell>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_10px_40px_-18px_rgba(15,20,16,0.35)]">
      {children}
    </div>
  );
}

function ShopAvatar({ shop }: { shop: DesktopFoundShop }) {
  if (shop.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={shop.logoUrl}
        alt=""
        className="size-11 shrink-0 rounded-xl object-cover"
      />
    );
  }
  const initial = shop.name.trim().charAt(0).toUpperCase() || "S";
  return (
    <span
      className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#1f7a3a] text-base font-semibold text-white"
      style={{ fontFamily: "var(--font-heading), sans-serif" }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-[#5a665e] transition hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}

function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900"
    >
      {message}
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
  busy,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1f7a3a] text-sm font-semibold text-white transition hover:bg-[#196532] disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
