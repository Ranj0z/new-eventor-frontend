import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
      <p className="text-secondary text-sm tracking-wide uppercase mb-4">Find what's happening near you</p>
      <h1 className="font-display text-4xl md:text-6xl leading-tight text-base-content max-w-2xl">
        Events worth
        <span className="text-primary"> showing up for</span>.
      </h1>
      <p className="mt-5 text-base-content/70 max-w-lg text-lg">
        Browse venues, reserve a seat, and skip the account if you're just here to RSVP —
        Eventor keeps the door open either way.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/events" className="btn btn-primary">
          Browse events <ArrowRight size={18} />
        </Link>
        <Link to="/venues" className="btn btn-outline btn-primary">
          See venues
        </Link>
      </div>
    </section>
  );
}
