/** LINE exposes monthly usage, but no exact reset timestamp. */
export function nextLineQuotaMonth(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return new Date(Date.UTC(year, month, 1));
}
export function lineQuotaMonthLabel(now: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(nextLineQuotaMonth(now));
}
