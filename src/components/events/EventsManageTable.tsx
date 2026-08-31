import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useGetAllEventsQuery, useDeleteEventMutation } from "../../reducers/events/eventsAPI";
import type { TEvents } from "../../reducers/events/eventsAPI";
import { useGetAllVenuesQuery } from "../../reducers/venues/venuesAPI";
import CreateEventModal from "./CreateEventModal";
import { TableSkeleton } from "../shared/Skeletons";

// getAllEvents is scoped server-side to the caller's own events for a host
// token, per eventor-architecture-decisions.md §4/§7 — so admin and host
// dashboards can share this exact component, same query, same modal.
export default function EventsManageTable() {
  const { data, isLoading, error } = useGetAllEventsQuery();
  const { data: venuesData } = useGetAllVenuesQuery();
  const [deleteEvent] = useDeleteEventMutation();
  const [editing, setEditing] = useState<TEvents | "new" | null>(null);

  const venueMap: Record<number, string> = {};
  venuesData?.Venues.forEach((v) => (venueMap[v.VenueID] = v.venueName));

  const handleDelete = (event: TEvents) => {
    if (!confirm(`Delete "${event.title}"? This can't be undone.`)) return;
    deleteEvent(event.EventID);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl">Events</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing("new")}>
          <Plus size={16} /> Create event
        </button>
      </div>

      {isLoading && <TableSkeleton columns={6} />}
      {error && <p className="text-error">Couldn't load events.</p>}
      {!isLoading && !error && data?.Events.length === 0 && (
        <p className="text-base-content/60">No events yet — create the first one.</p>
      )}

      {!!data?.Events.length && (
        <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Venue</th>
                <th>Date</th>
                <th>Price</th>
                <th>Sold</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.Events.map((event) => (
                <tr key={event.EventID}>
                  <td>{event.title}</td>
                  <td>{venueMap[event.VenueID] ?? "—"}</td>
                  <td>
                    {event.date} · {event.time}
                  </td>
                  <td>{event.ticketsPrice > 0 ? `KES ${event.ticketsPrice.toLocaleString()}` : "Free"}</td>
                  <td>
                    {event.soldTickets}/{event.totalTickets}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn btn-ghost btn-xs" onClick={() => setEditing(event)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(event)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <CreateEventModal
          event={editing === "new" ? null : editing}
          venues={venuesData?.Venues ?? []}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
