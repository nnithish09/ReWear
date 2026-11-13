import { useEffect } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => event.key === 'Escape' && !loading && onCancel();
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={() => !loading && onCancel()}
    >
      <div
        className="card w-full max-w-md animate-fade-up bg-canvas p-6 shadow-lift"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-blush-soft text-[#B4483F]">
          <Trash2 className="h-5 w-5" />
        </div>
        <h2 id="confirm-title" className="text-xl">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
