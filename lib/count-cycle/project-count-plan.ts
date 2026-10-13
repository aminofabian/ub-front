const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type CountPlan = {
  days: number;
  finishDate: Date;
};

/** At one batch a day, how long a full count takes and its last counting day. */
export function projectCountPlan(
  productCount: number,
  batchSize: number,
  today: Date,
): CountPlan {
  const days =
    productCount > 0 && batchSize > 0 ? Math.ceil(productCount / batchSize) : 0;
  const finishDate = new Date(today.getTime() + Math.max(0, days - 1) * MS_PER_DAY);
  return { days, finishDate };
}
