"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone, Wrench } from "lucide-react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { requestDomainHelp, type DomainHelpKind } from "@/lib/api";
import { cn } from "@/lib/utils";

const JOBS: {
  id: DomainHelpKind;
  title: string;
  detail: string;
  fee?: string;
  group: string;
}[] = [
  {
    id: "setup_domain",
    group: "Domain",
    title: "Buy and connect a .ke name",
    detail: "We pick a name with you, take KES 2,000 on M-Pesa, and connect the shop.",
  },
  {
    id: "connect_owned",
    group: "Domain",
    title: "Connect a domain I already own",
    detail: "You already paid someone else for the name. We point it at your shop.",
  },
  {
    id: "shop_online",
    group: "Domain",
    title: "Help me get the shop online",
    detail: "A developer walks through the domain, the shop address, and what customers see.",
  },
  {
    id: "theme",
    group: "Shop changes",
    title: "Theme customization",
    fee: "KES 5,000",
    detail: "Colors, logo, and how the shop looks. We make the change.",
  },
  {
    id: "functionality",
    group: "Shop changes",
    title: "Functionality adjustment",
    fee: "KES 5,000",
    detail: "Change how a part of the shop works. Same flat fee.",
  },
  {
    id: "other_change",
    group: "Shop changes",
    title: "Another change to the shop",
    fee: "KES 5,000",
    detail: "Anything else on the shop. Describe it below. Same flat fee.",
  },
];

export function DomainHelpPanel({ className }: { className?: string }) {
  const { me } = useDashboard();
  const [kind, setKind] = useState<DomainHelpKind>("setup_domain");
  const [phone, setPhone] = useState("");
  useEffect(() => {
    if (me?.phone) {
      setPhone((current) => (current.trim() ? current : me.phone ?? ""));
    }
  }, [me?.phone]);
  const [domain, setDomain] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextPhone = phone.trim();
    if (!nextPhone) {
      toast.error("Enter the phone we should call.");
      return;
    }
    setSending(true);
    try {
      const result = await requestDomainHelp({
        kind,
        phoneNumber: nextPhone,
        domain: domain.trim() || undefined,
        note: note.trim() || undefined,
      });
      setDone(result.message || "Request received. We'll call you.");
      toast.success("Request sent. Keep your phone nearby.");
    } catch (error) {
      toast.error(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Could not send the request.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={cn(
        "h-auto min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 lg:h-full",
        className,
      )}
    >
      <div className={cn(DASHBOARD_SECTION_SURFACE, "mx-auto max-w-xl space-y-4")}>
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center border border-border/60 bg-muted/40 text-muted-foreground">
            <Wrench className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Hire a developer
            </h2>
            <p className={cn(dashboardHintClass(), "mt-1.5")}>
              Domain help is a call. Theme customization, functionality
              changes, and other shop work are a flat KES 5,000 each. We text
              that phone, and a developer calls to confirm the fee and start.
            </p>
          </div>
        </div>

        {done ? (
          <div className="border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-4 py-4">
            <p className="text-sm font-semibold">We have your request</p>
            <p className={cn(dashboardHintClass(), "mt-1.5")}>{done}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setDone(null)}
            >
              Send another request
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">What should we do?</legend>
              {["Domain", "Shop changes"].map((group) => (
                <div key={group} className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    {group}
                    {group === "Shop changes" ? " · KES 5,000 each" : ""}
                  </p>
                  {JOBS.filter((job) => job.group === group).map((job) => {
                    const selected = kind === job.id;
                    return (
                      <label
                        key={job.id}
                        className={cn(
                          "flex cursor-pointer gap-3 border px-3 py-3",
                          selected
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
                        )}
                      >
                        <input
                          type="radio"
                          name="domain-help-kind"
                          className="mt-1"
                          checked={selected}
                          onChange={() => setKind(job.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-semibold">{job.title}</span>
                            {job.fee ? (
                              <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
                                {job.fee}
                              </span>
                            ) : null}
                          </span>
                          <span className={cn(dashboardHintClass(), "mt-0.5 block")}>
                            {job.detail}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor="domain-help-phone" className="text-sm font-medium">
                Phone we should call
              </label>
              <div className="relative">
                <Phone
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  id="domain-help-phone"
                  className={dashboardInputClass(false, "h-11 pl-10")}
                  placeholder="07xx xxx xxx"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="domain-help-domain" className="text-sm font-medium">
                Domain, if you already have one
              </label>
              <input
                id="domain-help-domain"
                className={dashboardInputClass()}
                placeholder="shop.co.ke"
                autoComplete="off"
                spellCheck={false}
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="domain-help-note" className="text-sm font-medium">
                Anything else we should know
              </label>
              <textarea
                id="domain-help-note"
                className={cn(dashboardInputClass(), "min-h-20 py-2")}
                placeholder="Colors, a button, a report, or when to call."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <Button type="submit" disabled={sending || !phone.trim()} className="gap-1.5">
              {sending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Wrench className="size-3.5" aria-hidden />
              )}
              {JOBS.find((job) => job.id === kind)?.fee
                ? "Request this for KES 5,000"
                : "Request a call"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
