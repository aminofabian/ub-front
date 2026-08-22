import type {
  StorefrontDesignButtons,
  StorefrontDesignDensity,
  StorefrontDesignRadius,
} from "@/lib/storefront-design";

/**
 * Store personalities — "What should your store feel like?"
 *
 * Each preset is a token delta (radius, buttons, density, surface) applied
 * instantly to the editor form. The merchant then fine-tunes and saves; nothing
 * is stored about the preset itself. The same token space is what the AI
 * assistant suggests, so presets are the manual, predictable version of the
 * AI's suggestions.
 */
export type StorePersonalityId =
  | "fresh"
  | "premium"
  | "bold"
  | "minimal"
  | "warm"
  | "luxury";

export type StorePersonalityPreset = {
  id: StorePersonalityId;
  emoji: string;
  name: string;
  /** One-line feel description shown in the picker. */
  vibe: string;
  tokens: {
    radius: StorefrontDesignRadius;
    buttons: StorefrontDesignButtons;
    density: StorefrontDesignDensity;
    /** Page background hex. */
    surface: string;
  };
};

export const STORE_PERSONALITY_PRESETS: readonly StorePersonalityPreset[] = [
  {
    id: "fresh",
    emoji: "🌱",
    name: "Fresh & Friendly",
    vibe: "Green-tinted calm, rounded cards, pill buttons",
    tokens: { radius: "soft", buttons: "pill", density: "airy", surface: "#F5FAF3" },
  },
  {
    id: "premium",
    emoji: "✨",
    name: "Modern & Premium",
    vibe: "Sharp edges, quiet off-white, tidy spacing",
    tokens: { radius: "sharp", buttons: "solid", density: "cozy", surface: "#FAFAF8" },
  },
  {
    id: "bold",
    emoji: "⚡",
    name: "Bold & Energetic",
    vibe: "Punchy solids, compact spacing, high contrast",
    tokens: { radius: "sharp", buttons: "solid", density: "compact", surface: "#FFFFFF" },
  },
  {
    id: "minimal",
    emoji: "○",
    name: "Minimal & Clean",
    vibe: "Lots of air, straight edges, pure white",
    tokens: { radius: "sharp", buttons: "solid", density: "airy", surface: "#FFFFFF" },
  },
  {
    id: "warm",
    emoji: "🏠",
    name: "Warm & Local",
    vibe: "Cream paper, outlined buttons, cosy spacing",
    tokens: { radius: "soft", buttons: "outline", density: "cozy", surface: "#FFF9F0" },
  },
  {
    id: "luxury",
    emoji: "◆",
    name: "Luxury",
    vibe: "Dark editorial canvas, sharp edges, air",
    tokens: { radius: "sharp", buttons: "outline", density: "airy", surface: "#111111" },
  },
];

export function storePersonalityPreset(
  id: StorePersonalityId,
): StorePersonalityPreset {
  return (
    STORE_PERSONALITY_PRESETS.find((p) => p.id === id) ??
    STORE_PERSONALITY_PRESETS[0]!
  );
}
