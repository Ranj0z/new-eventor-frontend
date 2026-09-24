import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { Smartphone, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import {
  partialPaymentsAPI,
  useLookupRSVPQuery,
  useInitiatePartialPaymentMutation,
} from "../../reducers/partialPayments/partialPaymentsAPI";
import type { TRSVPLookup } from "../../reducers/partialPayments/partialPaymentsAPI";
import { rsvpAPI } from "../../reducers/rsvp/rsvpAPI";
import type { TRSVPStatus } from "../../reducers/rsvp/rsvpAPI";
import { useGetPaymentStatusQuery } from "../../reducers/payments/paymentsAPI";
import { isValidKenyanPhone } from "../../utils/phoneValidation";
import { getApiErrorMessage, hasStatus } from "../../utils/apiError";

const statusBadge: Record<TRSVPStatus, string> = {
  Pending: "badge-warning",
  Booked: "badge-success",
  Cancelled: "badge-error",
};

// Same STK polling constants as PaymentModal.tsx.
type FlowState = "form" | "waiting" | "success" | "failed" | "timeout";
const POLL_INTERVAL_MS = 4000;
const TIMEOUT_MS = 90_000;
const MIN_INSTALLMENT = 100;

const kes = (n: number) => `KES ${Number(n).toLocaleString()}`;

// Valid = >= MIN_INSTALLMENT, or exactly the remaining balance (which may be
// below the minimum). Never more than what's still owed.
function amountError(raw: string, remaining: number): string | null {
  const n = Number(raw);
  if (!raw.trim() || !(n > 0)) return "Enter an amount.";
  if (n > remaining) return `Amount can't exceed the remaining balance (${kes(remaining)}).`;
  if (n < MIN_INSTALLMENT && n !== remaining) {
    return `Minimum payment is ${kes(MIN_INSTALLMENT)}, or pay the exact remaining balance (${kes(remaining)}).`;
  }
  return null;
}

// Public page — no auth. Phase 1: ID number lookup. Phase 2: summary +
// installment payment via the same STK flow as PaymentModal.
export default function RSVPLookup() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get("idNumber")?.trim() ?? "";

  const [input, setInput] = useState(initialId);
  const [submittedId, setSubmittedId] = useState(initialId); // deep link from ?idNumber= skips straight to the lookup

  // currentData (not data) so switching ID numbers never flashes the previous RSVP.
  const { currentData: rsvp, isFetching, error, refetch } = useLookupRSVPQuery(
    { idNumber: submittedId },
    { skip: !submittedId }
  );

  const handleLookup = (e: FormEvent) => {
    e.preventDefault();
    const id = input.trim();
    if (!id) return;
    if (id === submittedId) refetch();
    else setSubmittedId(id);
  };

  const handleReset = () => {
    setSubmittedId("");
    setInput("");
    setSearchParams({});
  };

  const lookupError =
    error && !isFetching
      ? hasStatus(error, 404)
        ? "No RSVP found for that ID number."
        : getApiErrorMessage(error) ?? "Couldn't look that up. Try again."
      : null;

  return (
    <section className="max-w-md mx-auto px-4 py-16">
      {!rsvp && (
        <>
          <h1 className="font-display text-3xl mb-1">Check your RSVP</h1>
          <p className="text-base-content/70 text-sm mb-8">
            Enter the ID number you RSVP'd with to see your balance and make a payment.
          </p>

          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="label text-sm">ID number</label>
              <input
                required
                className="input input-bordered w-full"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>

            {isFetching && (
              <div className="space-y-2">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            )}
            {lookupError && <p className="text-error text-sm">{lookupError}</p>}

            <button type="submit" className="btn btn-primary w-full" disabled={isFetching}>
              {isFetching ? "Looking up..." : "Look up"}
            </button>
          </form>
        </>
      )}

      {rsvp && (
        <div className="space-y-4">
          <h1 className="font-display text-3xl mb-1">Your RSVP</h1>
          <Summary rsvp={rsvp} />
          <PaymentPanel rsvp={rsvp} />
          <button className="btn btn-ghost w-full" onClick={handleReset}>
            Check a different ID number
          </button>
        </div>
      )}
    </section>
  );
}

function Summary({ rsvp }: { rsvp: TRSVPLookup }) {
  const total = Number(rsvp.totalAmount);
  const paid = Number(rsvp.amountPaid);

  return (
    <div className="border border-base-300 rounded-box p-4 space-y-2 text-sm">
      <Row label="Event" value={rsvp.eventName} />
      <Row label="Ticket type" value={rsvp.ticketType} />
      <Row
        label="Status"
        value={<span className={`badge badge-sm ${statusBadge[rsvp.RSVPStatus]}`}>{rsvp.RSVPStatus}</span>}
      />
      <Row label="Total" value={kes(total)} />
      <Row label="Paid so far" value={kes(paid)} />
      <Row label="Remaining" value={kes(Number(rsvp.remaining))} />
      <progress className="progress progress-primary w-full" value={paid} max={total} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-base-content/60">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

// Stays mounted across the lookup refetch that follows a successful payment,
// so the success card outlives the summary's data changing under it.
function PaymentPanel({ rsvp }: { rsvp: TRSVPLookup }) {
  const dispatch = useDispatch();
  const remaining = Number(rsvp.remaining);

  const [amount, setAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [flow, setFlow] = useState<FlowState>("form");
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [initiateError, setInitiateError] = useState<string | null>(null);
  // Flips synchronously on click so a fast double-click can't fire two STK pushes.
  const [submitting, setSubmitting] = useState(false);

  const [initiatePartialPayment, { isLoading: isInitiating }] = useInitiatePartialPaymentMutation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: statusData, refetch: refetchStatus } = useGetPaymentStatusQuery(paymentId ?? 0, {
    skip: paymentId === null || flow !== "waiting",
    pollingInterval: flow === "waiting" ? POLL_INTERVAL_MS : 0,
  });

  useEffect(() => {
    if (flow !== "waiting") return;
    timeoutRef.current = setTimeout(() => setFlow((c) => (c === "waiting" ? "timeout" : c)), TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [flow]);

  useEffect(() => {
    if (flow !== "waiting" || !statusData) return;

    if (statusData.status === "success") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Separate createApi instances — invalidate explicitly. The lookup query
      // provides "PartialPayment", so this also refetches amountPaid/remaining.
      dispatch(partialPaymentsAPI.util.invalidateTags(["PartialPayment"]));
      dispatch(rsvpAPI.util.invalidateTags(["RSVP"]));
      setFlow("success");
    } else if (statusData.status === "failed") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setFailureMessage(statusData.reason ?? "Payment failed. Please try again.");
      setFlow("failed");
    }
  }, [statusData, flow, dispatch]);

  const amountErr = amountError(amount, remaining);
  const phoneValid = isValidKenyanPhone(phoneNumber);

  const handleSubmit = async () => {
    // Errors show on submit; the button itself stays enabled until then.
    setAmountTouched(true);
    setPhoneTouched(true);
    if (amountErr || !phoneValid) return;

    setInitiateError(null);
    setSubmitting(true);
    try {
      const result = await initiatePartialPayment({
        rsvpId: rsvp.RSVPID,
        phoneNumber,
        amount: Number(amount),
      }).unwrap();
      setPaymentId(result.paymentId);
      setFlow("waiting");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 429 || status === 502) {
        setInitiateError("Too many attempts — please try again shortly.");
      } else {
        setInitiateError(getApiErrorMessage(err as FetchBaseQueryError) ?? "Couldn't start the payment. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Back to the form with amount + phone still filled in.
  const handleRetry = () => {
    setFlow("form");
    setPaymentId(null);
    setFailureMessage(null);
    setInitiateError(null);
  };

  const handleManualRecheck = () => {
    setFlow("waiting");
    refetchStatus();
  };

  const canPay = rsvp.RSVPStatus !== "Cancelled" && remaining > 0;

  return (
    <>
      {flow === "form" && canPay && (
        <>
          <div className="rounded-box border border-base-300 p-4 flex items-start gap-3">
            <Smartphone size={20} className="text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Pay with M-Pesa</p>
              <p className="text-base-content/60">
                Pay any amount from {kes(MIN_INSTALLMENT)}, or the exact balance. You'll get an STK push on your phone.
              </p>
            </div>
          </div>

          <label className="text-sm block">
            Amount (KES)
            <input
              type="number"
              inputMode="numeric"
              className="input input-bordered w-full mt-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => setAmountTouched(true)}
            />
            {amountTouched && amountErr && <span className="text-error text-xs block mt-1">{amountErr}</span>}
          </label>

          <label className="text-sm block">
            Phone number
            <input
              type="tel"
              className="input input-bordered w-full mt-1"
              placeholder="07XXXXXXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onBlur={() => setPhoneTouched(true)}
            />
            {phoneTouched && phoneNumber.length > 0 && !phoneValid && (
              <span className="text-error text-xs block mt-1">
                Enter a valid phone number (07XXXXXXXX, 01XXXXXXXX, or 254XXXXXXXXX).
              </span>
            )}
          </label>

          {initiateError && <p className="text-error text-sm">{initiateError}</p>}

          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={handleSubmit}
            disabled={isInitiating || submitting}
          >
            {isInitiating || submitting ? "Sending request..." : "Pay now"}
          </button>
        </>
      )}

      {flow === "form" && rsvp.RSVPStatus !== "Cancelled" && remaining <= 0 && (
        <p className="text-sm text-success">This RSVP is fully paid.</p>
      )}

      {flow === "waiting" && (
        <div className="rounded-box border border-base-300 p-4 flex items-start gap-3">
          <Loader2 size={20} className="text-primary shrink-0 mt-0.5 animate-spin" />
          <div className="text-sm">
            <p className="font-medium">Check your phone</p>
            <p className="text-base-content/60">
              Enter your M-Pesa PIN on the prompt sent to {phoneNumber}. This updates automatically once it's confirmed.
            </p>
          </div>
        </div>
      )}

      {flow === "success" && (
        <>
          <div className="rounded-box border border-success/40 bg-success/10 p-4 flex items-start gap-3">
            <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Payment confirmed</p>
              <p className="text-base-content/60">
                {remaining <= 0
                  ? "Your RSVP is now fully paid and booked."
                  : "Your balance has been updated above."}
              </p>
            </div>
          </div>
          {remaining > 0 && (
            <button
              className="btn btn-outline w-full"
              onClick={() => {
                setAmount("");
                setAmountTouched(false);
                handleRetry();
              }}
            >
              Make another payment
            </button>
          )}
        </>
      )}

      {flow === "failed" && (
        <>
          <div className="rounded-box border border-error/40 bg-error/10 p-4 flex items-start gap-3">
            <XCircle size={20} className="text-error shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Payment failed</p>
              <p className="text-base-content/60">{failureMessage}</p>
            </div>
          </div>
          <button className="btn btn-primary w-full" onClick={handleRetry}>
            Try again
          </button>
        </>
      )}

      {flow === "timeout" && (
        <>
          <div className="rounded-box border border-base-300 p-4 flex items-start gap-3">
            <Loader2 size={20} className="text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Still processing</p>
              <p className="text-base-content/60">
                This is taking longer than expected. You can check again, or come back later with your ID number.
              </p>
            </div>
          </div>
          <button className="btn btn-primary w-full" onClick={handleManualRecheck}>
            Check again
          </button>
        </>
      )}
    </>
  );
}
