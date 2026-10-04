export type Branch = "Mangla" | "Sarkanda";
export const BRANCHES: Branch[] = ["Mangla", "Sarkanda"];

export type PayMode = "cash" | "upi";

/** Dates are plain "YYYY-MM-DD" strings everywhere; no time zones to trip over. */
export interface Student {
  id: string;
  name: string;
  branch: Branch;
  /** Day of the month the fee falls due. null = not decided, so no dues. */
  dueDay: number | null;
  /** Monthly fee in rupees. 0 = learns for free, so no dues. */
  fee: number;
  /** Dues before this date are not tracked. */
  startOn: string;
  /** false = removed from the lists, but their past payments are kept. */
  active: boolean;
}

export type StudentInput = Omit<Student, "id" | "active">;

export interface Payment {
  id: string;
  receiptNo: number;
  studentId: string;
  /** "YYYY-MM": the month the due date falls in. One due per student per month. */
  period: string;
  amount: number;
  paidOn: string;
  mode: PayMode;
  // Copied from the due at the time of payment, so a later change to the
  // student's fee or due day never rewrites a month that was already paid.
  feeDue: number;
  dueDate: string;
  coversTo: string;
}

export type NewPayment = Omit<Payment, "id" | "receiptNo">;

export interface Reminder {
  id: string;
  studentId: string;
  period: string;
  /** "image" = sent the fee-due image; "manual" = logged by hand. */
  kind: "image" | "manual";
  at: string;
}

export type NewReminder = Omit<Reminder, "id" | "at">;

export interface AppData {
  students: Student[];
  payments: Payment[];
  reminders: Reminder[];
  upiId: string;
}
