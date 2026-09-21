import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import type { TEvents } from "../../reducers/events/eventsAPI";
import CreateRSVPModal from "../rsvp/CreateRSVPModal";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=60";

// "10 or fewer left" — same low-stock rule as the details page ticket list.
const LOW_STOCK_THRESHOLD = 10;

type EventCardProps = TEvents & {
  venueName: string;
  reloadEvents: () => void;
};

export default function EventCard(props: EventCardProps) {
  const { venueName, reloadEvents, ...event } = props;
  const { title, date, time, ticketsPrice, image_url, slug, totalTickets, soldTickets } = event;

  const [rsvpOpen, setRsvpOpen] = useState(false);

  const remaining = totalTickets - soldTickets;
  const soldOut = remaining <= 0;
  const lowStock = !soldOut && remaining <= LOW_STOCK_THRESHOLD;

  return (
    <div className="bg-base-100 border border-base-300 rounded-box overflow-hidden hover:shadow-md transition-shadow">
      <Link to={`/${slug}`} className="block text-left">
        <div className="relative">
          <img src={image_url || FALLBACK_IMAGE} alt={title} className="w-full h-40 object-contain bg-base-200" />
          {lowStock && (
            <span className="badge badge-warning badge-sm absolute top-2 right-2">{remaining} left</span>
          )}
        </div>
        <div className="p-4 pb-2">
          <h3 className="font-medium text-lg mb-2 line-clamp-1">{title}</h3>
          <div className="space-y-1 text-sm text-base-content/70">
            <p className="flex items-center gap-2">
              <CalendarDays size={15} /> {date} · {time}
            </p>
            <p className="flex items-center gap-2">
              <MapPin size={15} /> {venueName}
            </p>
            <p className="flex items-center gap-2 text-primary font-medium">
              <Ticket size={15} />
              {ticketsPrice > 0 ? `KES ${ticketsPrice.toLocaleString()}` : "Free"}
            </p>
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={(e) => {
            // Card and button are siblings, not nested, so this isn't
            // strictly load-bearing today — kept as a guard against a future
            // parent click handler, per plan §3.1.
            e.stopPropagation();
            setRsvpOpen(true);
          }}
          disabled={soldOut}
          className="btn btn-primary btn-sm w-full"
        >
          {soldOut ? "Sold out" : "RSVP"}
        </button>
      </div>

      {rsvpOpen && (
        <CreateRSVPModal event={event} reloadEvents={reloadEvents} onClose={() => setRsvpOpen(false)} />
      )}
    </div>
  );
}