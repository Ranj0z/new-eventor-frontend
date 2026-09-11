import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { TCategory, TEvents } from "../../reducers/events/eventsAPI";
import { useCreateEventMutation, useUpdateEventMutation } from "../../reducers/events/eventsAPI";
import type { TVenue } from "../../reducers/venues/venuesAPI";
import { useUploadImageMutation } from "../../reducers/uploads/uploadsAPI";
import ImageUploadField from "../shared/ImageUploadField";

const CATEGORIES: TCategory[] = ["Tech", "Data Science", "Web Dev"];

type CreateEventModalProps = {
  event: TEvents | null; // null = create, otherwise editing this event
  venues: TVenue[];
  onClose: () => void;
};

export default function CreateEventModal({ event, venues, onClose }: CreateEventModalProps) {
  const [createEvent, { isLoading: creating }] = useCreateEventMutation();
  const [updateEvent, { isLoading: updating }] = useUpdateEventMutation();
  const [uploadImage, { isLoading: uploading }] = useUploadImageMutation();
  const [error, setError] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    title: event?.title ?? "",
    description: event?.description ?? "",
    VenueID: event?.VenueID ?? venues[0]?.VenueID ?? 0,
    category: event?.category ?? "Tech",
    date: event?.date ?? "",
    time: event?.time ?? "",
    ticketsPrice: event?.ticketsPrice ?? 0,
    totalTickets: event?.totalTickets ?? 100,
  });

  const isLoading = creating || updating || uploading;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(false);

    let imagePatch: { image_url: string; image_public_id: string } | Record<string, never> = {};
    if (pendingFile) {
      try {
        const { url, public_id } = await uploadImage({ file: pendingFile, folder: "event" }).unwrap();
        imagePatch = { image_url: url, image_public_id: public_id };
      } catch {
        setError(true);
        return;
      }
    }

    try {
      if (event) {
        await updateEvent({ id: event.EventID, ...form, ...imagePatch }).unwrap();
      } else {
        await createEvent({ ...form, ...imagePatch }).unwrap();
      }
      onClose();
    } catch {
      setError(true);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" aria-label="Close">
          <X size={18} />
        </button>

        <h3 className="font-display text-xl mb-4">{event ? "Edit event" : "Create event"}</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="text-sm block">
            Title
            <input
              className="input input-bordered w-full mt-1"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>

          <label className="text-sm block">
            Description
            <textarea
              className="textarea textarea-bordered w-full mt-1"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Venue
              <select
                className="select select-bordered w-full mt-1"
                value={form.VenueID}
                onChange={(e) => setForm({ ...form, VenueID: Number(e.target.value) })}
                required
              >
                {venues.map((v) => (
                  <option key={v.VenueID} value={v.VenueID}>
                    {v.venueName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Category
              <select
                className="select select-bordered w-full mt-1"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as TCategory })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Date
              <input
                type="date"
                className="input input-bordered w-full mt-1"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
            <label className="text-sm">
              Time
              <input
                type="time"
                className="input input-bordered w-full mt-1"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Ticket price (KES)
              <input
                type="number"
                min={0}
                className="input input-bordered w-full mt-1"
                value={form.ticketsPrice}
                onChange={(e) => setForm({ ...form, ticketsPrice: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm">
              Total tickets
              <input
                type="number"
                min={1}
                className="input input-bordered w-full mt-1"
                value={form.totalTickets}
                onChange={(e) => setForm({ ...form, totalTickets: Number(e.target.value) })}
              />
            </label>
          </div>

          <ImageUploadField
            label="Event photo"
            value={event?.image_url ?? null}
            onFileSelect={setPendingFile}
            folder="event"
          />

          {error && <p className="text-error text-sm">Couldn't save the event. Try again.</p>}

          <button className="btn btn-primary w-full" disabled={isLoading}>
            {uploading ? "Uploading..." : isLoading ? "Saving..." : event ? "Save changes" : "Create event"}
          </button>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
