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
  "min-h-dvh bg-[radial-gradient(120%_80%_at_50%_-10%,color-mix(in_srgb,#0f766e_14%,#f7f4ef),#efeae2_42%,#e7e1d6)] lg:min-h-screen";

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
  "transition-[border-color,box-shadow,transform] duration-200 " +
  "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_32%,transparent)] " +
  "hover:shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] " +
  "active:scale-[0.98]";

export const spBtnPrimary =
  "inline-flex h-9 items-center justify-center gap-2 border border-[var(--pos-primary,#0f766e)] " +
  "bg-[var(--pos-primary,#0f766e)] px-3 text-[11px] font-bold uppercase tracking-[0.12em] " +
  "text-[var(--pos-primary-ink,#fff)] transition hover:brightness-110 active:brightness-95 " +
  "disabled:pointer-events-none disabled:opacity-50";

export const spBtnGhost =
  "inline-flex h-9 items-center justify-center gap-2 border " +
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] " +
  "bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)] px-3 text-[11px] font-bold uppercase " +
  "tracking-[0.12em] text-muted-foreground transition " +
  "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)] hover:text-[var(--pos-ink,#1c1915)] " +
  "disabled:pointer-events-none disabled:opacity-50";

export const spTabItem =
  "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 " +
  "text-[10px] font-medium tracking-wide text-muted-foreground " +
  "transition-colors active:scale-95 touch-manipulation";

export const spTabItemActive =
  "text-[var(--pos-primary,#0f766e)] font-semibold";

export const spQuickAction =
  "inline-flex min-w-[4.75rem] snap-start flex-col items-center gap-2 " +
  "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] " +
  "bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] px-3 py-3 " +
  "transition active:scale-95 touch-manipulation";

export const spRise =
  "animate-[sp-card-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both]";

export const spAppHeader =
  "sticky top-0 z-30 " +
  "bg-[color-mix(in_srgb,#faf8f4_78%,transparent)] pt-[max(0.4rem,env(safe-area-inset-top))] " +
  "backdrop-blur-xl supports-[backdrop-filter]:bg-[color-mix(in_srgb,#faf8f4_62%,transparent)]";

export const spTabBar =
  "shrink-0 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] " +
  "bg-[color-mix(in_srgb,#faf8f4_96%,transparent)] pb-[max(0.25rem,env(safe-area-inset-bottom))] " +
  "backdrop-blur-xl supports-[backdrop-filter]:bg-[color-mix(in_srgb,#faf8f4_88%,transparent)]";
