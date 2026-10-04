import { supabase } from "./supabase.ts";
import type {
  AppData,
  NewPayment,
  NewReminder,
  Payment,
  Reminder,
  Student,
  StudentInput,
} from "./types.ts";

/** Everything the app reads and writes. Two versions exist: Supabase, and a dev-only demo. */
export interface Store {
  load(): Promise<AppData>;
  addStudent(input: StudentInput): Promise<Student>;
  updateStudent(id: string, input: StudentInput): Promise<Student>;
  /** Hides the student. If they have no payments at all, deletes them outright. */
  removeStudent(id: string, hasPayments: boolean): Promise<void>;
  addPayment(input: NewPayment): Promise<Payment>;
  deletePayment(id: string): Promise<void>;
  addReminder(input: NewReminder): Promise<Reminder>;
  deleteReminder(id: string): Promise<void>;
  saveUpiId(upiId: string): Promise<void>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const toStudent = (r: any): Student => ({
  id: r.id,
  name: r.name,
  branch: r.branch,
  dueDay: r.due_day,
  fee: r.fee,
  startOn: r.start_on,
  active: r.active,
});

const toPayment = (r: any): Payment => ({
  id: r.id,
  receiptNo: r.receipt_no,
  studentId: r.student_id,
  period: r.period,
  amount: r.amount,
  paidOn: r.paid_on,
  mode: r.mode,
  feeDue: r.fee_due,
  dueDate: r.due_date,
  coversTo: r.covers_to,
});

const toReminder = (r: any): Reminder => ({
  id: r.id,
  studentId: r.student_id,
  period: r.period,
  kind: r.kind,
  at: r.at,
});

const studentRow = (s: StudentInput) => ({
  name: s.name,
  branch: s.branch,
  due_day: s.dueDay,
  fee: s.fee,
  start_on: s.startOn,
});

/** Supabase returns errors rather than throwing them; turn them back into throws. */
function ok<T>(result: { data: T; error: { message: string; code?: string } | null }): T {
  if (!result.error) return result.data;
  const { message, code } = result.error;
  // PGRST205 / 42P01: the table is not there, i.e. the SQL file was never run.
  if (code === "PGRST205" || code === "42P01") {
    throw new Error("The database tables are not set up yet. Run the SQL file in Supabase first.");
  }
  throw new Error(message);
}

const supabaseStore: Store = {
  async load() {
    const [students, payments, reminders, settings] = await Promise.all([
      supabase.from("students").select("*").order("name"),
      supabase.from("payments").select("*").order("receipt_no"),
      supabase.from("reminders").select("*").order("at"),
      supabase.from("settings").select("upi_id").eq("id", 1).maybeSingle(),
    ]);
    return {
      students: (ok(students) ?? []).map(toStudent),
      payments: (ok(payments) ?? []).map(toPayment),
      reminders: (ok(reminders) ?? []).map(toReminder),
      upiId: ok(settings)?.upi_id ?? "",
    };
  },

  async addStudent(input) {
    return toStudent(ok(await supabase.from("students").insert(studentRow(input)).select().single()));
  },

  async updateStudent(id, input) {
    return toStudent(
      ok(await supabase.from("students").update(studentRow(input)).eq("id", id).select().single())
    );
  },

  async removeStudent(id, hasPayments) {
    const query = hasPayments
      ? supabase.from("students").update({ active: false }).eq("id", id)
      : supabase.from("students").delete().eq("id", id);
    ok(await query);
  },

  async addPayment(p) {
    const row = {
      student_id: p.studentId,
      period: p.period,
      amount: p.amount,
      paid_on: p.paidOn,
      mode: p.mode,
      fee_due: p.feeDue,
      due_date: p.dueDate,
      covers_to: p.coversTo,
    };
    return toPayment(ok(await supabase.from("payments").insert(row).select().single()));
  },

  async deletePayment(id) {
    ok(await supabase.from("payments").delete().eq("id", id));
  },

  async addReminder(r) {
    const row = { student_id: r.studentId, period: r.period, kind: r.kind };
    return toReminder(ok(await supabase.from("reminders").insert(row).select().single()));
  },

  async deleteReminder(id) {
    ok(await supabase.from("reminders").delete().eq("id", id));
  },

  async saveUpiId(upiId) {
    ok(await supabase.from("settings").upsert({ id: 1, upi_id: upiId }));
  },
};

/**
 * `?demo` on the dev server swaps in made-up students held in memory, so the
 * screens can be tried without touching the real records. The check is on
 * import.meta.env.DEV, so the demo code is not even included in the live app.
 */
export const isDemo = import.meta.env.DEV && new URLSearchParams(location.search).has("demo");

export async function getStore(): Promise<Store> {
  if (import.meta.env.DEV && isDemo) return (await import("./demo.ts")).demoStore;
  return supabaseStore;
}
