import { Smartphone } from "lucide-react";
import type { TEvents } from "../../reducers/events/eventsAPI";
import type { TRSVP } from "../../reducers/rsvp/rsvpAPI";

type PaymentModalProps = {
  rsvp: TRSVP;
  event: TEvents;
  onClose: () => void;
};

// STUB — real M-Pesa/Daraja integration is paused (see
// eventor-architecture-decisions.md §6: app_code registration, STK push
// polling interval, and failure/timeout handling are all still open). This
// closes the RSVP flow with a placeholder confirmation instead of an actual
// charge, so the rest of the app isn't blocked on the gateway decision.
export default function PaymentModal({ rsvp, event, onClose }: PaymentModalProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-box border border-base-300 p-4 flex items-start gap-3">
        <Smartphone size={20} className="text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">M-Pesa payment — coming soon</p>
          <p className="text-base-content/60">
            Payment for RSVP #{rsvp.RSVPID} ({event.title}) isn't wired up to the gateway yet.
            This is a placeholder so the booking flow can be tested end-to-end.
          </p>
        </div>
      </div>

      <div className="flex justify-between text-sm px-1">
        <span className="text-base-content/60">Amount due</span>
        <span className="font-medium">KES {event.ticketsPrice.toLocaleString()}</span>
      </div>

      <button className="btn btn-primary w-full" onClick={onClose}>
        Continue (placeholder)
      </button>
    </div>
  );
}
