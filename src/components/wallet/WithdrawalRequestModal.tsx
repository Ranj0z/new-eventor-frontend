import { useState } from "react";
import { X } from "lucide-react";
import { useRequestWithdrawalMutation } from "../../reducers/wallet/walletAPI";
import { getApiErrorMessage } from "../../utils/apiError";

type WithdrawalRequestModalProps = {
  balance: number;
  onClose: () => void;
};

// Amount-only form — payout method/reference aren't collected here. The API
// takes `{amount}` only; the admin records how/where it was paid when they
// approve (see eventor-wallet-frontend-plan.md §1/§4).
export default function WithdrawalRequestModal({ balance, onClose }: WithdrawalRequestModalProps) {
  const [amount, setAmount] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [requestWithdrawal, { isLoading }] = useRequestWithdrawalMutation();

  const parsedAmount = Number(amount);
  const isValid = amount.trim().length > 0 && !Number.isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= balance;

  const validationMessage =
    touched && amount.trim().length > 0
      ? Number.isNaN(parsedAmount) || parsedAmount <= 0
        ? "Enter an amount greater than 0."
        : parsedAmount > balance
          ? "Amount can't exceed your available balance."
          : null
      : null;

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!isValid) {
      setTouched(true);
      return;
    }

    try {
      await requestWithdrawal({ amount: parsedAmount }).unwrap();
      onClose();
    } catch (err) {
      // Covers the case the plan calls out explicitly: balance changed
      // server-side since the modal opened, so the client-side check above
      // passed but the request still fails validation on the backend.
      setSubmitError(getApiErrorMessage(err as never) ?? "Couldn't submit the request. Try again.");
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" aria-label="Close">
          <X size={18} />
        </button>

        <h3 className="font-display text-xl mb-1">Request withdrawal</h3>
        <p className="text-sm text-base-content/60 mb-4">Available balance: KES {balance.toLocaleString()}</p>

        <label className="text-sm block mb-1">
          Amount (KES)
          <input
            type="number"
            className="input input-bordered w-full mt-1"
            placeholder="0"
            min={0}
            max={balance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => setTouched(true)}
            required
          />
        </label>
        {validationMessage && <span className="text-error text-xs block mb-3">{validationMessage}</span>}

        {submitError && <p className="text-error text-sm mt-3 mb-1">{submitError}</p>}

        <button className="btn btn-primary w-full mt-4" onClick={handleSubmit} disabled={isLoading || !isValid}>
          {isLoading ? "Submitting..." : "Submit request"}
        </button>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
