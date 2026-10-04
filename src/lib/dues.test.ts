import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDues, coversTo, dueDateIn, ordinal, owedNow, summariseMonths } from "./dues.ts";
import type { Payment, Student } from "./types.ts";

const student = (over: Partial<Student> = {}): Student => ({
  id: "s1",
  name: "Test",
  branch: "Mangla",
  dueDay: 15,
  fee: 2500,
  startOn: "2026-09-15",
  active: true,
  ...over,
});

const payment = (over: Partial<Payment> = {}): Payment => ({
  id: "p1",
  receiptNo: 1,
  studentId: "s1",
  period: "2026-09",
  amount: 2500,
  paidOn: "2026-09-20",
  mode: "cash",
  feeDue: 2500,
  dueDate: "2026-09-15",
  coversTo: "2026-10-14",
  ...over,
});

test("a due appears on the due day and not before", () => {
  assert.equal(buildDues(student(), [], "2026-09-14").length, 0);
  const dues = buildDues(student(), [], "2026-09-15");
  assert.equal(dues.length, 1);
  assert.equal(dues[0].dueDate, "2026-09-15");
  assert.equal(dues[0].coversTo, "2026-10-14");
  assert.equal(dues[0].daysLate, 0);
});

test("a new due appears every month, and days late are counted", () => {
  const dues = buildDues(student(), [], "2026-10-04");
  assert.deepEqual(dues.map((d) => d.period), ["2026-09"]);
  assert.equal(dues[0].daysLate, 19);
  assert.equal(buildDues(student(), [], "2026-12-15").length, 4);
});

test("tracking starts at startOn: an earlier due day in the same month is skipped", () => {
  // Due on the 1st, tracking from 15 Sept: the first due is 1 Oct.
  const dues = buildDues(student({ dueDay: 1 }), [], "2026-10-04");
  assert.deepEqual(dues.map((d) => d.dueDate), ["2026-10-01"]);
  assert.equal(dues[0].coversTo, "2026-10-31");
  assert.equal(dues[0].daysLate, 3);
});

test("already paid before tracking: starts from the next due", () => {
  const s = student({ startOn: "2026-10-15" });
  assert.equal(buildDues(s, [], "2026-10-04").length, 0);
  assert.equal(buildDues(s, [], "2026-10-15").length, 1);
});

test("free students and students with no due day get no dues", () => {
  assert.equal(buildDues(student({ fee: 0 }), [], "2026-12-01").length, 0);
  assert.equal(buildDues(student({ dueDay: null }), [], "2026-12-01").length, 0);
});

test("part payment leaves a balance; full payment clears it", () => {
  const part = buildDues(student(), [payment({ amount: 1000 })], "2026-10-04");
  assert.equal(part[0].paid, 1000);
  assert.equal(part[0].balance, 1500);
  assert.equal(owedNow(part).length, 1);

  const full = buildDues(
    student(),
    [payment({ amount: 1000 }), payment({ id: "p2", receiptNo: 2, amount: 1500 })],
    "2026-10-04"
  );
  assert.equal(full[0].balance, 0);
  assert.equal(owedNow(full).length, 0);
});

test("a fee change applies to unpaid months but not to ones already paid", () => {
  const dues = buildDues(student({ fee: 3000 }), [payment()], "2026-10-20");
  assert.equal(dues[0].fee, 2500); // September was paid at the old fee
  assert.equal(dues[0].balance, 0);
  assert.equal(dues[1].fee, 3000); // October uses the new fee
});

test("a removed student keeps paid history but stops owing", () => {
  const dues = buildDues(student({ active: false }), [payment()], "2026-12-20");
  assert.deepEqual(dues.map((d) => d.period), ["2026-09"]);
});

test("due day 31 lands on the last day of short months", () => {
  assert.equal(dueDateIn("2027-02", 31), "2027-02-28");
  assert.equal(dueDateIn("2028-02", 31), "2028-02-29");
  assert.equal(coversTo("2027-01", 31), "2027-02-27");
  assert.equal(coversTo("2026-12", 26), "2027-01-25");
});

test("most overdue first", () => {
  const a = buildDues(student({ id: "a", name: "A", dueDay: 26, startOn: "2026-09-15" }), [], "2026-10-04");
  const b = buildDues(student({ id: "b", name: "B" }), [], "2026-10-04");
  assert.deepEqual(owedNow([...a, ...b]).map((d) => d.student.name), ["B", "A"]);
});

test("month totals", () => {
  const dues = [
    ...buildDues(student(), [payment({ amount: 1000 })], "2026-10-20"),
    ...buildDues(student({ id: "s2", name: "Two" }), [payment({ id: "p2", studentId: "s2" })], "2026-10-20"),
  ];
  const [oct, sep] = summariseMonths(dues);
  assert.equal(oct.period, "2026-10");
  assert.equal(oct.collected, 0);
  assert.equal(oct.pending, 5000);
  assert.equal(sep.collected, 3500);
  assert.equal(sep.pending, 1500);
});

test("ordinals", () => {
  assert.deepEqual([1, 2, 3, 4, 10, 11, 12, 13, 21, 22, 26].map(ordinal), [
    "1st", "2nd", "3rd", "4th", "10th", "11th", "12th", "13th", "21st", "22nd", "26th",
  ]);
});
