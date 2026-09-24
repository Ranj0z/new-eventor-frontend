import { createApi } from "@reduxjs/toolkit/query/react";
import { authBaseQuery } from "../../utils/authBaseQuery";
import type { TRSVPStatus } from "../rsvp/rsvpAPI";

// GET /rsvp/lookup?idNumber=... — public, no auth required.
export type TRSVPLookup = {
  RSVPID: number;
  idNumber: string;
  eventName: string;
  ticketType: string;
  totalAmount: number;
  amountPaid: number;
  remaining: number; // totalAmount - amountPaid, derived server-side
  RSVPStatus: TRSVPStatus;
};

// POST /rsvp/:rsvpId/partial-payment — one STK push for one installment.
export type TPartialPaymentInitiateRequest = {
  rsvpId: number;
  phoneNumber: string;
  amount: number;
};

// Same shape as TPaymentInitiateResponse — status is polled through
// paymentsAPI.useGetPaymentStatusQuery, no separate endpoint.
export type TPartialPaymentInitiateResponse = { paymentId: number };

export const partialPaymentsAPI = createApi({
  reducerPath: "partialPaymentsAPI",
  // authBaseQuery only attaches Authorization when a token exists, so it's
  // fine for the public lookup route too.
  baseQuery: authBaseQuery(),
  tagTypes: ["PartialPayment"],
  endpoints: (builder) => ({
    lookupRSVP: builder.query<TRSVPLookup, { idNumber: string }>({
      query: ({ idNumber }) => ({ url: "/rsvp/lookup", params: { idNumber } }),
      providesTags: ["PartialPayment"],
    }),
    initiatePartialPayment: builder.mutation<TPartialPaymentInitiateResponse, TPartialPaymentInitiateRequest>({
      query: ({ rsvpId, phoneNumber, amount }) => ({
        url: `/rsvp/${rsvpId}/partial-payment`,
        method: "POST",
        body: { phoneNumber, amount },
      }),
      invalidatesTags: ["PartialPayment"],
    }),
  }),
});

export const { useLookupRSVPQuery, useInitiatePartialPaymentMutation } = partialPaymentsAPI;
