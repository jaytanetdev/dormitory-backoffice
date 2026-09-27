import { test } from "node:test";
import assert from "node:assert/strict";
import { nextLineQuotaMonth, lineQuotaMonthLabel } from "./line-quota.ts";
test("monthly quota rolls over year and leap-year February", () => {
  assert.equal(
    nextLineQuotaMonth(new Date("2026-12-15T00:00:00Z")).toISOString(),
    "2027-01-01T00:00:00.000Z",
  );
  assert.equal(
    nextLineQuotaMonth(new Date("2028-02-29T00:00:00Z")).toISOString(),
    "2028-03-01T00:00:00.000Z",
  );
});
test("month labels use Thai calendar independently of host timezone", () => {
  assert.equal(
    nextLineQuotaMonth(new Date("2026-09-30T16:59:59Z")).toISOString(),
    "2026-10-01T00:00:00.000Z",
  );
  assert.equal(
    nextLineQuotaMonth(new Date("2026-09-30T17:00:00Z")).toISOString(),
    "2026-11-01T00:00:00.000Z",
  );
  assert.match(
    lineQuotaMonthLabel(new Date("2026-09-27T00:00:00Z")),
    /1.*ต.ค.*2569/,
  );
});
