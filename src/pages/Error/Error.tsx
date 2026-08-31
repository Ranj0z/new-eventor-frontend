import { Link } from "react-router-dom";

export default function Error() {
  return (
    <section className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1 className="font-display text-5xl text-primary mb-4">404</h1>
      <p className="text-base-content/70 mb-8">
        This page doesn't exist, or it moved.
      </p>
      <Link to="/" className="btn btn-primary">
        Back to home
      </Link>
    </section>
  );
}
