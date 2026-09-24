import { createApi } from "@reduxjs/toolkit/query/react";
import { authBaseQuery } from "../../utils/authBaseQuery";

export type TRSVPStatus = "Pending" | "Booked" | "Cancelled";

export type TRSVP = {
  RSVPID: number;
  UserID: number | null;
  EventID: number;
  TicketTypeID: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  RSVPDate: string;
  RSVPStatus: TRSVPStatus;
  totalAmount: number;
  // Payment status lives here, not on Payment — Payments are never updated
  // once created (see paymentsAPI.ts). Toggled via markRSVPPaid/
  // markRSVPUnpaid below; also flips to true automatically when a payment
  // is created for this RSVP (backend-side, not something the frontend
  // needs to trigger itself).
  paid: boolean;
  // Set at RSVP-creation time when the cart total is > 0 (see
  // reservation.service.ts createReservationService); null for $0/free
  // RSVPs, which never get a Payment row. Used to call
  // paymentsAPI.initiatePayment without a separate RSVPID -> PaymentID
  // lookup.
  PaymentID: number | null;
  // Partial-payments events only — null on regular events. Unique per event.
  idNumber: string | null;
  // Running total of confirmed installments; 0 on full-payment events or
  // before any payment. `paid` stays the authoritative "fully settled" flag.
  amountPaid: number;
};

// Cart-checkout request shape — matches backend's validateCart /
// CreateReservationInput (reservation.controller.ts / reservation.service.ts).
export type TCartAttendee = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  // Only sent on partialPaymentsEnabled events.
  idNumber?: string;
};

export type TCartLine = {
  TicketTypeID: number;
  quantity: number;
  attendees: TCartAttendee[];
};

export type TCreateRSVPRequest = {
  UserID: number | null;
  cart: TCartLine[];
};

// Minimal shape of the Payment row the backend inlines into the create
// response — full TPayment type lives in paymentsAPI.ts.
type TCreateRSVPPayment = {
  PaymentID: number;
  amount: string;
} | null;

export const rsvpAPI = createApi({
  reducerPath: "rsvpAPI",
  baseQuery: authBaseQuery(),
  tagTypes: ["RSVP"],
  endpoints: (builder) => ({
    // guest-friendly — works with or without an auth token attached.
    // Backend returns one RSVP row per attendee across the whole cart, plus
    // the single shared Payment (null for all-$0 carts) — see
    // reservation.service.ts createReservationService.
    createRSVP: builder.mutation<
      { message: string; rsvps: TRSVP[]; payment: TCreateRSVPPayment },
      TCreateRSVPRequest
    >({
      query: (body) => ({ url: "/reservation/newRsvp", method: "POST", body }),
      invalidatesTags: ["RSVP"],
    }),
    getAllRSVPs: builder.query<{ reservations: TRSVP[] }, void>({
      query: () => "/reservation/allRsvps",
      providesTags: ["RSVP"],
    }),
    getRSVPById: builder.query<{ reservations: TRSVP }, number>({
      query: (id) => `/reservation/${id}`,
      providesTags: ["RSVP"],
    }),
    getRSVPsByUser: builder.query<{ reservations: TRSVP[] }, number>({
      query: (userId) => `/reservation/user/${userId}`,
      providesTags: ["RSVP"],
    }),
    // Real backend is a generic PATCH /reservation/update/:id, not a
    // dedicated /status sub-route — matches the pattern on Events/Venues.
    updateRSVPStatus: builder.mutation<TRSVP, { id: number; RSVPStatus: TRSVPStatus }>({
      query: ({ id, RSVPStatus }) => ({
        url: `/reservation/update/${id}`,
        method: "PATCH",
        body: { RSVPStatus },
      }),
      invalidatesTags: ["RSVP"],
    }),
    // never automatic — only fires for RSVP IDs the user explicitly checked.
    // Body key confirmed as `rsvpIDs` against api-endpoints.md (was
    // `rsvpIds` before that doc existed — fixed here).
    linkGuestRSVPs: builder.mutation<{ linked: TRSVP[] }, { rsvpIDs: number[] }>({
      query: (body) => ({
        url: "/reservation/link-guest",
        method: "POST",
        body,
      }),
      invalidatesTags: ["RSVP"],
    }),
    // Paid state lives on the RSVP, not the Payment (see paymentsAPI.ts).
    // Also flips automatically when a payment is created for this RSVP —
    // these two mutations are for the manual/admin override path.
    markRSVPPaid: builder.mutation<TRSVP, number>({
      query: (id) => ({ url: `/reservation/markpaid/${id}`, method: "PATCH" }),
      invalidatesTags: ["RSVP"],
    }),
    markRSVPUnpaid: builder.mutation<TRSVP, number>({
      query: (id) => ({ url: `/reservation/markunpaid/${id}`, method: "PATCH" }),
      invalidatesTags: ["RSVP"],
    }),
  }),
});

export const {
  useCreateRSVPMutation,
  useGetAllRSVPsQuery,
  useGetRSVPByIdQuery,
  useGetRSVPsByUserQuery,
  useUpdateRSVPStatusMutation,
  useLinkGuestRSVPsMutation,
  useMarkRSVPPaidMutation,
  useMarkRSVPUnpaidMutation,
} = rsvpAPI;