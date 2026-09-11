import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { TVenue } from "../../reducers/venues/venuesAPI";
import { useCreateVenueMutation, useUpdateVenueMutation } from "../../reducers/venues/venuesAPI";
import { useUploadImageMutation } from "../../reducers/uploads/uploadsAPI";
import ImageUploadField from "../shared/ImageUploadField";

type VenueModalProps = {
  venue: TVenue | null;
  onClose: () => void;
};

export default function VenueModal({ venue, onClose }: VenueModalProps) {
  const [createVenue, { isLoading: creating }] = useCreateVenueMutation();
  const [updateVenue, { isLoading: updating }] = useUpdateVenueMutation();
  const [uploadImage, { isLoading: uploading }] = useUploadImageMutation();
  const [error, setError] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    venueName: venue?.venueName ?? "",
    address: venue?.address ?? "",
    capacity: venue?.capacity ?? 0,
  });

  const isLoading = creating || updating || uploading;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(false);

    let imagePatch: { image_url: string; image_public_id: string } | Record<string, never> = {};
    if (pendingFile) {
      try {
        const { url, public_id } = await uploadImage({ file: pendingFile, folder: "venue" }).unwrap();
        imagePatch = { image_url: url, image_public_id: public_id };
      } catch {
        setError(true);
        return;
      }
    }

    try {
      if (venue) await updateVenue({ id: venue.VenueID, ...form, ...imagePatch }).unwrap();
      else await createVenue({ ...form, ...imagePatch }).unwrap();
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

          <ImageUploadField
            label="Venue photo"
            value={venue?.image_url ?? null}
            onFileSelect={setPendingFile}
            folder="venue"
          />

          {error && <p className="text-error text-sm">Couldn't save the venue. Try again.</p>}

          <button className="btn btn-primary w-full" disabled={isLoading}>
            {uploading ? "Uploading..." : isLoading ? "Saving..." : venue ? "Save changes" : "Add venue"}
          </button>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
