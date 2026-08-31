import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useResetPasswordMutation } from "../../reducers/login/loginAPI";

// ASSUMPTION: reset link is /reset-password?token=... — unconfirmed against
// a real email/link, see loginAPI.ts's TResetPasswordInput note.
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    try {
      await resetPassword({ token, password }).unwrap();
      navigate("/login", { state: { passwordReset: true } });
    } catch {
      // error state surfaced via `error` below
    }
  };

  if (!token) {
    return (
      <section className="max-w-sm mx-auto px-4 py-16">
        <h1 className="font-display text-3xl mb-3">Invalid link</h1>
        <p className="text-base-content/70 text-sm">
          This reset link is missing or malformed. Request a new one below.
        </p>
        <Link to="/forgot-password" className="text-primary font-medium text-sm mt-6 inline-block">
          Request a new link
        </Link>
      </section>
    );
  }

  return (
    <section className="max-w-sm mx-auto px-4 py-16">
      <h1 className="font-display text-3xl mb-1">Set a new password</h1>
      <p className="text-base-content/70 text-sm mb-8">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label text-sm">New password</label>
          <input
            type="password"
            required
            minLength={8}
            className="input input-bordered w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-sm">Confirm password</label>
          <input
            type="password"
            required
            className="input input-bordered w-full"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {mismatch && <p className="text-error text-sm">Passwords don't match.</p>}
        {error && <p className="text-error text-sm">That link may have expired. Request a new one.</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
          {isLoading ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </section>
  );
}
