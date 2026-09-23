import { useState } from "react";
import { useGetAllWithdrawalsQuery } from "../../reducers/wallet/walletAPI";
import type { TWithdrawalRequest, TWithdrawalStatus } from "../../reducers/wallet/walletAPI";
import { TableSkeleton } from "../shared/Skeletons";
import ReviewWithdrawalModal from "./ReviewWithdrawalModal";

const STATUS_TABS: TWithdrawalStatus[] = ["Pending", "Approved", "Rejected"];

const statusBadge: Record<TWithdrawalStatus, string> = {
  Pending: "badge-ghost",
  Approved: "badge-success",
  Rejected: "badge-error",
};

const PAGE_SIZE = 10;

export default function AdminWithdrawalsPanel() {
  const [statusFilter, setStatusFilter] = useState<TWithdrawalStatus>("Pending");
  const [offset, setOffset] = useState(0);
  const [reviewing, setReviewing] = useState<TWithdrawalRequest | null>(null);

  const { data, isLoading, error } = useGetAllWithdrawalsQuery({ status: statusFilter });

  // Reset page when filter changes
  const handleTabChange = (s: TWithdrawalStatus) => {
    setStatusFilter(s);
    setOffset(0);
  };

  const paged = data?.slice(offset, offset + PAGE_SIZE) ?? [];

  return (
    <section>
      <h1 className="font-display text-2xl mb-6">Withdrawal requests</h1>

      {/* Status filter tabs */}
      <div role="tablist" className="tabs tabs-boxed w-fit mb-4">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            role="tab"
            className={`tab ${statusFilter === s ? "tab-active" : ""}`}
            onClick={() => handleTabChange(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && <TableSkeleton columns={5} />}
      {error && <p className="text-error">Couldn't load withdrawal requests.</p>}
      {!isLoading && !error && data?.length === 0 && (
        <p className="text-base-content/60">No {statusFilter.toLowerCase()} withdrawal requests.</p>
      )}

      {paged.length > 0 && (
        <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
          <table className="table">
            <thead>
              <tr>
                <th>Requested</th>
                <th>Amount</th>
                <th>Status</th>
                {statusFilter === "Approved" && <th>Payout method</th>}
                {statusFilter === "Rejected" && <th>Reason</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((w) => (
                <tr key={w.WithdrawalID}>
                  <td>{new Date(w.requestedAt).toLocaleDateString()}</td>
                  <td>KES {Number(w.amount).toLocaleString()}</td>
                  <td>
                    <span className={`badge badge-sm ${statusBadge[w.status]}`}>{w.status}</span>
                  </td>
                  {statusFilter === "Approved" && (
                    <td>{w.payoutMethod ? `${w.payoutMethod} — ${w.payoutReference}` : "—"}</td>
                  )}
                  {statusFilter === "Rejected" && (
                    <td className="max-w-xs truncate" title={w.rejectionReason ?? undefined}>
                      {w.rejectionReason ?? "—"}
                    </td>
                  )}
                  <td className="text-right">
                    {w.status === "Pending" && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setReviewing(w)}
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Prev / Next — no total count from the endpoint, enabled when page is full */}
      {(offset > 0 || paged.length === PAGE_SIZE) && (
        <div className="flex justify-end gap-2 mt-3">
          <button
            className="btn btn-ghost btn-sm"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            Previous
          </button>
          <button
            className="btn btn-ghost btn-sm"
            disabled={paged.length < PAGE_SIZE}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Next
          </button>
        </div>
      )}

      {reviewing && (
        <ReviewWithdrawalModal
          withdrawal={reviewing}
          onClose={() => setReviewing(null)}
        />
      )}
    </section>
  );
}
