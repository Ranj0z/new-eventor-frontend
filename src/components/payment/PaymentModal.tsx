import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Smartphone, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { TEvents } from "../../reducers/events/eventsAPI";
import type { TRSVP } from "../../reducers/rsvp/rsvpAPI";
import { rsvpAPI } from "../../reducers/rsvp/rsvpAPI";
import type { TTicketType } from "../../reducers/ticketTypes/ticketTypesAPI";
import { useInitiatePaymentMutation, useGetPaymentStatusQuery } from "../../reducers/payments/paymentsAPI";
import { isValidKenyanPhone } from "../../utils/phoneValidation";

type TCreateRSVPPayment = { PaymentID: number; amount: string } | null;

type PaymentModalProps = {
  rsvps: TRSVP[];
  payment: TCreateRSVPPayment;
  // Passed down from CreateRSVPModal, which already fetched this — avoids a
  // duplicate query just to look up tier names for the order summary.
  ticketTypes: TTicketType[];
  event: TEvents;
  onClose: () => void;
};

type FlowState = "form" | "waiting" | "success" | "failed" | "timeout";

const POLL_INTERVAL_MS = 4000;
const TIMEOUT_MS = 90_000;

export default function PaymentModal({ rsvps, payment, ticketTypes, event, onClose }: PaymentModalProps) {
  const dispatch = useDispatch();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [flow, setFlow] = useState<FlowState>("form");
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [initiateError, setInitiateError] = useState<string | null>(null);
  // Belt-and-suspenders on top of RTK Query's own isLoading: flips true
  // synchronously on click, before the mutation's loading state has a chance
  // to update, so a fast double-click can't fire two initiate calls.
  const [submitting, setSubmitting] = useState(false);

  const [initiatePayment, { isLoading: isInitiating }] = useInitiatePaymentMutation();

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: statusData,
    refetch: refetchStatus,
  } = useGetPaymentStatusQuery(paymentId ?? 0, {
    skip: paymentId === null || flow !== "waiting",
    pollingInterval: flow === "waiting" ? POLL_INTERVAL_MS : 0,
  });

  // 90s timeout window — only runs while actively waiting on a payment.
  useEffect(() => {
    if (flow !== "waiting") return;

    timeoutRef.current = setTimeout(() => setFlow((current) => (current === "waiting" ? "timeout" : current)), TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [flow]);

  // React to poll results.
  useEffect(() => {
    if (flow !== "waiting" || !statusData) return;

    if (statusData.status === "success") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // paymentsAPI and rsvpAPI are separate createApi instances — this
      // slice's own invalidatesTags can't reach rsvpAPI's "RSVP" tag, so the
      // refetch has to be dispatched explicitly here.
      dispatch(rsvpAPI.util.invalidateTags(["RSVP"]));
      setFlow("success");
    } else if (statusData.status === "failed") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setFailureMessage(statusData.reason ?? "Payment failed. Please try again.");
      setFlow("failed");
    }
  }, [statusData, flow, dispatch]);

  // Groups the flat rsvps array by TicketTypeID for the order summary —
  // one row per tier, "Tier name × count — subtotal."
  const tierCounts = new Map<number, number>();
  rsvps.forEach((r) => tierCounts.set(r.TicketTypeID, (tierCounts.get(r.TicketTypeID) ?? 0) + 1));
  const ticketTypesById = new Map(ticketTypes.map((t) => [t.TicketTypeID, t]));

  const phoneValid = isValidKenyanPhone(phoneNumber);

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    if (!phoneTouched) setPhoneTouched(true);
  };

  const handleSubmit = async () => {
    setInitiateError(null);
    setSubmitting(true);

    // Defensive — this modal should only ever be reached for a cart total
    // > 0, which always produces a Payment row at creation time (see
    // reservation.service.ts). A null payment here means this was opened for
    // a free order by mistake, so there's nothing to initiate.
    if (!payment) {
      setInitiateError("This RSVP has no payment to process.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await initiatePayment({ paymentId: payment.PaymentID, phoneNumber }).unwrap();
      setPaymentId(result.paymentId);
      setFlow("waiting");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 429 || status === 502) {
        setInitiateError("Too many attempts — please try again shortly.");
      } else {
        setInitiateError("Couldn't start the payment. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Order summary — replaces the old bare "Amount due" line. */}
      <div className="rounded-box border border-base-300 p-3 space-y-1 text-sm">
        {Array.from(tierCounts.entries()).map(([ticketTypeId, count]) => {
          const t = ticketTypesById.get(ticketTypeId);
          const subtotal = t ? Number(t.price) * count : null;
          return (
            <div key={ticketTypeId} className="flex justify-between">
              <span>
                {t?.name ?? "Ticket"} × {count}
              </span>
              {subtotal !== null && <span>KES {subtotal.toLocaleString()}</span>}
            </div>
          );
        })}
        {payment && (
          <div className="flex justify-between font-medium border-t border-base-300 pt-1 mt-1">
            <span>Total</span>
            <span>KES {Number(payment.amount).toLocaleString()}</span>
          </div>
        )}
      </div>

      {flow === "form" && (
        <>
          <div className="rounded-box border border-base-300 p-4 flex items-start gap-3">
            <Smartphone size={20} className="text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Pay with M-Pesa</p>
              <p className="text-base-content/60">
                {event.title} — {rsvps.length} ticket{rsvps.length === 1 ? "" : "s"}. Enter the phone number
                to receive the STK push.
              </p>
            </div>
          </div>

          <label className="text-sm block">
            Phone number
            <input
              type="tel"
              className="input input-bordered w-full mt-1"
              placeholder="07XXXXXXXX"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={() => setPhoneTouched(true)}
              required
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
            disabled={isInitiating || submitting || !phoneValid || !payment}
          >
            {isInitiating || submitting ? "Sending request..." : "Pay now"}
          </button>
        </>
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
        <div className="rounded-box border border-success/40 bg-success/10 p-4 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Payment confirmed</p>
            <p className="text-base-content/60">Payment confirmed — your tickets for {event.title} are booked.</p>
          </div>
        </div>
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
                This is taking longer than expected. You can check again, or close this and check back later.
              </p>
            </div>
          </div>
          <button className="btn btn-primary w-full" onClick={handleManualRecheck}>
            Check again
          </button>
        </>
      )}

      <button className="btn btn-ghost w-full" onClick={onClose}>
        {flow === "success" ? "Close" : "Cancel"}
      </button>
    </div>
  );
}