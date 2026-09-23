import { useState } from "react";
import { X } from "lucide-react";
import { useReviewWithdrawalMutation } from "../../reducers/wallet/walletAPI";
import type { TWithdrawalRequest } from "../../reducers/wallet/walletAPI";
import { getApiErrorMessage } from "../../utils/apiError";

type Props = {
  withdrawal: TWithdrawalRequest & { hostName?: string };
  onClose: () => void;
};

type Decision = "Approve" | "Reject";

const PAYOUT_METHODS = ["M-Pesa", "Bank", "Other"] as const;

export default function ReviewWithdrawalModal({ withdrawal, onClose }: Props) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<string>(PAYOUT_METHODS[0]);
  const [payoutReference, setPayoutReference] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [reviewWithdrawal, { isLoading }] = useReviewWithdrawalMutation();

  const approveValid = payoutReference.trim().length > 0;
  const rejectValid = rejectionReason.trim().length > 0;
  const canConfirm = decision === "Approve" ? approveValid : rejectValid;

  const handleConfirm = async () => {
    setSubmitError(null);
    try {
      await reviewWithdrawal(
        decision === "Approve"
          ? { withdrawalId: withdrawal.WithdrawalID, decision: "Approved", payoutMethod, payoutReference }
          : { withdrawalId: withdrawal.WithdrawalID, decision: "Rejected", rejectionReason }
      ).unwrap();
      onClose();
    } catch (err) {
      setSubmitError(getApiErrorMessage(err as never) ?? "Couldn't submit review. Try again.");
      setConfirming(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" aria-label="Close">
          <X size={18} />
        </button>

        <h3 className="font-display text-xl mb-4">Review withdrawal</h3>

        {/* Read-only summary */}
        <div className="space-y-2 text-sm mb-5">
          {withdrawal.hostName && (
            <p className="flex justify-between gap-4">
              <span className="text-base-content/60">Host</span>
              <span>{withdrawal.hostName}</span>
            </p>
          )}
          <p className="flex justify-between gap-4">
            <span className="text-base-content/60">Amount</span>
            <span className="font-medium">KES {Number(withdrawal.amount).toLocaleString()}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-base-content/60">Requested</span>
            <span>{new Date(withdrawal.requestedAt).toLocaleDateString()}</span>
          </p>
        </div>

        {/* Decision picker — shown until user picks one */}
        {!decision && (
          <div className="flex gap-3">
            <button className="btn btn-success flex-1" onClick={() => setDecision("Approve")}>
              Approve
            </button>
            <button className="btn btn-error flex-1" onClick={() => setDecision("Reject")}>
              Reject
            </button>
          </div>
        )}

        {/* Approve form */}
        {decision === "Approve" && !confirming && (
          <div className="space-y-4">
            <label className="text-sm block">
              Payout method
              <select
                className="select select-bordered w-full mt-1"
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
              >
                {PAYOUT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="text-sm block">
              Payout reference
              <input
                type="text"
                className="input input-bordered w-full mt-1"
                placeholder="e.g. M-Pesa confirmation code"
                value={payoutReference}
                onChange={(e) => setPayoutReference(e.target.value)}
              />
            </label>
            <div className="flex gap-3 pt-1">
              <button className="btn btn-ghost flex-1" onClick={() => setDecision(null)}>Back</button>
              <button
                className="btn btn-success flex-1"
                disabled={!approveValid}
                onClick={() => setConfirming(true)}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Reject form */}
        {decision === "Reject" && !confirming && (
          <div className="space-y-4">
            <label className="text-sm block">
              Reason for rejection
              <textarea
                className="textarea textarea-bordered w-full mt-1"
                rows={3}
                placeholder="Explain why this request is being rejected…"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </label>
            <div className="flex gap-3 pt-1">
              <button className="btn btn-ghost flex-1" onClick={() => setDecision(null)}>Back</button>
              <button
                className="btn btn-error flex-1"
                disabled={!rejectValid}
                onClick={() => setConfirming(true)}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Confirm step — shown after user fills the form */}
        {confirming && (
          <div>
            <div className="bg-base-200 rounded-box p-4 text-sm space-y-2 mb-4">
              <p className="font-medium">
                {decision === "Approve" ? "Approve this withdrawal?" : "Reject this withdrawal?"}
              </p>
              {decision === "Approve" ? (
                <>
                  <p className="flex justify-between"><span className="text-base-content/60">Method</span><span>{payoutMethod}</span></p>
                  <p className="flex justify-between"><span className="text-base-content/60">Reference</span><span>{payoutReference}</span></p>
                </>
              ) : (
                <p className="flex justify-between gap-4"><span className="text-base-content/60">Reason</span><span className="text-right">{rejectionReason}</span></p>
              )}
              <p className="text-warning text-xs pt-1">This action is final and cannot be undone.</p>
            </div>

            {submitError && <p className="text-error text-sm mb-3">{submitError}</p>}

            <div className="flex gap-3">
              <button className="btn btn-ghost flex-1" onClick={() => setConfirming(false)} disabled={isLoading}>
                Back
              </button>
              <button
                className={`btn flex-1 ${decision === "Approve" ? "btn-success" : "btn-error"}`}
                onClick={handleConfirm}
                disabled={isLoading || !canConfirm}
              >
                {isLoading ? "Submitting…" : "Confirm"}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
