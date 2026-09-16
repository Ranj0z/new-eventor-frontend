import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { X, Plus, Minus, Trash2 } from "lucide-react";
import type { TCategory, TEvents, TTicketTypeInput } from "../../reducers/events/eventsAPI";
import { useCreateEventMutation, useUpdateEventMutation } from "../../reducers/events/eventsAPI";
import type { TTicketType, TTicketTypePreset } from "../../reducers/ticketTypes/ticketTypesAPI";
import {
  useCreateTicketTypeMutation,
  useGetTicketTypesByEventQuery,
  useUpdateTicketTypeMutation,
} from "../../reducers/ticketTypes/ticketTypesAPI";
import type { TVenue } from "../../reducers/venues/venuesAPI";
import { useUploadImageMutation } from "../../reducers/uploads/uploadsAPI";
import {
  useAddEventImageMutation,
  useDeleteEventImageMutation,
  useGetEventImagesQuery,
} from "../../reducers/eventImages/eventImagesAPI";
import ImageUploadField from "../shared/ImageUploadField";

const CATEGORIES: TCategory[] = ["Tech", "Data Science", "Web Dev", "Other"];
const CUSTOM_CATEGORY_MAX = 30;

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

// Shared row editor for a *new* ticket-type row — used both for the
// create-event flow (ticketRows) and for adding a new tier to an existing
// event in edit mode (§7.2). Purely a controlled view over one row; the
// caller owns the row list and the key-based update/remove/preset handlers.
function NewTicketTypeRow({
  row,
  canRemove,
  onUpdate,
  onSetPreset,
  onRemove,
}: {
  row: TTicketTypeInput & { _key: number };
  canRemove: boolean;
  onUpdate: (key: number, patch: Partial<TTicketTypeInput>) => void;
  onSetPreset: (key: number, preset: TTicketTypePreset) => void;
  onRemove: (key: number) => void;
}) {
  return (
    <div className="rounded-box border border-base-300 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <select
          className="select select-bordered select-sm flex-1"
          value={row.preset}
          onChange={(e) => onSetPreset(row._key, e.target.value as TTicketTypePreset)}
        >
          {PRESETS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(row._key)}
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
          onChange={(e) => onUpdate(row._key, { name: e.target.value })}
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
            onChange={(e) => onUpdate(row._key, { price: Number(e.target.value) })}
          />
        </label>
        <label className="text-xs">
          Number of tickets
          <input
            type="number"
            min={1}
            className="input input-bordered input-sm w-full mt-1"
            value={row.totalQuantity}
            onChange={(e) => onUpdate(row._key, { totalQuantity: Number(e.target.value) })}
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
              onClick={() => onUpdate(row._key, { groupSize: Math.max(2, (row.groupSize ?? 5) - 1) })}
            >
              <Minus size={12} />
            </button>
            <span className="w-6 text-center">{row.groupSize ?? 5}</span>
            <button
              type="button"
              className="btn btn-xs btn-outline btn-circle"
              aria-label="Increase group size"
              onClick={() => onUpdate(row._key, { groupSize: (row.groupSize ?? 5) + 1 })}
            >
              <Plus size={12} />
            </button>
          </div>
        </label>
      )}
    </div>
  );
}

export type ExistingTicketTypesHandle = {
  // Fires every queued update/create in one batch. Throws (and leaves nothing
  // queued-but-uncommitted lost) if any mutation fails, so the caller can
  // surface an error and keep the modal open instead of closing on a partial
  // save.
  commitPendingChanges: () => Promise<void>;
};

// Existing tiers for an event already being edited (§7.2). Split out like
// ExtraImagesSection so its query only ever mounts with a real EventID.
// Edits are staged locally and only sent to the backend when the parent
// form is submitted — see commitPendingChanges.
const ExistingTicketTypesSection = forwardRef<ExistingTicketTypesHandle, { eventId: number }>(
  function ExistingTicketTypesSection({ eventId }, ref) {
    const { data, isLoading } = useGetTicketTypesByEventQuery(eventId);
    const tiers = data?.data ?? [];
    const [createTicketType] = useCreateTicketTypeMutation();
    const [updateTicketType] = useUpdateTicketTypeMutation();

    const [edits, setEdits] = useState<Record<number, Partial<TTicketType>>>({});
    const [newRows, setNewRows] = useState<(TTicketTypeInput & { _key: number })[]>([]);

    const patchTier = (id: number, patch: Partial<TTicketType>) => {
      setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    };

    const addNewRow = () => setNewRows((rows) => [...rows, makeRow("Regular")]);
    const removeNewRow = (key: number) => setNewRows((rows) => rows.filter((r) => r._key !== key));
    const updateNewRow = (key: number, patch: Partial<TTicketTypeInput>) => {
      setNewRows((rows) => rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));
    };
    const setNewRowPreset = (key: number, preset: TTicketTypePreset) => {
      setNewRows((rows) =>
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

    useImperativeHandle(ref, () => ({
      commitPendingChanges: async () => {
        const updates = Object.entries(edits).map(([ticketTypeId, patch]) =>
          updateTicketType({ ticketTypeId: Number(ticketTypeId), ...patch }).unwrap()
        );
        const creates = newRows.map((row) =>
          createTicketType({
            eventId,
            name: row.name,
            type: row.preset === "Group ticket" ? "group" : "individual",
            price: row.price,
            totalQuantity: row.totalQuantity,
            groupSize: row.preset === "Group ticket" ? row.groupSize ?? 5 : undefined,
          }).unwrap()
        );
        // Let all queued mutations settle before deciding success/failure so
        // one failure doesn't abandon the others mid-flight.
        await Promise.all([...updates, ...creates]);
        setEdits({});
        setNewRows([]);
      },
    }));

    return (
      <div className="border-t pt-3 space-y-3">
        <span className="text-sm font-medium">Ticket types</span>

        {isLoading && <p className="text-xs opacity-60">Loading ticket types...</p>}

        {tiers.map((tier) => {
          const locked = tier.soldQuantity > 0;
          const effective = { ...tier, ...edits[tier.TicketTypeID] };

          return (
            <div key={tier.TicketTypeID} className="rounded-box border border-base-300 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  className="input input-bordered input-sm flex-1"
                  value={effective.name}
                  disabled={locked}
                  onChange={(e) => patchTier(tier.TicketTypeID, { name: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={() =>
                    patchTier(tier.TicketTypeID, {
                      status: effective.status === "active" ? "suspended" : "active",
                    })
                  }
                >
                  {effective.status === "active" ? "Suspend" : "Reactivate"}
                </button>
              </div>

              {locked && (
                <p className="text-xs opacity-70">
                  Locked — tickets already sold. You can still suspend this tier.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">
                  Price per ticket (KES)
                  <input
                    type="number"
                    min={0}
                    className="input input-bordered input-sm w-full mt-1"
                    value={effective.price}
                    disabled={locked}
                    onChange={(e) => patchTier(tier.TicketTypeID, { price: Number(e.target.value) })}
                  />
                </label>
                <label className="text-xs">
                  Number of tickets
                  <input
                    type="number"
                    min={1}
                    className="input input-bordered input-sm w-full mt-1"
                    value={effective.totalQuantity}
                    disabled={locked}
                    onChange={(e) =>
                      patchTier(tier.TicketTypeID, { totalQuantity: Number(e.target.value) })
                    }
                  />
                </label>
              </div>

              {tier.type === "group" && (
                <label className="text-xs block">
                  People per group
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      className="btn btn-xs btn-outline btn-circle"
                      aria-label="Decrease group size"
                      disabled={locked}
                      onClick={() =>
                        patchTier(tier.TicketTypeID, {
                          groupSize: Math.max(2, (effective.groupSize ?? 5) - 1),
                        })
                      }
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center">{effective.groupSize ?? 5}</span>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline btn-circle"
                      aria-label="Increase group size"
                      disabled={locked}
                      onClick={() =>
                        patchTier(tier.TicketTypeID, { groupSize: (effective.groupSize ?? 5) + 1 })
                      }
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </label>
              )}
            </div>
          );
        })}

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium opacity-70">Add a new tier</span>
          <button type="button" onClick={addNewRow} className="btn btn-xs btn-outline gap-1">
            <Plus size={14} /> Add ticket type
          </button>
        </div>

        {newRows.map((row) => (
          <NewTicketTypeRow
            key={row._key}
            row={row}
            canRemove
            onUpdate={updateNewRow}
            onSetPreset={setNewRowPreset}
            onRemove={removeNewRow}
          />
        ))}
      </div>
    );
  }
);

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
  const ticketTypesRef = useRef<ExistingTicketTypesHandle>(null);

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
    customCategory: event?.customCategory ?? null,
    date: event?.date ?? "",
    time: event?.time ?? "",
  });

  const setCategory = (category: TCategory) => {
    setForm((f) => ({
      ...f,
      category,
      // Client-side defense in depth: the backend also enforces this, but we
      // don't rely on that alone (matches eventsAPI's TCreateEventPayload note).
      customCategory: category === "Other" ? f.customCategory : null,
    }));
  };

  // Ticket tiers are handled by two different flows depending on mode:
  // - create mode: bundled into createEvent's payload (unchanged, ticketRows).
  // - edit mode: existing tiers are editable via ExistingTicketTypesSection
  //   (§7.2) — new tiers there call createTicketType directly instead.
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
        // Ticket tiers ARE editable in edit mode (§7.2) — handled by
        // ExistingTicketTypesSection, committed alongside the event fields
        // below so both succeed or the modal stays open with an error.
        await updateEvent({ id: activeEvent.EventID, ...form, ...imagePatch }).unwrap();
        if (ticketTypesRef.current) {
          await ticketTypesRef.current.commitPendingChanges();
        }
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
                onChange={(e) => setCategory(e.target.value as TCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {form.category === "Other" && (
            <label className="text-sm block">
              Custom category
              <input
                className="input input-bordered w-full mt-1"
                value={form.customCategory ?? ""}
                maxLength={CUSTOM_CATEGORY_MAX}
                onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                required
              />
            </label>
          )}

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

          {activeEvent ? (
            <ExistingTicketTypesSection ref={ticketTypesRef} eventId={activeEvent.EventID} />
          ) : (
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ticket types</span>
                <button type="button" onClick={addRow} className="btn btn-xs btn-outline gap-1">
                  <Plus size={14} /> Add ticket type
                </button>
              </div>

              {ticketRows.map((row) => (
                <NewTicketTypeRow
                  key={row._key}
                  row={row}
                  canRemove={ticketRows.length > 1}
                  onUpdate={updateRow}
                  onSetPreset={setRowPreset}
                  onRemove={removeRow}
                />
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