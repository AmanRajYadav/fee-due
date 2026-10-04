import type { Payment, Student } from "./types.ts";

/**
 * Dues are worked out, never stored. Each student owes one fee per month, on
 * their due day, from `startOn` onwards. Only payments are saved; a due is
 * "whatever has fallen due minus whatever was paid for it".
 */

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** Today on this phone's clock, as YYYY-MM-DD. */
export const todayISO = (now = new Date()): string =>
  iso(now.getFullYear(), now.getMonth() + 1, now.getDate());

/** Month is 1-based. */
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** A due day of 31 lands on the last day of shorter months. */
export const dueDateIn = (period: string, dueDay: number): string => {
  const [y, m] = period.split("-").map(Number);
  return iso(y, m, Math.min(dueDay, daysInMonth(y, m)));
};

export const nextPeriod = (period: string): string => {
  const [y, m] = period.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
};

// Date-only ISO strings parse as UTC midnight, so this is exact across DST.
export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

const addDays = (date: string, days: number): string =>
  new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);

/** The fee covers the month starting on the due date: up to the day before the next one. */
export const coversTo = (period: string, dueDay: number): string =>
  addDays(dueDateIn(nextPeriod(period), dueDay), -1);

export interface Due {
  student: Student;
  period: string;
  dueDate: string;
  coversTo: string;
  fee: number;
  paid: number;
  balance: number;
  /** 0 on the due date itself. */
  daysLate: number;
  payments: Payment[];
}

/** Every due for one student up to today, oldest first. */
export function buildDues(student: Student, payments: Payment[], today: string): Due[] {
  const paidFor = new Map<string, Payment[]>();
  for (const p of payments) {
    if (p.studentId !== student.id) continue;
    const list = paidFor.get(p.period);
    if (list) list.push(p);
    else paidFor.set(p.period, [p]);
  }

  // A month that has a payment is always shown, even if the student has since
  // been removed or had their due day changed.
  const periods = new Set(paidFor.keys());
  const dueDay = student.dueDay;
  if (student.active && dueDay && student.fee > 0) {
    const last = today.slice(0, 7);
    for (let p = student.startOn.slice(0, 7); p <= last; p = nextPeriod(p)) {
      const date = dueDateIn(p, dueDay);
      if (date >= student.startOn && date <= today) periods.add(p);
    }
  }

  return [...periods].sort().map((period) => {
    const rows = (paidFor.get(period) ?? []).sort((a, b) => a.receiptNo - b.receiptNo);
    const first = rows[0];
    const dueDate = first ? first.dueDate : dueDateIn(period, dueDay!);
    const fee = first ? first.feeDue : student.fee;
    const paid = rows.reduce((sum, p) => sum + p.amount, 0);
    return {
      student,
      period,
      dueDate,
      coversTo: first ? first.coversTo : coversTo(period, dueDay!),
      fee,
      paid,
      balance: Math.max(0, fee - paid),
      daysLate: daysBetween(dueDate, today),
      payments: rows,
    };
  });
}

/** What is owed right now, most overdue first. */
export const owedNow = (dues: Due[]): Due[] =>
  dues
    .filter((d) => d.balance > 0)
    .sort((a, b) => b.daysLate - a.daysLate || a.student.name.localeCompare(b.student.name));

export interface MonthSummary {
  period: string;
  collected: number;
  pending: number;
  dues: Due[];
}

/** Totals per month, newest first. A due belongs to the month its due date is in. */
export function summariseMonths(dues: Due[]): MonthSummary[] {
  const months = new Map<string, MonthSummary>();
  for (const d of dues) {
    let m = months.get(d.period);
    if (!m) months.set(d.period, (m = { period: d.period, collected: 0, pending: 0, dues: [] }));
    m.collected += d.paid;
    m.pending += d.balance;
    m.dues.push(d);
  }
  return [...months.values()]
    .sort((a, b) => b.period.localeCompare(a.period))
    .map((m) => ({ ...m, dues: m.dues.sort((a, b) => a.student.name.localeCompare(b.student.name)) }));
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "4 Oct 2026" */
export const formatDate = (date: string): string => {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** "4 Oct" */
export const formatDay = (date: string): string => {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};

/** "October 2026" */
export const formatMonth = (period: string): string => {
  const [y, m] = period.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
};

/** "15 Sep – 14 Oct 2026" */
export const formatCover = (due: Pick<Due, "dueDate" | "coversTo">): string =>
  `${formatDay(due.dueDate)} – ${formatDate(due.coversTo)}`;

export const rupees = (n: number): string => `₹${n.toLocaleString("en-IN")}`;

export const receiptLabel = (n: number): string => `FL-${String(n).padStart(4, "0")}`;

/** "15th" */
export const ordinal = (n: number): string => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

export const lateLabel = (daysLate: number): string =>
  daysLate === 0 ? "Due today" : daysLate === 1 ? "1 day late" : `${daysLate} days late`;
