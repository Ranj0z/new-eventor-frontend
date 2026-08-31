import { useGetAllPaymentsQuery } from "../../reducers/payments/paymentsAPI";
import { useGetAllRSVPsQuery, useMarkRSVPPaidMutation, useMarkRSVPUnpaidMutation } from "../../reducers/rsvp/rsvpAPI";
import { TableSkeleton } from "../shared/Skeletons";

// paymentsAPI has no update/status endpoint — "paid" lives on the RSVP and
// flips automatically when a payment is created, or manually here. See
// paymentsAPI.ts / rsvpAPI.ts. Shared by admin and host dashboards.
export default function PaymentsPanel() {
  const { data, isLoading, error } = useGetAllPaymentsQuery();
  const { data: rsvpData } = useGetAllRSVPsQuery();

  const payments = data?.allPayments;
  const rsvps = rsvpData?.reservations;

  const [markPaid] = useMarkRSVPPaidMutation();
  const [markUnpaid] = useMarkRSVPUnpaidMutation();

  const rsvpMap: Record<number, boolean> = {};
  rsvps?.forEach((r) => (rsvpMap[r.RSVPID] = r.paid));

  return (
    <section>
      <h1 className="font-display text-2xl mb-6">Payments</h1>

      {isLoading && <TableSkeleton columns={8} />}
      {error && <p className="text-error">Couldn't load payments.</p>}
      {!isLoading && !error && payments?.length === 0 && (
        <p className="text-base-content/60">No payments recorded yet.</p>
      )}

      {!!payments?.length && (
        <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
          <table className="table">
            <thead>
              <tr>
                <th>RSVP</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Balance</th>
                <th>Date</th>
                <th>Status</th>
                <th>Paid on RSVP</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const paid = rsvpMap[p.RSVPID];
                return (
                  <tr key={p.PaymentID}>
                    <td>#{p.RSVPID}</td>
                    <td>{p.paymentMethod}</td>
                    <td>KES {Number(p.amount).toLocaleString()}</td>
                    <td>KES {Number(p.balance).toLocaleString()}</td>
                    <td>{p.paymentDate}</td>
                    <td>
                      <span className="badge badge-sm badge-ghost">{p.paymentStatus}</span>
                    </td>
                    <td>{paid ? "Yes" : "No"}</td>
                    <td className="text-right">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => (paid ? markUnpaid(p.RSVPID) : markPaid(p.RSVPID))}
                      >
                        Mark {paid ? "unpaid" : "paid"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}