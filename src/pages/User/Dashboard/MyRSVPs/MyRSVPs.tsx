import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import type { RootState } from "../../../../app/store";
import { useGetRSVPsByUserQuery } from "../../../../reducers/rsvp/rsvpAPI";
import type { TRSVPStatus } from "../../../../reducers/rsvp/rsvpAPI";
import { ListSkeleton } from "../../../../components/shared/Skeletons";

const statusBadge: Record<TRSVPStatus, string> = {
  Pending: "badge-warning",
  Booked: "badge-success",
  Cancelled: "badge-error",
};

// View-only — no edit/cancel action here, see eventor-build-spec.md §8.
export default function MyRSVPs() {
  const user = useSelector((state: RootState) => state.user.user);
  const { data, isLoading, error } = useGetRSVPsByUserQuery(user!.UserID, { skip: !user });

  return (
    <section>
      <h1 className="font-display text-2xl mb-6">My RSVPs</h1>

      {isLoading && <ListSkeleton />}
      {error && <p className="text-error">Couldn't load your RSVPs.</p>}
      {!isLoading && !error && data?.reservations.length === 0 && (
        <p className="text-base-content/60">No RSVPs yet — browse events to book one.</p>
      )}

      <div className="space-y-3">
        {data?.reservations.map((r) => (
          <div key={r.RSVPID} className="bg-base-100 border border-base-300 rounded-box p-4 text-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">RSVP #{r.RSVPID}</p>
                <p className="text-base-content/60">
                  {r.RSVPDate} · {r.totalAmount > 0 ? `KES ${r.totalAmount.toLocaleString()}` : "Free"} ·{" "}
                  {r.paid ? "Paid" : "Not paid"}
                </p>
              </div>
              <span className={`badge badge-sm ${statusBadge[r.RSVPStatus]}`}>{r.RSVPStatus}</span>
            </div>

            {!r.paid && r.amountPaid < r.totalAmount && (
              <div className="space-y-1">
                <p className="text-base-content/60">
                  Paid: KES {Number(r.amountPaid).toLocaleString()} of KES {Number(r.totalAmount).toLocaleString()}
                </p>
                <progress className="progress progress-primary w-full" value={r.amountPaid} max={r.totalAmount} />
                {r.idNumber && (
                  <Link to={`/rsvp/lookup?idNumber=${encodeURIComponent(r.idNumber)}`} className="text-primary text-sm">
                    Make a payment →
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}