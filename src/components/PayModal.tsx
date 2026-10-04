import React, { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { formatCover, rupees } from "../lib/dues.ts";
import type { Due } from "../lib/dues.ts";
import type { PayMode } from "../lib/types.ts";
import { Modal, Segmented, btnDark, field, label } from "./ui.tsx";

const MODE_KEY = "fluence_fees_last_mode";

interface Props {
  due: Due;
  today: string;
  onClose: () => void;
  onSave: (amount: number, paidOn: string, mode: PayMode) => Promise<void>;
}

export function PayModal({ due, today, onClose, onSave }: Props) {
  const [amount, setAmount] = useState(String(due.balance));
  const [paidOn, setPaidOn] = useState(today);
  // Starts on whichever was used last, so the usual case is a single tap on Save.
  const [mode, setMode] = useState<PayMode>(() =>
    localStorage.getItem(MODE_KEY) === "upi" ? "upi" : "cash"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = Number(amount);
  const problem =
    !Number.isInteger(value) || value <= 0
      ? "Enter the amount paid."
      : value > due.balance
        ? `That is more than the ${rupees(due.balance)} owed.`
        : !paidOn || paidOn > today
          ? "The date cannot be in the future."
          : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || problem) return;
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem(MODE_KEY, mode);
      await onSave(value, paidOn, mode);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title={`${due.student.name} paid`} onClose={onClose}>
      <p className="text-xs font-bold text-slate-400 -mt-3 mb-4">
        {due.student.branch} · {formatCover(due)}
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={label} htmlFor="pay-amount">
            Amount (₹)
          </label>
          <input
            id="pay-amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            className={`${field} text-2xl font-black`}
          />
          {value > 0 && value < due.balance && (
            <p className="text-xs font-bold text-amber-600 mt-1.5">
              Part payment. {rupees(due.balance - value)} will still be due.
            </p>
          )}
        </div>

        <div>
          <label className={label} htmlFor="pay-date">
            Date paid
          </label>
          <input
            id="pay-date"
            type="date"
            value={paidOn}
            max={today}
            onChange={(e) => setPaidOn(e.target.value)}
            className={field}
          />
        </div>

        <div>
          <span className={label}>Paid by</span>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: "cash", label: "Cash" },
              { value: "upi", label: "UPI" },
            ]}
          />
        </div>

        {(error || (problem && amount !== "")) && (
          <p className="text-center text-xs font-bold text-red-500">{error ?? problem}</p>
        )}

        <button type="submit" disabled={busy || Boolean(problem)} className={`${btnDark} w-full`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save and make receipt
        </button>
      </form>
    </Modal>
  );
}
