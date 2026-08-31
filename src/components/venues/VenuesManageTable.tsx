import { useState } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useGetAllVenuesQuery, useDeleteVenueMutation } from "../../reducers/venues/venuesAPI";
import type { TVenue } from "../../reducers/venues/venuesAPI";
import VenueModal from "./VenueModal";
import { CardGridSkeleton } from "../shared/Skeletons";

export default function VenuesManageTable() {
  const { data, isLoading, error } = useGetAllVenuesQuery();
  const [deleteVenue] = useDeleteVenueMutation();
  const [editing, setEditing] = useState<TVenue | "new" | null>(null);

  const handleDelete = (venue: TVenue) => {
    if (!confirm(`Delete "${venue.venueName}"? This can't be undone.`)) return;
    deleteVenue(venue.VenueID);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl">Venues</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing("new")}>
          <Plus size={16} /> Add venue
        </button>
      </div>

      {isLoading && <CardGridSkeleton count={3} />}
      {error && <p className="text-error">Couldn't load venues.</p>}

      {!isLoading && (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.Venues.map((venue) => (
          <div key={venue.VenueID} className="bg-base-100 border border-base-300 rounded-box p-4 text-sm space-y-1">
            <h3 className="font-medium text-base">{venue.venueName}</h3>
            <p className="text-base-content/70">{venue.address}</p>
            {venue.capacity != null && (
              <p className="flex items-center gap-1.5 text-base-content/70">
                <Users size={14} /> Capacity {venue.capacity}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <button className="btn btn-ghost btn-xs" onClick={() => setEditing(venue)}>
                <Pencil size={14} /> Edit
              </button>
              <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(venue)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {editing && <VenueModal venue={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </section>
  );
}
