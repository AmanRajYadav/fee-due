import type { Store } from "./db.ts";
import { coversTo, dueDateIn } from "./dues.ts";
import type { AppData, Payment, Student } from "./types.ts";

// Made-up students for trying the screens on the dev server (`?demo`).
// Nothing here is real and nothing is saved: a refresh resets it.

let nextId = 1;
const id = () => `demo-${nextId++}`;

const student = (name: string, branch: Student["branch"], dueDay: number | null, over: Partial<Student> = {}): Student => ({
  id: id(),
  name,
  branch,
  dueDay,
  fee: 2500,
  startOn: "2026-08-01",
  active: true,
  ...over,
});

const students: Student[] = [
  student("Demo Asha", "Mangla", 15),
  student("Demo Bharat", "Mangla", 1),
  student("Demo Chetna", "Mangla", null, { fee: 0 }),
  student("Demo Dev", "Sarkanda", 22),
  student("Demo Esha", "Sarkanda", 26),
  student("Demo Farhan With A Long Name", "Sarkanda", 10, { fee: 3000 }),
];

let receipt = 1;
const paid = (s: Student, period: string, amount: number, paidOn: string): Payment => ({
  id: id(),
  receiptNo: receipt++,
  studentId: s.id,
  period,
  amount,
  paidOn,
  mode: receipt % 2 ? "cash" : "upi",
  feeDue: s.fee,
  dueDate: dueDateIn(period, s.dueDay!),
  coversTo: coversTo(period, s.dueDay!),
});

const data: AppData = {
  students,
  payments: [
    paid(students[0], "2026-08", 2500, "2026-08-17"),
    paid(students[1], "2026-08", 2500, "2026-08-02"),
    paid(students[1], "2026-09", 2500, "2026-09-05"),
    paid(students[3], "2026-08", 2500, "2026-08-25"),
    paid(students[3], "2026-09", 1000, "2026-09-28"),
    paid(students[4], "2026-08", 2500, "2026-08-26"),
    paid(students[5], "2026-08", 3000, "2026-08-12"),
    paid(students[5], "2026-09", 3000, "2026-09-10"),
  ],
  reminders: [
    { id: id(), studentId: students[0].id, period: "2026-09", kind: "image", at: "2026-09-20T09:00:00Z" },
    { id: id(), studentId: students[0].id, period: "2026-09", kind: "manual", at: "2026-10-02T09:00:00Z" },
  ],
  upiId: "demo@upi",
};

export const demoStore: Store = {
  async load() {
    return structuredClone(data);
  },
  async addStudent(input) {
    const s = { ...input, id: id(), active: true };
    data.students.push(s);
    return { ...s };
  },
  async updateStudent(sid, input) {
    const s = data.students.find((x) => x.id === sid)!;
    Object.assign(s, input);
    return { ...s };
  },
  async removeStudent(sid, hasPayments) {
    if (hasPayments) data.students.find((x) => x.id === sid)!.active = false;
    else data.students = data.students.filter((x) => x.id !== sid);
  },
  async addPayment(input) {
    const p = { ...input, id: id(), receiptNo: receipt++ };
    data.payments.push(p);
    return { ...p };
  },
  async deletePayment(pid) {
    data.payments = data.payments.filter((x) => x.id !== pid);
  },
  async addReminder(input) {
    const r = { ...input, id: id(), at: new Date().toISOString() };
    data.reminders.push(r);
    return { ...r };
  },
  async deleteReminder(rid) {
    data.reminders = data.reminders.filter((x) => x.id !== rid);
  },
  async saveUpiId(upiId) {
    data.upiId = upiId;
  },
};
