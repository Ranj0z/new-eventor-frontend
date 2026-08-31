import { CalendarDays, MapPin, Ticket } from "lucide-react";
import type { TEvents } from "../../reducers/events/eventsAPI";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=60";

type EventCardProps = TEvents & {
  venueName: string;
  reloadEvents: () => void;
  onOpen: (event: TEvents) => void;
};

export default function EventCard(props: EventCardProps) {
  const { title, date, time, ticketsPrice, venueName, image_url, onOpen } = props;

  return (
    <button
      onClick={() => onOpen(props)}
      className="text-left bg-base-100 border border-base-300 rounded-box overflow-hidden hover:shadow-md transition-shadow"
    >
      <img
        src={image_url || FALLBACK_IMAGE}
        alt={title}
        className="w-full h-40 object-cover"
      />
      <div className="p-4">
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
    </button>
  );
}
