"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import type { DomainRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { DomainChip, statusMeta } from "./domain-helpers";

export type ConnectOwnedResult =
  | { ok: true; row: DomainRecord }
  | { ok: false; message: string };

type DnsRow = {
  type: string;
  host: string;
  value: string;
  hint: string;
};

function normalizeOwnedDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#:]/)[0]
    .replace(/\.$/, "");
}

function ownedDomainError(host: string): string | null {
  if (!host) return "Enter the domain you already bought.";
  if (
    !host.includes(".") ||
    host.includes(" ") ||
    host.includes("..") ||
    host.startsWith(".") ||
    host.endsWith(".")
  ) {
    return "Enter the full address, like shop.co.ke.";
  }
  if (host === "kiosk.ke" || host.endsWith(".kiosk.ke")) {
    return "That free kiosk.ke address is already yours. Enter a domain you bought somewhere else.";
  }
  return null;
}

function friendlyConnectError(message: string): string {
  if (/already in use/i.test(message)) {
    return "That domain is already connected to a shop.";
  }
  if (/reserved|platform subdomain/i.test(message)) {
    return "That address belongs to Kiosk. Enter a domain you bought somewhere else.";
  }
  if (/invalid domain/i.test(message)) {
    return "Enter the full address, like shop.co.ke, without https://.";
  }
  return message;
}

function asObjects(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (row): row is Record<string, unknown> => !!row && typeof row === "object",
  );
}

function text(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value.trim() : "";
}

function recordHint(type: string, host: string, hostname: string): string {
  const kind = type.toUpperCase();
  if (kind === "A" && (host === "@" || host === hostname)) {
    return `Points ${hostname} itself at your shop. If an A record for @ already exists, replace it.`;
  }
  if (kind === "CNAME" && (host === "www" || host === `www.${hostname}`)) {
    return `Points www.${hostname} at your shop.`;
  }
  if (kind === "TXT") return "Proves you own this domain. Add it exactly, then check the connection.";
  if (kind === "CNAME" && host && !host.includes(".")) {
    return `Points ${host}.${hostname} at your shop. In the host field, type ${host}.`;
  }
  if (kind === "CNAME") return `Points ${host} at your shop.`;
  return "Add this exactly in the DNS section. Leave mail records alone.";
}

function dnsRows(row: DomainRecord): DnsRow[] {
  const hostname = row.domain;
  const recommended = asObjects(row.dnsInstructions?.recommendedRecords).map(
    (record) => {
      const type = text(record, "type") || "DNS";
      const host = text(record, "name") || "@";
      const value = text(record, "value");
      return {
        type,
        host,
        value,
        hint: recordHint(type, host, hostname),
      };
    },
  );
  const seen = new Set(
    recommended.map((record) => `${record.type}|${record.host}|${record.value}`),
  );
  const challenges = asObjects(row.dnsInstructions?.challenges).flatMap(
    (record) => {
      const type = text(record, "type") || "TXT";
      const host = text(record, "domain") || text(record, "name") || "@";
      const value = text(record, "value");
      const key = `${type}|${host}|${value}`;
      if (!value || seen.has(key)) return [];
      seen.add(key);
      return [
        {
          type,
          host,
          value,
          hint: recordHint(type, host, hostname),
        },
      ];
    },
  );
  const order = ["A", "ALIAS", "AAAA", "CNAME", "TXT"];
  return [...recommended, ...challenges]
    .filter((record) => record.value)
    .sort((a, b) => {
      const ai = order.indexOf(a.type.toUpperCase());
      const bi = order.indexOf(b.type.toUpperCase());
      return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
    });
}

function humanLastError(error: string | null | undefined): string | null {
  const text = error?.trim();
  if (!text) return null;
  if (/^[\w.:-]{1,80}$/.test(text) || text.startsWith("http_")) {
    return "We couldn't confirm the connection yet. Check the records, then try again.";
  }
  return text;
}

function CopyValue({ value }: { value: string }) {
  return (
    <button
      type="button"
      className="inline-flex shrink-0 items-center gap-1 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] px-2 py-1 text-[12px] font-semibold text-muted-foreground hover:text-foreground focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:outline-none"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(
          () => toast.success("Copied"),
          () => toast.error("Could not copy"),
        );
      }}
    >
      <Copy className="size-3" aria-hidden />
      Copy
    </button>
  );
}

function SetupGuide({
  row,
  checking,
  checked,
  onVerify,
  onAnother,
}: {
  row: DomainRecord;
  checking: boolean;
  checked: boolean;
  onVerify: () => void;
  onAnother: () => void;
}) {
  const records = dnsRows(row);
  const rawNote =
    typeof row.dnsInstructions?.note === "string" ? row.dnsInstructions.note.trim() : "";
  const note =
    rawNote && !/vercel|click verify/i.test(rawNote) ? rawNote : null;
  const problem = humanLastError(row.lastError);
  const badge = statusMeta(row);

  if (row.active) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {row.domain} is connected
          </h2>
          <p className={cn(dashboardHintClass(), "mt-1.5")}>
            Customers can open your shop at this address.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="gap-1.5">
            <a href={`https://${row.domain}`} target="_blank" rel="noreferrer">
              Visit site
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </Button>
          <Button type="button" variant="outline" onClick={onAnother}>
            Connect another domain
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Point {row.domain} at your shop
          </h2>
          <DomainChip className={badge.className}>{badge.text}</DomainChip>
        </div>
        <p className={cn(dashboardHintClass(), "mt-1.5 max-w-xl")}>
          You already paid for this name. Add the records below where you bought
          it. Leave the nameservers as they are, and leave mail records alone.
        </p>
      </div>

      <ol className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="flex gap-2">
          <span className="font-semibold text-foreground">1.</span>
          Sign in at the company you bought {row.domain} from and open DNS for
          this domain.
        </li>
        <li className="flex gap-2">
          <span className="font-semibold text-foreground">2.</span>
          Add each row. Match Type, Host, and Points to, then save.
        </li>
        <li className="flex gap-2">
          <span className="font-semibold text-foreground">3.</span>
          Come back here and choose Check connection. It can take a few minutes
          before it says live.
        </li>
      </ol>

      <div>
        <p className="text-sm font-semibold">Records to add</p>
        {note ? <p className={cn(dashboardHintClass(), "mt-1")}>{note}</p> : null}
        {records.length > 0 ? (
          <ul className="mt-3 divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
            {records.map((record) => (
              <li
                key={`${record.type}-${record.host}-${record.value}`}
                className="flex items-start justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0">
                  <DomainChip className="border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground">
                    {record.type}
                  </DomainChip>
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">Host </span>
                    <span className="font-mono font-semibold">{record.host}</span>
                  </p>
                  <p className="mt-0.5 break-all text-sm">
                    <span className="text-muted-foreground">Points to </span>
                    <span className="font-mono font-semibold">{record.value}</span>
                  </p>
                  <p className={cn(dashboardHintClass(), "mt-1.5")}>{record.hint}</p>
                </div>
                <CopyValue value={record.value} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={cn(dashboardHintClass(), "mt-2")}>
            Records aren&apos;t ready yet. Choose Check connection and we&apos;ll
            ask again.
          </p>
        )}
        <p className={cn(dashboardHintClass(), "mt-2")}>
          If the form asks for a host, use @ for the domain itself. If it asks
          how long to cache the record, the default is fine.
        </p>
      </div>

      {problem ? (
        <p className="border border-[#9a2e16]/35 bg-[color-mix(in_srgb,#9a2e16_5%,white)] px-3 py-2.5 text-sm text-[#9a2e16]">
          {problem}
        </p>
      ) : null}

      {checked && !problem ? (
        <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
          <CheckCircle2
            className="mt-0.5 size-4 shrink-0 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          Not live yet. DNS can take a few minutes. Leave the records in place,
          then check again.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={checking}
          className="gap-1.5"
          onClick={onVerify}
        >
          {checking ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <CheckCircle2 className="size-3.5" aria-hidden />
          )}
          Check connection
        </Button>
        <Button type="button" variant="outline" onClick={onAnother}>
          Use a different domain
        </Button>
      </div>
    </div>
  );
}

export function ConnectOwnedPanel({
  rows,
  saving,
  verifyingId,
  setupId,
  checked,
  onSetupId,
  onChecked,
  onConnect,
  onVerify,
  onBuyInstead,
  className,
}: {
  rows: DomainRecord[];
  saving: boolean;
  verifyingId: string | null;
  setupId: string | null;
  checked: boolean;
  onSetupId: (id: string | null) => void;
  onChecked: (checked: boolean) => void;
  onConnect: (domain: string) => Promise<ConnectOwnedResult>;
  onVerify: (row: DomainRecord) => Promise<void>;
  onBuyInstead: () => void;
  className?: string;
}) {
  const fieldId = useId();
  const focusedOnce = useRef(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const setup = rows.find((row) => row.id === setupId) ?? null;
  const waiting = rows.filter(
    (row) =>
      (row.source || "").toLowerCase() === "manual_connect" &&
      !row.active &&
      row.id !== setupId,
  );

  useEffect(() => {
    if (setupId && !rows.some((row) => row.id === setupId)) {
      onSetupId(null);
      onChecked(false);
    }
  }, [rows, setupId, onSetupId, onChecked]);

  const openSetup = (id: string) => {
    onSetupId(id);
    onChecked(false);
    setError(null);
    setDraft("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const host = normalizeOwnedDomain(draft);
    const invalid = ownedDomainError(host);
    if (invalid) {
      setError(invalid);
      return;
    }
    const existing = rows.find((row) => row.domain.toLowerCase() === host);
    if (existing) {
      if ((existing.source || "").toLowerCase() === "platform_subdomain") {
        setError(
          "That free address is already on this shop. Enter a domain you bought somewhere else.",
        );
        return;
      }
      openSetup(existing.id);
      return;
    }
    setError(null);
    const result = await onConnect(host);
    if (!result.ok) {
      setError(friendlyConnectError(result.message));
      return;
    }
    openSetup(result.row.id);
  };

  return (
    <div
      className={cn(
        "h-full min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5",
        className,
      )}
    >
      <div className={cn(DASHBOARD_SECTION_SURFACE, "space-y-4")}>
        {setup ? (
          <SetupGuide
            row={setup}
            checking={verifyingId === setup.id}
            checked={checked}
            onVerify={() => {
              onChecked(false);
              void onVerify(setup).then(() => onChecked(true));
            }}
            onAnother={() => {
              onSetupId(null);
              onChecked(false);
            }}
          />
        ) : (
          <>
            <div className="min-w-0 max-w-xl">
              <h2 className="text-lg font-semibold tracking-tight">
                Connect a domain you already bought
              </h2>
              <p className={cn(dashboardHintClass(), "mt-1.5")}>
                Type the address. We&apos;ll show the DNS records to add at the
                company you bought it from. This step does not buy a name.
              </p>
            </div>

            {waiting.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Finish one you started</p>
                <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
                  {waiting.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--pos-primary,#0f766e)]"
                        onClick={() => openSetup(row.id)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-[13px] font-semibold">
                            {row.domain}
                          </span>
                          <span className={cn(dashboardHintClass(), "mt-0.5 block")}>
                            DNS records are waiting
                          </span>
                        </span>
                        <span className="shrink-0 text-[12px] font-semibold text-[var(--pos-primary,#0f766e)]">
                          Show steps
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <form className="space-y-2" onSubmit={(event) => void submit(event)}>
              <label htmlFor={fieldId} className="text-sm font-medium">
                {waiting.length > 0
                  ? "Or connect another domain"
                  : "Domain you already own"}
              </label>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
                <div className="relative min-w-0 flex-1">
                  <Link2
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    id={fieldId}
                    className={dashboardInputClass(
                      saving,
                      "h-12 pl-10 font-mono text-[15px]",
                    )}
                    placeholder="shop.co.ke"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={saving}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={
                      error ? `${fieldId}-error` : `${fieldId}-hint`
                    }
                    ref={(node) => {
                      if (!node || focusedOnce.current) return;
                      if (node.getClientRects().length === 0) return;
                      focusedOnce.current = true;
                      node.focus();
                    }}
                    value={draft}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      if (error) setError(null);
                    }}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={saving || !draft.trim()}
                  className="h-12 shrink-0 gap-2 px-6"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Link2 className="size-4" aria-hidden />
                  )}
                  {saving ? "Saving…" : "Connect this domain"}
                </Button>
              </div>
              {error ? (
                <p id={`${fieldId}-error`} className="text-sm text-[#9a2e16]" role="alert">
                  {error}
                </p>
              ) : (
                <p id={`${fieldId}-hint`} className={dashboardHintClass()}>
                  The address customers will type, without https://. Example:
                  shop.co.ke
                </p>
              )}
            </form>

            <button
              type="button"
              className="text-left text-[13px] font-semibold text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pos-primary,#0f766e)]"
              onClick={onBuyInstead}
            >
              I need to buy a .ke name
            </button>
          </>
        )}
      </div>
    </div>
  );
}
