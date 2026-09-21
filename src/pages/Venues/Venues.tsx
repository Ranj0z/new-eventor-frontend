import { MapPin, Users } from "lucide-react";
import { useGetAllVenuesQuery } from "../../reducers/venues/venuesAPI";
import { CardGridSkeleton } from "../../components/shared/Skeletons";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=60";

export default function Venues() {
  const { data, isLoading, error } = useGetAllVenuesQuery();

  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl md:text-4xl mb-8">Venues</h1>

      {isLoading && <CardGridSkeleton withImage />}
      {error && <p className="text-error">Couldn't load venues. Try again shortly.</p>}
      {!isLoading && !error && data?.Venues.length === 0 && (
        <p className="text-base-content/60">No venues listed yet.</p>
      )}

      {!isLoading && (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data?.Venues.map((venue) => (
          <div
            key={venue.VenueID}
            className="bg-base-100 border border-base-300 rounded-box overflow-hidden"
          >
            <img
              src={venue.image_url || FALLBACK_IMAGE}
              alt={venue.venueName}
              className="block mx-auto w-auto max-w-full h-auto max-h-80"
            />
            <div className="p-4 space-y-1 text-sm">
              <h3 className="font-medium text-base">{venue.venueName}</h3>
              <p className="flex items-center gap-2 text-base-content/70">
                <MapPin size={15} /> {venue.address}
              </p>
              {venue.capacity != null && (
                <p className="flex items-center gap-2 text-base-content/70">
                  <Users size={15} /> Capacity {venue.capacity}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </section>
  );
}