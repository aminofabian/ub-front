/**
 * What a customer can choose on a service (ADR 0025): groups where one option is picked (hair
 * length, style) and groups of extras where several may be. Each option can add to the price and
 * to the time. The server prices the line; these helpers only show the same sums before saving.
 */

export type ServiceOption = { id: string; name: string; priceDelta: number; extraMinutes: number };

export type ServiceOptionGroup = {
  id: string;
  name: string;
  /** The visit cannot be paid until something here is chosen. */
  required: boolean;
  /** Several may be chosen (extras); otherwise one. */
  multiple: boolean;
  options: ServiceOption[];
};

/** One option as it was chosen on a visit line. */
export type ChosenLineOption = {
  optionId: string;
  group: string;
  name: string;
  priceDelta: number;
  extraMinutes: number;
};

export const MAX_OPTION_GROUPS = 6;
export const MAX_OPTIONS_PER_GROUP = 12;
export const MAX_CHOSEN_OPTIONS = 10;
export const MAX_OPTION_NAME = 40;
export const MAX_EXTRA_MINUTES = 600;

/** Chosen ids that the service still offers, in the order the service lists them. */
export function stillOffered(groups: readonly ServiceOptionGroup[], chosen: readonly string[]): string[] {
  const wanted = new Set(chosen);
  return groups.flatMap((g) => g.options.filter((o) => wanted.has(o.id)).map((o) => o.id));
}

/**
 * Taps an option. In a pick-one group it replaces the earlier choice, and tapping the chosen one
 * again clears it unless the group must be chosen. In an extras group it switches on or off.
 */
export function toggleOption(
  groups: readonly ServiceOptionGroup[],
  chosen: readonly string[],
  optionId: string,
): string[] {
  const group = groups.find((g) => g.options.some((o) => o.id === optionId));
  if (!group) return [...chosen];
  const on = chosen.includes(optionId);
  if (group.multiple) {
    return stillOffered(groups, on ? chosen.filter((id) => id !== optionId) : [...chosen, optionId]);
  }
  const others = chosen.filter((id) => !group.options.some((o) => o.id === id));
  if (on) return stillOffered(groups, group.required ? chosen : others);
  return stillOffered(groups, [...others, optionId]);
}

/** What the chosen options add to the service's price and time. */
export function optionsExtra(
  groups: readonly ServiceOptionGroup[],
  chosen: readonly string[],
): { price: number; minutes: number } {
  const wanted = new Set(chosen);
  let price = 0;
  let minutes = 0;
  for (const group of groups) {
    for (const option of group.options) {
      if (wanted.has(option.id)) {
        price += option.priceDelta;
        minutes += option.extraMinutes;
      }
    }
  }
  return { price: Math.round(price * 100) / 100, minutes };
}

/** Name of the first group that must be chosen from and is not; null when nothing is missing. */
export function missingOptionGroup(groups: readonly ServiceOptionGroup[], chosen: readonly string[]): string | null {
  const wanted = new Set(chosen);
  const missing = groups.find((g) => g.required && !g.options.some((o) => wanted.has(o.id)));
  return missing ? missing.name : null;
}

/** "2 h 15 min", "45 min", "3 h". */
export function minutesInWords(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

// ---------------------------------------------------------------- the editor

export type OptionDraft = { id?: string; name: string; price: string; minutes: string };
export type GroupDraft = { id?: string; name: string; required: boolean; multiple: boolean; options: OptionDraft[] };

export type OptionGroupPayload = {
  id?: string;
  name: string;
  required: boolean;
  multiple: boolean;
  options: { id?: string; name: string; priceDelta: number; extraMinutes: number }[];
};

export function groupsToDrafts(groups: readonly ServiceOptionGroup[]): GroupDraft[] {
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    required: g.required,
    multiple: g.multiple,
    options: g.options.map((o) => ({
      id: o.id,
      name: o.name,
      price: o.priceDelta > 0 ? String(o.priceDelta) : "",
      minutes: o.extraMinutes > 0 ? String(o.extraMinutes) : "",
    })),
  }));
}

/** What to send, or the first thing wrong in words the owner can act on. */
export function draftsToPayload(drafts: readonly GroupDraft[]): { groups: OptionGroupPayload[] } | { error: string } {
  if (drafts.length > MAX_OPTION_GROUPS) return { error: `A service can have up to ${MAX_OPTION_GROUPS} groups` };
  const groupNames = new Set<string>();
  const groups: OptionGroupPayload[] = [];
  for (const draft of drafts) {
    const name = draft.name.trim();
    if (!name) return { error: "Give every group a name, such as Hair length" };
    if (name.length > MAX_OPTION_NAME) return { error: `"${name}" is too long; keep it under ${MAX_OPTION_NAME} letters` };
    if (groupNames.has(name.toLowerCase())) return { error: `"${name}" is listed twice` };
    groupNames.add(name.toLowerCase());
    if (draft.options.length === 0) return { error: `Add at least one choice under ${name}` };
    if (draft.options.length > MAX_OPTIONS_PER_GROUP) {
      return { error: `${name} can have up to ${MAX_OPTIONS_PER_GROUP} choices` };
    }
    const optionNames = new Set<string>();
    const options: OptionGroupPayload["options"] = [];
    for (const option of draft.options) {
      const optionName = option.name.trim();
      if (!optionName) return { error: `Name every choice under ${name}` };
      if (optionName.length > MAX_OPTION_NAME) {
        return { error: `"${optionName}" is too long; keep it under ${MAX_OPTION_NAME} letters` };
      }
      if (optionNames.has(optionName.toLowerCase())) return { error: `"${optionName}" is listed twice under ${name}` };
      optionNames.add(optionName.toLowerCase());
      const price = option.price.trim() === "" ? 0 : Number(option.price);
      if (!Number.isFinite(price) || price < 0) return { error: `Enter what ${optionName} adds to the price, or leave it empty` };
      const minutes = option.minutes.trim() === "" ? 0 : Number(option.minutes);
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > MAX_EXTRA_MINUTES) {
        return { error: `Enter the minutes ${optionName} adds, up to ${MAX_EXTRA_MINUTES}, or leave it empty` };
      }
      options.push({
        ...(option.id ? { id: option.id } : {}),
        name: optionName,
        priceDelta: Math.round(price * 100) / 100,
        extraMinutes: minutes,
      });
    }
    groups.push({
      ...(draft.id ? { id: draft.id } : {}),
      name,
      required: draft.required,
      multiple: draft.multiple,
      options,
    });
  }
  return { groups };
}
