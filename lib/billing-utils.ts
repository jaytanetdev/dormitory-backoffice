import type { InvoiceDto } from './api-types';

export function receivedAmount(invoice: InvoiceDto): number {
  return (invoice.payments ?? []).filter((payment) => payment.status === 'APPROVED')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
}

export function defaultBillingDueDate(year: number, month: number, billingDay: number, dueDays: number): string {
  const day = Math.min(billingDay, new Date(Date.UTC(year, month, 0)).getUTCDate());
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + dueDays);
  return date.toISOString().slice(0, 10);
}
