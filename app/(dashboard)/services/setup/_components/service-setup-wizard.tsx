"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DashboardLoading,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { ApiRequestError } from "@/lib/api";
import { getBusinessStoreTypes, serviceStationLabel } from "@/lib/business-store-type";
import { APP_ROUTES } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import {
  createService,
  createStaffWithoutLogin,
  fetchServicePerformers,
  fetchServices,
  fetchStationCount,
  markSelfAsServingCustomers,
  previewCommission,
  setCommissionPlan,
  setStationCount,
  type ServicePerformerRecord,
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

type ServiceDraft = { name: string; durationMinutes: number; ticked: boolean; price: string; exists: boolean };

const CHOICE =
  "flex w-full items-center justify-between rounded-[2px] border px-3 py-3 text-left text-sm font-medium " +
  "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)] bg-[var(--op-surface,#FCFAF5)] " +
  "hover:border-[var(--pos-primary,#1D4B3B)] focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-[var(--pos-primary,#1D4B3B)]";
const CHOICE_ON =
  "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)]";

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
  const [nameInput, setNameInput] = useState("");
  const [alone, setAlone] = useState(false);
  const [drafts, setDrafts] = useState<ServiceDraft[]>([]);
  const [payMode, setPayMode] = useState<"percent" | "salary">("percent");
  const [percent, setPercent] = useState("");
  const [sellsProducts, setSellsProducts] = useState<boolean | null>(null);

  const step = STEPS[index]!;

  // Start from what already exists so the flow can be re-entered safely.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [count, people, existing] = await Promise.all([
          branchId ? fetchStationCount(branchId).catch(() => 0) : Promise.resolve(0),
          fetchServicePerformers().catch(() => [] as ServicePerformerRecord[]),
          fetchServices().catch(() => []),
        ]);
        if (cancelled) return;
        if (count > 0) setChairs(count);
        setTeam(people);
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
    setError(null);
    setNewNames((prev) => [...prev, name]);
    setNameInput("");
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
        for (const name of newNames) {
          try {
            await createStaffWithoutLogin({ displayName: name, bookable: true });
          } catch (err) {
            // Already there from an earlier try: that is what we wanted.
            if (!isConflict(err)) throw err;
          }
          added.push(name);
        }
        if (added.length > 0) {
          setTeam(await fetchServicePerformers());
          setNewNames([]);
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
      } else if (step.id === "pay") {
        if (payMode === "percent") {
          if (percentNumber == null || !(percentNumber > 0) || percentNumber > 100) {
            setError("Enter a percent between 1 and 100");
            return;
          }
          for (const person of team) {
            await setCommissionPlan(person.staffProfileId, {
              type: "PERCENT",
              rate: percentNumber,
              productRate: null,
            });
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

  const example =
    payMode === "percent" && percentNumber != null && percentNumber > 0 && percentNumber <= 100
      ? previewCommission(300, "PERCENT", percentNumber)
      : null;

  return (
    <div className={DASHBOARD_MAX}>
      <div className={cn(DASHBOARD_SECTION_SURFACE, "mx-auto mt-2 w-full max-w-lg")}>
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span>
            Step {index + 1} of {STEPS.length}
          </span>
          <span className={dashboardHintClass()}>{step.label}</span>
        </div>
        <div
          className="mt-1.5 flex gap-1"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={index + 1}
          aria-label="Set-up progress"
        >
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                "h-1 flex-1 rounded-full",
                i <= index
                  ? "bg-[var(--pos-primary,#1D4B3B)]"
                  : "bg-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]",
              )}
            />
          ))}
        </div>

        <div className="mt-4 min-h-[16rem]">
          {step.id === "chairs" ? (
            <>
              <h1 className="text-lg font-semibold">How many {stationWord}s do you have?</h1>
              <p className={dashboardHintClass()}>One {stationWord} seats one customer at a time.</p>
              <div className="mt-5 flex items-center justify-center gap-5">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Fewer ${stationWord}s`}
                  disabled={chairs <= 1}
                  onClick={() => setChairs((c) => Math.max(1, c - 1))}
                >
                  −
                </Button>
                <span className="min-w-[3rem] text-center font-mono text-4xl font-semibold tabular-nums">
                  {chairs}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`More ${stationWord}s`}
                  disabled={chairs >= 50}
                  onClick={() => setChairs((c) => Math.min(50, c + 1))}
                >
                  +
                </Button>
              </div>
              <p className={cn("mt-4 text-center", dashboardHintClass())}>You can change this later.</p>
            </>
          ) : null}

          {step.id === "team" ? (
            <>
              <h1 className="text-lg font-semibold">Who works here?</h1>
              <p className={dashboardHintClass()}>Names only. They do not need an email or a password.</p>
              {!alone ? (
                <>
                  <ul className="mt-3 divide-y">
                    {team.map((person) => (
                      <li key={person.staffProfileId} className="py-2 text-sm">
                        {person.displayName}
                      </li>
                    ))}
                    {newNames.map((name) => (
                      <li key={name} className="flex items-center justify-between py-2 text-sm">
                        {name}
                        <button
                          type="button"
                          className="underline"
                          aria-label={`Remove ${name}`}
                          onClick={() => setNewNames((prev) => prev.filter((n) => n !== name))}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-2">
                    <input
                      className={dashboardInputClass()}
                      value={nameInput}
                      maxLength={255}
                      placeholder="Brian"
                      aria-label="Name"
                      onChange={(e) => {
                        setNameInput(e.target.value);
                        setError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addName();
                      }}
                    />
                    <Button variant="outline" onClick={addName}>
                      Add
                    </Button>
                  </div>
                </>
              ) : null}
              {team.length === 0 ? (
                <button
                  type="button"
                  aria-pressed={alone}
                  className={cn(CHOICE, "mt-3", alone && CHOICE_ON)}
                  onClick={() => {
                    setAlone((v) => !v);
                    setError(null);
                  }}
                >
                  I work alone
                </button>
              ) : null}
              {alone ? (
                <p className={cn("mt-2", dashboardHintClass())}>
                  Services will be rung against you.
                </p>
              ) : null}
            </>
          ) : null}

          {step.id === "services" ? (
            <>
              <h1 className="text-lg font-semibold">What do you offer?</h1>
              <p className={dashboardHintClass()}>Tick a service and type your price.</p>
              {drafts.length === 0 ? (
                <p className={cn("mt-3", dashboardHintClass())}>
                  Add your services on the Services page after this.
                </p>
              ) : (
                <ul className="mt-2 divide-y">
                  {drafts.map((draft, i) => (
                    <li key={draft.name} className="flex items-center gap-2 py-2">
                      <input
                        type="checkbox"
                        checked={draft.ticked}
                        disabled={draft.exists}
                        aria-label={draft.name}
                        onChange={(e) => {
                          setDrafts((prev) => prev.map((d, j) => (j === i ? { ...d, ticked: e.target.checked } : d)));
                          setError(null);
                        }}
                      />
                      <span className="min-w-0 flex-1 text-sm">
                        {draft.name}
                        <span className={cn("block", dashboardHintClass())}>{draft.durationMinutes} min</span>
                      </span>
                      {draft.ticked ? (
                        <label className="flex items-center gap-1 text-sm">
                          <span className={dashboardHintClass()}>KSh</span>
                          <input
                            className={dashboardInputClass(draft.exists, "w-24 text-right font-mono")}
                            inputMode="decimal"
                            disabled={draft.exists}
                            value={draft.price}
                            aria-label={`Price for ${draft.name}`}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, "");
                              setDrafts((prev) => prev.map((d, j) => (j === i ? { ...d, price: value } : d)));
                              setError(null);
                            }}
                          />
                        </label>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}

          {step.id === "pay" ? (
            <>
              <h1 className="text-lg font-semibold">How do you pay your team?</h1>
              <p className={dashboardHintClass()}>You can set a different rate for each person later.</p>
              <button
                type="button"
                aria-pressed={payMode === "percent"}
                className={cn(CHOICE, "mt-3", payMode === "percent" && CHOICE_ON)}
                onClick={() => setPayMode("percent")}
              >
                A share of each service
              </button>
              {payMode === "percent" ? (
                <label className="my-2 ml-3 flex items-center gap-2 text-sm">
                  <input
                    className={dashboardInputClass(false, "w-20 text-right font-mono")}
                    inputMode="decimal"
                    value={percent}
                    aria-label="Percent"
                    onChange={(e) => {
                      setPercent(e.target.value.replace(/[^0-9.]/g, ""));
                      setError(null);
                    }}
                  />
                  % to the person who did it
                </label>
              ) : null}
              <button
                type="button"
                aria-pressed={payMode === "salary"}
                className={cn(CHOICE, "mt-2", payMode === "salary" && CHOICE_ON)}
                onClick={() => setPayMode("salary")}
              >
                A salary
              </button>
              {example != null ? (
                <p className={cn("mt-2", dashboardHintClass())}>
                  On a {formatMoney(300, "KES")} service they earn {formatMoney(example, "KES")} and the shop
                  keeps {formatMoney(300 - example, "KES")}.
                </p>
              ) : null}
              {payMode === "percent" && team.length === 0 ? (
                <p className={cn("mt-2", dashboardHintClass())}>
                  No one is on the team yet, so there is no one to set this for. Set it on the commissions
                  page once you have added them.
                </p>
              ) : null}
            </>
          ) : null}

          {step.id === "products" ? (
            <>
              <h1 className="text-lg font-semibold">Do you also sell products?</h1>
              <p className={dashboardHintClass()}>Hair oil, combs, aftershave and the like.</p>
              <button
                type="button"
                aria-pressed={sellsProducts === true}
                className={cn(CHOICE, "mt-3", sellsProducts === true && CHOICE_ON)}
                onClick={() => {
                  setSellsProducts(true);
                  setError(null);
                }}
              >
                Yes, add my products next
              </button>
              <button
                type="button"
                aria-pressed={sellsProducts === false}
                className={cn(CHOICE, "mt-2", sellsProducts === false && CHOICE_ON)}
                onClick={() => {
                  setSellsProducts(false);
                  setError(null);
                }}
              >
                No, services only
              </button>
            </>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          {index > 0 ? (
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => {
                setError(null);
                setIndex((i) => i - 1);
              }}
            >
              Back
            </Button>
          ) : null}
          {step.id !== "products" ? (
            <Button variant="ghost" disabled={saving} onClick={next}>
              Skip
            </Button>
          ) : null}
          <Button className="flex-1" disabled={saving} onClick={() => void saveAndContinue()}>
            {saving ? "Saving…" : step.id === "products" ? "Finish" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
