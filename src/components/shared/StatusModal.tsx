import { useState } from "react";
import { X } from "lucide-react";

type Row = { label: string; value: string };

type StatusModalProps<S extends string> = {
  title: string;
  rows: Row[];
  statusOptions: S[];
  currentStatus: S;
  onSave: (status: S) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
};

// Same "read-only context + one editable status field" shape covers RSVP
// status and support ticket status — see eventor-build-spec.md §8. Payments
// have no status endpoint (see paymentsAPI.ts), so this isn't used there.
export default function StatusModal<S extends string>({
  title,
  rows,
  statusOptions,
  currentStatus,
  onSave,
  onClose,
  isSaving,
}: StatusModalProps<S>) {
  const [status, setStatus] = useState<S>(currentStatus);
  const [error, setError] = useState(false);

  const handleSave = async () => {
    setError(false);
    try {
      await onSave(status);
      onClose();
    } catch {
      setError(true);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" aria-label="Close">
          <X size={18} />
        </button>

        <h3 className="font-display text-xl mb-4">{title}</h3>

        <div className="space-y-2 text-sm mb-5">
          {rows.map((r) => (
            <p key={r.label} className="flex justify-between gap-4">
              <span className="text-base-content/60">{r.label}</span>
              <span className="text-right">{r.value}</span>
            </p>
          ))}
        </div>

        <label className="text-sm block mb-5">
          Status
          <select
            className="select select-bordered w-full mt-1"
            value={status}
            onChange={(e) => setStatus(e.target.value as S)}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-error text-sm mb-3">Couldn't update status. Try again.</p>}

        <button className="btn btn-primary w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
