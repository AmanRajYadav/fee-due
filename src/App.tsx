import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { History as HistoryIcon, ListChecks, Loader2, Users } from "lucide-react";
import { DueList } from "./components/DueList.tsx";
import type { BranchFilter } from "./components/DueList.tsx";
import { History } from "./components/History.tsx";
import { ImageModal } from "./components/ImageModal.tsx";
import { PayModal } from "./components/PayModal.tsx";
import { Students } from "./components/Students.tsx";
import { getStore, isDemo } from "./lib/db.ts";
import type { Store } from "./lib/db.ts";
import { buildDues, owedNow, rupees, todayISO } from "./lib/dues.ts";
import type { Due } from "./lib/dues.ts";
import { dueSpec, receiptSpec } from "./lib/receipt.ts";
import type { ImageSpec } from "./lib/receipt.ts";
import { isSupabaseConfigured } from "./lib/supabase.ts";
import type { AppData, Payment, PayMode, Student, StudentInput } from "./lib/types.ts";

type Tab = "due" | "history" | "students";

const FILTER_KEY = "fluence_fees_branch";

const TABS: { id: Tab; label: string; icon: typeof ListChecks }[] = [
  { id: "due", label: "Due", icon: ListChecks },
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "students", label: "Students", icon: Users },
];

interface Toast {
  message: string;
  undo?: () => void;
}

function Brand({ large = false }: { large?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${large ? "flex-col" : ""}`}>
      <img
        src={`${import.meta.env.BASE_URL}fluence_logo.png`}
        alt=""
        aria-hidden="true"
        className={`${large ? "w-14 h-14" : "w-10 h-10"} shrink-0 object-contain`}
      />
      <div className={`leading-none ${large ? "text-center" : ""}`}>
        <h1 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">
          Fluence
        </h1>
        <p className="text-[9px] text-slate-400 uppercase tracking-[0.16em] font-bold mt-1.5 whitespace-nowrap">
          Question Everything
        </p>
      </div>
    </div>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8 max-w-md w-full text-center">
        <Brand large />
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  const store = useRef<Store | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState(todayISO);
  const [tab, setTab] = useState<Tab>("due");
  const [filter, setFilter] = useState<BranchFilter>(() => {
    const saved = localStorage.getItem(FILTER_KEY);
    return saved === "Mangla" || saved === "Sarkanda" ? saved : "all";
  });
  const [paying, setPaying] = useState<Due | null>(null);
  const [image, setImage] = useState<{ spec: ImageSpec; remindFor?: Due } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      store.current ??= await getStore();
      setData(await store.current.load());
      setToday(todayISO());
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured || isDemo) void load();
  }, [load]);

  // The app is often left open on the phone. Coming back to it the next day
  // should show the new day's dues without needing a manual refresh.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && store.current) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const allDues = useMemo(
    () => (data ? data.students.flatMap((s) => buildDues(s, data.payments, today)) : []),
    [data, today]
  );
  const owed = useMemo(
    () => owedNow(allDues).filter((d) => filter === "all" || d.student.branch === filter),
    [allDues, filter]
  );

  if (!isSupabaseConfigured && !isDemo) {
    return (
      <FullScreen>
        <p className="text-sm font-bold text-slate-600">
          Supabase is not configured. Add the project URL and anon key, then rebuild.
        </p>
      </FullScreen>
    );
  }

  if (!data) {
    return (
      <FullScreen>
        {loadError ? (
          <>
            <p className="text-sm font-bold text-red-600">{loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 px-4 min-h-12 bg-slate-800 text-white font-black text-sm rounded-2xl cursor-pointer"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-semibold mt-3">Loading fees…</p>
          </>
        )}
      </FullScreen>
    );
  }

  const db = store.current!;
  const patch = (change: (d: AppData) => Partial<AppData>) =>
    setData((d) => (d ? { ...d, ...change(d) } : d));
  const fail = (err: unknown) => setToast({ message: `Not saved: ${(err as Error).message}` });

  const undoPayment = async (payment: Payment) => {
    try {
      await db.deletePayment(payment.id);
      patch((d) => ({ payments: d.payments.filter((p) => p.id !== payment.id) }));
      setToast({ message: "Payment removed." });
    } catch (err) {
      fail(err);
    }
  };

  const savePayment = async (due: Due, amount: number, paidOn: string, mode: PayMode) => {
    const payment = await db.addPayment({
      studentId: due.student.id,
      period: due.period,
      amount,
      paidOn,
      mode,
      feeDue: due.fee,
      dueDate: due.dueDate,
      coversTo: due.coversTo,
    });
    patch((d) => ({ payments: [...d.payments, payment] }));
    setPaying(null);
    const paidDue = { ...due, payments: [...due.payments, payment] };
    setImage({ spec: receiptSpec(paidDue, payment, data.upiId) });
    setToast({
      message: `${due.student.name}: ${rupees(amount)} saved.`,
      undo: () => {
        setImage(null);
        void undoPayment(payment);
      },
    });
  };

  const remind = async (due: Due, kind: "image" | "manual") => {
    try {
      const reminder = await db.addReminder({ studentId: due.student.id, period: due.period, kind });
      patch((d) => ({ reminders: [...d.reminders, reminder] }));
      setToast({
        message: `Reminder noted for ${due.student.name}.`,
        undo: async () => {
          try {
            await db.deleteReminder(reminder.id);
            patch((d) => ({ reminders: d.reminders.filter((r) => r.id !== reminder.id) }));
            setToast(null);
          } catch (err) {
            fail(err);
          }
        },
      });
    } catch (err) {
      fail(err);
    }
  };

  const addStudent = async (input: StudentInput) => {
    const student = await db.addStudent(input);
    patch((d) => ({ students: [...d.students, student].sort((a, b) => a.name.localeCompare(b.name)) }));
  };

  const updateStudent = async (id: string, input: StudentInput) => {
    const student = await db.updateStudent(id, input);
    patch((d) => ({
      students: d.students
        .map((s) => (s.id === id ? student : s))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  };

  const removeStudent = async (student: Student) => {
    const hasPayments = data.payments.some((p) => p.studentId === student.id);
    await db.removeStudent(student.id, hasPayments);
    patch((d) => ({
      students: hasPayments
        ? d.students.map((s) => (s.id === student.id ? { ...s, active: false } : s))
        : d.students.filter((s) => s.id !== student.id),
      reminders: hasPayments ? d.reminders : d.reminders.filter((r) => r.studentId !== student.id),
    }));
    setToast({ message: `${student.name} removed.` });
  };

  const saveUpi = async (upiId: string) => {
    await db.saveUpiId(upiId);
    patch(() => ({ upiId }));
    setToast({ message: "UPI ID saved." });
  };

  // History lists removed students too, but only if they have something to show.
  const historyStudents = data.students.filter(
    (s) => s.active || allDues.some((d) => d.student.id === s.id)
  );

  return (
    <div className="min-h-dvh bg-slate-100 font-sans text-slate-800 selection:bg-indigo-200">
      <header className="bg-white border-b-2 border-slate-200/60 sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <Brand />
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 rounded-xl px-3 py-1.5">
            {isDemo ? "Demo" : "Fees"}
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 pb-28">
        {tab === "due" && (
          <DueList
            dues={owed}
            reminders={data.reminders}
            filter={filter}
            onFilter={(f) => {
              localStorage.setItem(FILTER_KEY, f);
              setFilter(f);
            }}
            onPay={setPaying}
            onImage={(due) => setImage({ spec: dueSpec(due, data.upiId), remindFor: due })}
            onRemind={(due) => void remind(due, "manual")}
          />
        )}
        {tab === "history" && (
          <History
            dues={allDues}
            students={historyStudents}
            reminders={data.reminders}
            onReceipt={(due, payment) => setImage({ spec: receiptSpec(due, payment, data.upiId) })}
            onUndo={(payment) => void undoPayment(payment)}
          />
        )}
        {tab === "students" && (
          <Students
            students={data.students.filter((s) => s.active)}
            today={today}
            upiId={data.upiId}
            onAdd={addStudent}
            onUpdate={updateStudent}
            onRemove={removeStudent}
            onSaveUpi={saveUpi}
          />
        )}
      </main>

      {toast && (
        <div
          role="status"
          // At the top, so it never sits on the Share button or the bottom bar.
          className="fixed left-0 right-0 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 px-4 pointer-events-none"
        >
          <div className="max-w-md mx-auto bg-slate-900 text-white rounded-2xl shadow-xl pl-4 pr-2 py-2 flex items-center justify-between gap-3 pointer-events-auto">
            <span className="text-sm font-bold py-1.5">{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={toast.undo}
                className="shrink-0 min-h-10 px-3 rounded-xl bg-white/15 text-sm font-black cursor-pointer"
              >
                Undo
              </button>
            )}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-slate-200/60 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto grid grid-cols-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-black cursor-pointer ${
                tab === id ? "text-slate-900" : "text-slate-400"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {paying && (
        <PayModal
          due={paying}
          today={today}
          onClose={() => setPaying(null)}
          onSave={(amount, paidOn, mode) => savePayment(paying, amount, paidOn, mode)}
        />
      )}

      {image && (
        <ImageModal
          spec={image.spec}
          onClose={() => setImage(null)}
          onShared={image.remindFor ? () => void remind(image.remindFor!, "image") : undefined}
        />
      )}
    </div>
  );
}
