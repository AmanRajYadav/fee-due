import { useState } from "react";
import { ChevronDown, Receipt } from "lucide-react";
import {
  formatCover,
  formatDay,
  formatMonth,
  receiptLabel,
  rupees,
  summariseMonths,
} from "../lib/dues.ts";
import type { Due } from "../lib/dues.ts";
import type { Payment, Reminder, Student } from "../lib/types.ts";
import { reminderLine } from "./DueList.tsx";
import { ConfirmButton, Segmented, field } from "./ui.tsx";

interface Props {
  /** Every due for every student, including removed students' paid months. */
  dues: Due[];
  students: Student[];
  reminders: Reminder[];
  onReceipt: (due: Due, payment: Payment) => void;
  onUndo: (payment: Payment) => void;
}

const card = "bg-white rounded-3xl shadow-sm border border-slate-200/60";

function Status({ due }: { due: Due }) {
  if (due.balance === 0) {
    const last = due.payments[due.payments.length - 1];
    return (
      <span className="text-xs font-black text-emerald-600 whitespace-nowrap">
        Paid {formatDay(last.paidOn)}
      </span>
    );
  }
  return (
    <span className="text-xs font-black text-red-600 whitespace-nowrap">
      {due.paid > 0 ? `${rupees(due.balance)} left` : `${rupees(due.balance)} pending`}
    </span>
  );
}

function ByMonth({ dues }: { dues: Due[] }) {
  const months = summariseMonths(dues);
  const [open, setOpen] = useState<string | null>(months[0]?.period ?? null);

  if (months.length === 0) {
    return <p className="text-center text-sm font-bold text-slate-400 py-10">No dues yet.</p>;
  }

  return (
    <div className="space-y-3">
      {months.map((m) => (
        <section key={m.period} className={card}>
          <button
            type="button"
            aria-expanded={open === m.period}
            onClick={() => setOpen(open === m.period ? null : m.period)}
            className="w-full text-left p-4 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-black text-slate-900">{formatMonth(m.period)} dues</h3>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform ${open === m.period ? "rotate-180" : ""}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-emerald-50 rounded-2xl px-3 py-2">
                <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-700/70">
                  Collected
                </span>
                <span className="text-lg font-black text-emerald-700">{rupees(m.collected)}</span>
              </div>
              <div className="bg-red-50 rounded-2xl px-3 py-2">
                <span className="block text-[10px] font-black uppercase tracking-wider text-red-700/70">
                  Pending
                </span>
                <span className="text-lg font-black text-red-700">{rupees(m.pending)}</span>
              </div>
            </div>
          </button>

          {open === m.period && (
            <ul className="border-t border-slate-100 px-4 py-1">
              {m.dues.map((d) => (
                <li
                  key={d.student.id}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800 break-words">{d.student.name}</p>
                    <p className="text-[11px] font-bold text-slate-400">
                      {d.student.branch} · due {formatDay(d.dueDate)}
                    </p>
                  </div>
                  <Status due={d} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function ByStudent({ dues, students, reminders, onReceipt, onUndo }: Props) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const mine = dues.filter((d) => d.student.id === studentId).reverse();

  return (
    <div className="space-y-3">
      <select
        aria-label="Student"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        className={field}
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.branch}){s.active ? "" : " · removed"}
          </option>
        ))}
      </select>

      {mine.length === 0 ? (
        <p className="text-center text-sm font-bold text-slate-400 py-10">Nothing due yet.</p>
      ) : (
        mine.map((d) => (
          <section key={d.period} className={`${card} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">{formatCover(d)}</h3>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                  Fee {rupees(d.fee)} · {reminderLine(reminders, d)}
                </p>
              </div>
              <Status due={d} />
            </div>

            {d.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100"
              >
                <p className="text-xs font-bold text-slate-600 min-w-0">
                  <span className="font-black text-slate-900">{rupees(p.amount)}</span> ·{" "}
                  {formatDay(p.paidOn)} · {p.mode === "upi" ? "UPI" : "Cash"}
                  <span className="block text-[11px] text-slate-400">{receiptLabel(p.receiptNo)}</span>
                </p>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onReceipt(d, p)}
                    className="flex items-center gap-1 min-h-10 px-3 rounded-xl bg-slate-800 text-white text-xs font-black cursor-pointer active:scale-95"
                  >
                    <Receipt className="w-3.5 h-3.5" /> Receipt
                  </button>
                  <ConfirmButton
                    confirmText="Tap again"
                    onConfirm={() => onUndo(p)}
                    className="min-h-10 px-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-black cursor-pointer active:scale-95"
                  >
                    Undo
                  </ConfirmButton>
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}

export function History(props: Props) {
  const [view, setView] = useState<"month" | "student">("month");

  return (
    <div className="space-y-3">
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: "month", label: "By month" },
          { value: "student", label: "By student" },
        ]}
      />
      {view === "month" ? <ByMonth dues={props.dues} /> : <ByStudent {...props} />}
    </div>
  );
}
