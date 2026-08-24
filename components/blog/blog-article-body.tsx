import Link from "next/link";

import type { BlogBlock, BlogFaq } from "@/lib/blog";
import { cn } from "@/lib/utils";

type BlogArticleBodyProps = {
  body: BlogBlock[];
  faqs?: BlogFaq[];
};

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function calloutLabel(
  tone: "info" | "tip" | "warning" | undefined,
  text: string,
): string {
  if (tone === "warning") return "Important";
  if (tone === "tip") return "Bottom line";
  if (text.startsWith("Best for:")) return "Best for";
  return "Note";
}

export function BlogArticleBody({ body, faqs }: BlogArticleBodyProps) {
  return (
    <div className="blog-article-prose space-y-6">
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
                id={slugifyHeading(block.text)}
                className="scroll-mt-28 pt-2 font-heading text-2xl tracking-[-0.02em] text-[var(--kiosk-text)] sm:text-[1.65rem]"
              >
                {block.text}
              </h2>
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
                  {calloutLabel(block.tone, block.text)}
                </p>
                <p>
                  {block.text.startsWith("Best for:")
                    ? block.text.replace(/^Best for:\s*/, "")
                    : block.text}
                </p>
              </aside>
            );
          case "table":
            return (
              <div
                key={key}
                className="overflow-x-auto rounded-xl border border-[var(--kiosk-border)]"
              >
                <table className="w-full min-w-[20rem] border-collapse text-left text-[14px] sm:min-w-[28rem]">
                  <thead>
                    <tr className="border-b border-[var(--kiosk-border)] bg-[var(--kiosk-panel)]">
                      {block.headers.map((header) => (
                        <th
                          key={header}
                          className="px-4 py-3 font-medium text-[var(--kiosk-text)]"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="border-b border-[var(--kiosk-border-soft)] last:border-b-0"
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className={cn(
                              "px-4 py-3.5 align-top leading-[1.55] text-[var(--kiosk-text-soft)]",
                              cellIndex === 0 &&
                                "font-medium text-[var(--kiosk-text)]",
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
          case "image":
            return (
              <figure
                key={key}
                className="overflow-hidden rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- blog illustrations are static public assets */}
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
          case "links":
            return (
              <ul key={key} className="space-y-0 border-t border-[var(--kiosk-border-soft)]">
                {block.items.map((item) => (
                  <li
                    key={item.href}
                    className="border-b border-[var(--kiosk-border-soft)]"
                  >
                    <Link
                      href={item.href}
                      className="group flex items-baseline justify-between gap-4 py-3.5 no-underline"
                    >
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold tracking-[-0.015em] text-[var(--kiosk-text)] transition-colors group-hover:text-[var(--kiosk-gold)]">
                          {item.label}
                        </span>
                        {item.blurb ? (
                          <span className="mt-1 block text-[13px] leading-[1.5] text-[var(--kiosk-text-soft)]">
                            {item.blurb}
                          </span>
                        ) : null}
                      </span>
                      <span
                        aria-hidden
                        className="shrink-0 font-mono text-[12px] text-[var(--kiosk-text-faint)] transition-colors group-hover:text-[var(--kiosk-gold)]"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            );
          default:
            return null;
        }
      })}

      {faqs && faqs.length > 0 ? (
        <section className="space-y-4 pt-4" aria-labelledby="article-faq">
          <h2
            id="article-faq"
            className="scroll-mt-28 pt-2 font-heading text-2xl tracking-[-0.02em] text-[var(--kiosk-text)] sm:text-[1.65rem]"
          >
            Frequently asked questions
          </h2>
          <div className="border-t border-[var(--kiosk-border-soft)]">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="border-b border-[var(--kiosk-border-soft)]"
              >
                <summary className="cursor-pointer list-none py-4 text-[15px] font-semibold tracking-[-0.015em] text-[var(--kiosk-text)] [&::-webkit-details-marker]:hidden">
                  {faq.question}
                </summary>
                <p className="pb-4 pr-4 text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
