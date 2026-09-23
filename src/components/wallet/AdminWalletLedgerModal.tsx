import { useState } from "react";
import { X } from "lucide-react";
import { useGetWalletLedgerByAdminQuery } from "../../reducers/wallet/walletAPI";
import type { TAdminWalletRow } from "../../reducers/wallet/walletAPI";
import { TableSkeleton } from "../shared/Skeletons";

type Props = {
  wallet: TAdminWalletRow;
  onClose: () => void;
};

const PAGE_SIZE = 10;

export default function AdminWalletLedgerModal({ wallet, onClose }: Props) {
  const [offset, setOffset] = useState(0);

  const { data, isLoading, error } = useGetWalletLedgerByAdminQuery({
    walletId: wallet.WalletID,
    limit: PAGE_SIZE,
    offset,
  });

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h3 className="font-display text-xl mb-1">Ledger — {wallet.hostName}</h3>
        <p className="text-sm text-base-content/60 mb-4">
          {wallet.hostEmail} &nbsp;·&nbsp; Balance: KES {Number(wallet.balance).toLocaleString()}
        </p>

        {isLoading && <TableSkeleton columns={5} />}
        {error && <p className="text-error text-sm">Couldn't load transactions.</p>}
        {!isLoading && !error && data?.length === 0 && (
          <p className="text-base-content/60 text-sm">No transactions yet.</p>
        )}

        {!!data?.length && (
          <div className="overflow-x-auto border border-base-300 rounded-box">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Ref</th>
                </tr>
              </thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.TransactionID}>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge badge-sm ${t.type === "credit" ? "badge-success" : "badge-ghost"}`}>
                        {t.type}
                      </span>
                    </td>
                    <td>KES {Number(t.amount).toLocaleString()}</td>
                    <td>{t.description ?? "—"}</td>
                    <td>
                      {t.PaymentID
                        ? `Payment #${t.PaymentID}`
                        : t.WithdrawalID
                          ? `Withdrawal #${t.WithdrawalID}`
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(offset > 0 || (data?.length ?? 0) === PAGE_SIZE) && (
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
              disabled={(data?.length ?? 0) < PAGE_SIZE}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Next
            </button>
          </div>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
