import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { useGetAllWalletsQuery } from "../../reducers/wallet/walletAPI";
import type { TAdminWalletRow } from "../../reducers/wallet/walletAPI";
import { TableSkeleton } from "../shared/Skeletons";
import AdminWalletLedgerModal from "./AdminWalletLedgerModal";

type SortBy = "balance" | "createdAt";
type SortOrder = "asc" | "desc";

const PAGE_SIZE = 10;

export default function AdminWalletsPanel() {
  const [sortBy, setSortBy] = useState<SortBy>("balance");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [offset, setOffset] = useState(0);
  const [viewingLedger, setViewingLedger] = useState<TAdminWalletRow | null>(null);

  const { data, isLoading, error } = useGetAllWalletsQuery({
    limit: PAGE_SIZE,
    offset,
    sortBy,
    sortOrder,
  });

  const toggleSort = (col: SortBy) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
    setOffset(0);
  };

  const SortIcon = ({ col }: { col: SortBy }) => (
    <ArrowUpDown
      size={12}
      className={`inline ml-1 ${sortBy === col ? "opacity-100" : "opacity-30"}`}
    />
  );

  return (
    <section>
      <h1 className="font-display text-2xl mb-6">Host wallets</h1>

      {isLoading && <TableSkeleton columns={4} />}
      {error && <p className="text-error">Couldn't load wallets.</p>}
      {!isLoading && !error && data?.length === 0 && (
        <p className="text-base-content/60">No host wallets found.</p>
      )}

      {!!data?.length && (
        <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
          <table className="table">
            <thead>
              <tr>
                <th>Host name</th>
                <th>Email</th>
                <th>
                  <button className="flex items-center gap-1" onClick={() => toggleSort("balance")}>
                    Balance <SortIcon col="balance" />
                  </button>
                </th>
                <th>
                  <button className="flex items-center gap-1" onClick={() => toggleSort("createdAt")}>
                    Created <SortIcon col="createdAt" />
                  </button>
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((w) => (
                <tr key={w.WalletID}>
                  <td>{w.hostName}</td>
                  <td>{w.hostEmail}</td>
                  <td>KES {Number(w.balance).toLocaleString()}</td>
                  <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                  <td className="text-right">
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => setViewingLedger(w)}
                    >
                      View ledger
                    </button>
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

      {viewingLedger && (
        <AdminWalletLedgerModal
          wallet={viewingLedger}
          onClose={() => setViewingLedger(null)}
        />
      )}
    </section>
  );
}
