import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CalendarDays, MapPin, Tag, Ticket as TicketIcon } from "lucide-react";
import { useGetEventBySlugQuery } from "../../reducers/events/eventsAPI";
import { useGetVenueByIdQuery } from "../../reducers/venues/venuesAPI";
import { useGetTicketTypesByEventQuery } from "../../reducers/ticketTypes/ticketTypesAPI";
import type { TTicketType } from "../../reducers/ticketTypes/ticketTypesAPI";
import EventImageCarousel from "../../components/shared/EventImageCarousel";
import ShareButton from "../../components/shared/ShareButton";
import CreateRSVPModal from "../../components/rsvp/CreateRSVPModal";
import { useGetEventImagesQuery } from "../../reducers/eventImages/eventImagesAPI";
import Error from "../Error/Error";

const LOW_STOCK_THRESHOLD = 10;

function TicketRow({ ticketType }: { ticketType: TTicketType }) {
  const remaining = ticketType.totalQuantity - ticketType.soldQuantity;
  const soldOut = remaining <= 0;
  const lowStock = !soldOut && remaining <= LOW_STOCK_THRESHOLD;

  return (
    <div className="flex items-center justify-between border border-base-300 rounded-box p-3">
      <div>
        <p className="font-medium">{ticketType.name}</p>
        <p className="text-sm text-base-content/70">
          {ticketType.price > 0 ? `KES ${ticketType.price.toLocaleString()}` : "Free"}
        </p>
      </div>
      <div className="text-right">
        {soldOut ? (
          <span className="badge badge-ghost badge-sm">Sold out</span>
        ) : lowStock ? (
          <span className="badge badge-warning badge-sm">{remaining} left</span>
        ) : null}
      </div>
    </div>
  );
}

export default function EventDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [rsvpOpen, setRsvpOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useGetEventBySlugQuery(slug ?? "", { skip: !slug });

  const event = data && data.found ? data.event : null;

  const { data: venueData } = useGetVenueByIdQuery(event?.VenueID ?? 0, { skip: !event });
  const { data: extraImages } = useGetEventImagesQuery(event?.EventID ?? 0, { skip: !event });
  const { data: ticketTypesData } = useGetTicketTypesByEventQuery(event?.EventID ?? 0, { skip: !event });

  // A `found: false` response still carries the event's current slug — the
  // requested one is stale (e.g. the event was retitled), so redirect rather
  // than show a dead page.
  useEffect(() => {
    if (data && !data.found) {
      navigate(`/${data.slug}`, { replace: true });
    }
  }, [data, navigate]);

  if (isLoading) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-base-content/60">Loading event...</div>;
  }

  if (isError) return <Error />;

  // Either still loading the redirect target, or the redirect effect above
  // is about to fire — render nothing rather than a flash of missing content.
  if (!event) return null;

  const categoryLabel = event.category === "Other" ? event.customCategory ?? "Other" : event.category;
  const venueName = venueData?.data.venueName ?? "Venue";

  // Suspended tiers are hidden from public view — only "active" ones render.
  const visibleTicketTypes = (ticketTypesData?.data ?? []).filter((t) => t.status === "active");
  const soldOut =
    visibleTicketTypes.length > 0 &&
    visibleTicketTypes.every((t) => t.totalQuantity - t.soldQuantity <= 0);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <section className="max-w-3xl mx-auto px-4 py-12">
      {/* Hero — always its own static element, never part of the carousel. */}
      {event.image_url && (
        <img
          src={event.image_url}
          alt=""
          className="block mx-auto w-auto max-w-full h-auto max-h-[500px] rounded-box border border-base-300 mb-4"
        />
      )}

      {/* Carousel of extra photos — renders nothing when there are none. */}
      {extraImages && extraImages.length > 0 && (
        <div className="mb-6">
          <EventImageCarousel images={extraImages} />
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="font-display text-3xl md:text-4xl">{event.title}</h1>
        <ShareButton url={shareUrl} title={event.title} />
      </div>

      <span className="badge badge-secondary badge-sm mb-4">
        <Tag size={12} className="mr-1" /> {categoryLabel}
      </span>

      <div className="space-y-2 text-sm mb-6">
        <p className="flex items-center gap-2">
          <CalendarDays size={16} className="text-primary" />
          {event.date} · {event.time}
        </p>
        <p className="flex items-center gap-2">
          <MapPin size={16} className="text-primary" /> {venueName}
        </p>
      </div>

      <div className="mb-8">
        <h2 className="font-display text-xl mb-2">What to expect</h2>
        <p className="leading-relaxed text-base-content/80 whitespace-pre-line">{event.description}</p>
      </div>

      {visibleTicketTypes.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-xl mb-3 flex items-center gap-2">
            <TicketIcon size={18} /> Tickets
          </h2>
          <div className="space-y-2">
            {visibleTicketTypes.map((tt) => (
              <TicketRow key={tt.TicketTypeID} ticketType={tt} />
            ))}
          </div>
        </div>
      )}

      <button className="btn btn-primary w-full" disabled={soldOut} onClick={() => setRsvpOpen(true)}>
        {soldOut ? "Sold out" : "RSVP"}
      </button>

      {rsvpOpen && (
        <CreateRSVPModal event={event} reloadEvents={refetch} onClose={() => setRsvpOpen(false)} />
      )}
    </section>
  );
}