import type { BlogBlock } from "./types";

export function spokePlaceholderBody(
  teaser: string,
  pillarTitle: string,
): BlogBlock[] {
  return [
    {
      type: "paragraph",
      text: teaser,
    },
    {
      type: "callout",
      tone: "info",
      text: `Full article coming soon. For now, start with the pillar guide: ${pillarTitle}.`,
    },
  ];
}

export function criteriaTable(rows: [string, string][]): BlogBlock {
  return {
    type: "table",
    headers: ["Criterion", "Verdict"],
    rows,
  };
}
