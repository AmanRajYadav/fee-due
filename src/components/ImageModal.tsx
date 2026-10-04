import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { renderImage } from "../lib/receipt.ts";
import type { ImageSpec } from "../lib/receipt.ts";
import { Modal, btnDark, btnLight } from "./ui.tsx";

interface Props {
  spec: ImageSpec;
  onClose: () => void;
  /** Called once the phone's share sheet reports the image was sent. */
  onShared?: () => void;
}

/** Shows a receipt or fee-due image and hands it to the phone's share sheet. */
export function ImageModal({ spec, onClose, onShared }: Props) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    renderImage(spec).then(
      (b) => active && setBlob(b),
      (e: Error) => active && setError(e.message)
    );
    return () => {
      active = false;
    };
  }, [spec]);

  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const file = useMemo(
    () => (blob ? new File([blob], spec.fileName, { type: "image/png" }) : null),
    [blob, spec.fileName]
  );
  const canShare = Boolean(file && navigator.canShare?.({ files: [file] }));

  const share = async () => {
    if (!file) return;
    try {
      // The image only: no text is attached, the message is yours to paste.
      await navigator.share({ files: [file] });
      onShared?.();
    } catch (e) {
      // AbortError = the share sheet was closed without choosing anything.
      if ((e as Error).name !== "AbortError") setError("Sharing did not work. Use Download instead.");
    }
  };

  return (
    <Modal title={spec.title} onClose={onClose}>
      <div className="bg-slate-100 rounded-2xl overflow-hidden min-h-48 flex items-center justify-center">
        {url ? (
          <img src={url} alt={`${spec.title} image`} className="w-full block" />
        ) : error ? null : (
          <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
        )}
      </div>

      {error && <p className="text-center text-xs font-bold text-red-500 mt-3">{error}</p>}

      <div className="flex gap-2 mt-4">
        {canShare && (
          <button type="button" onClick={share} className={`${btnDark} flex-1`}>
            <Share2 className="w-4 h-4" /> Share
          </button>
        )}
        {url && (
          <a href={url} download={spec.fileName} className={`${canShare ? btnLight : btnDark} flex-1`}>
            <Download className="w-4 h-4" /> Download
          </a>
        )}
      </div>
    </Modal>
  );
}
