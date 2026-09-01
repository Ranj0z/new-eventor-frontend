import { createApi } from "@reduxjs/toolkit/query/react";
import { authBaseQuery } from "../../utils/authBaseQuery";

// "In Progress" removed — migration 0021 dropped it from the backend enum.
export type TPaymentStatus = "Pending" | "Completed" | "Failed";

export type TPayment = {
  PaymentID: number;
  RSVPID: number;
  EventID: number;
  amount: string;
  // balance removed — migration 0021 dropped the column from the backend row.
  failureReason: string | null;
  paymentStatus: TPaymentStatus;
  paymentDate: string;
  paymentMethod: string;
  TransactionID: string;
  created_at: string;
  updated_at: string | null;
};

export type TPaymentInitiateResponse = { paymentId: number };

export type TPaymentStatusResponse = {
  status: "pending" | "success" | "failed";
  reason?: string;
};

export const paymentsAPI = createApi({
  reducerPath: "paymentsAPI",
  baseQuery: authBaseQuery(),
  tagTypes: ["Payments"],
  endpoints: (builder) => ({
    getAllPayments: builder.query<{ allPayments: TPayment[] }, void>({
      query: () => "/payment/allPayment",
      providesTags: ["Payments"],
    }),
    getPaymentById: builder.query<{ data: TPayment }, number>({
      query: (id) => `/payment/${id}`,
      providesTags: ["Payments"],
    }),
    // M-Pesa STK push initiation. Amount is derived server-side from the
    // RSVP/event, never sent from the client.
    initiatePayment: builder.mutation<TPaymentInitiateResponse, { rsvpId: number; phoneNumber: string }>({
      query: ({ rsvpId, phoneNumber }) => ({
        url: `/payments/rsvp/${rsvpId}/initiate`,
        method: "POST",
        body: { phoneNumber },
      }),
      invalidatesTags: ["Payments"],
    }),
    // Polled from PaymentModal until status settles or the 90s window elapses.
    // This slice can't invalidate rsvpAPI's "RSVP" tag (separate createApi
    // instance) — PaymentModal dispatches rsvpAPI.util.invalidateTags itself.
    getPaymentStatus: builder.query<TPaymentStatusResponse, number>({
      query: (paymentId) => `/payments/${paymentId}/status`,
    }),
  }),
});

export const {
  useGetAllPaymentsQuery,
  useGetPaymentByIdQuery,
  useInitiatePaymentMutation,
  useGetPaymentStatusQuery,
} = paymentsAPI;