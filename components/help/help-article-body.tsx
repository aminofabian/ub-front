import type { HelpBlock } from "@/lib/help";
import { cn } from "@/lib/utils";

type HelpArticleBodyProps = {
  body: HelpBlock[];
};

export function HelpArticleBody({ body }: HelpArticleBodyProps) {
  return (
    <div className="help-article-prose space-y-6">
      {body.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case "paragraph":
            return (
              <p
                key={key}
                className="text-[16px] leading-[1.7] text-[var(--kiosk-text-soft)]"
              >
                {block.text}
              </p>
            );
          case "heading":
            return (
              <h2
                key={key}
                className="pt-2 font-heading text-2xl tracking-[-0.02em] text-[var(--kiosk-text)] sm:text-[1.65rem]"
              >
                {block.text}
              </h2>
            );
          case "steps":
            return (
              <ol
                key={key}
                className="space-y-3 border-l-2 border-[var(--kiosk-gold-border)] pl-5"
              >
                {block.items.map((item, i) => (
                  <li key={i} className="relative text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)]">
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
                      Step {String(i + 1).padStart(2, "0")}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            );
          case "list":
            return (
              <ul key={key} className="space-y-2.5 pl-1">
                {block.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)]"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--kiosk-gold)]"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          case "callout":
            return (
              <aside
                key={key}
                className={cn(
                  "rounded-xl border px-4 py-3.5 text-[14px] leading-[1.65]",
                  block.tone === "warning"
                    ? "border-[var(--kiosk-danger)]/25 bg-[var(--kiosk-danger-bg)] text-[var(--kiosk-text)]"
                    : block.tone === "tip"
                      ? "border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] text-[var(--kiosk-text)]"
                      : "border-[var(--kiosk-border)] bg-[var(--kiosk-panel)] text-[var(--kiosk-text-soft)]",
                )}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
                  {block.tone === "warning"
                    ? "Important"
                    : block.tone === "tip"
                      ? "Tip"
                      : "Note"}
                </p>
                <p>{block.text}</p>
              </aside>
            );
          case "faq":
            return (
              <div key={key} className="space-y-4">
                <h2 className="font-heading text-2xl tracking-[-0.02em] text-[var(--kiosk-text)]">
                  Frequently asked
                </h2>
                <dl className="space-y-4">
                  {block.items.map((item) => (
                    <div
                      key={item.question}
                      className="rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] px-4 py-4"
                    >
                      <dt className="font-medium text-[var(--kiosk-text)]">
                        {item.question}
                      </dt>
                      <dd className="mt-2 text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)]">
                        {item.answer}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          case "image":
            return (
              <figure key={key} className="overflow-hidden rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- help screenshots are static public assets */}
                <img
                  src={block.src}
                  alt={block.alt}
                  className="h-auto w-full"
                  loading="lazy"
                  decoding="async"
                />
                {block.caption ? (
                  <figcaption className="border-t border-[var(--kiosk-border-soft)] px-4 py-3 text-[13px] leading-relaxed text-[var(--kiosk-text-dim)]">
                    {block.caption}
                  </figcaption>
                ) : null}
              </figure>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
