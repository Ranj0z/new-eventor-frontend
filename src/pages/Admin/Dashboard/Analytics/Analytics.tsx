import { Users, CalendarDays, MapPin, Ticket, Wallet } from "lucide-react";
import { useGetAllUsersQuery } from "../../../../reducers/users/usersAPI";
import { useGetAllEventsQuery } from "../../../../reducers/events/eventsAPI";
import { useGetAllVenuesQuery } from "../../../../reducers/venues/venuesAPI";
import { useGetAllRSVPsQuery } from "../../../../reducers/rsvp/rsvpAPI";
import { useGetAllPaymentsQuery } from "../../../../reducers/payments/paymentsAPI";

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-box p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-display">{value}</p>
        <p className="text-sm text-base-content/60">{label}</p>
      </div>
    </div>
  );
}

// No charting library is installed (see eventor-dependencies-deployment.md
// §1 — kept lean on purpose), so this stays plain aggregate cards rather
// than pulling in recharts for one screen.
export default function Analytics() {
  const { data: users } = useGetAllUsersQuery();
  const { data: events } = useGetAllEventsQuery();
  const { data: venues } = useGetAllVenuesQuery();
  const { data: rsvps } = useGetAllRSVPsQuery();
  const { data: payments } = useGetAllPaymentsQuery();

  const totalRevenue = (payments?.allPayments ?? []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const bookedRSVPs = (rsvps?.reservations ?? []).filter((r) => r.RSVPStatus === "Booked").length;
  const ticketsSold = (events?.Events ?? []).reduce((sum, e) => sum + e.soldTickets, 0);

  return (
    <section>
      <h1 className="font-display text-2xl mb-6">Analytics</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Total users" value={users?.data.length ?? 0} />
        <StatCard icon={CalendarDays} label="Total events" value={events?.Events.length ?? 0} />
        <StatCard icon={MapPin} label="Total venues" value={venues?.Venues.length ?? 0} />
        <StatCard icon={Ticket} label="Tickets sold" value={ticketsSold} />
        <StatCard icon={Ticket} label="Booked RSVPs" value={bookedRSVPs} />
        <StatCard icon={Wallet} label="Total revenue" value={`KES ${totalRevenue.toLocaleString()}`} />
      </div>
    </section>
  );
}
