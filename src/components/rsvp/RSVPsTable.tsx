import { useMemo, useState, useRef } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useGetAllRSVPsQuery, useUpdateRSVPStatusMutation } from "../../reducers/rsvp/rsvpAPI";
import type { TRSVP, TRSVPStatus } from "../../reducers/rsvp/rsvpAPI";
import { useGetAllEventsQuery } from "../../reducers/events/eventsAPI";
import StatusModal from "../shared/StatusModal";
import { TableSkeleton } from "../shared/Skeletons";

const STATUS_OPTIONS: TRSVPStatus[] = ["Pending", "Booked", "Cancelled"];

const statusBadge: Record<TRSVPStatus, string> = {
  Pending: "badge-warning",
  Booked: "badge-success",
  Cancelled: "badge-error",
};

type SortOption = "newest" | "oldest" | "amount-high" | "amount-low";

const SORTERS: Record<SortOption, (a: TRSVP, b: TRSVP) => number> = {
  newest: (a, b) => b.RSVPID - a.RSVPID,
  oldest: (a, b) => a.RSVPID - b.RSVPID,
  "amount-high": (a, b) => Number(b.totalAmount) - Number(a.totalAmount),
  "amount-low": (a, b) => Number(a.totalAmount) - Number(b.totalAmount),
};

function initials(firstName: string, lastName: string) {
  const a = firstName?.trim()?.[0] ?? "";
  const b = lastName?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

function formatAmount(totalAmount: number) {
  const amount = Number(totalAmount);
  return amount > 0 ? `KES ${amount.toLocaleString()}` : "Free";
}

// Same table serves admin (all RSVPs) and host (own-event RSVPs, scoped
// server-side) — see eventor-architecture-decisions.md §7. getAllEvents is
// scoped the same way, so the EventID→title map below is safe for both roles.
export default function RSVPsTable() {
  const { data, isLoading, error } = useGetAllRSVPsQuery();
  const { data: eventsData } = useGetAllEventsQuery();
  const [updateStatus, { isLoading: saving }] = useUpdateRSVPStatusMutation();
  const [editing, setEditing] = useState<TRSVP | null>(null);
  const [tab, setTab] = useState<"table" | "grouped">("table");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const touchStartX = useRef<number | null>(null);

  const reservations = data?.reservations;

  const eventTitle: Record<number, string> = {};
  eventsData?.Events.forEach((e) => (eventTitle[e.EventID] = e.title));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (reservations ?? [])
      .filter((r) => {
        if (!q) return true;
        const name = `${r.firstName} ${r.lastName}`.toLowerCase();
        return name.includes(q) || (r.email ?? "").toLowerCase().includes(q);
      })
      .filter((r) => !dateFrom || r.RSVPDate >= dateFrom)
      .filter((r) => !dateTo || r.RSVPDate <= dateTo)
      .sort(SORTERS[sortBy]);
  }, [reservations, search, dateFrom, dateTo, sortBy]);

  const stats = useMemo(() => {
    const list = reservations ?? [];
    return {
      total: list.length,
      paid: list.filter((r) => r.paid).length,
      unpaid: list.filter((r) => !r.paid).length,
      pending: list.filter((r) => r.RSVPStatus === "Pending").length,
      booked: list.filter((r) => r.RSVPStatus === "Booked").length,
      cancelled: list.filter((r) => r.RSVPStatus === "Cancelled").length,
    };
  }, [reservations]);

  const grouped = useMemo(() => {
    const map = new Map<number, TRSVP[]>();
    visible.forEach((r) => {
      const list = map.get(r.EventID) ?? [];
      list.push(r);
      map.set(r.EventID, list);
    });
    return Array.from(map.entries())
      .map(([eventId, rows]) => ({ eventId, rows }))
      .sort((a, b) => b.rows.length - a.rows.length);
  }, [visible]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    if (delta < 0 && tab === "table") setTab("grouped");
    if (delta > 0 && tab === "grouped") setTab("table");
  };

  const editingModal = editing && (
    <StatusModal
      title={`RSVP #${editing.RSVPID}`}
      rows={[
        { label: "Guest", value: `${editing.firstName} ${editing.lastName}` },
        { label: "Email", value: editing.email },
        { label: "Date", value: editing.RSVPDate },
        { label: "Amount", value: formatAmount(editing.totalAmount) },
      ]}
      statusOptions={STATUS_OPTIONS}
      currentStatus={editing.RSVPStatus}
      isSaving={saving}
      onClose={() => setEditing(null)}
      onSave={async (status) => {
        await updateStatus({ id: editing.RSVPID, RSVPStatus: status }).unwrap();
      }}
    />
  );

  return (
    <section>
      <h1 className="font-display text-2xl mb-6">RSVPs</h1>

      {isLoading && <TableSkeleton columns={7} />}
      {error && <p className="text-error">Couldn't load RSVPs.</p>}
      {!isLoading && !error && reservations?.length === 0 && (
        <p className="text-base-content/60">No RSVPs yet.</p>
      )}

      {!isLoading && !error && !!reservations?.length && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mb-4 text-base-content/70">
            <span>Total <b className="text-base-content">{stats.total}</b></span>
            <span className="text-base-content/30">·</span>
            <span>Paid <b className="text-success">{stats.paid}</b></span>
            <span className="text-base-content/30">·</span>
            <span>Unpaid <b className="text-base-content">{stats.unpaid}</b></span>
            <span className="text-base-content/30">·</span>
            <span>Pending <b className="text-warning">{stats.pending}</b></span>
            <span className="text-base-content/30">·</span>
            <span>Booked <b className="text-success">{stats.booked}</b></span>
            <span className="text-base-content/30">·</span>
            <span>Cancelled <b className="text-error">{stats.cancelled}</b></span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
            <div role="tablist" className="tabs tabs-boxed w-fit shrink-0">
              <button
                role="tab"
                className={`tab ${tab === "table" ? "tab-active" : ""}`}
                onClick={() => setTab("table")}
              >
                Table view
              </button>
              <button
                role="tab"
                className={`tab ${tab === "grouped" ? "tab-active" : ""}`}
                onClick={() => setTab("grouped")}
              >
                By event
              </button>
            </div>

            <label className="input input-bordered flex items-center gap-2 flex-1">
              <Search size={16} className="text-base-content/50" />
              <input
                className="grow"
                placeholder="Search by guest name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <button
              className={`btn btn-sm shrink-0 ${showFilters || dateFrom || dateTo ? "btn-primary btn-soft" : "btn-ghost"}`}
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal size={14} />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-base-100 border border-base-300 rounded-box">
              <select
                className="select select-bordered select-sm w-full sm:w-48"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="amount-high">Amount: high to low</option>
                <option value="amount-low">Amount: low to high</option>
              </select>
              <label className="text-sm text-base-content/60 flex items-center gap-2">
                From
                <input
                  type="date"
                  className="input input-bordered input-sm"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>
              <label className="text-sm text-base-content/60 flex items-center gap-2">
                To
                <input
                  type="date"
                  className="input input-bordered input-sm"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
              {(dateFrom || dateTo) && (
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  Clear dates
                </button>
              )}
            </div>
          )}

          <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {visible.length === 0 && (
              <p className="text-base-content/60">No RSVPs match the current filters.</p>
            )}

            {visible.length > 0 && tab === "table" && (
              <RSVPFlatTable rows={visible} onEdit={setEditing} />
            )}

            {visible.length > 0 && tab === "grouped" && (
              <div className="space-y-3">
                {grouped.map(({ eventId, rows }) => (
                  <EventGroup
                    key={eventId}
                    title={eventTitle[eventId] ?? `Event #${eventId}`}
                    rows={rows}
                    onEdit={setEditing}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {editingModal}
    </section>
  );
}

function RSVPFlatTable({ rows, onEdit }: { rows: TRSVP[]; onEdit: (r: TRSVP) => void }) {
  return (
    <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>Guest</th>
            <th>Date</th>
            <th className="text-right">Amount</th>
            <th>Paid</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <RSVPRow key={r.RSVPID} r={r} onEdit={onEdit} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventGroup({ title, rows, onEdit }: { title: string; rows: TRSVP[]; onEdit: (r: TRSVP) => void }) {
  const paid = rows.filter((r) => r.paid).length;
  const pending = rows.filter((r) => r.RSVPStatus === "Pending").length;

  return (
    <div className="collapse collapse-arrow bg-base-100 border border-base-300 rounded-box">
      <input type="checkbox" defaultChecked />
      <div className="collapse-title font-medium flex items-center gap-3">
        <span>{title}</span>
        <span className="text-sm text-base-content/60 font-normal">
          {rows.length} RSVP{rows.length !== 1 ? "s" : ""} · {paid} paid · {pending} pending
        </span>
      </div>
      <div className="collapse-content">
        <RSVPFlatTable rows={rows} onEdit={onEdit} />
      </div>
    </div>
  );
}

function RSVPRow({ r, onEdit }: { r: TRSVP; onEdit: (r: TRSVP) => void }) {
  return (
    <tr className="hover:bg-base-200/60 transition-colors">
      <td>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
            {initials(r.firstName, r.lastName)}
          </div>
          <div className="min-w-0">
            <div className="truncate">
              {r.firstName || r.lastName ? `${r.firstName} ${r.lastName}` : "—"}
            </div>
            <div className="text-xs text-base-content/50 truncate">{r.email || "—"}</div>
          </div>
        </div>
      </td>
      <td>{r.RSVPDate}</td>
      <td className="text-right">{formatAmount(r.totalAmount)}</td>
      <td>
        <span className={`badge badge-sm ${r.paid ? "badge-success badge-soft" : "badge-ghost"}`}>
          {r.paid ? "Paid" : "Unpaid"}
        </span>
      </td>
      <td>
        <span className={`badge badge-sm ${statusBadge[r.RSVPStatus]}`}>{r.RSVPStatus}</span>
      </td>
      <td className="text-right">
        <button className="btn btn-ghost btn-xs" onClick={() => onEdit(r)}>
          Edit status
        </button>
      </td>
    </tr>
  );
}