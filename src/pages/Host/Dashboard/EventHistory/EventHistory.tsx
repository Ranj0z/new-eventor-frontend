import { CalendarDays, MapPin } from "lucide-react";
import { useGetAllEventsQuery } from "../../../../reducers/events/eventsAPI";
import { useGetAllVenuesQuery } from "../../../../reducers/venues/venuesAPI";
import { ListSkeleton } from "../../../../components/shared/Skeletons";

// Read-only — the venue's own past events. getAllEvents is scoped
// server-side for a host token, see EventsManageTable.tsx.
export default function EventHistory() {
  const { data, isLoading, error } = useGetAllEventsQuery();
  const { data: venuesData } = useGetAllVenuesQuery();

  const venueMap: Record<number, string> = {};
  venuesData?.Venues.forEach((v) => (venueMap[v.VenueID] = v.venueName));

  const today = new Date().toISOString().slice(0, 10);
  const past = (data?.Events ?? []).filter((e) => e.date < today);

  return (
    <section>
      <h1 className="font-display text-2xl mb-6">Event history</h1>

      {isLoading && <ListSkeleton />}
      {error && <p className="text-error">Couldn't load events.</p>}
      {!isLoading && !error && past.length === 0 && (
        <p className="text-base-content/60">No past events yet.</p>
      )}

      <div className="space-y-3">
        {past.map((event) => (
          <div key={event.EventID} className="bg-base-100 border border-base-300 rounded-box p-4 text-sm">
            <h3 className="font-medium text-base mb-1">{event.title}</h3>
            <p className="flex items-center gap-2 text-base-content/70">
              <CalendarDays size={14} /> {event.date} · {event.time}
            </p>
            <p className="flex items-center gap-2 text-base-content/70">
              <MapPin size={14} /> {venueMap[event.VenueID] ?? "—"}
            </p>
            <p className="text-base-content/70 mt-1">
              {event.soldTickets}/{event.totalTickets} tickets sold
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
