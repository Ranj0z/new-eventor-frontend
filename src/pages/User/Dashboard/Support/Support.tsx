import { useState, type FormEvent } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../../app/store";
import { useCreateTicketMutation, useGetTicketsByUserQuery } from "../../../../reducers/tickets/ticketsAPI";
import type { TTicketStatus } from "../../../../reducers/tickets/ticketsAPI";
import { ListSkeleton } from "../../../../components/shared/Skeletons";

const statusBadge: Record<TTicketStatus, string> = {
  Pending: "badge-warning",
  "In Progress": "badge-info",
  Closed: "badge-ghost",
};

export default function Support() {
  const user = useSelector((state: RootState) => state.user.user);
  const { data, isLoading } = useGetTicketsByUserQuery(user!.UserID, { skip: !user });
  const [createTicket, { isLoading: submitting, error }] = useCreateTicketMutation();
  const [form, setForm] = useState({ subject: "", description: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSent(false);
    try {
      await createTicket(form).unwrap();
      setForm({ subject: "", description: "" });
      setSent(true);
    } catch {
      // error surfaced below
    }
  };

  return (
    <section className="max-w-lg">
      <h1 className="font-display text-2xl mb-6">Support</h1>

      <form onSubmit={handleSubmit} className="space-y-3 mb-8">
        <label className="text-sm block">
          Subject
          <input
            className="input input-bordered w-full mt-1"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
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

        {error && <p className="text-error text-sm">Couldn't submit that. Try again.</p>}
        {sent && <p className="text-success text-sm">Ticket submitted.</p>}

        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit ticket"}
        </button>
      </form>

      <h2 className="font-display text-lg mb-3">Your tickets</h2>
      {isLoading && <ListSkeleton count={2} />}
      {!isLoading && data?.Tickets.length === 0 && (
        <p className="text-base-content/60">No tickets submitted yet.</p>
      )}

      <div className="space-y-2">
        {data?.Tickets.map((t) => (
          <div key={t.TicketID} className="bg-base-100 border border-base-300 rounded-box p-4 text-sm flex items-center justify-between">
            <div>
              <p className="font-medium">{t.subject}</p>
              <p className="text-base-content/60">{t.created_at}</p>
            </div>
            <span className={`badge badge-sm ${statusBadge[t.ticketStatus]}`}>{t.ticketStatus}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
