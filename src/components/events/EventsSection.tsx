import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useGetAllEventsQuery } from "../../reducers/events/eventsAPI";
import { useGetAllVenuesQuery } from "../../reducers/venues/venuesAPI";
import type { TEvents } from "../../reducers/events/eventsAPI";
import EventCard from "./EventCard";
import EventModal from "./EventModal";
import { CardGridSkeleton } from "../shared/Skeletons";

// date is stored as "YYYY-MM-DD" — compare against local midnight so
// timezone doesn't shift an event across the today/upcoming boundary.
function dateBucket(dateStr: string): "today" | "upcoming" | "past" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(dateStr);
  eventDate.setHours(0, 0, 0, 0);

  if (eventDate.getTime() === today.getTime()) return "today";
  return eventDate.getTime() > today.getTime() ? "upcoming" : "past";
}

function EventGrid({
  events,
  venueMap,
  onOpen,
  reloadEvents,
}: {
  events: TEvents[];
  venueMap: Record<number, string>;
  onOpen: (e: TEvents) => void;
  reloadEvents: () => void;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard
          key={event.EventID}
          reloadEvents={reloadEvents}
          {...event}
          venueName={venueMap[event.VenueID] || "Unknown venue"}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

export default function EventsSection() {
  const { data: eventsData, isLoading, error, refetch } = useGetAllEventsQuery();
  const { data: venuesData } = useGetAllVenuesQuery();
  const [selected, setSelected] = useState<TEvents | null>(null);
  const [showPast, setShowPast] = useState(false);

  const venueMap: Record<number, string> = {};
  venuesData?.Venues.forEach((v) => {
    venueMap[v.VenueID] = v.venueName;
  });

  const today: TEvents[] = [];
  const upcoming: TEvents[] = [];
  const past: TEvents[] = [];

  eventsData?.Events.forEach((event) => {
    const bucket = dateBucket(event.date);
    if (bucket === "today") today.push(event);
    else if (bucket === "upcoming") upcoming.push(event);
    else past.push(event);
  });

  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  past.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl md:text-4xl mb-8">Events</h1>

      {isLoading && <CardGridSkeleton withImage />}

      {error && (
        <p className="text-error">
          Couldn't load events. Check that the API is reachable and try again.
        </p>
      )}

      {!isLoading && !error && eventsData?.Events.length === 0 && (
        <p className="text-base-content/60">No events scheduled yet — check back soon.</p>
      )}

      {!isLoading && !error && (
        <div className="space-y-12">
          {today.length > 0 && (
            <div>
              <h2 className="font-display text-xl mb-4 flex items-center gap-2">
                Happening today
                <span className="badge badge-primary badge-sm">{today.length}</span>
              </h2>
              <EventGrid events={today} venueMap={venueMap} onOpen={setSelected} reloadEvents={refetch} />
            </div>
          )}

          <div>
            <h2 className="font-display text-xl mb-4">Upcoming</h2>
            {upcoming.length > 0 ? (
              <EventGrid events={upcoming} venueMap={venueMap} onOpen={setSelected} reloadEvents={refetch} />
            ) : (
              <p className="text-base-content/60 text-sm">No upcoming events scheduled.</p>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <button
                onClick={() => setShowPast((v) => !v)}
                className="font-display text-xl mb-4 flex items-center gap-2 text-base-content/70 hover:text-base-content"
              >
                Past events
                <span className="badge badge-ghost badge-sm">{past.length}</span>
                <ChevronDown size={18} className={`transition-transform ${showPast ? "rotate-180" : ""}`} />
              </button>
              {showPast && (
                <EventGrid events={past} venueMap={venueMap} onOpen={setSelected} reloadEvents={refetch} />
              )}
            </div>
          )}
        </div>
      )}

      <EventModal
        event={selected}
        venueName={selected ? venueMap[selected.VenueID] || "Unknown venue" : ""}
        onClose={() => setSelected(null)}
        reloadEvents={refetch}
      />
    </section>
  );
}