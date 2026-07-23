import type { BlogBlock } from "@/lib/blog";
import { cn } from "@/lib/utils";

type BlogArticleBodyProps = {
  body: BlogBlock[];
};

function calloutLabel(
  tone: "info" | "tip" | "warning" | undefined,
  text: string,
): string {
  if (tone === "warning") return "Important";
  if (tone === "tip") return "Bottom line";
  if (text.startsWith("Best for:")) return "Best for";
  return "Note";
}

export function BlogArticleBody({ body }: BlogArticleBodyProps) {
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
                className="pt-2 font-heading text-2xl tracking-[-0.02em] text-[var(--kiosk-text)] sm:text-[1.65rem]"
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
          default:
            return null;
        }
      })}
    </div>
  );
}
