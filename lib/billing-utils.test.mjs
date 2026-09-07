import { test } from 'node:test';
import assert from 'node:assert/strict';
import { receivedAmount, defaultBillingDueDate } from './billing-utils.ts';

test('partial receipts count only approved payments', () => {
  assert.equal(receivedAmount({ status: 'PARTIALLY_PAID', payments: [
    { status: 'APPROVED', amount: '1500.50' }, { status: 'APPROVED', amount: 500 },
    { status: 'PENDING', amount: 3000 }, { status: 'REJECTED', amount: 1000 },
  ] }), 2000.50);
  assert.equal(receivedAmount({ payments: [] }), 0);
});
test('due dates follow the selected month and clamp short months', () => {
  assert.equal(defaultBillingDueDate(2026, 10, 1, 5), '2026-10-06');
  assert.equal(defaultBillingDueDate(2026, 2, 31, 0), '2026-02-28');
  assert.equal(defaultBillingDueDate(2028, 2, 31, 0), '2028-02-29');
  assert.equal(defaultBillingDueDate(2026, 12, 31, 5), '2027-01-05');
});
