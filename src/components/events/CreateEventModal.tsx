import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { X, Plus, Minus, Trash2 } from "lucide-react";
import type { TCategory, TEvents, TTicketTypeInput } from "../../reducers/events/eventsAPI";
import { useCreateEventMutation, useUpdateEventMutation } from "../../reducers/events/eventsAPI";
import type { TTicketTypePreset } from "../../reducers/ticketTypes/ticketTypesAPI";
import type { TVenue } from "../../reducers/venues/venuesAPI";
import { useUploadImageMutation } from "../../reducers/uploads/uploadsAPI";
import {
  useAddEventImageMutation,
  useDeleteEventImageMutation,
  useGetEventImagesQuery,
} from "../../reducers/eventImages/eventImagesAPI";
import ImageUploadField from "../shared/ImageUploadField";

const CATEGORIES: TCategory[] = ["Tech", "Data Science", "Web Dev"];

const PRESETS: TTicketTypePreset[] = ["Free Entry", "Early Bird", "Regular", "VIP", "Group ticket", "Custom"];

const PRESET_FIXED_NAME: Partial<Record<TTicketTypePreset, string>> = {
  "Free Entry": "Free Entry",
  "Group ticket": "Group ticket",
};

// Mirrors the backend caps: /uploads/image rejects anything outside these
// types or over 5MB, and the event_images module caps a single event at 6
// extra photos.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EXTRA_IMAGES = 6;

let rowKeySeq = 0;
function makeRow(preset: TTicketTypePreset = "Regular"): TTicketTypeInput & { _key: number } {
  return {
    _key: rowKeySeq++,
    preset,
    name: PRESET_FIXED_NAME[preset] ?? preset,
    price: preset === "Free Entry" ? 0 : 0,
    totalQuantity: 1,
    groupSize: preset === "Group ticket" ? 5 : null,
  };
}

// Extra ("carousel") photos for an already-existing event. Split into its own
// component so the images query can take a plain number and never has to be
// skipped — it only ever mounts once there's a real EventID to attach to.
function ExtraImagesSection({ eventId }: { eventId: number }) {
  const { data: images = [], isLoading } = useGetEventImagesQuery(eventId);
  const [uploadImage, { isLoading: uploadingExtra }] = useUploadImageMutation();
  const [addEventImage, { isLoading: persisting }] = useAddEventImageMutation();
  const [deleteEventImage] = useDeleteEventImageMutation();
  const [imageError, setImageError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const atCap = images.length >= MAX_EXTRA_IMAGES;
  const busy = uploadingExtra || persisting;

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);

    // 1. Client-side validation, before anything hits the network.
    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError("Only JPEG, PNG, or WEBP images are allowed.");
      resetInput();
      return;
    }
    if (file.size > MAX_BYTES) {
      setImageError("Image must be 5MB or smaller.");
      resetInput();
      return;
    }

    // 2. Upload to Cloudinary.
    let uploaded: { url: string; public_id: string };
    try {
      uploaded = await uploadImage({ file, folder: "event" }).unwrap();
    } catch {
      setImageError("Couldn't upload that photo. Try again.");
      resetInput();
      return;
    }

    // 3. Persist the row. A failure here leaves an orphaned Cloudinary asset,
    // so it must be surfaced rather than swallowed.
    try {
      await addEventImage({ eventId, url: uploaded.url, public_id: uploaded.public_id }).unwrap();
    } catch {
      setImageError("Photo uploaded but couldn't be attached to the event. Try adding it again.");
    }
    resetInput();
  };

  const handleDelete = async (imageId: number) => {
    setImageError(null);
    setDeletingId(imageId);
    try {
      await deleteEventImage({ imageId, eventId }).unwrap();
    } catch {
      setImageError("Couldn't remove that photo. Try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="border-t pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">More photos</span>
        <span className="text-xs opacity-60">
          {images.length}/{MAX_EXTRA_IMAGES}
        </span>
      </div>

      {isLoading && <p className="text-xs opacity-60">Loading photos...</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((image) => (
            <div key={image.id} className="relative">
              <img
                src={image.url}
                alt=""
                className="w-full h-16 object-cover rounded border border-base-300"
              />
              <button
                type="button"
                onClick={() => handleDelete(image.id)}
                disabled={deletingId === image.id}
                className="btn btn-xs btn-circle absolute -right-1.5 -top-1.5"
                aria-label="Remove photo"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {atCap ? (
        <p className="text-xs opacity-70">Maximum {MAX_EXTRA_IMAGES} additional photos.</p>
      ) : (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="file-input file-input-bordered file-input-sm w-full"
          disabled={busy}
          onChange={handleFile}
        />
      )}

      {busy && (
        <p className="text-xs opacity-70">{uploadingExtra ? "Uploading photo..." : "Saving photo..."}</p>
      )}
      {imageError && <p className="text-error text-xs">{imageError}</p>}
    </div>
  );
}

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

  // The modal owns its own create/edit mode: after a successful create it
  // switches to editing the event it just made instead of closing, so the host
  // can add extra photos in the same session.
  const [activeEvent, setActiveEvent] = useState<TEvents | null>(event);
  const [justCreated, setJustCreated] = useState(false);
  const isEditing = activeEvent !== null;

  const [form, setForm] = useState({
    title: event?.title ?? "",
    description: event?.description ?? "",
    VenueID: event?.VenueID ?? venues[0]?.VenueID ?? 0,
    category: event?.category ?? "Tech",
    date: event?.date ?? "",
    time: event?.time ?? "",
  });

  // Ticket tiers only apply at creation time — an existing event's tiers
  // can't be edited/deleted later, so this list is create-only.
  const [ticketRows, setTicketRows] = useState<(TTicketTypeInput & { _key: number })[]>(
    event ? [] : [makeRow("Regular")]
  );

  const isLoading = creating || updating || uploading;

  const updateRow = (key: number, patch: Partial<TTicketTypeInput>) => {
    setTicketRows((rows) => rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  };

  const setRowPreset = (key: number, preset: TTicketTypePreset) => {
    setTicketRows((rows) =>
      rows.map((r) =>
        r._key === key
          ? {
              ...r,
              preset,
              name: PRESET_FIXED_NAME[preset] ?? (preset === "Custom" ? "" : preset),
              price: preset === "Free Entry" ? 0 : r.price,
              groupSize: preset === "Group ticket" ? r.groupSize ?? 5 : null,
            }
          : r
      )
    );
  };

  const addRow = () => setTicketRows((rows) => [...rows, makeRow("Regular")]);
  const removeRow = (key: number) => setTicketRows((rows) => rows.filter((r) => r._key !== key));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(false);

    if (!isEditing && ticketRows.length === 0) {
      setError(true);
      return;
    }

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
      if (activeEvent) {
        // Ticket tiers are create-only — editing an event never touches ticketTypes.
        await updateEvent({ id: activeEvent.EventID, ...form, ...imagePatch }).unwrap();
        onClose();
      } else {
        const ticketTypes: TTicketTypeInput[] = ticketRows.map(({ _key, ...row }) => ({
          ...row,
          groupSize: row.preset === "Group ticket" ? row.groupSize ?? 5 : null,
        }));
        const created = await createEvent({ ...form, ...imagePatch, ticketTypes }).unwrap();
        // Stay open and flip into edit mode for the event just created.
        setActiveEvent(created.data);
        setJustCreated(true);
        setPendingFile(null);
        setTicketRows([]);
      }
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

        <h3 className="font-display text-xl mb-4">{isEditing ? "Edit event" : "Create event"}</h3>

        {justCreated && (
          <div className="alert alert-success text-sm mb-4">
            Event created — add a few more photos below, or close when you're done.
          </div>
        )}

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

          {isEditing ? (
            <p className="text-sm opacity-70 border-t pt-3">
              Ticket tiers can't be changed after an event is created.
            </p>
          ) : (
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ticket types</span>
                <button type="button" onClick={addRow} className="btn btn-xs btn-outline gap-1">
                  <Plus size={14} /> Add ticket type
                </button>
              </div>

              {ticketRows.map((row) => (
                <div key={row._key} className="rounded-box border border-base-300 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      className="select select-bordered select-sm flex-1"
                      value={row.preset}
                      onChange={(e) => setRowPreset(row._key, e.target.value as TTicketTypePreset)}
                    >
                      {PRESETS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    {ticketRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(row._key)}
                        className="btn btn-xs btn-ghost btn-circle"
                        aria-label="Remove ticket type"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {row.preset === "Custom" && (
                    <input
                      className="input input-bordered input-sm w-full"
                      placeholder="Ticket name"
                      value={row.name}
                      onChange={(e) => updateRow(row._key, { name: e.target.value })}
                      required
                    />
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs">
                      Price per ticket (KES)
                      <input
                        type="number"
                        min={0}
                        className="input input-bordered input-sm w-full mt-1"
                        value={row.price}
                        disabled={row.preset === "Free Entry"}
                        onChange={(e) => updateRow(row._key, { price: Number(e.target.value) })}
                      />
                    </label>
                    <label className="text-xs">
                      Number of tickets
                      <input
                        type="number"
                        min={1}
                        className="input input-bordered input-sm w-full mt-1"
                        value={row.totalQuantity}
                        onChange={(e) => updateRow(row._key, { totalQuantity: Number(e.target.value) })}
                        required
                      />
                    </label>
                  </div>

                  {row.preset === "Group ticket" && (
                    <label className="text-xs block">
                      People per group
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          className="btn btn-xs btn-outline btn-circle"
                          aria-label="Decrease group size"
                          onClick={() =>
                            updateRow(row._key, { groupSize: Math.max(2, (row.groupSize ?? 5) - 1) })
                          }
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center">{row.groupSize ?? 5}</span>
                        <button
                          type="button"
                          className="btn btn-xs btn-outline btn-circle"
                          aria-label="Increase group size"
                          onClick={() => updateRow(row._key, { groupSize: (row.groupSize ?? 5) + 1 })}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}

          <ImageUploadField
            label="Event photo"
            value={activeEvent?.image_url ?? null}
            onFileSelect={setPendingFile}
            folder="event"
          />

          {/* Extra photos need a real EventID to attach to, so this only ever
              renders in edit mode — including straight after a create. */}
          {activeEvent && <ExtraImagesSection eventId={activeEvent.EventID} />}

          {error && <p className="text-error text-sm">Couldn't save the event. Try again.</p>}

          <button className="btn btn-primary w-full" disabled={isLoading}>
            {uploading ? "Uploading..." : isLoading ? "Saving..." : isEditing ? "Save changes" : "Create event"}
          </button>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}