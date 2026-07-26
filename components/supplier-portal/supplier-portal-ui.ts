/** Shared look tokens — aligned with marketplace POS chrome. */
export {
  mktChip,
  mktChipActive,
  mktPosAccentBar,
  mktPosHeader,
  mktPosInkBorder,
  mktPosPaper,
  mktPosSearch,
  mktPosShell,
  mktPosTile,
} from "@/app/marketplace/_components/marketplace-ui";

export const spPage =
  "relative mx-auto w-full max-w-[1400px]";

export const spShellBg =
  "min-h-screen bg-[radial-gradient(120%_80%_at_50%_-10%,color-mix(in_srgb,#0f766e_10%,#f7f4ef),#efeae2_42%,#e7e1d6)]";

export const spSerifTitle =
  "font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-[var(--pos-ink,#1c1915)] sm:text-4xl";

export const spEyebrow =
  "text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground";

export const spPanel =
  "relative overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] " +
  "bg-[color-mix(in_srgb,var(--card)_92%,#f7f3eb)]";

export const spMetric =
  "relative overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] " +
  "bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)] px-4 py-4 " +
  "transition-[border-color,box-shadow] duration-150 " +
  "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_32%,transparent)] " +
  "hover:shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]";

export const spBtnPrimary =
  "inline-flex h-9 items-center justify-center gap-2 border border-[var(--pos-primary,#0f766e)] " +
  "bg-[var(--pos-primary,#0f766e)] px-3 text-[11px] font-bold uppercase tracking-[0.12em] " +
  "text-[var(--pos-primary-ink,#fff)] transition hover:brightness-110 " +
  "disabled:pointer-events-none disabled:opacity-50";

export const spBtnGhost =
  "inline-flex h-9 items-center justify-center gap-2 border " +
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] " +
  "bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)] px-3 text-[11px] font-bold uppercase " +
  "tracking-[0.12em] text-muted-foreground transition " +
  "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)] hover:text-[var(--pos-ink,#1c1915)] " +
  "disabled:pointer-events-none disabled:opacity-50";
