import type { ReactNode } from "react";

import { AlertTriangle, Check, HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/* ── Shared building blocks for the desktop long-form pages ──────────── */

export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 font-heading text-[1.7rem] leading-[1.15] tracking-[-0.02em] text-[var(--kiosk-text)] sm:text-[1.95rem]"
    >
      {children}
    </h2>
  );
}

export function H3({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3
      id={id}
      className="scroll-mt-24 pt-2 font-heading text-xl leading-snug tracking-[-0.015em] text-[var(--kiosk-text)]"
    >
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="text-[16px] leading-[1.75] text-[var(--kiosk-text-soft)]">
      {children}
    </p>
  );
}

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="text-[17px] leading-[1.7] text-[var(--kiosk-text-muted)]">
      {children}
    </p>
  );
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-medium text-[var(--kiosk-text)]">{children}</strong>;
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-[var(--kiosk-border-soft)] bg-[var(--kiosk-panel)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--kiosk-text)]">
      {children}
    </code>
  );
}

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-4 border-l-2 border-[var(--kiosk-gold-border)] pl-5">
      {items.map((item, i) => (
        <li key={i} className="relative text-[15px] leading-[1.7] text-[var(--kiosk-text-soft)]">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
            Step {String(i + 1).padStart(2, "0")}
          </span>
          {item}
        </li>
      ))}
    </ol>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-[1.7] text-[var(--kiosk-text-soft)]">
          <span className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--kiosk-gold)]" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

type CalloutTone = "tip" | "warning" | "note";

export function Callout({
  tone = "note",
  title,
  children,
}: {
  tone?: CalloutTone;
  title: string;
  children: ReactNode;
}) {
  return (
    <aside
      className={cn(
        "rounded-xl border px-4 py-3.5 text-[14.5px] leading-[1.7]",
        tone === "warning"
          ? "border-[var(--kiosk-danger)]/25 bg-[var(--kiosk-danger-bg)]"
          : tone === "tip"
            ? "border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)]"
            : "border-[var(--kiosk-border)] bg-[var(--kiosk-panel)]",
      )}
    >
      <p
        className={cn(
          "mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
          tone === "warning"
            ? "text-[var(--kiosk-danger)]"
            : "text-[var(--kiosk-gold)]",
        )}
      >
        {tone === "warning" ? (
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        ) : tone === "tip" ? (
          <Check className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        )}
        {title}
      </p>
      <div className="text-[var(--kiosk-text-soft)]">{children}</div>
    </aside>
  );
}

export function DataTable({
  head,
  rows,
}: {
  head: string[];
  rows: (ReactNode | undefined)[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--kiosk-border)]">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--kiosk-border)] bg-[var(--kiosk-panel)]">
            {head.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--kiosk-border-soft)]">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={cn(
                    "px-4 py-3 align-top leading-relaxed",
                    j === 0
                      ? "whitespace-nowrap font-medium text-[var(--kiosk-text)]"
                      : "text-[var(--kiosk-text-soft)]",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Faq({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <dl className="space-y-4">
      {items.map((item) => (
        <div
          key={item.q}
          className="rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] px-4 py-4"
        >
          <dt className="flex items-start gap-2.5 font-medium text-[var(--kiosk-text)]">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kiosk-gold)]" strokeWidth={1.75} aria-hidden />
            {item.q}
          </dt>
          <dd className="mt-2 pl-6 text-[15px] leading-[1.7] text-[var(--kiosk-text-soft)]">
            {item.a}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionHeader({
  icon,
  step,
  title,
  id,
  children,
}: {
  icon: ReactNode;
  step: string;
  title: string;
  id: string;
  children?: ReactNode;
}) {
  return (
    <header className="space-y-4">
      <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--kiosk-gold)]">
        {icon}
        {step}
      </p>
      <H2 id={id}>{title}</H2>
      {children ? <Lead>{children}</Lead> : null}
    </header>
  );
}
