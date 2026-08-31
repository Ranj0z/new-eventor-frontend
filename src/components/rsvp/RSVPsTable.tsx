import { useState } from "react";
import { useGetAllRSVPsQuery, useUpdateRSVPStatusMutation } from "../../reducers/rsvp/rsvpAPI";
import type { TRSVP, TRSVPStatus } from "../../reducers/rsvp/rsvpAPI";
import StatusModal from "../shared/StatusModal";
import { TableSkeleton } from "../shared/Skeletons";

const STATUS_OPTIONS: TRSVPStatus[] = ["Pending", "Booked", "Cancelled"];

const statusBadge: Record<TRSVPStatus, string> = {
  Pending: "badge-warning",
  Booked: "badge-success",
  Cancelled: "badge-error",
};

// Same table serves admin (all RSVPs) and host (own-event RSVPs, scoped
// server-side) — see eventor-architecture-decisions.md §7.
export default function RSVPsTable() {
  const { data, isLoading, error } = useGetAllRSVPsQuery();
  const [updateStatus, { isLoading: saving }] = useUpdateRSVPStatusMutation();
  const [editing, setEditing] = useState<TRSVP | null>(null);

  const reservations = data?.reservations;

  return (
    <section>
      <h1 className="font-display text-2xl mb-6">RSVPs</h1>

      {isLoading && <TableSkeleton columns={7} />}
      {error && <p className="text-error">Couldn't load RSVPs.</p>}
      {!isLoading && !error && reservations?.length === 0 && (
        <p className="text-base-content/60">No RSVPs yet.</p>
      )}

      {!!reservations?.length && (
        <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
          <table className="table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Email</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => {
                const amount = Number(r.totalAmount);
                return (
                  <tr key={r.RSVPID}>
                    <td>
                      {r.firstName} {r.lastName}
                    </td>
                    <td>{r.email}</td>
                    <td>{r.RSVPDate}</td>
                    <td>{amount > 0 ? `KES ${amount.toLocaleString()}` : "Free"}</td>
                    <td>{r.paid ? "Yes" : "No"}</td>
                    <td>
                      <span className={`badge badge-sm ${statusBadge[r.RSVPStatus]}`}>{r.RSVPStatus}</span>
                    </td>
                    <td className="text-right">
                      <button className="btn btn-ghost btn-xs" onClick={() => setEditing(r)}>
                        Edit status
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <StatusModal
          title={`RSVP #${editing.RSVPID}`}
          rows={[
            { label: "Guest", value: `${editing.firstName} ${editing.lastName}` },
            { label: "Email", value: editing.email },
            { label: "Date", value: editing.RSVPDate },
            {
              label: "Amount",
              value: Number(editing.totalAmount) > 0 ? `KES ${Number(editing.totalAmount).toLocaleString()}` : "Free",
            },
          ]}
          statusOptions={STATUS_OPTIONS}
          currentStatus={editing.RSVPStatus}
          isSaving={saving}
          onClose={() => setEditing(null)}
          onSave={async (status) => {
            await updateStatus({ id: editing.RSVPID, RSVPStatus: status }).unwrap();
          }}
        />
      )}
    </section>
  );
}