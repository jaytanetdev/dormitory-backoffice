import type { InvoiceDto } from "./api-types";
import { receivedAmount } from "./billing-utils";
export type CollectionStatus =
  "PAID" | "REVIEW" | "PARTIAL" | "OVERDUE" | "UNPAID";
export function outstandingAmount(invoice: InvoiceDto): number {
  return invoice.status === "PAID"
    ? 0
    : Math.max(0, Number(invoice.total) - receivedAmount(invoice));
}
const calendarDate = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export function collectionStatus(
  invoice: InvoiceDto,
  now = new Date(),
): CollectionStatus {
  if (outstandingAmount(invoice) <= 0) return "PAID";
  if ((invoice.payments ?? []).some((payment) => payment.status === "PENDING"))
    return "REVIEW";
  if (calendarDate(new Date(invoice.dueDate)) < calendarDate(now))
    return "OVERDUE";
  if (receivedAmount(invoice) > 0) return "PARTIAL";
  return "UNPAID";
}
