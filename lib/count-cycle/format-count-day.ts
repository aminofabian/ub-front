const COUNT_DAY_FORMAT = new Intl.DateTimeFormat("en-KE", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "Mon 26 Oct" — accepts a Date or a server `YYYY-MM-DD` day. */
export function formatCountDay(day: Date | string): string {
  const date = typeof day === "string" ? new Date(`${day.slice(0, 10)}T12:00:00`) : day;
  return COUNT_DAY_FORMAT.formatToParts(date)
    .filter((part) => part.type !== "literal")
    .map((part) => part.value)
    .join(" ");
}
