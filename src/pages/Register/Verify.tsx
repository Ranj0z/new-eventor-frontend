import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useVerifyMutation } from "../../reducers/login/loginAPI";

export default function Verify() {
  const location = useLocation();
  const prefillEmail = (location.state as { email?: string } | null)?.email ?? "";

  const [email, setEmail] = useState(prefillEmail);
  const [verificationCode, setVerificationCode] = useState("");
  const [verify, { isLoading, error }] = useVerifyMutation();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await verify({ email, verificationCode }).unwrap();
      navigate("/login", { state: { verified: true } });
    } catch {
      // error state surfaced via `error` below
    }
  };

  return (
    <section className="max-w-sm mx-auto px-4 py-16">
      <h1 className="font-display text-3xl mb-1">Verify your email</h1>
      <p className="text-base-content/70 text-sm mb-8">
        Enter the code we sent to your email to activate your account.
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
        <div>
          <label className="label text-sm">Verification code</label>
          <input
            required
            className="input input-bordered w-full"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
          />
        </div>

        {error && <p className="text-error text-sm">That code didn't work. Check it and try again.</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
          {isLoading ? "Verifying..." : "Verify account"}
        </button>
      </form>

      <p className="text-sm text-base-content/70 mt-6">
        Wrong email?{" "}
        <Link to="/register" className="text-primary font-medium">
          Start over
        </Link>
      </p>
    </section>
  );
}
