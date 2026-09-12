import { useState, type FormEvent } from "react";
import { X, CalendarDays } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../app/store";
import type { TEvents } from "../../reducers/events/eventsAPI";
import type { TRSVP } from "../../reducers/rsvp/rsvpAPI";
import { useCreateRSVPMutation } from "../../reducers/rsvp/rsvpAPI";
import { useGetTicketTypesByEventQuery } from "../../reducers/ticketTypes/ticketTypesAPI";
import {
  useLoginMutation,
  useRegisterMutation,
  useVerifyMutation,
} from "../../reducers/login/loginAPI";
import { loginSuccess } from "../../reducers/login/userSlice";
import GuestRSVPLinkModal from "./GuestRSVPLinkModal";
import PaymentModal from "../payment/PaymentModal";

type Step = "form" | "authChoice" | "login" | "register" | "verify" | "payment" | "done";

type CreateRSVPModalProps = {
  event: TEvents;
  onClose: () => void;
  reloadEvents: () => void;
};

// Guest-friendly RSVP flow — auth is offered at submit, never required to
// access or fill the form. See eventor-build-spec.md §6 /
// eventor-architecture-decisions.md §5.
export default function CreateRSVPModal({ event, onClose, reloadEvents }: CreateRSVPModalProps) {
  const dispatch = useDispatch();
  const sessionUser = useSelector((state: RootState) => state.user.user);

  const [step, setStep] = useState<Step>("form");
  const [rsvpForm, setRsvpForm] = useState({
    firstName: sessionUser?.firstName ?? "",
    lastName: sessionUser?.lastName ?? "",
    phoneNumber: sessionUser?.phoneNumber ?? "",
    email: sessionUser?.email ?? "",
  });

  // The event's own ticket types — which tier gets charged depends entirely
  // on which one the user picks here. There is no fallback: submission is
  // blocked until one is selected (see disabled prop on the Continue button).
  const { data: ticketTypesData, isLoading: ticketTypesLoading } = useGetTicketTypesByEventQuery(
    event.EventID
  );
  const ticketTypes = ticketTypesData?.data ?? [];
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<number | null>(null);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const [createdRSVP, setCreatedRSVP] = useState<TRSVP | null>(null);
  const [pendingUnlinked, setPendingUnlinked] = useState<TRSVP[] | null>(null);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);

  const [createRSVP, { isLoading: rsvpLoading, error: rsvpError }] = useCreateRSVPMutation();
  const [login, { isLoading: loginLoading, error: loginError }] = useLoginMutation();
  const [register, { isLoading: registerLoading, error: registerError }] = useRegisterMutation();
  const [verify, { isLoading: verifyLoading, error: verifyError }] = useVerifyMutation();

  const submitRSVP = async (userId: number | null) => {
    if (selectedTicketTypeId === null) return; // guarded by disabled buttons, but defend anyway
    try {
      const res = await createRSVP({
        UserID: userId,
        cart: [
          {
            TicketTypeID: selectedTicketTypeId,
            // Group-type tiers still book as a single cart line for now —
            // "buy N seats under one group ticket" is separate, unbuilt UX.
            quantity: 1,
            attendees: [
              {
                firstName: rsvpForm.firstName,
                lastName: rsvpForm.lastName,
                email: rsvpForm.email,
                phoneNumber: rsvpForm.phoneNumber,
              },
            ],
          },
        ],
      }).unwrap();
      // Single attendee/single ticket-type cart only, so exactly one RSVP
      // row comes back — take it directly. Revisit once carts can span
      // multiple attendees/ticket types.
      const createdRow = res.rsvps[0];
      setCreatedRSVP(createdRow);
      reloadEvents();
      setStep(createdRow.totalAmount > 0 ? "payment" : "done");
    } catch {
      // error surfaced via rsvpError below; stay on current step
    }
  };

  // Shared by both the inline-login path and the inline-register-then-
  // verify-then-login path. Chains into GuestRSVPLinkModal when the backend
  // returns unlinkedGuestRSVPs, then auto-resubmits the RSVP — no redirect,
  // no re-entry of anything already typed. See architecture doc §5.
  const completeAuthAndSubmit = (token: string, user: typeof sessionUser, unlinked?: TRSVP[]) => {
    if (!user) return;
    dispatch(loginSuccess({ token, user }));
    if (unlinked && unlinked.length > 0) {
      setPendingUnlinked(unlinked);
      setPendingUserId(user.UserID);
    } else {
      submitRSVP(user.UserID);
    }
  };

  const handleFormContinue = (e: FormEvent) => {
    e.preventDefault();
    if (selectedTicketTypeId === null) return;
    if (sessionUser) {
      submitRSVP(sessionUser.UserID);
    } else {
      setLoginForm((f) => ({ ...f, email: rsvpForm.email }));
      setStep("authChoice");
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await login(loginForm).unwrap();
      completeAuthAndSubmit(res.token, res.user, res.unlinkedGuestRSVPs);
    } catch {
      // error surfaced via loginError below
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    try {
      await register({
        firstName: rsvpForm.firstName,
        lastName: rsvpForm.lastName,
        email: rsvpForm.email,
        phoneNumber: rsvpForm.phoneNumber,
        address: registerForm.address,
        password: registerForm.password,
      }).unwrap();
      setStep("verify");
    } catch {
      // error surfaced via registerError below
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await verify({ email: rsvpForm.email, verificationCode }).unwrap();
      // Verify doesn't return a session (see loginAPI.ts note) — log in
      // with the password already collected during register, still in
      // this modal's state, so nothing needs to be re-typed.
      const res = await login({ email: rsvpForm.email, password: registerForm.password }).unwrap();
      completeAuthAndSubmit(res.token, res.user, res.unlinkedGuestRSVPs);
    } catch {
      // error surfaced via verifyError below
    }
  };

  const setRsvpField = (key: keyof typeof rsvpForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setRsvpForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h3 className="font-display text-xl mb-1">RSVP — {event.title}</h3>
        <p className="text-sm text-base-content/60 mb-5 flex items-center gap-2">
          <CalendarDays size={14} className="text-primary" />
          {event.date} · {event.time}
        </p>

        {step === "form" && (
          <form onSubmit={handleFormContinue} className="space-y-3">
            <div>
              <label className="label text-sm">Ticket type</label>
              {ticketTypesLoading && (
                <p className="text-sm text-base-content/60">Loading ticket types…</p>
              )}
              {!ticketTypesLoading && ticketTypes.length === 0 && (
                <p className="text-sm text-error">No ticket types available for this event.</p>
              )}
              {!ticketTypesLoading && ticketTypes.length > 0 && (
                <div className="space-y-2">
                  {ticketTypes.map((t) => {
                    const remaining = t.totalQuantity - t.soldQuantity;
                    const soldOut = remaining <= 0;
                    return (
                      <label
                        key={t.TicketTypeID}
                        className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer ${
                          selectedTicketTypeId === t.TicketTypeID
                            ? "border-primary"
                            : "border-base-300"
                        } ${soldOut ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="ticketType"
                            className="radio radio-sm radio-primary"
                            checked={selectedTicketTypeId === t.TicketTypeID}
                            disabled={soldOut}
                            onChange={() => setSelectedTicketTypeId(t.TicketTypeID)}
                          />
                          <span className="text-sm">
                            <span className="font-medium block">{t.name}</span>
                            <span className="text-base-content/60">
                              {soldOut ? "Sold out" : `${remaining} left`}
                            </span>
                          </span>
                        </span>
                        <span className="text-sm font-medium">
                          {Number(t.price) > 0 ? `KES ${Number(t.price).toLocaleString()}` : "Free"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-sm">First name</label>
                <input required className="input input-bordered w-full" value={rsvpForm.firstName} onChange={setRsvpField("firstName")} />
              </div>
              <div>
                <label className="label text-sm">Last name</label>
                <input required className="input input-bordered w-full" value={rsvpForm.lastName} onChange={setRsvpField("lastName")} />
              </div>
            </div>
            <div>
              <label className="label text-sm">Email</label>
              <input type="email" required className="input input-bordered w-full" value={rsvpForm.email} onChange={setRsvpField("email")} />
            </div>
            <div>
              <label className="label text-sm">Phone number</label>
              <input required className="input input-bordered w-full" value={rsvpForm.phoneNumber} onChange={setRsvpField("phoneNumber")} />
            </div>

            {sessionUser && rsvpError && (
              <p className="text-error text-sm">Couldn't submit your RSVP. Try again.</p>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={selectedTicketTypeId === null || (sessionUser ? rsvpLoading : false)}
            >
              {sessionUser ? (rsvpLoading ? "Booking..." : "RSVP") : "Continue"}
            </button>
          </form>
        )}

        {step === "authChoice" && (
          <div className="space-y-3">
            <p className="text-sm text-base-content/70">
              Log in to save this RSVP to your account, or continue without one.
            </p>
            <button className="btn btn-primary w-full" onClick={() => setStep("login")}>
              Log in
            </button>
            <button
              className="btn btn-outline w-full"
              disabled={rsvpLoading}
              onClick={() => submitRSVP(null)}
            >
              {rsvpLoading ? "Booking..." : "Continue as guest"}
            </button>
            {rsvpError && <p className="text-error text-sm">Couldn't submit your RSVP. Try again.</p>}
            <button className="text-sm text-base-content/60" onClick={() => setStep("form")}>
              ← Back
            </button>
          </div>
        )}

        {step === "login" && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="label text-sm">Email</label>
              <input
                type="email"
                required
                className="input input-bordered w-full"
                value={loginForm.email}
                onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="label text-sm">Password</label>
              <input
                type="password"
                required
                className="input input-bordered w-full"
                value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>

            {loginError && <p className="text-error text-sm">Couldn't log you in. Check your details.</p>}

            <button type="submit" className="btn btn-primary w-full" disabled={loginLoading}>
              {loginLoading ? "Logging in..." : "Log in & continue"}
            </button>
            <button type="button" className="text-sm text-primary block" onClick={() => setStep("register")}>
              No account? Register instead
            </button>
            <button type="button" className="text-sm text-base-content/60" onClick={() => setStep("authChoice")}>
              ← Back
            </button>
          </form>
        )}

        {step === "register" && (
          <form onSubmit={handleRegister} className="space-y-3">
            <p className="text-sm text-base-content/60">
              Using {rsvpForm.firstName} {rsvpForm.lastName} · {rsvpForm.email}
            </p>
            <div>
              <label className="label text-sm">Address</label>
              <input
                required
                className="input input-bordered w-full"
                value={registerForm.address}
                onChange={(e) => setRegisterForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div>
              <label className="label text-sm">Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="input input-bordered w-full"
                value={registerForm.password}
                onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div>
              <label className="label text-sm">Confirm password</label>
              <input
                type="password"
                required
                className="input input-bordered w-full"
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              />
            </div>

            {mismatch && <p className="text-error text-sm">Passwords don't match.</p>}
            {registerError && <p className="text-error text-sm">Couldn't create your account. Try again.</p>}

            <button type="submit" className="btn btn-primary w-full" disabled={registerLoading}>
              {registerLoading ? "Creating account..." : "Create account & continue"}
            </button>
            <button type="button" className="text-sm text-base-content/60" onClick={() => setStep("login")}>
              ← Back to log in
            </button>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerify} className="space-y-3">
            <p className="text-sm text-base-content/70">
              Enter the verification code we sent to {rsvpForm.email}.
            </p>
            <div>
              <label className="label text-sm">Verification code</label>
              <input
                required
                className="input input-bordered w-full"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
            </div>

            {verifyError && <p className="text-error text-sm">That code didn't work. Check it and try again.</p>}

            <button type="submit" className="btn btn-primary w-full" disabled={verifyLoading}>
              {verifyLoading ? "Verifying..." : "Verify & continue"}
            </button>
          </form>
        )}

        {step === "payment" && createdRSVP && (
          <PaymentModal
            rsvp={createdRSVP}
            event={event}
            onClose={() => setStep("done")}
          />
        )}

        {step === "done" && (
          <div className="space-y-4">
            <p className="text-sm text-base-content/70">
              You're booked for <strong>{event.title}</strong>. A confirmation was sent to{" "}
              {rsvpForm.email}.
            </p>
            <button className="btn btn-primary w-full" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose} />

      {pendingUnlinked && (
        <GuestRSVPLinkModal
          rsvps={pendingUnlinked}
          onClose={() => {
            setPendingUnlinked(null);
            submitRSVP(pendingUserId);
          }}
        />
      )}
    </div>
  );
}