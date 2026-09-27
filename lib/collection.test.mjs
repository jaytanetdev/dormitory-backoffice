import { test } from "node:test";
import assert from "node:assert/strict";
import { collectionStatus, outstandingAmount } from "./collection.ts";
const now = new Date("2026-09-27T10:00:00+07:00");
const invoice = (
  payments = [],
  status = "ISSUED",
  dueDate = "2026-09-27T00:00:00+07:00",
) => ({ total: 5000, payments, status, dueDate });
test("separates pending, rejected, partial and full payments", () => {
  assert.equal(
    collectionStatus(invoice([{ status: "PENDING", amount: 5000 }]), now),
    "REVIEW",
  );
  assert.equal(
    collectionStatus(invoice([{ status: "REJECTED", amount: 5000 }]), now),
    "UNPAID",
  );
  assert.equal(
    collectionStatus(invoice([{ status: "APPROVED", amount: 2000 }]), now),
    "PARTIAL",
  );
  assert.equal(
    outstandingAmount(invoice([{ status: "APPROVED", amount: 2000 }])),
    3000,
  );
  assert.equal(
    collectionStatus(invoice([{ status: "APPROVED", amount: 5000 }]), now),
    "PAID",
  );
});
test("a Bangkok due date is not overdue until the next day", () => {
  assert.equal(collectionStatus(invoice(), now), "UNPAID");
  assert.equal(
    collectionStatus(invoice([], "ISSUED", "2026-09-26T00:00:00+07:00"), now),
    "OVERDUE",
  );
  assert.equal(
    collectionStatus(
      invoice(
        [{ status: "PENDING", amount: 5000 }],
        "ISSUED",
        "2026-09-26T00:00:00+07:00",
      ),
      now,
    ),
    "REVIEW",
  );
});
