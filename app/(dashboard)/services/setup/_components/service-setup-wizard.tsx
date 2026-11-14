"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowRight, Check, ChevronLeft, CircleAlert, Loader2, Minus, Plus } from "lucide-react";

import { DASHBOARD_MAX, DashboardLoading } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { SetupSlip, type SetupSlipLine } from "@/components/onboarding/setup-slip";
import {
  EASE,
  FIELD_CLASS,
  FIELD_LABEL,
  FIELD_SHELL,
  FOCUS_RING,
  KEY_BASE,
  KEY_OFF,
  KEY_ON,
  NOTE,
  QUIET_BUTTON,
  SETUP_GRID,
} from "@/components/onboarding/setup-ui";
import { ApiRequestError } from "@/lib/api";
import { getBusinessStoreTypes, serviceStationLabel, type StoreTypeId } from "@/lib/business-store-type";
import { APP_ROUTES } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import {
  createService,
  addTeamMember,
  fetchPayModel,
  fetchServicePerformers,
  fetchServices,
  fetchStationCount,
  looksLikeKenyanMobile,
  markSelfAsServingCustomers,
  sendTeamSignIn,
  setCommissionPlan,
  setPayModel,
  setStationCount,
  signInSentSentence,
  updateService,
  type SentSignIn,
  type ServicePayModel,
  type ServicePerformerRecord,
  type ServiceRecord,
} from "@/lib/service-business-api";
import { starterServicesForStoreTypes } from "@/lib/service-starter-kits";
import { cn } from "@/lib/utils";

type StepId = "chairs" | "team" | "services" | "pay" | "products";
const STEPS: readonly { id: StepId; label: string }[] = [
  { id: "chairs", label: "Chairs" },
  { id: "team", label: "Your team" },
  { id: "services", label: "Services and prices" },
  { id: "pay", label: "How you pay your team" },
  { id: "products", label: "Products" },
];

type ServiceDraft = {
  name: string;
  durationMinutes: number;
  ticked: boolean;
  price: string;
  exists: boolean;
  /** Which kind of shop the suggestion is for; absent on services the shop already has. */
  storeType?: StoreTypeId;
};

const KIT_TITLES: Partial<Record<StoreTypeId, string>> = {
  barbershop: "Kinyozi",
  salon: "Salon",
  spa: "Spa",
  "nail-studio": "Nails",
  "beauty-parlour": "Beauty",
};

const isConflict = (err: unknown) => err instanceof ApiRequestError && err.status === 409;

/**
 * First-time set-up for a service business, one question per screen: chairs, team, services and
 * prices, how the team is paid, and whether products are sold too. Every step saves when you
 * continue and can be skipped; coming back shows what is already there, so repeating a step
 * never creates a second John or a second Haircut.
 */
export function ServiceSetupWizard() {
  const router = useRouter();
  const { business, branchId, me } = useDashboard();
  const stationWord = serviceStationLabel(business).toLowerCase();

  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chairs, setChairs] = useState(3);
  const [team, setTeam] = useState<ServicePerformerRecord[]>([]);
  const [newNames, setNewNames] = useState<string[]>([]);
  // People who should be able to sign in and see what they earn, by name. Their PIN is made for
  // them and sent to these when the step is saved.
  const [logins, setLogins] = useState<Record<string, { email: string; phone: string }>>({});
  const [wantsSignIn, setWantsSignIn] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  // Sign-ins just sent, shown once before moving on, and anyone whose sign-in could not be made.
  const [sent, setSent] = useState<SentSignIn[]>([]);
  const [notSent, setNotSent] = useState<string[]>([]);
  const [alone, setAlone] = useState(false);
  const [drafts, setDrafts] = useState<ServiceDraft[]>([]);
  const [payMode, setPayMode] = useState<"percent" | "salary">("percent");
  const [percent, setPercent] = useState("");
  // What the share is worked out on, and each service's product cost when it comes off first.
  const [payModel, setPayModelChoice] = useState<ServicePayModel>("GROSS");
  const [catalog, setCatalog] = useState<ServiceRecord[]>([]);
  const [productCosts, setProductCosts] = useState<Record<string, string>>({});
  const [sellsProducts, setSellsProducts] = useState<boolean | null>(null);

  const step = STEPS[index]!;

  // Start from what already exists so the flow can be re-entered safely.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [count, people, existing, model] = await Promise.all([
          branchId ? fetchStationCount(branchId).catch(() => 0) : Promise.resolve(0),
          fetchServicePerformers().catch(() => [] as ServicePerformerRecord[]),
          fetchServices().catch(() => []),
          fetchPayModel(),
        ]);
        if (cancelled) return;
        if (count > 0) setChairs(count);
        setTeam(people);
        setPayModelChoice(model);
        rememberCatalog(existing);
        const existingNames = new Set(existing.map((s) => s.name.trim().toLowerCase()));
        const starter = starterServicesForStoreTypes(getBusinessStoreTypes(business));
        setDrafts([
          ...existing.map((s) => ({
            name: s.name,
            durationMinutes: s.durationMinutes,
            ticked: true,
            price: String(s.price),
            exists: true,
          })),
          ...starter
            .filter((s) => !existingNames.has(s.name.trim().toLowerCase()))
            // Durations are a starting point; prices are always the shop\u2019s own.
            .map((s) => ({ ...s, ticked: false, price: "", exists: false })),
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId, business]);

  /** The shop's services, and the product cost each one already has. */
  function rememberCatalog(services: ServiceRecord[]) {
    setCatalog(services);
    setProductCosts((prev) => {
      const next = { ...prev };
      for (const service of services) {
        if (next[service.id] == null && service.productCost) next[service.id] = String(Math.round(service.productCost));
      }
      return next;
    });
  }

  const everyone = useMemo(
    () => [...team.map((p) => p.displayName), ...newNames],
    [team, newNames],
  );
  const percentNumber = percent.trim() === "" ? null : Number(percent);

  function addName() {
    const name = nameInput.trim();
    if (!name) return setError("Enter a name first");
    if (everyone.some((n) => n.trim().toLowerCase() === name.toLowerCase())) {
      return setError(`${name} is already on the list`);
    }
    const email = emailInput.trim();
    const phone = phoneInput.trim();
    if (wantsSignIn) {
      if (!/^\S+@\S+\.\S+$/.test(email)) return setError(`Enter ${name}'s email. It is what they sign in with.`);
      if (phone && !looksLikeKenyanMobile(phone)) return setError("That mobile number does not look right. Try 0712 345 678.");
    }
    setError(null);
    setNewNames((prev) => [...prev, name]);
    if (wantsSignIn) setLogins((prev) => ({ ...prev, [name]: { email, phone } }));
    setNameInput("");
    setEmailInput("");
    setPhoneInput("");
    setWantsSignIn(false);
  }

  const next = useCallback(() => {
    setError(null);
    setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, []);

  async function saveAndContinue() {
    setError(null);
    setSaving(true);
    try {
      if (step.id === "chairs") {
        if (!branchId) {
          setError("Choose a branch at the top of the page first");
          return;
        }
        await setStationCount(branchId, chairs);
      } else if (step.id === "team") {
        if (!alone && everyone.length === 0) {
          setError("Add at least one person, or choose I work alone");
          return;
        }
        if (alone && me?.id) {
          // The owner is the one serving customers, so the till must be able to pick them.
          await markSelfAsServingCustomers(me.id);
          setTeam(await fetchServicePerformers());
        }
        const added: string[] = [];
        const justSent: SentSignIn[] = [];
        const failed: string[] = [];
        for (const name of newNames) {
          const login = logins[name];
          let staffProfileId: string | null = null;
          try {
            const member = await addTeamMember(login?.phone ? { displayName: name, phone: login.phone } : { displayName: name });
            staffProfileId = member.staffProfileId;
          } catch (err) {
            // Already there from an earlier try: that is what we wanted.
            if (!isConflict(err)) throw err;
          }
          added.push(name);
          if (!login) continue;
          try {
            if (!staffProfileId) throw new Error("already on the team");
            // The PIN is made for them and sent to their phone and email.
            justSent.push(await sendTeamSignIn(staffProfileId, { email: login.email, phone: login.phone, branchId }));
          } catch {
            failed.push(name);
          }
        }
        if (added.length > 0) {
          setTeam(await fetchServicePerformers());
          setNewNames([]);
          setLogins({});
        }
        if (justSent.length > 0 || failed.length > 0) {
          // Stay on this step: the PINs are shown once, here.
          setSent(justSent);
          setNotSent(failed);
          return;
        }
      } else if (step.id === "services") {
        const wanted = drafts.filter((d) => d.ticked && !d.exists);
        if (drafts.every((d) => !d.ticked)) {
          setError("Tick at least one service");
          return;
        }
        const missingPrice = wanted.find((d) => !(Number(d.price) > 0));
        if (missingPrice) {
          setError(`Type your price for ${missingPrice.name}`);
          return;
        }
        for (const draft of wanted) {
          try {
            await createService({
              name: draft.name,
              durationMinutes: draft.durationMinutes,
              price: Number(draft.price),
            });
          } catch (err) {
            if (!isConflict(err)) throw err;
          }
        }
        setDrafts((prev) => prev.map((d) => (d.ticked ? { ...d, exists: true } : d)));
        rememberCatalog(await fetchServices().catch(() => catalog));
      } else if (step.id === "pay") {
        if (payMode === "percent") {
          if (percentNumber == null || !(percentNumber > 0) || percentNumber > 100) {
            setError("Enter a percent between 1 and 100");
            return;
          }
          await setPayModel(payModel);
          for (const person of team) {
            await setCommissionPlan(person.staffProfileId, {
              type: "PERCENT",
              rate: percentNumber,
              productRate: null,
            });
          }
          if (payModel === "NET_OF_PRODUCT") {
            for (const service of catalog) {
              const typed = Number(productCosts[service.id] ?? "") || 0;
              if (typed === Math.round(service.productCost ?? 0)) continue;
              if (typed > service.price && !service.priceIsVariable) {
                setError(`${service.name} costs ${formatMoney(service.price, "KES")}; its product cost cannot be more`);
                return;
              }
              await updateService(service.id, { productCost: typed });
            }
            rememberCatalog(await fetchServices().catch(() => catalog));
          }
        }
      } else if (step.id === "products") {
        if (sellsProducts == null) {
          setError("Choose one to finish");
          return;
        }
        router.replace(sellsProducts ? APP_ROUTES.products : APP_ROUTES.servicesSell);
        return;
      }
      next();
    } catch {
      setError("That did not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoading label="Getting things ready…" />
      </div>
    );
  }

  // The worked example uses one of their own services when there is one: the dearest, since that
  // is where the choice matters most. Otherwise a 1,000 shilling service using 300 of product.
  const percentOk = payMode === "percent" && percentNumber != null && percentNumber > 0 && percentNumber <= 100;
  const dearest = [...catalog].filter((s) => s.price > 0).sort((a, b) => b.price - a.price)[0] ?? null;
  const exampleName = dearest?.name ?? "a service";
  const examplePrice = dearest?.price ?? 1000;
  const typedCost = dearest ? Number(productCosts[dearest.id] ?? "") || 0 : 0;
  const exampleCost =
    payModel === "NET_OF_PRODUCT" ? Math.min(examplePrice, typedCost > 0 ? typedCost : Math.round(examplePrice * 0.3)) : 0;
  const example = percentOk ? Math.floor(((examplePrice - exampleCost) * percentNumber!) / 100 + 0.5) : null;

  const tickedCount = drafts.filter((d) => d.ticked).length;
  const stationPlural = `${stationWord}s`;
  const slipLines: SetupSlipLine[] = [
    {
      label: stationPlural.charAt(0).toUpperCase() + stationPlural.slice(1),
      value: String(chairs),
    },
    {
      label: "Team",
      value:
        index < 1
          ? null
          : alone
            ? "Just me"
            : everyone.length > 0
              ? everyone.length > 3
                ? `${everyone.slice(0, 3).join(", ")} +${everyone.length - 3}`
                : everyone.join(", ")
              : null,
      skipped: index > 1 && !alone && everyone.length === 0,
    },
    {
      label: "Services",
      value: index >= 2 && tickedCount > 0 ? String(tickedCount) : null,
      skipped: index > 2 && tickedCount === 0,
    },
    {
      label: "Pay",
      value:
        index < 3
          ? null
          : payMode === "salary"
            ? "Salary"
            : example != null
              ? `${percentNumber}% ${payModel === "NET_OF_PRODUCT" ? "after product" : "of the price"}`
              : null,
      skipped: index > 3 && payMode === "percent" && example == null,
    },
    {
      label: "Products",
      value:
        index >= 4 && sellsProducts != null
          ? sellsProducts
            ? "Yes"
            : "Services only"
          : null,
    },
  ];
  const slipMeta = [
    business?.countryCode?.toUpperCase(),
    business?.currency?.toUpperCase(),
    "Setup slip",
  ]
    .filter(Boolean)
    .join(" · ");

  const headingClass =
    "text-balance font-serif text-[2rem] font-medium leading-[1.05] tracking-[-0.01em] text-[#121A16] sm:text-[2.6rem]";
  const leadClass = "mt-2.5 max-w-[54ch] text-pretty text-[15px] leading-relaxed text-[#556159]";
  const choiceClass = (on: boolean) =>
    cn(
      KEY_BASE,
      "relative flex min-h-14 w-full items-center py-3 pl-4 pr-11 text-[15px] font-semibold tracking-[-0.01em]",
      on ? KEY_ON : KEY_OFF,
    );
  const stepQuestion = "mt-7 text-[15px] font-semibold tracking-[-0.01em] text-[#121A16]";
  const choiceHint = (on: boolean) =>
    cn("mt-0.5 block text-[13px] font-normal leading-snug", on ? "text-[#F4F1EA]/80" : "text-[#556159]");
  const choiceTick = (on: boolean) => (
    <Check
      className={cn(
        "absolute right-4 top-1/2 size-4 -translate-y-1/2 transition-opacity duration-200",
        on ? "opacity-100" : "opacity-0",
      )}
      strokeWidth={2.5}
      aria-hidden
    />
  );
  const stepperKey = cn(
    KEY_BASE,
    KEY_OFF,
    "flex size-14 items-center justify-center disabled:pointer-events-none disabled:opacity-40",
  );

  return (
    <div className={DASHBOARD_MAX}>
      <div className={cn("kiosk-setup premium-portal pb-10 pt-4 sm:pt-8", SETUP_GRID)}>
        <div className="w-full max-w-xl lg:max-w-none">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] font-medium text-[#121A16]">{step.label}</span>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#556159]">
              {index + 1} of {STEPS.length}
            </span>
          </div>
          <div
            className="mt-2 flex gap-1"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={index + 1}
            aria-label="Set-up progress"
          >
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className="relative h-[3px] flex-1 overflow-hidden bg-[rgba(18,26,22,0.12)]"
              >
                <span
                  className={cn(
                    "absolute inset-0 origin-left bg-[#1D4B3B] transition-transform duration-500",
                    EASE,
                    i <= index ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </span>
            ))}
          </div>

          <div
            key={step.id}
            className="mt-8 min-h-[19rem] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2 motion-safe:duration-300 sm:mt-10"
          >
            {step.id === "chairs" ? (
              <>
                <h1 className={headingClass}>How many {stationWord}s do you have?</h1>
                <p className={leadClass}>One {stationWord} seats one customer at a time.</p>
                <div className="mt-8 flex items-center gap-5">
                  <button
                    type="button"
                    className={stepperKey}
                    aria-label={`Fewer ${stationWord}s`}
                    disabled={chairs <= 1}
                    onClick={() => setChairs((c) => Math.max(1, c - 1))}
                  >
                    <Minus className="size-5" aria-hidden />
                  </button>
                  <span
                    className="min-w-[5.5rem] text-center font-serif text-[5rem] font-medium leading-none tabular-nums text-[#121A16]"
                    aria-live="polite"
                  >
                    {chairs}
                  </span>
                  <button
                    type="button"
                    className={stepperKey}
                    aria-label={`More ${stationWord}s`}
                    disabled={chairs >= 50}
                    onClick={() => setChairs((c) => Math.min(50, c + 1))}
                  >
                    <Plus className="size-5" aria-hidden />
                  </button>
                </div>
                {/* The floor, one mark per seat: the number made visible. */}
                <div className="mt-7 flex max-w-[26rem] flex-wrap gap-1.5" aria-hidden>
                  {Array.from({ length: chairs }, (_, i) => (
                    <span
                      key={i}
                      className="size-4 rounded-[2px] bg-[#1D4B3B] motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:fade-in-0 motion-safe:duration-200"
                    />
                  ))}
                </div>
                <p className={cn(NOTE, "mt-5")}>You can change this later.</p>
              </>
            ) : null}

            {step.id === "team" ? (
              <>
                <h1 className={headingClass}>Who works here?</h1>
                <p className={leadClass}>
                  Add everyone who serves customers. A name is enough to start; you can let someone sign in on their own
                  phone to see their bookings and what they have earned.
                </p>
                {sent.length > 0 || notSent.length > 0 ? (
                  <div className="mt-6 border-y border-[#1D4B3B]/30 py-4" role="status">
                    {sent.length > 0 ? (
                      <>
                        <p className="text-[15px] font-semibold text-[#121A16]">
                          {sent.length === 1 ? "Their sign-in is on its way" : "Their sign-ins are on the way"}
                        </p>
                        <ul className="mt-2 space-y-3">
                          {sent.map((one) => (
                            <li key={one.staffProfileId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5">
                              <span className="text-[15px] font-medium text-[#121A16]">{one.displayName}</span>
                              <span className="font-mono text-[15px] font-semibold tabular-nums tracking-[0.12em] text-[#121A16]">
                                <span className="sr-only">PIN </span>
                                {one.pin}
                              </span>
                              <span className={cn(NOTE, "col-span-2")}>{signInSentSentence(one)}</span>
                            </li>
                          ))}
                        </ul>
                        <p className={cn(NOTE, "mt-3")}>
                          These PINs are shown this once. Write one down if the message may not reach them. You can send a
                          new one any time under Commissions.
                        </p>
                      </>
                    ) : null}
                    {notSent.length > 0 ? (
                      <p className={cn("text-[15px] leading-relaxed text-[#8F3F2F]", sent.length > 0 && "mt-3")}>
                        {notSent.join(", ")} {notSent.length === 1 ? "is" : "are"} on the team, but the sign-in could not be
                        set up (the email may already be in use). Send it from Commissions after this.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {!alone ? (
                  <>
                    {team.length + newNames.length > 0 ? (
                      <ul className="mt-6 divide-y divide-[rgba(18,26,22,0.1)] border-y border-[rgba(18,26,22,0.1)]">
                        {team.map((person) => (
                          <li
                            key={person.staffProfileId}
                            className="py-3 text-[15px] font-medium text-[#121A16]"
                          >
                            {person.displayName}
                          </li>
                        ))}
                        {newNames.map((name) => (
                          <li key={name} className="flex items-center justify-between gap-3 py-2">
                            <span className="min-w-0 text-[15px] font-medium text-[#121A16]">
                              {name}
                              <span className={cn("block truncate font-normal", NOTE)}>
                                {logins[name]
                                  ? `We will send a sign-in to ${[logins[name]!.phone, logins[name]!.email].filter(Boolean).join(" and ")}`
                                  : "No sign-in for now"}
                              </span>
                            </span>
                            <button
                              type="button"
                              className={cn(QUIET_BUTTON, "shrink-0")}
                              aria-label={`Remove ${name}`}
                              onClick={() => setNewNames((prev) => prev.filter((n) => n !== name))}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-6 space-y-3">
                      <label className="block">
                        <span className={FIELD_LABEL}>{everyone.length > 0 ? "Next person's name" : "Their name"}</span>
                        <input
                          className={FIELD_CLASS}
                          value={nameInput}
                          maxLength={255}
                          placeholder="Brian"
                          onChange={(e) => {
                            setNameInput(e.target.value);
                            setError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addName();
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        aria-pressed={wantsSignIn}
                        className={choiceClass(wantsSignIn)}
                        onClick={() => {
                          setWantsSignIn((v) => !v);
                          setError(null);
                        }}
                      >
                        Let them sign in to see their earnings
                        {choiceTick(wantsSignIn)}
                      </button>
                      {wantsSignIn ? (
                        <div className="space-y-3 border-l-2 border-[#1D4B3B] pl-4">
                          <label className="block">
                            <span className={FIELD_LABEL}>Their email</span>
                            <input
                              className={FIELD_CLASS}
                              type="email"
                              inputMode="email"
                              autoComplete="off"
                              value={emailInput}
                              maxLength={191}
                              placeholder="brian@example.com"
                              onChange={(e) => {
                                setEmailInput(e.target.value);
                                setError(null);
                              }}
                            />
                          </label>
                          <label className="block">
                            <span className={FIELD_LABEL}>Their mobile number (optional)</span>
                            <input
                              className={cn(FIELD_CLASS, "font-mono")}
                              type="tel"
                              inputMode="tel"
                              autoComplete="off"
                              value={phoneInput}
                              maxLength={20}
                              placeholder="0712 345 678"
                              onChange={(e) => {
                                setPhoneInput(e.target.value.replace(/[^0-9+ -]/g, ""));
                                setError(null);
                              }}
                            />
                          </label>
                          <p className={NOTE}>
                            You do not need to think up a PIN. We make one and send it to their email, and by text if you
                            give a number. They see only their own earnings, never anyone else&apos;s.
                          </p>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        className={cn(KEY_BASE, KEY_OFF, "flex h-12 items-center gap-2 px-5 text-sm font-semibold")}
                        onClick={addName}
                      >
                        <Plus className="size-4" aria-hidden />
                        Add {nameInput.trim() || "this person"}
                      </button>
                    </div>
                  </>
                ) : null}
                {team.length === 0 ? (
                  <button
                    type="button"
                    aria-pressed={alone}
                    className={cn(choiceClass(alone), "mt-4")}
                    onClick={() => {
                      setAlone((v) => !v);
                      setError(null);
                    }}
                  >
                    I work alone
                    {choiceTick(alone)}
                  </button>
                ) : null}
                {alone ? <p className={cn(NOTE, "mt-3")}>Services will be rung against you.</p> : null}
              </>
            ) : null}

            {step.id === "services" ? (
              <>
                <h1 className={headingClass}>What do you offer?</h1>
                <p className={leadClass}>Tick a service and type your price.</p>
                {drafts.length === 0 ? (
                  <p className={cn(NOTE, "mt-6 border-y border-[rgba(18,26,22,0.1)] py-4")}>
                    Add your services on the Services page after this.
                  </p>
                ) : (
                  <ul className="mt-4">
                    {drafts.map((draft, i) => {
                      const startsGroup =
                        i === 0 ||
                        drafts[i - 1]!.storeType !== draft.storeType ||
                        drafts[i - 1]!.exists !== draft.exists;
                      return (
                        <li key={draft.name}>
                          {startsGroup ? (
                            <p className="border-b border-[rgba(18,26,22,0.18)] pb-2 pt-5 text-[13px] font-semibold text-[#121A16]">
                              {draft.exists
                                ? "Already on your list"
                                : (KIT_TITLES[draft.storeType ?? "other"] ?? "Suggestions")}
                            </p>
                          ) : null}
                          <div className="flex min-h-14 items-center gap-3 border-b border-[rgba(18,26,22,0.1)] py-2">
                            <input
                              type="checkbox"
                              className="size-[1.125rem] shrink-0 accent-[#1D4B3B]"
                              checked={draft.ticked}
                              disabled={draft.exists}
                              aria-label={draft.name}
                              onChange={(e) => {
                                setDrafts((prev) =>
                                  prev.map((d, j) => (j === i ? { ...d, ticked: e.target.checked } : d)),
                                );
                                setError(null);
                              }}
                            />
                            <span
                              className={cn(
                                "min-w-0 flex-1 text-[15px] font-medium",
                                draft.ticked ? "text-[#121A16]" : "text-[#2A332E]",
                              )}
                            >
                              {draft.name}
                              <span className="ml-2 font-mono text-[12px] font-normal tabular-nums text-[#556159]">
                                {draft.durationMinutes} min
                              </span>
                            </span>
                            {draft.ticked ? (
                              <label
                                className={cn(
                                  FIELD_SHELL,
                                  "flex h-11 w-36 shrink-0 items-center overflow-hidden focus-within:border-[#1D4B3B] focus-within:ring-2 focus-within:ring-[#1D4B3B]/15",
                                  draft.exists && "opacity-60",
                                )}
                              >
                                <span className="flex h-full items-center border-r border-[rgba(18,26,22,0.12)] bg-[#EFEBE2] px-2.5 font-mono text-[12px] text-[#2A332E]">
                                  KSh
                                </span>
                                <input
                                  className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-right font-mono text-[15px] tabular-nums text-[#121A16] outline-none"
                                  inputMode="decimal"
                                  disabled={draft.exists}
                                  value={draft.price}
                                  aria-label={`Price for ${draft.name}`}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, "");
                                    setDrafts((prev) =>
                                      prev.map((d, j) => (j === i ? { ...d, price: value } : d)),
                                    );
                                    setError(null);
                                  }}
                                />
                              </label>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            ) : null}

            {step.id === "pay" ? (
              <>
                <h1 className={headingClass}>How do you pay your team?</h1>
                <p className={leadClass}>
                  Three short questions. Everyone starts on the same terms; you can change one person later under
                  Commissions.
                </p>

                <h2 className={stepQuestion}>1. What do they earn?</h2>
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    aria-pressed={payMode === "percent"}
                    className={choiceClass(payMode === "percent")}
                    onClick={() => setPayMode("percent")}
                  >
                    <span>
                      A share of each service they do
                      <span className={choiceHint(payMode === "percent")}>The usual way in a kinyozi or salon</span>
                    </span>
                    {choiceTick(payMode === "percent")}
                  </button>
                  <button
                    type="button"
                    aria-pressed={payMode === "salary"}
                    className={choiceClass(payMode === "salary")}
                    onClick={() => setPayMode("salary")}
                  >
                    <span>
                      A salary
                      <span className={choiceHint(payMode === "salary")}>The same pay whatever they do; nothing to set here</span>
                    </span>
                    {choiceTick(payMode === "salary")}
                  </button>
                </div>

                {payMode === "percent" ? (
                  <>
                    <h2 className={stepQuestion}>2. How big is their share?</h2>
                    <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Their share, in percent">
                      {[30, 40, 50, 60].map((quick) => (
                        <button
                          key={quick}
                          type="button"
                          aria-pressed={percentNumber === quick}
                          className={cn(
                            KEY_BASE,
                            "h-12 min-w-[4.25rem] px-4 text-center font-mono text-[15px] font-semibold tabular-nums",
                            percentNumber === quick ? KEY_ON : KEY_OFF,
                          )}
                          onClick={() => {
                            setPercent(String(quick));
                            setError(null);
                          }}
                        >
                          {quick}%
                        </button>
                      ))}
                      <label className="flex items-center gap-2 text-[14px] text-[#556159]">
                        or
                        <span
                          className={cn(
                            FIELD_SHELL,
                            "flex h-12 w-24 shrink-0 items-center overflow-hidden focus-within:border-[#1D4B3B] focus-within:ring-2 focus-within:ring-[#1D4B3B]/15",
                          )}
                        >
                          <input
                            className="h-full min-w-0 flex-1 bg-transparent px-3 text-right font-mono text-lg tabular-nums text-[#121A16] outline-none"
                            inputMode="decimal"
                            value={percent}
                            aria-label="Another percent"
                            onChange={(e) => {
                              setPercent(e.target.value.replace(/[^0-9.]/g, ""));
                              setError(null);
                            }}
                          />
                          <span className="flex h-full items-center border-l border-[rgba(18,26,22,0.12)] bg-[#EFEBE2] px-2.5 font-mono text-sm text-[#2A332E]">
                            %
                          </span>
                        </span>
                      </label>
                    </div>

                    <h2 className={stepQuestion}>3. Their share of what?</h2>
                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        aria-pressed={payModel === "GROSS"}
                        className={choiceClass(payModel === "GROSS")}
                        onClick={() => setPayModelChoice("GROSS")}
                      >
                        <span>
                          Of everything the customer pays
                          <span className={choiceHint(payModel === "GROSS")}>
                            The shop buys gel, dye and the rest out of its own part
                          </span>
                        </span>
                        {choiceTick(payModel === "GROSS")}
                      </button>
                      <button
                        type="button"
                        aria-pressed={payModel === "NET_OF_PRODUCT"}
                        className={choiceClass(payModel === "NET_OF_PRODUCT")}
                        onClick={() => setPayModelChoice("NET_OF_PRODUCT")}
                      >
                        <span>
                          Of what is left after the product used
                          <span className={choiceHint(payModel === "NET_OF_PRODUCT")}>
                            The cost of the gel or dye comes off first and stays with the shop
                          </span>
                        </span>
                        {choiceTick(payModel === "NET_OF_PRODUCT")}
                      </button>
                    </div>

                    {payModel === "NET_OF_PRODUCT" && catalog.length > 0 ? (
                      <div className="mt-5">
                        <p className="text-[13px] font-semibold text-[#121A16]">What does the product for each one cost you?</p>
                        <p className={cn(NOTE, "mt-0.5")}>Leave it empty where no shop product is used, like a plain haircut.</p>
                        <ul className="mt-2 border-t border-[rgba(18,26,22,0.1)]">
                          {catalog.map((service) => (
                            <li key={service.id} className="flex min-h-14 items-center gap-3 border-b border-[rgba(18,26,22,0.1)] py-2">
                              <span className="min-w-0 flex-1 text-[15px] font-medium text-[#121A16]">
                                {service.name}
                                <span className="ml-2 font-mono text-[12px] font-normal tabular-nums text-[#556159]">
                                  {formatMoney(service.price, "KES").replace(/\.00$/, "")}
                                </span>
                              </span>
                              <label
                                className={cn(
                                  FIELD_SHELL,
                                  "flex h-11 w-32 shrink-0 items-center overflow-hidden focus-within:border-[#1D4B3B] focus-within:ring-2 focus-within:ring-[#1D4B3B]/15",
                                )}
                              >
                                <span className="flex h-full items-center border-r border-[rgba(18,26,22,0.12)] bg-[#EFEBE2] px-2.5 font-mono text-[12px] text-[#2A332E]">
                                  KSh
                                </span>
                                <input
                                  className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-right font-mono text-[15px] tabular-nums text-[#121A16] outline-none"
                                  inputMode="numeric"
                                  placeholder="0"
                                  value={productCosts[service.id] ?? ""}
                                  aria-label={`Product cost for ${service.name}`}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, "");
                                    setProductCosts((prev) => ({ ...prev, [service.id]: value }));
                                    setError(null);
                                  }}
                                />
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {payModel === "NET_OF_PRODUCT" && catalog.length === 0 ? (
                      <p className={cn(NOTE, "mt-4")}>
                        Once you have services, type each one&apos;s product cost where you edit the service.
                      </p>
                    ) : null}

                    {example != null ? (
                      <dl className="mt-6 border-y border-[rgba(18,26,22,0.18)] py-3 font-mono text-[13px] tabular-nums text-[#2A332E]" aria-live="polite">
                        <div className="flex justify-between gap-4 font-sans text-[13px] text-[#556159]">
                          <dt>For example, {exampleName}</dt>
                          <dd className="font-mono">{formatMoney(examplePrice, "KES").replace(/\.00$/, "")}</dd>
                        </div>
                        {exampleCost > 0 ? (
                          <div className="mt-1.5 flex justify-between gap-4">
                            <dt className="font-sans">Product, kept by the shop{typedCost > 0 ? "" : " (say)"}</dt>
                            <dd>{formatMoney(exampleCost, "KES").replace(/\.00$/, "")}</dd>
                          </div>
                        ) : null}
                        <div className="mt-1.5 flex justify-between gap-4">
                          <dt className="font-sans">
                            The person who did it, {percentNumber}%{exampleCost > 0 ? ` of ${formatMoney(examplePrice - exampleCost, "KES").replace(/\.00$/, "")}` : ""}
                          </dt>
                          <dd className="font-semibold text-[#121A16]">{formatMoney(example, "KES").replace(/\.00$/, "")}</dd>
                        </div>
                        <div className="mt-1.5 flex justify-between gap-4 border-t border-dashed border-[rgba(18,26,22,0.25)] pt-1.5">
                          <dt className="font-sans font-semibold text-[#121A16]">The shop keeps</dt>
                          <dd className="font-semibold text-[#1D4B3B]">{formatMoney(examplePrice - example, "KES").replace(/\.00$/, "")}</dd>
                        </div>
                      </dl>
                    ) : null}
                    {team.length === 0 ? (
                      <p className={cn(NOTE, "mt-4")}>
                        No one is on the team yet, so the share is not saved for anyone. Set it under Commissions once
                        you have added them.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className={cn(NOTE, "mt-5")}>
                    Nothing more to set. Services are still recorded against whoever did them, so you can see who is
                    busiest.
                  </p>
                )}
              </>
            ) : null}

            {step.id === "products" ? (
              <>
                <h1 className={headingClass}>Do you also sell products?</h1>
                <p className={leadClass}>Hair oil, combs, aftershave and the like.</p>
                <div className="mt-6 space-y-2">
                  <button
                    type="button"
                    aria-pressed={sellsProducts === true}
                    className={choiceClass(sellsProducts === true)}
                    onClick={() => {
                      setSellsProducts(true);
                      setError(null);
                    }}
                  >
                    Yes, add my products next
                    {choiceTick(sellsProducts === true)}
                  </button>
                  <button
                    type="button"
                    aria-pressed={sellsProducts === false}
                    className={choiceClass(sellsProducts === false)}
                    onClick={() => {
                      setSellsProducts(false);
                      setError(null);
                    }}
                  >
                    No, services only
                    {choiceTick(sellsProducts === false)}
                  </button>
                </div>
              </>
            ) : null}
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-5 flex items-start gap-2.5 border-y border-[#A55237]/35 py-3 text-[15px] leading-relaxed text-[#8F3F2F]"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-2 border-t border-[rgba(18,26,22,0.1)] pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="order-2 sm:order-1">
              {index > 0 ? (
                <button
                  type="button"
                  className={QUIET_BUTTON}
                  disabled={saving}
                  onClick={() => {
                    setError(null);
                    setIndex((i) => i - 1);
                  }}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Back
                </button>
              ) : null}
            </div>
            <div className="order-1 flex flex-col gap-2 sm:order-2 sm:flex-row-reverse sm:items-center sm:gap-5">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveAndContinue()}
                className={cn(
                  "group flex h-12 w-full items-center justify-center gap-2 rounded-[2px] bg-[#1D4B3B] px-6 text-[15px] font-semibold tracking-[-0.01em] text-[#F4F1EA] touch-manipulation sm:w-auto sm:min-w-[13.5rem]",
                  "transition-[background-color,transform] duration-200 hover:bg-[#163B2E] motion-safe:active:scale-[0.985] disabled:pointer-events-none disabled:opacity-70",
                  EASE,
                  FOCUS_RING,
                )}
              >
                {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {saving ? "Saving…" : step.id === "products" ? "Finish" : "Continue"}
                {saving ? null : (
                  <ArrowRight
                    className="size-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5"
                    aria-hidden
                  />
                )}
              </button>
              {step.id !== "products" ? (
                <button
                  type="button"
                  className={cn(QUIET_BUTTON, "justify-center")}
                  disabled={saving}
                  onClick={next}
                >
                  Skip
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <SetupSlip
          shopName={
            business?.branding?.displayName?.trim() || business?.name?.trim() || "Your shop"
          }
          meta={slipMeta}
          lines={slipLines}
        />
      </div>
    </div>
  );
}
