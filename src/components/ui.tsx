import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

export const field =
  "w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 disabled:opacity-60";

export const label = "block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5";

export const btnDark =
  "flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-black text-sm px-4 min-h-12 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer";

export const btnLight =
  "flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-black text-sm px-4 min-h-12 rounded-2xl border border-slate-200 transition-all active:scale-95 cursor-pointer";

/** A sheet that slides up from the bottom on a phone and sits centred on a wide screen. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/80 flex items-end sm:items-center justify-center z-40 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] w-full max-w-md max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-lg font-black text-slate-900 leading-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-1 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Two-way or three-way switch. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex bg-slate-200/70 rounded-2xl p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`flex-1 min-h-10 rounded-xl text-sm font-black transition-all cursor-pointer ${
            o.value === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Asks for a second tap before doing anything that deletes. A slip of the
 * thumb on a phone should never remove a payment.
 */
export function ConfirmButton({
  children,
  confirmText,
  onConfirm,
  className,
  disabled,
}: {
  children: React.ReactNode;
  confirmText: string;
  onConfirm: () => void;
  className: string;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
      className={`${className} ${armed ? "!bg-red-600 !text-white !border-red-600" : ""}`}
    >
      {armed ? confirmText : children}
    </button>
  );
}
