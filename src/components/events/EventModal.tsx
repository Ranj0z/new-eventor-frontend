import { useState } from "react";
import { X, CalendarDays, MapPin, Ticket, Tag } from "lucide-react";
import type { TEvents } from "../../reducers/events/eventsAPI";
import CreateRSVPModal from "../rsvp/CreateRSVPModal";

type EventModalProps = {
  event: TEvents | null;
  venueName: string;
  onClose: () => void;
  reloadEvents: () => void;
};

export default function EventModal({ event, venueName, onClose, reloadEvents }: EventModalProps) {
  const [rsvpOpen, setRsvpOpen] = useState(false);

  if (!event) return null;

  const soldOut = event.totalTickets - event.soldTickets <= 0;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h3 className="font-display text-2xl mb-1">{event.title}</h3>
        <span className="badge badge-secondary badge-sm mb-4">
          <Tag size={12} className="mr-1" /> {event.category}
        </span>

        <p className="text-base-content/70 mb-5 leading-relaxed">{event.description}</p>

        <div className="space-y-2 text-sm mb-6">
          <p className="flex items-center gap-2">
            <CalendarDays size={16} className="text-primary" />
            {event.date} · {event.time}
          </p>
          <p className="flex items-center gap-2">
            <MapPin size={16} className="text-primary" /> {venueName}
          </p>
          <p className="flex items-center gap-2">
            <Ticket size={16} className="text-primary" />
            {event.ticketsPrice > 0 ? `KES ${event.ticketsPrice.toLocaleString()} per ticket` : "Free entry"}
            {" · "}
            {Math.max(event.totalTickets - event.soldTickets, 0)} left
          </p>
        </div>

        <button className="btn btn-primary w-full" disabled={soldOut} onClick={() => setRsvpOpen(true)}>
          {soldOut ? "Sold out" : "RSVP"}
        </button>
      </div>
      <div className="modal-backdrop" onClick={onClose} />

      {rsvpOpen && (
        <CreateRSVPModal
          event={event}
          reloadEvents={reloadEvents}
          onClose={() => {
            setRsvpOpen(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}
