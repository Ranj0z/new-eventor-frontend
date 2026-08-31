import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { TVenue } from "../../reducers/venues/venuesAPI";
import { useCreateVenueMutation, useUpdateVenueMutation } from "../../reducers/venues/venuesAPI";

type VenueModalProps = {
  venue: TVenue | null;
  onClose: () => void;
};

export default function VenueModal({ venue, onClose }: VenueModalProps) {
  const [createVenue, { isLoading: creating }] = useCreateVenueMutation();
  const [updateVenue, { isLoading: updating }] = useUpdateVenueMutation();
  const [error, setError] = useState(false);

  const [form, setForm] = useState({
    venueName: venue?.venueName ?? "",
    address: venue?.address ?? "",
    capacity: venue?.capacity ?? 0,
    image_url: venue?.image_url ?? "",
  });

  const isLoading = creating || updating;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(false);
    try {
      if (venue) await updateVenue({ id: venue.VenueID, ...form }).unwrap();
      else await createVenue(form).unwrap();
      onClose();
    } catch {
      setError(true);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" aria-label="Close">
          <X size={18} />
        </button>

        <h3 className="font-display text-xl mb-4">{venue ? "Edit venue" : "Add venue"}</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="text-sm block">
            Venue name
            <input
              className="input input-bordered w-full mt-1"
              value={form.venueName}
              onChange={(e) => setForm({ ...form, venueName: e.target.value })}
              required
            />
          </label>

          <label className="text-sm block">
            Address
            <input
              className="input input-bordered w-full mt-1"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
          </label>

          <label className="text-sm block">
            Capacity
            <input
              type="number"
              min={0}
              className="input input-bordered w-full mt-1"
              value={form.capacity ?? 0}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
            />
          </label>

          <label className="text-sm block">
            Image URL
            <input
              className="input input-bordered w-full mt-1"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
            />
          </label>

          {error && <p className="text-error text-sm">Couldn't save the venue. Try again.</p>}

          <button className="btn btn-primary w-full" disabled={isLoading}>
            {isLoading ? "Saving..." : venue ? "Save changes" : "Add venue"}
          </button>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
