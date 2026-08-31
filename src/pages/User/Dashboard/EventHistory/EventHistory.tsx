import { CalendarDays } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../../app/store";
import { useGetRSVPsByUserQuery } from "../../../../reducers/rsvp/rsvpAPI";
import { useGetAllEventsQuery } from "../../../../reducers/events/eventsAPI";
import type { TEvents } from "../../../../reducers/events/eventsAPI";
import { ListSkeleton } from "../../../../components/shared/Skeletons";

// Past events the user actually RSVP'd to — joins their own RSVPs against
// the event list, filtered to dates already gone.
export default function EventHistory() {
  const user = useSelector((state: RootState) => state.user.user);
  const { data: rsvps, isLoading, error } = useGetRSVPsByUserQuery(user!.UserID, { skip: !user });
  const { data: events } = useGetAllEventsQuery();

  const eventMap: Record<number, TEvents> = {};
  events?.Events.forEach((e) => (eventMap[e.EventID] = e));

  const today = new Date().toISOString().slice(0, 10);
  const past = (rsvps?.RSVPs ?? [])
    .map((r) => eventMap[r.EventID])
    .filter((e): e is TEvents => !!e && e.date < today);

  return (
    <section>
      <h1 className="font-display text-2xl mb-6">Event history</h1>

      {isLoading && <ListSkeleton />}
      {error && <p className="text-error">Couldn't load your history.</p>}
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
          </div>
        ))}
      </div>
    </section>
  );
}
