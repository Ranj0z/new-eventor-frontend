import { useState, type FormEvent } from "react";
import { X, CalendarDays, Plus, Minus } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../app/store";
import type { TEvents } from "../../reducers/events/eventsAPI";
import type { TRSVP, TCartLine } from "../../reducers/rsvp/rsvpAPI";
import { useCreateRSVPMutation } from "../../reducers/rsvp/rsvpAPI";
import { useGetTicketTypesByEventQuery } from "../../reducers/ticketTypes/ticketTypesAPI";
import {
  useLoginMutation,
  useRegisterMutation,
  useVerifyMutation,
} from "../../reducers/login/loginAPI";
import { loginSuccess } from "../../reducers/login/userSlice";
import { isValidKenyanPhone } from "../../utils/phoneValidation";
import GuestRSVPLinkModal from "./GuestRSVPLinkModal";
import PaymentModal from "../payment/PaymentModal";

type Step = "build" | "authChoice" | "login" | "register" | "verify" | "payment" | "done";

type CreateRSVPModalProps = {
  event: TEvents;
  onClose: () => void;
  reloadEvents: () => void;
};

type CartAttendeeDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
};

type CartLineDraft = {
  TicketTypeID: number;
  quantity: number;
  attendees: CartAttendeeDraft[];
};

// Assumption: the backend's RSVPTable name columns' actual max length isn't
// documented anywhere we have access to — 50 mirrors the one length limit we
// do know (events.title varchar(50)). Flagged for confirmation.
const MAX_NAME_LENGTH = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const blankAttendee = (): CartAttendeeDraft => ({
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
});

function validateAttendee(a: CartAttendeeDraft): string[] {
  const errors: string[] = [];
  const first = a.firstName.trim();
  const last = a.lastName.trim();
  if (!first) errors.push("First name is required.");
  else if (first.length > MAX_NAME_LENGTH) errors.push(`First name must be ${MAX_NAME_LENGTH} characters or fewer.`);
  if (!last) errors.push("Last name is required.");
  else if (last.length > MAX_NAME_LENGTH) errors.push(`Last name must be ${MAX_NAME_LENGTH} characters or fewer.`);
  if (!EMAIL_RE.test(a.email.trim())) errors.push("Enter a valid email address.");
  if (!isValidKenyanPhone(a.phoneNumber)) {
    errors.push("Enter a valid phone number (07XXXXXXXX, 01XXXXXXXX, or 254XXXXXXXXX).");
  }
  return errors;
}

// Guest-friendly RSVP flow — auth is offered at submit, never required to
// access or fill the form. See eventor-build-spec.md §6 /
// eventor-architecture-decisions.md §5. Rebuilt per eventor-frontend-plan.md
// §5 for a multi-ticket-type cart instead of a single fixed-quantity line.
export default function CreateRSVPModal({ event, onClose, reloadEvents }: CreateRSVPModalProps) {
  const dispatch = useDispatch();
  const sessionUser = useSelector((state: RootState) => state.user.user);

  const [step, setStep] = useState<Step>("build");

  // Cart state, keyed by TicketTypeID. Only tiers with quantity > 0 end up
  // in the submitted payload (see cartLines below).
  const [cart, setCart] = useState<Record<number, CartLineDraft>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [touchedAttendees, setTouchedAttendees] = useState<Set<string>>(new Set());

  // The very first attendee block created across the whole cart prefills
  // from sessionUser (matches prior single-attendee behavior); every other
  // block — on this tier or any other — starts blank. Tracked with a plain
  // mutable flag rather than state since it must take effect within the same
  // setCart updater that creates the block.
  const [hasPrefilled, setHasPrefilled] = useState(false);

  const { data: ticketTypesData, isLoading: ticketTypesLoading } = useGetTicketTypesByEventQuery(
    event.EventID
  );
  const allTicketTypes = ticketTypesData?.data ?? [];
  // Suspended tiers are hidden from public booking, same rule as the details
  // page's ticket list.
  const activeTicketTypes = allTicketTypes.filter((t) => t.status === "active");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const [createdRSVPs, setCreatedRSVPs] = useState<TRSVP[] | null>(null);
  const [createdPayment, setCreatedPayment] = useState<{ PaymentID: number; amount: string } | null>(null);
  const [pendingUnlinked, setPendingUnlinked] = useState<TRSVP[] | null>(null);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);

  const [createRSVP, { isLoading: rsvpLoading, error: rsvpError }] = useCreateRSVPMutation();
  const [login, { isLoading: loginLoading, error: loginError }] = useLoginMutation();
  const [register, { isLoading: registerLoading, error: registerError }] = useRegisterMutation();
  const [verify, { isLoading: verifyLoading, error: verifyError }] = useVerifyMutation();

  const cartLines = Object.values(cart).filter((l) => l.quantity > 0);
  const allAttendeesValid = cartLines.every((l) => l.attendees.every((a) => validateAttendee(a).length === 0));
  const canContinue = cartLines.length > 0 && allAttendeesValid;

  // Used to prefill the login/register forms once the cart is built — the
  // very first attendee entered anywhere in the cart, since that's the same
  // person who'll almost always be the one authenticating.
  const firstAttendee: CartAttendeeDraft = cartLines[0]?.attendees[0] ?? blankAttendee();

  const setQuantity = (ticketTypeId: number, quantity: number) => {
    setCart((prev) => {
      const existing = prev[ticketTypeId];
      const currentAttendees = existing?.attendees ?? [];

      if (quantity === currentAttendees.length) return prev;

      let attendees: CartAttendeeDraft[];
      if (quantity > currentAttendees.length) {
        const toAdd = quantity - currentAttendees.length;
        const additions: CartAttendeeDraft[] = [];
        for (let i = 0; i < toAdd; i++) {
          if (!hasPrefilled && additions.length === 0 && currentAttendees.length === 0 && sessionUser) {
            additions.push({
              firstName: sessionUser.firstName,
              lastName: sessionUser.lastName,
              email: sessionUser.email,
              phoneNumber: sessionUser.phoneNumber,
            });
          } else {
            additions.push(blankAttendee());
          }
        }
        attendees = [...currentAttendees, ...additions];
      } else {
        // Trimming — warn if any removed slot already has data, to avoid
        // silently discarding what someone typed.
        const removed = currentAttendees.slice(quantity);
        const hasData = removed.some((a) => a.firstName || a.lastName || a.email || a.phoneNumber);
        if (hasData) {
          const ok = window.confirm(
            `Remove ${removed.length} attendee${removed.length === 1 ? "" : "s"} already filled in?`
          );
          if (!ok) return prev;
        }
        attendees = currentAttendees.slice(0, quantity);
      }

      if (quantity === 0) {
        const next = { ...prev };
        delete next[ticketTypeId];
        return next;
      }

      return { ...prev, [ticketTypeId]: { TicketTypeID: ticketTypeId, quantity, attendees } };
    });

    if (!hasPrefilled && sessionUser && !cart[ticketTypeId] && quantity > 0) {
      setHasPrefilled(true);
    }
  };

  const updateAttendee = (ticketTypeId: number, index: number, patch: Partial<CartAttendeeDraft>) => {
    setCart((prev) => {
      const line = prev[ticketTypeId];
      if (!line) return prev;
      const attendees = line.attendees.map((a, i) => (i === index ? { ...a, ...patch } : a));
      return { ...prev, [ticketTypeId]: { ...line, attendees } };
    });
  };

  const markTouched = (ticketTypeId: number, index: number) => {
    setTouchedAttendees((prev) => new Set(prev).add(`${ticketTypeId}:${index}`));
  };

  const scrollToBlock = (ticketTypeId: number) => {
    document.getElementById(`ticket-block-${ticketTypeId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const submitRSVP = async (userId: number | null) => {
    if (cartLines.length === 0) return; // guarded by disabled buttons, but defend anyway
    try {
      const cartPayload: TCartLine[] = cartLines.map(({ TicketTypeID, quantity, attendees }) => ({
        TicketTypeID,
        quantity,
        attendees: attendees.map((a) => ({
          firstName: a.firstName.trim(),
          lastName: a.lastName.trim(),
          email: a.email.trim(),
          phoneNumber: a.phoneNumber,
        })),
      }));

      const res = await createRSVP({ UserID: userId, cart: cartPayload }).unwrap();
      setCreatedRSVPs(res.rsvps);
      setCreatedPayment(res.payment); // null => free order — fixes the prior totalAmount bug directly
      reloadEvents();
      setStep(res.payment ? "payment" : "done");
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

  const handleBuildContinue = (e: FormEvent) => {
    e.preventDefault();
    if (!canContinue) return;
    if (sessionUser) {
      submitRSVP(sessionUser.UserID);
    } else {
      setLoginForm((f) => ({ ...f, email: firstAttendee.email }));
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
        firstName: firstAttendee.firstName,
        lastName: firstAttendee.lastName,
        email: firstAttendee.email,
        phoneNumber: firstAttendee.phoneNumber,
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
      await verify({ email: firstAttendee.email, verificationCode }).unwrap();
      // Verify doesn't return a session (see loginAPI.ts note) — log in
      // with the password already collected during register, still in
      // this modal's state, so nothing needs to be re-typed.
      const res = await login({ email: firstAttendee.email, password: registerForm.password }).unwrap();
      completeAuthAndSubmit(res.token, res.user, res.unlinkedGuestRSVPs);
    } catch {
      // error surfaced via verifyError below
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
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

        {step === "build" && (
          <form onSubmit={handleBuildContinue} className="space-y-3">
            {ticketTypesLoading && <p className="text-sm text-base-content/60">Loading ticket types…</p>}
            {!ticketTypesLoading && activeTicketTypes.length === 0 && (
              <p className="text-sm text-error">No ticket types available for this event.</p>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {activeTicketTypes.map((t) => {
                const line = cart[t.TicketTypeID];
                const quantity = line?.quantity ?? 0;
                const remaining = t.totalQuantity - t.soldQuantity;
                const soldOut = remaining <= 0;

                return (
                  <div
                    key={t.TicketTypeID}
                    id={`ticket-block-${t.TicketTypeID}`}
                    className="rounded-box border border-base-300 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm">{t.name}</p>
                        <p className="text-xs text-base-content/60">
                          {Number(t.price) > 0 ? `KES ${Number(t.price).toLocaleString()}` : "Free"}
                          {" · "}
                          {soldOut ? "Sold out" : `${remaining} left`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-xs btn-outline btn-circle"
                          disabled={quantity === 0}
                          onClick={() => setQuantity(t.TicketTypeID, Math.max(0, quantity - 1))}
                          aria-label={`Decrease ${t.name} quantity`}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center text-sm">{quantity}</span>
                        <button
                          type="button"
                          className="btn btn-xs btn-outline btn-circle"
                          disabled={soldOut || quantity >= remaining}
                          onClick={() => setQuantity(t.TicketTypeID, quantity + 1)}
                          aria-label={`Increase ${t.name} quantity`}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                    {quantity > 0 && line && (
                      <div className="space-y-3 pt-2 border-t border-base-300">
                        {line.attendees.map((a, i) => {
                          const touchKey = `${t.TicketTypeID}:${i}`;
                          const touched = touchedAttendees.has(touchKey);
                          const errors = touched ? validateAttendee(a) : [];
                          return (
                            <div key={i} id={`attendee-${t.TicketTypeID}-${i}`} className="space-y-1.5">
                              <p className="text-xs font-medium text-base-content/60">Attendee {i + 1}</p>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  placeholder="First name"
                                  className="input input-bordered input-sm w-full"
                                  value={a.firstName}
                                  onChange={(e) => updateAttendee(t.TicketTypeID, i, { firstName: e.target.value })}
                                  onBlur={() => markTouched(t.TicketTypeID, i)}
                                />
                                <input
                                  placeholder="Last name"
                                  className="input input-bordered input-sm w-full"
                                  value={a.lastName}
                                  onChange={(e) => updateAttendee(t.TicketTypeID, i, { lastName: e.target.value })}
                                  onBlur={() => markTouched(t.TicketTypeID, i)}
                                />
                              </div>
                              <input
                                type="email"
                                placeholder="Email"
                                className="input input-bordered input-sm w-full"
                                value={a.email}
                                onChange={(e) => updateAttendee(t.TicketTypeID, i, { email: e.target.value })}
                                onBlur={() => markTouched(t.TicketTypeID, i)}
                              />
                              <input
                                placeholder="Phone (07XXXXXXXX)"
                                className="input input-bordered input-sm w-full"
                                value={a.phoneNumber}
                                onChange={(e) => updateAttendee(t.TicketTypeID, i, { phoneNumber: e.target.value })}
                                onBlur={() => markTouched(t.TicketTypeID, i)}
                              />
                              {errors.map((err) => (
                                <p key={err} className="text-error text-xs">
                                  {err}
                                </p>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {cartLines.length > 0 && (
              <div>
                <button
                  type="button"
                  className="text-sm text-primary"
                  onClick={() => setReviewOpen((v) => !v)}
                >
                  {reviewOpen ? "Hide order" : "Review order"}
                </button>
                {reviewOpen && (
                  <div className="mt-2 space-y-2 text-sm border border-base-300 rounded-box p-3">
                    {cartLines.map((line) => {
                      const t = activeTicketTypes.find((tt) => tt.TicketTypeID === line.TicketTypeID);
                      return (
                        <div key={line.TicketTypeID}>
                          <div className="flex justify-between items-center font-medium">
                            <span>
                              {t?.name ?? "Ticket"} × {line.quantity}
                            </span>
                            <button
                              type="button"
                              className="text-xs text-primary"
                              onClick={() => scrollToBlock(line.TicketTypeID)}
                            >
                              Edit
                            </button>
                          </div>
                          <p className="text-base-content/60 pl-2">
                            {line.attendees
                              .map((a) => `${a.firstName} ${a.lastName}`.trim() || "—")
                              .join(", ")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {sessionUser && rsvpError && (
              <p className="text-error text-sm">Couldn't submit your RSVP. Try again.</p>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={!canContinue || (sessionUser ? rsvpLoading : false)}
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
            <button className="text-sm text-base-content/60" onClick={() => setStep("build")}>
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
              Using {firstAttendee.firstName} {firstAttendee.lastName} · {firstAttendee.email}
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
              Enter the verification code we sent to {firstAttendee.email}.
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

        {step === "payment" && createdRSVPs && createdPayment && (
          <PaymentModal
            rsvps={createdRSVPs}
            payment={createdPayment}
            ticketTypes={allTicketTypes}
            event={event}
            onClose={() => setStep("done")}
          />
        )}

        {step === "done" && (
          <div className="space-y-4">
            <p className="text-sm text-base-content/70">
              {createdRSVPs?.length ?? 0} ticket{(createdRSVPs?.length ?? 0) === 1 ? "" : "s"} confirmed for{" "}
              <strong>{event.title}</strong>. Confirmations sent to each attendee's email.
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