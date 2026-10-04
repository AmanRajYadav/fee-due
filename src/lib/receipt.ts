import { formatCover, formatDate, receiptLabel, rupees } from "./dues.ts";
import type { Due } from "./dues.ts";
import type { Payment } from "./types.ts";

/**
 * Receipt and fee-due images, drawn on a canvas in the browser. Nothing is
 * uploaded anywhere: the picture exists only on the phone until it is shared.
 */

export interface ImageSpec {
  title: string;
  /** Shown on the right of the title bar, e.g. the receipt number. */
  tag?: string;
  rows: { label: string; value: string }[];
  amountLabel: string;
  amount: string;
  note?: { text: string; tone: "good" | "warn" };
  footer?: string;
  fileName: string;
}

const MODE_LABEL = { cash: "Cash", upi: "UPI" } as const;

const safeName = (name: string) => name.trim().replace(/[^\p{L}\p{N}]+/gu, "-");

export function receiptSpec(due: Due, payment: Payment, upiId: string): ImageSpec {
  // Balance as it stood right after this payment, so an old part-payment
  // receipt reads the same if it is shared again later.
  const paidSoFar = due.payments
    .filter((p) => p.receiptNo <= payment.receiptNo)
    .reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(0, due.fee - paidSoFar);
  const no = receiptLabel(payment.receiptNo);

  return {
    title: "Fee Receipt",
    tag: no,
    rows: [
      { label: "Student", value: due.student.name },
      { label: "Branch", value: due.student.branch },
      { label: "Fee for", value: formatCover(due) },
      { label: "Date paid", value: formatDate(payment.paidOn) },
      { label: "Paid by", value: MODE_LABEL[payment.mode] },
    ],
    amountLabel: "Amount received",
    amount: rupees(payment.amount),
    note:
      balance > 0
        ? { text: `Balance remaining ${rupees(balance)}`, tone: "warn" }
        : { text: "Paid in full", tone: "good" },
    footer: upiId ? `UPI: ${upiId}` : undefined,
    fileName: `Fluence-receipt-${no}-${safeName(due.student.name)}.png`,
  };
}

export function dueSpec(due: Due, upiId: string): ImageSpec {
  const rows = [
    { label: "Student", value: due.student.name },
    { label: "Branch", value: due.student.branch },
    { label: "Fee for", value: formatCover(due) },
    { label: "Due date", value: formatDate(due.dueDate) },
  ];
  if (due.paid > 0) rows.push({ label: "Paid so far", value: rupees(due.paid) });

  return {
    title: "Fee Due",
    rows,
    amountLabel: "Amount due",
    amount: rupees(due.balance),
    footer: upiId ? `Pay by UPI: ${upiId}` : undefined,
    fileName: `Fluence-fee-due-${safeName(due.student.name)}-${due.period}.png`,
  };
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

const W = 1080;
const MARGIN = 48;
const PAD = 64;
const LEFT = MARGIN + PAD;
const RIGHT = W - MARGIN - PAD;
const ROW_H = 96;
const FONT = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const SLATE_900 = "#0f172a";
const SLATE_500 = "#64748b";
const SLATE_400 = "#94a3b8";
const SLATE_200 = "#e2e8f0";
const SLATE_100 = "#f1f5f9";
const SLATE_50 = "#f8fafc";

let logo: Promise<HTMLImageElement> | null = null;
const loadLogo = () =>
  (logo ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the logo."));
    img.src = `${import.meta.env.BASE_URL}fluence_logo.png`;
  }));

/** Canvas text silently falls back to another font unless the face is already loaded. */
async function loadFonts(sample: string) {
  try {
    await Promise.all(
      [600, 700, 800, 900].map((weight) => document.fonts.load(`${weight} 32px Inter`, sample))
    );
  } catch {
    /* offline: the system font is fine */
  }
}

const spaced = (ctx: CanvasRenderingContext2D, px: number) => {
  // Not in every browser; where it is missing the text is simply unspaced.
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
};

/** Shrinks the font until the text fits, so a long name never runs off the edge. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number) {
  for (let s = size; s >= 20; s -= 2) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) return;
  }
}

export async function renderImage(spec: ImageSpec): Promise<Blob> {
  const [img] = await Promise.all([
    loadLogo(),
    loadFonts(spec.title + spec.amount + spec.rows.map((r) => r.value).join("")),
  ]);

  const headerBottom = 430;
  const barTop = headerBottom;
  const barH = 104;
  const rowsTop = barTop + barH + 28;
  const rowsBottom = rowsTop + spec.rows.length * ROW_H;
  const boxTop = rowsBottom + 36;
  const boxH = spec.note ? 300 : 236;
  const footerH = spec.footer ? 96 : 0;
  const cardBottom = boxTop + boxH + footerH + PAD;
  const H = cardBottom + MARGIN;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw the image.");

  ctx.fillStyle = SLATE_100;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(MARGIN, MARGIN, W - MARGIN * 2, cardBottom - MARGIN, 48);
  ctx.fill();

  // Brand
  const logoSize = 170;
  ctx.drawImage(img, (W - logoSize) / 2, MARGIN + 40, logoSize, logoSize);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = SLATE_900;
  ctx.font = `900 68px ${FONT}`;
  spaced(ctx, 16);
  ctx.fillText("FLUENCE", W / 2 + 8, 340);
  ctx.fillStyle = SLATE_400;
  ctx.font = `700 24px ${FONT}`;
  spaced(ctx, 5);
  ctx.fillText("QUESTION EVERYTHING", W / 2 + 2, 386);

  // Title bar
  ctx.fillStyle = SLATE_900;
  ctx.beginPath();
  ctx.roundRect(LEFT - 24, barTop, RIGHT - LEFT + 48, barH, 28);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `800 36px ${FONT}`;
  spaced(ctx, 4);
  ctx.fillText(spec.title.toUpperCase(), LEFT + 8, barTop + barH / 2 + 2);
  if (spec.tag) {
    ctx.textAlign = "right";
    spaced(ctx, 1);
    ctx.fillText(spec.tag, RIGHT - 8, barTop + barH / 2 + 2);
  }
  spaced(ctx, 0);

  // Rows
  spec.rows.forEach((row, i) => {
    const y = rowsTop + i * ROW_H + ROW_H / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = SLATE_400;
    ctx.font = `700 26px ${FONT}`;
    spaced(ctx, 2);
    const label = row.label.toUpperCase();
    ctx.fillText(label, LEFT, y);
    const labelWidth = ctx.measureText(label).width;
    spaced(ctx, 0);

    ctx.textAlign = "right";
    ctx.fillStyle = SLATE_900;
    fitFont(ctx, row.value, 800, 40, RIGHT - LEFT - labelWidth - 40);
    ctx.fillText(row.value, RIGHT, y);

    ctx.strokeStyle = SLATE_200;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(LEFT, rowsTop + (i + 1) * ROW_H);
    ctx.lineTo(RIGHT, rowsTop + (i + 1) * ROW_H);
    ctx.stroke();
  });

  // Amount
  ctx.fillStyle = SLATE_50;
  ctx.strokeStyle = SLATE_200;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(LEFT - 24, boxTop, RIGHT - LEFT + 48, boxH, 36);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = SLATE_500;
  ctx.font = `700 28px ${FONT}`;
  spaced(ctx, 3);
  ctx.fillText(spec.amountLabel.toUpperCase(), W / 2, boxTop + 58);
  spaced(ctx, 0);

  ctx.fillStyle = SLATE_900;
  ctx.font = `900 108px ${FONT}`;
  ctx.fillText(spec.amount, W / 2, boxTop + 150);

  if (spec.note) {
    ctx.fillStyle = spec.note.tone === "good" ? "#059669" : "#b45309";
    ctx.font = `800 32px ${FONT}`;
    ctx.fillText(spec.note.text, W / 2, boxTop + 244);
  }

  if (spec.footer) {
    ctx.fillStyle = SLATE_500;
    fitFont(ctx, spec.footer, 600, 30, RIGHT - LEFT);
    ctx.fillText(spec.footer, W / 2, boxTop + boxH + 64);
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not make the image."))), "image/png")
  );
}
