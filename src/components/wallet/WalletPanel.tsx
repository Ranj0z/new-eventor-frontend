import { useState } from "react";
import {
  useGetWalletBalanceQuery,
  useGetWalletTransactionsQuery,
  useGetMyWithdrawalsQuery,
} from "../../reducers/wallet/walletAPI";
import { TableSkeleton } from "../shared/Skeletons";
import WithdrawalRequestModal from "./WithdrawalRequestModal";

const PAGE_SIZE = 10;

type Tab = "ledger" | "withdrawals";

export default function WalletPanel() {
  const [tab, setTab] = useState<Tab>("ledger");
  const [showRequestModal, setShowRequestModal] = useState(false);

  const [ledgerOffset, setLedgerOffset] = useState(0);
  const [withdrawalsOffset, setWithdrawalsOffset] = useState(0);

  const { data: wallet, isLoading: balanceLoading, error: balanceError } = useGetWalletBalanceQuery();

  const {
    data: transactions,
    isLoading: ledgerLoading,
    error: ledgerError,
  } = useGetWalletTransactionsQuery({ limit: PAGE_SIZE, offset: ledgerOffset });

  const {
    data: withdrawals,
    isLoading: withdrawalsLoading,
    error: withdrawalsError,
  } = useGetMyWithdrawalsQuery();

  const balance = wallet ? Number(wallet.balance) : 0;

  // Client-side page slice — the endpoint returns the full "my withdrawals"
  // list (no server-side pagination for that one per the API plan), so
  // paginate it here for consistency with the ledger table.
  const pagedWithdrawals = withdrawals?.slice(withdrawalsOffset, withdrawalsOffset + PAGE_SIZE);

  return (
    <section>
      <h1 className="font-display text-2xl mb-6">Wallet</h1>

      <div className="bg-base-100 border border-base-300 rounded-box p-6 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-base-content/60">Available balance</p>
          {balanceLoading ? (
            <div className="skeleton h-8 w-32 mt-1" />
          ) : balanceError ? (
            <p className="text-error text-sm">Couldn't load balance.</p>
          ) : (
            <p className="font-display text-3xl">KES {balance.toLocaleString()}</p>
          )}
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowRequestModal(true)}
          disabled={balanceLoading || !!balanceError || balance <= 0}
        >
          Request withdrawal
        </button>
      </div>

      <div role="tablist" className="tabs tabs-boxed w-fit mb-4">
        <button
          role="tab"
          className={`tab ${tab === "ledger" ? "tab-active" : ""}`}
          onClick={() => setTab("ledger")}
        >
          Ledger
        </button>
        <button
          role="tab"
          className={`tab ${tab === "withdrawals" ? "tab-active" : ""}`}
          onClick={() => setTab("withdrawals")}
        >
          My withdrawal requests
        </button>
      </div>

      {tab === "ledger" && (
        <>
          {ledgerLoading && <TableSkeleton columns={5} />}
          {ledgerError && <p className="text-error">Couldn't load transactions.</p>}
          {!ledgerLoading && !ledgerError && transactions?.length === 0 && (
            <p className="text-base-content/60">No transactions yet.</p>
          )}

          {!!transactions?.length && (
            <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
              <table className="table">
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
                  {transactions.map((t) => (
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
                        {t.PaymentID ? `Payment #${t.PaymentID}` : t.WithdrawalID ? `Withdrawal #${t.WithdrawalID}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pager
            offset={ledgerOffset}
            count={transactions?.length ?? 0}
            onPrev={() => setLedgerOffset((o) => Math.max(0, o - PAGE_SIZE))}
            onNext={() => setLedgerOffset((o) => o + PAGE_SIZE)}
          />
        </>
      )}

      {tab === "withdrawals" && (
        <>
          {withdrawalsLoading && <TableSkeleton columns={5} />}
          {withdrawalsError && <p className="text-error">Couldn't load withdrawal requests.</p>}
          {!withdrawalsLoading && !withdrawalsError && withdrawals?.length === 0 && (
            <p className="text-base-content/60">No withdrawal requests yet.</p>
          )}

          {!!pagedWithdrawals?.length && (
            <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
              <table className="table">
                <thead>
                  <tr>
                    <th>Requested</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payout method</th>
                    <th>Payout reference</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedWithdrawals.map((w) => {
                    const statusBadgeClass =
                      w.status === "Approved" ? "badge-success" : w.status === "Rejected" ? "badge-error" : "badge-ghost";
                    return (
                      <tr key={w.WithdrawalID}>
                        <td>{new Date(w.requestedAt).toLocaleDateString()}</td>
                        <td>KES {Number(w.amount).toLocaleString()}</td>
                        <td>
                          <span
                            className={`badge badge-sm ${statusBadgeClass}`}
                            title={w.status === "Rejected" ? (w.rejectionReason ?? undefined) : undefined}
                          >
                            {w.status}
                          </span>
                        </td>
                        <td>{w.payoutMethod ?? "—"}</td>
                        <td>{w.payoutReference ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pager
            offset={withdrawalsOffset}
            count={pagedWithdrawals?.length ?? 0}
            onPrev={() => setWithdrawalsOffset((o) => Math.max(0, o - PAGE_SIZE))}
            onNext={() => setWithdrawalsOffset((o) => o + PAGE_SIZE)}
          />
        </>
      )}

      {showRequestModal && wallet && (
        <WithdrawalRequestModal balance={Number(wallet.balance)} onClose={() => setShowRequestModal(false)} />
      )}
    </section>
  );
}

// Simple prev/next pager — no total-count field on these endpoints, so page
// forward is enabled whenever the current page came back full.
function Pager({
  offset,
  count,
  onPrev,
  onNext,
}: {
  offset: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (offset === 0 && count < PAGE_SIZE) return null;

  return (
    <div className="flex justify-end gap-2 mt-3">
      <button className="btn btn-ghost btn-sm" onClick={onPrev} disabled={offset === 0}>
        Previous
      </button>
      <button className="btn btn-ghost btn-sm" onClick={onNext} disabled={count < PAGE_SIZE}>
        Next
      </button>
    </div>
  );
}
