import { useState } from "react";
import { X, CalendarDays } from "lucide-react";
import type { TRSVP } from "../../reducers/rsvp/rsvpAPI";
import { useLinkGuestRSVPsMutation } from "../../reducers/rsvp/rsvpAPI";

type GuestRSVPLinkModalProps = {
  rsvps: TRSVP[];
  onClose: () => void;
};

// Fires whenever a login/register response includes unlinkedGuestRSVPs.
// Linking is always an explicit, checkbox-driven choice — never automatic.
// See eventor-architecture-decisions.md §5 and eventor-build-spec.md §9.
export default function GuestRSVPLinkModal({ rsvps, onClose }: GuestRSVPLinkModalProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [linkGuestRSVPs, { isLoading, error }] = useLinkGuestRSVPsMutation();
  const [done, setDone] = useState(false);

  if (rsvps.length === 0) return null;

  const allSelected = selected.size === rsvps.length;

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rsvps.map((r) => r.RSVPID)));
  };

  const handleLink = async () => {
    if (selected.size === 0) return;
    try {
      await linkGuestRSVPs({ rsvpIDs: Array.from(selected) }).unwrap();
      setDone(true);
    } catch {
      // error state surfaced via `error` below
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {done ? (
          <>
            <h3 className="font-display text-xl mb-2">Linked!</h3>
            <p className="text-sm text-base-content/70 mb-5">
              {selected.size} RSVP{selected.size === 1 ? "" : "s"} added to your account.
            </p>
            <button className="btn btn-primary w-full" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <h3 className="font-display text-xl mb-1">We found past RSVPs</h3>
            <p className="text-sm text-base-content/70 mb-4">
              These guest bookings match your email. Choose which ones to add to your account.
            </p>

            <label className="flex items-center gap-2 text-sm font-medium mb-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={allSelected}
                onChange={toggleAll}
              />
              Select all
            </label>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
              {rsvps.map((r) => (
                <label
                  key={r.RSVPID}
                  className="flex items-center gap-3 p-3 rounded-lg border border-base-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={selected.has(r.RSVPID)}
                    onChange={() => toggle(r.RSVPID)}
                  />
                  <div className="text-sm">
                    <p className="flex items-center gap-1.5 font-medium">
                      <CalendarDays size={14} className="text-primary" />
                      RSVP #{r.RSVPID}
                    </p>
                    <p className="text-base-content/60">{r.RSVPDate} · {r.RSVPStatus}</p>
                  </div>
                </label>
              ))}
            </div>

            {error && (
              <p className="text-error text-sm mb-3">Couldn't link those RSVPs. Try again.</p>
            )}

            <div className="flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={onClose}>
                Skip
              </button>
              <button
                className="btn btn-primary flex-1"
                disabled={selected.size === 0 || isLoading}
                onClick={handleLink}
              >
                {isLoading ? "Linking..." : `Link ${selected.size || ""}`}
              </button>
            </div>
          </>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
