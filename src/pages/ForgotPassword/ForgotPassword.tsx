import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useForgotPasswordMutation } from "../../reducers/login/loginAPI";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [forgotPassword, { isLoading, isSuccess, error }] = useForgotPasswordMutation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await forgotPassword({ email }).unwrap();
    } catch {
      // error state surfaced via `error` below
    }
  };

  if (isSuccess) {
    return (
      <section className="max-w-sm mx-auto px-4 py-16">
        <h1 className="font-display text-3xl mb-3">Check your email</h1>
        <p className="text-base-content/70 text-sm">
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your
          password.
        </p>
        <Link to="/login" className="text-primary font-medium text-sm mt-6 inline-block">
          Back to log in
        </Link>
      </section>
    );
  }

  return (
    <section className="max-w-sm mx-auto px-4 py-16">
      <h1 className="font-display text-3xl mb-1">Reset your password</h1>
      <p className="text-base-content/70 text-sm mb-8">
        Enter your email and we'll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label text-sm">Email</label>
          <input
            type="email"
            required
            className="input input-bordered w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error && <p className="text-error text-sm">Something went wrong. Try again.</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="text-sm text-base-content/70 mt-6">
        <Link to="/login" className="text-primary font-medium">
          Back to log in
        </Link>
      </p>
    </section>
  );
}
