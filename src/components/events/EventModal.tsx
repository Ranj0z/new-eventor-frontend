import { useState } from "react";
import { X, CalendarDays, MapPin, Ticket, Tag } from "lucide-react";
import type { TEvents } from "../../reducers/events/eventsAPI";
import CreateRSVPModal from "../rsvp/CreateRSVPModal";
import EventImageCarousel from "../shared/EventImageCarousel";
import { useGetEventImagesQuery } from "../../reducers/eventImages/eventImagesAPI";

type EventModalProps = {
  event: TEvents | null;
  venueName: string;
  onClose: () => void;
  reloadEvents: () => void;
};

export default function EventModal({ event, venueName, onClose, reloadEvents }: EventModalProps) {
  const [rsvpOpen, setRsvpOpen] = useState(false);

  // Extra photos are additive: skipped entirely while no event is selected,
  // and the section below simply doesn't render when the list comes back empty.
  const { data: extraImages } = useGetEventImagesQuery(event?.EventID ?? 0, { skip: !event });

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

        {/* Hero image — always its own static element, never part of the carousel. */}
        {event.image_url && (
          <img
            src={event.image_url}
            alt=""
            className="block mx-auto w-auto max-w-full h-auto max-h-[500px] rounded-box border border-base-300 mb-4"
          />
        )}

        {/* Carousel of extra photos, rendered only when event_images rows exist. */}
        {extraImages && extraImages.length > 0 && (
          <div className="mb-4">
            <EventImageCarousel images={extraImages} />
          </div>
        )}

        <h3 className="font-display text-2xl mb-1">{event.title}</h3>
        <span className="badge badge-secondary badge-sm mb-4">
          <Tag size={12} className="mr-1" /> {event.category}
        </span>

        <p className="text-base-content/70 mb-5 leading-relaxed whitespace-pre-line">{event.description}</p>

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