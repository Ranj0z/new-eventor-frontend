import { createApi } from "@reduxjs/toolkit/query/react";
import { authBaseQuery } from "../../utils/authBaseQuery";

export type TRSVPStatus = "Pending" | "Booked" | "Cancelled";

// firstName/lastName/phoneNumber/email casing is unconfirmed against a real
// payload — pending backend migration, see eventor-frontend-types.md.
export type TRSVP = {
  RSVPID: number;
  UserID: number | null;
  EventID: number;
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
};

export const rsvpAPI = createApi({
  reducerPath: "rsvpAPI",
  baseQuery: authBaseQuery(),
  tagTypes: ["RSVP"],
  endpoints: (builder) => ({
    // guest-friendly — works with or without an auth token attached
    createRSVP: builder.mutation<{ reservations: TRSVP }, Partial<TRSVP>>({
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
