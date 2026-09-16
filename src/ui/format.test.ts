import assert from "node:assert/strict";
import test from "node:test";

import { formatPeakDays, formatThaiDate } from "./format";

test("the common Thai windows read as a range", () => {
  assert.equal(formatPeakDays(["mon", "tue", "wed", "thu", "fri"]), "จ.–ศ.");
  assert.equal(formatPeakDays(["sat", "sun"]), "ส.–อา.");
});

test("a window covering every day says so, and an empty one means no peak window", () => {
  assert.equal(formatPeakDays(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]), "ทุกวัน");
  assert.equal(formatPeakDays([]), "ราคาเดียวทั้งวัน");
});

test("a scattered window lists its days", () => {
  assert.equal(formatPeakDays(["mon", "wed", "fri"]), "จ., พ., ศ.");
  assert.equal(formatPeakDays(["sun", "tue"]), "อ., อา.");
});

test("a checked date is shown as a Thai short date", () => {
  assert.equal(formatThaiDate("2026-09-15"), "15 ก.ย. 2569");
  assert.equal(formatThaiDate("2026-02-01"), "1 ก.พ. 2569");
});

test("an unusable date says it is unknown rather than showing a broken value", () => {
  assert.equal(formatThaiDate(null), "ไม่ระบุวันที่ตรวจ");
  assert.equal(formatThaiDate("not-a-date"), "not-a-date");
});
