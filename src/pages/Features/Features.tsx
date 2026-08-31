import { CalendarCheck, Building2, Ticket } from "lucide-react";

const features = [
  {
    icon: CalendarCheck,
    title: "Guest-friendly RSVPs",
    body: "Reserve a spot without creating an account. Log in later and your guest RSVPs link to your profile in one click.",
  },
  {
    icon: Building2,
    title: "Venue browsing",
    body: "See where an event is happening, its capacity, and what else is booked at that venue.",
  },
  {
    icon: Ticket,
    title: "One ticket, one reservation",
    body: "No confusing quantity fields — each RSVP is a single seat at the event's listed price.",
  },
];

export default function Features() {
  return (
    <section className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="font-display text-3xl md:text-4xl mb-10">Features</h1>
      <div className="grid gap-6 md:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="bg-base-100 border border-base-300 rounded-box p-6">
            <Icon className="text-primary mb-3" size={28} />
            <h2 className="font-medium text-lg mb-2">{title}</h2>
            <p className="text-base-content/70 text-sm leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
