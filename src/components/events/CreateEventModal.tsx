import { useState, type FormEvent } from "react";
import { X, Plus, Minus, Trash2 } from "lucide-react";
import type { TCategory, TEvents, TTicketTypeInput } from "../../reducers/events/eventsAPI";
import { useCreateEventMutation, useUpdateEventMutation } from "../../reducers/events/eventsAPI";
import type { TTicketTypePreset } from "../../reducers/ticketTypes/ticketTypesAPI";
import type { TVenue } from "../../reducers/venues/venuesAPI";
import { useUploadImageMutation } from "../../reducers/uploads/uploadsAPI";
import ImageUploadField from "../shared/ImageUploadField";

const CATEGORIES: TCategory[] = ["Tech", "Data Science", "Web Dev"];

const PRESETS: TTicketTypePreset[] = ["Free Entry", "Early Bird", "Regular", "VIP", "Group ticket", "Custom"];

const PRESET_FIXED_NAME: Partial<Record<TTicketTypePreset, string>> = {
  "Free Entry": "Free Entry",
  "Group ticket": "Group ticket",
};

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

    if (!event && ticketRows.length === 0) {
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
      if (event) {
        // Ticket tiers are create-only — editing an event never touches ticketTypes.
        await updateEvent({ id: event.EventID, ...form, ...imagePatch }).unwrap();
      } else {
        const ticketTypes: TTicketTypeInput[] = ticketRows.map(({ _key, ...row }) => ({
          ...row,
          groupSize: row.preset === "Group ticket" ? row.groupSize ?? 5 : null,
        }));
        await createEvent({ ...form, ...imagePatch, ticketTypes }).unwrap();
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

          {event ? (
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