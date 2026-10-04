import React, { useState } from "react";
import { Check, ChevronRight, Loader2, Plus } from "lucide-react";
import { ordinal, rupees } from "../lib/dues.ts";
import { BRANCHES } from "../lib/types.ts";
import type { Branch, Student, StudentInput } from "../lib/types.ts";
import { ConfirmButton, Modal, Segmented, btnDark, btnLight, field, label } from "./ui.tsx";

interface Props {
  /** Active students only. */
  students: Student[];
  today: string;
  upiId: string;
  onAdd: (input: StudentInput) => Promise<void>;
  onUpdate: (id: string, input: StudentInput) => Promise<void>;
  onRemove: (student: Student) => Promise<void>;
  onSaveUpi: (upiId: string) => Promise<void>;
}

const summary = (s: Student): string => {
  if (s.fee === 0) return "Free";
  if (!s.dueDay) return `${rupees(s.fee)} · due day not set`;
  return `${rupees(s.fee)} · due on the ${ordinal(s.dueDay)}`;
};

function StudentForm({
  student,
  today,
  onClose,
  onSave,
  onRemove,
}: {
  student: Student | null;
  today: string;
  onClose: () => void;
  onSave: (input: StudentInput) => Promise<void>;
  onRemove?: () => Promise<void>;
}) {
  const [name, setName] = useState(student?.name ?? "");
  const [branch, setBranch] = useState<Branch>(student?.branch ?? "Mangla");
  const [fee, setFee] = useState(String(student?.fee ?? 2500));
  const [dueDay, setDueDay] = useState(student?.dueDay ? String(student.dueDay) : "");
  const [startOn, setStartOn] = useState(student?.startOn ?? today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const day = dueDay === "" ? null : Number(dueDay);
  const problem =
    name.trim() === ""
      ? "Enter the student's name."
      : fee === ""
        ? "Enter the monthly fee (0 if free)."
        : day !== null && (day < 1 || day > 31)
          ? "The due day must be between 1 and 31."
          : !startOn
            ? "Choose the date to track fees from."
            : null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || problem) return;
    void run(() => onSave({ name: name.trim(), branch, fee: Number(fee), dueDay: day, startOn }));
  };

  return (
    <Modal title={student ? "Edit student" : "Add student"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={label} htmlFor="st-name">
            Name
          </label>
          <input id="st-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>

        <div>
          <span className={label}>Branch</span>
          <Segmented
            value={branch}
            onChange={setBranch}
            options={BRANCHES.map((b) => ({ value: b, label: b }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="st-fee">
              Monthly fee (₹)
            </label>
            <input
              id="st-fee"
              inputMode="numeric"
              value={fee}
              onChange={(e) => setFee(e.target.value.replace(/\D/g, ""))}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="st-day">
              Due day (1–31)
            </label>
            <input
              id="st-day"
              inputMode="numeric"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
              className={field}
            />
          </div>
        </div>
        <p className="text-[11px] font-semibold text-slate-400 !mt-2">
          Fee 0 means free. With no due day, no dues appear. A change here applies to months that are
          not paid yet; paid months stay as they were.
        </p>

        <div>
          <label className={label} htmlFor="st-start">
            Track fees from
          </label>
          <input
            id="st-start"
            type="date"
            value={startOn}
            onChange={(e) => setStartOn(e.target.value)}
            className={field}
          />
        </div>

        {error && <p className="text-center text-xs font-bold text-red-500">{error}</p>}
        {!error && problem && name !== "" && (
          <p className="text-center text-xs font-bold text-red-500">{problem}</p>
        )}

        <div className="flex gap-2">
          {onRemove && (
            <ConfirmButton
              disabled={busy}
              confirmText="Tap again to remove"
              onConfirm={() => void run(onRemove)}
              className={`${btnLight} !text-red-600`}
            >
              Remove
            </ConfirmButton>
          )}
          <button type="submit" disabled={busy || Boolean(problem)} className={`${btnDark} flex-1`}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

function UpiCard({ upiId, onSave }: { upiId: string; onSave: (upiId: string) => Promise<void> }) {
  const [value, setValue] = useState(upiId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = value.trim() !== upiId;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(value.trim());
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  return (
    <form onSubmit={save} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/60">
      <label className={label} htmlFor="upi">
        Your UPI ID (shown on receipts and fee-due images)
      </label>
      <div className="flex gap-2">
        <input
          id="upi"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="name@bank"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`${field} min-w-0`}
        />
        <button type="submit" disabled={busy || !changed} className={`${btnDark} shrink-0`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
        </button>
      </div>
      {error && <p className="text-xs font-bold text-red-500 mt-2">{error}</p>}
    </form>
  );
}

export function Students({ students, today, upiId, onAdd, onUpdate, onRemove, onSaveUpi }: Props) {
  // null = closed, "new" = adding, otherwise the student being edited.
  const [editing, setEditing] = useState<Student | "new" | null>(null);

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setEditing("new")} className={`${btnDark} w-full`}>
        <Plus className="w-4 h-4" /> Add student
      </button>

      {BRANCHES.map((branch) => {
        const list = students.filter((s) => s.branch === branch);
        return (
          <section key={branch}>
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1 mb-2">
              {branch} · {list.length}
            </h2>
            <ul className="bg-white rounded-3xl shadow-sm border border-slate-200/60 px-4">
              {list.length === 0 && (
                <li className="py-4 text-sm font-bold text-slate-400">No students yet.</li>
              )}
              {list.map((s) => (
                <li key={s.id} className="border-b border-slate-100 last:border-0">
                  <button
                    type="button"
                    onClick={() => setEditing(s)}
                    className="w-full flex items-center justify-between gap-3 py-3 text-left cursor-pointer"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-slate-800 break-words">{s.name}</span>
                      <span className="block text-[11px] font-bold text-slate-400">{summary(s)}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <UpiCard key={upiId} upiId={upiId} onSave={onSaveUpi} />

      {editing && (
        <StudentForm
          student={editing === "new" ? null : editing}
          today={today}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            if (editing === "new") await onAdd(input);
            else await onUpdate(editing.id, input);
            setEditing(null);
          }}
          onRemove={
            editing === "new"
              ? undefined
              : async () => {
                  await onRemove(editing);
                  setEditing(null);
                }
          }
        />
      )}
    </div>
  );
}
