import { BellPlus, Check, Image as ImageIcon, PartyPopper } from "lucide-react";
import { formatCover, formatDay, lateLabel, rupees, todayISO } from "../lib/dues.ts";
import type { Due } from "../lib/dues.ts";
import type { Branch, Reminder } from "../lib/types.ts";
import { Segmented, btnDark, btnLight } from "./ui.tsx";

export type BranchFilter = "all" | Branch;

interface Props {
  /** Already filtered and sorted, most overdue first. */
  dues: Due[];
  reminders: Reminder[];
  filter: BranchFilter;
  onFilter: (filter: BranchFilter) => void;
  onPay: (due: Due) => void;
  onImage: (due: Due) => void;
  onRemind: (due: Due) => void;
}

// Three buttons share a phone-width row, so each stacks its icon over its label.
const stacked = "flex-col !gap-1 !px-1 py-2 min-h-14 !text-xs";

/** "Reminded 3 times · last 2 Oct" for one student's one due. */
export function reminderLine(reminders: Reminder[], due: Due): string {
  const mine = reminders.filter((r) => r.studentId === due.student.id && r.period === due.period);
  if (mine.length === 0) return "Not reminded yet";
  const last = mine.reduce((a, b) => (a.at > b.at ? a : b));
  const times = mine.length === 1 ? "once" : `${mine.length} times`;
  return `Reminded ${times} · last ${formatDay(todayISO(new Date(last.at)))}`;
}

export function DueList({ dues, reminders, filter, onFilter, onPay, onImage, onRemind }: Props) {
  const total = dues.reduce((sum, d) => sum + d.balance, 0);

  return (
    <div className="space-y-3">
      <Segmented
        value={filter}
        onChange={onFilter}
        options={[
          { value: "all", label: "Both" },
          { value: "Mangla", label: "Mangla" },
          { value: "Sarkanda", label: "Sarkanda" },
        ]}
      />

      {dues.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-slate-200">
          <PartyPopper className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="text-sm font-black text-slate-700 mt-3">Nobody owes fees right now.</p>
        </div>
      ) : (
        <>
          <p className="text-xs font-bold text-slate-400 px-1">
            {dues.length} due · {rupees(total)} pending
          </p>

          {dues.map((due) => (
            <article
              key={`${due.student.id}-${due.period}`}
              className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-slate-900 leading-tight break-words">
                    {due.student.name}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    {due.student.branch} · {formatCover(due)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-slate-900 leading-tight">{rupees(due.balance)}</p>
                  <span
                    className={`inline-block mt-1 text-[11px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
                      due.daysLate > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {lateLabel(due.daysLate)}
                  </span>
                </div>
              </div>

              {due.paid > 0 && (
                <p className="text-xs font-bold text-amber-600 mt-2">
                  {rupees(due.paid)} paid of {rupees(due.fee)}
                </p>
              )}
              <p className="text-xs font-semibold text-slate-500 mt-2">{reminderLine(reminders, due)}</p>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <button type="button" onClick={() => onPay(due)} className={`${btnDark} ${stacked}`}>
                  <Check className="w-4 h-4 shrink-0" /> Paid
                </button>
                <button type="button" onClick={() => onImage(due)} className={`${btnLight} ${stacked}`}>
                  <ImageIcon className="w-4 h-4 shrink-0" /> Due image
                </button>
                <button type="button" onClick={() => onRemind(due)} className={`${btnLight} ${stacked}`}>
                  <BellPlus className="w-4 h-4 shrink-0" /> Reminded
                </button>
              </div>
            </article>
          ))}
        </>
      )}
    </div>
  );
}
