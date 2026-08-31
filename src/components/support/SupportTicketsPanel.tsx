import { useState } from "react";
import { useGetAllTicketsQuery, useUpdateTicketStatusMutation } from "../../reducers/tickets/ticketsAPI";
import type { TTicket, TTicketStatus } from "../../reducers/tickets/ticketsAPI";
import StatusModal from "../shared/StatusModal";
import { TableSkeleton } from "../shared/Skeletons";

const STATUS_OPTIONS: TTicketStatus[] = ["Pending", "In Progress", "Closed"];

const statusBadge: Record<TTicketStatus, string> = {
  Pending: "badge-warning",
  "In Progress": "badge-info",
  Closed: "badge-ghost",
};

export default function SupportTicketsPanel() {
  const { data, isLoading, error } = useGetAllTicketsQuery();
  const [updateStatus, { isLoading: saving }] = useUpdateTicketStatusMutation();
  const [editing, setEditing] = useState<TTicket | null>(null);

  return (
    <section>
      <h1 className="font-display text-2xl mb-6">Support tickets</h1>

      {isLoading && <TableSkeleton columns={4} />}
      {error && <p className="text-error">Couldn't load tickets.</p>}
      {!isLoading && !error && data?.Tickets.length === 0 && (
        <p className="text-base-content/60">No support tickets yet.</p>
      )}

      {!!data?.Tickets.length && (
        <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Opened</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.Tickets.map((t) => (
                <tr key={t.TicketID}>
                  <td>{t.subject}</td>
                  <td>{t.created_at}</td>
                  <td>
                    <span className={`badge badge-sm ${statusBadge[t.ticketStatus]}`}>{t.ticketStatus}</span>
                  </td>
                  <td className="text-right">
                    <button className="btn btn-ghost btn-xs" onClick={() => setEditing(t)}>
                      Edit status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <StatusModal
          title={editing.subject}
          rows={[{ label: "Description", value: editing.description }, { label: "Opened", value: editing.created_at }]}
          statusOptions={STATUS_OPTIONS}
          currentStatus={editing.ticketStatus}
          isSaving={saving}
          onClose={() => setEditing(null)}
          onSave={async (status) => {
            await updateStatus({ id: editing.TicketID, ticketStatus: status }).unwrap();
          }}
        />
      )}
    </section>
  );
}
