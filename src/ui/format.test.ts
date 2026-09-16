import assert from "node:assert/strict";
import test from "node:test";

import { formatFetchedAt, formatPeakDays, formatThaiDate } from "./format";

test("the common Thai windows read as a range", () => {
  assert.equal(formatPeakDays(["mon", "tue", "wed", "thu", "fri"]), "จ.–ศ.");
  assert.equal(formatPeakDays(["sat", "sun"]), "ส.–อา.");
});

test("a window covering every day says so, and an empty one means no peak window", () => {
  assert.equal(formatPeakDays(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]), "ทุกวัน");
  assert.equal(formatPeakDays([]), "ราคาเดียวทั้งวัน");
});

test("a window that covers more than the working week never claims to be one", () => {
  assert.equal(formatPeakDays(["mon", "tue", "wed", "thu", "fri", "sat"]), "จ., อ., พ., พฤ., ศ., ส.");
  assert.equal(formatPeakDays(["mon", "sat", "sun"]), "จ., ส., อา.");
  assert.equal(formatPeakDays(["fri", "sat", "sun"]), "ศ., ส., อา.");
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

test("a fetch time is shown as a Thai date and a clock time", () => {
  // Built from a local moment, so the expectation holds wherever the tests run.
  const fetchedAt = new Date(2026, 8, 16, 12, 47).toISOString();
  assert.equal(formatFetchedAt(fetchedAt), "ดึงล่าสุด 16 ก.ย. 2569 12:47");
});

test("a fetch time that does not parse says so rather than showing rubbish", () => {
  assert.equal(formatFetchedAt(null), "ไม่ทราบเวลาที่ดึงข้อมูล");
  assert.equal(formatFetchedAt("whenever"), "ไม่ทราบเวลาที่ดึงข้อมูล");
});
