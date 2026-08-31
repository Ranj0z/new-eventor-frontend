import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useLoginMutation } from "../../reducers/login/loginAPI";
import { loginSuccess } from "../../reducers/login/userSlice";
import type { TRSVP } from "../../reducers/rsvp/rsvpAPI";
import GuestRSVPLinkModal from "../../components/rsvp/GuestRSVPLinkModal";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading, error }] = useLoginMutation();
  const [unlinked, setUnlinked] = useState<TRSVP[] | null>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await login({ email, password }).unwrap();
      dispatch(loginSuccess({ token: res.token, user: res.user }));

      if (res.unlinkedGuestRSVPs && res.unlinkedGuestRSVPs.length > 0) {
        setUnlinked(res.unlinkedGuestRSVPs);
        return; // navigate after the modal closes
      }

      // Role-based dashboard paths don't exist until Phase 6 — send
      // everyone home for now rather than hitting the catch-all Error page.
      const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(redirectTo, { replace: true });
    } catch {
      // error state surfaced via `error` below
    }
  };

  return (
    <section className="max-w-sm mx-auto px-4 py-16">
      <h1 className="font-display text-3xl mb-1">Welcome back</h1>
      <p className="text-base-content/70 text-sm mb-8">Log in to your Eventor account.</p>

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
          <label className="label text-sm">Password</label>
          <input
            type="password"
            required
            className="input input-bordered w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Link to="/forgot-password" className="text-xs text-primary mt-1 inline-block">
            Forgot password?
          </Link>
        </div>

        {error && <p className="text-error text-sm">Couldn't log you in. Check your details and try again.</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="text-sm text-base-content/70 mt-6">
        No account yet?{" "}
        <Link to="/register" className="text-primary font-medium">
          Sign up
        </Link>
      </p>

      {unlinked && (
        <GuestRSVPLinkModal
          rsvps={unlinked}
          onClose={() => {
            setUnlinked(null);
            const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";
            navigate(redirectTo, { replace: true });
          }}
        />
      )}
    </section>
  );
}
