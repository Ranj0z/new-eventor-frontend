import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useGetAllEventsQuery, useDeleteEventMutation } from "../../reducers/events/eventsAPI";
import type { TEvents } from "../../reducers/events/eventsAPI";
import { useGetAllVenuesQuery } from "../../reducers/venues/venuesAPI";
import CreateEventModal from "./CreateEventModal";
import { TableSkeleton } from "../shared/Skeletons";

type SortOption = "newest" | "oldest" | "az" | "za";

const SORTERS: Record<SortOption, (a: TEvents, b: TEvents) => number> = {
  // EventID is a serial auto-increment, so sorting by it is equivalent to
  // createdAt order without relying on a date field with only day precision.
  newest: (a, b) => b.EventID - a.EventID,
  oldest: (a, b) => a.EventID - b.EventID,
  az: (a, b) => a.title.localeCompare(b.title),
  za: (a, b) => b.title.localeCompare(a.title),
};

// getAllEvents is scoped server-side to the caller's own events for a host
// token, per eventor-architecture-decisions.md §4/§7 — so admin and host
// dashboards can share this exact component, same query, same modal.
export default function EventsManageTable() {
  const { data, isLoading, error } = useGetAllEventsQuery();
  const { data: venuesData } = useGetAllVenuesQuery();
  const [deleteEvent] = useDeleteEventMutation();
  const [editing, setEditing] = useState<TEvents | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const venueMap: Record<number, string> = {};
  venuesData?.Venues.forEach((v) => (venueMap[v.VenueID] = v.venueName));

  const visibleEvents = (data?.Events ?? [])
    .filter((e) => e.title.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((e) => !dateFrom || e.date >= dateFrom) // date is "YYYY-MM-DD" — lexicographic compare works
    .filter((e) => !dateTo || e.date <= dateTo)
    .sort(SORTERS[sortBy]);

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

      <div className="flex flex-col sm:flex-row gap-3 mb-2">
        <label className="input input-bordered flex items-center gap-2 flex-1">
          <Search size={16} className="text-base-content/50" />
          <input
            className="grow"
            placeholder="Search events by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="select select-bordered w-full sm:w-48"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="az">Title A–Z</option>
          <option value="za">Title Z–A</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm text-base-content/60 flex items-center gap-2">
          From
          <input
            type="date"
            className="input input-bordered input-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="text-sm text-base-content/60 flex items-center gap-2">
          To
          <input
            type="date"
            className="input input-bordered input-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear dates
          </button>
        )}
      </div>

      {isLoading && <TableSkeleton columns={6} />}
      {error && <p className="text-error">Couldn't load events.</p>}
      {!isLoading && !error && data?.Events.length === 0 && (
        <p className="text-base-content/60">No events yet — create the first one.</p>
      )}
      {!isLoading && !error && !!data?.Events.length && visibleEvents.length === 0 && (
        <p className="text-base-content/60">No events match the current filters.</p>
      )}

      {!!visibleEvents.length && (
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
              {visibleEvents.map((event) => (
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