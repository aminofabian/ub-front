/**
 * Sharing one tip between the people who worked on a visit.
 *
 * A tip is never revenue and never earns commission. Whatever the customer hands over as a tip
 * must be given out in full: every function here returns amounts that add up to exactly the tip,
 * in cents, with any odd cent going to the first person.
 */

export type TipMode = "ONE" | "EQUAL" | "BY_WORK" | "MANUAL";

export type TipPerson = {
  staffProfileId: string;
  /** What they did on this visit, in shillings; used to share a tip by work done. */
  work: number;
};

export type TipShare = { staffProfileId: string; amount: number };

const cents = (n: number) => Math.round(n * 100);

/** Splits `tip` between `people` by `weights`, to the cent, adding up exactly. */
function split(tip: number, people: readonly TipPerson[], weights: readonly number[]): TipShare[] {
  const total = cents(tip);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0 || people.length === 0 || weightSum <= 0) return [];
  const shares = weights.map((w) => Math.floor((total * w) / weightSum));
  let left = total - shares.reduce((sum, s) => sum + s, 0);
  for (let i = 0; left > 0; i = (i + 1) % shares.length, left -= 1) {
    shares[i]! += 1;
  }
  return people
    .map((person, i) => ({ staffProfileId: person.staffProfileId, amount: shares[i]! / 100 }))
    .filter((share) => share.amount > 0);
}

/**
 * @param oneId for {@link TipMode} `ONE`, who gets all of it
 * @param manual for `MANUAL`, the amount typed for each person
 */
export function allocateTip(
  tip: number,
  people: readonly TipPerson[],
  mode: TipMode,
  opts: { oneId?: string | null; manual?: Readonly<Record<string, number>> } = {},
): TipShare[] {
  if (!(tip > 0) || people.length === 0) return [];
  if (mode === "ONE") {
    const who = people.find((p) => p.staffProfileId === opts.oneId) ?? people[0]!;
    return [{ staffProfileId: who.staffProfileId, amount: cents(tip) / 100 }];
  }
  if (mode === "EQUAL") {
    return split(tip, people, people.map(() => 1));
  }
  if (mode === "BY_WORK") {
    const work = people.map((p) => Math.max(0, p.work));
    return work.some((w) => w > 0) ? split(tip, people, work) : split(tip, people, people.map(() => 1));
  }
  return people
    .map((p) => ({ staffProfileId: p.staffProfileId, amount: cents(opts.manual?.[p.staffProfileId] ?? 0) / 100 }))
    .filter((share) => share.amount > 0);
}

/** How far a manual split is from the tip: positive means still to give out, negative means too much. */
export function tipLeftToAllocate(tip: number, shares: readonly TipShare[]): number {
  return (cents(tip) - shares.reduce((sum, s) => sum + cents(s.amount), 0)) / 100;
}
