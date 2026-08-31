import { createApi } from "@reduxjs/toolkit/query/react";
import { authBaseQuery } from "../../utils/authBaseQuery";

export type TPaymentStatus = "Pending" | "In Progress" | "Completed";

export type TPayment = {
  PaymentID: number;
  RSVPID: number;
  EventID: number;
  amount: string;
  balance: string;
  paymentStatus: TPaymentStatus;
  paymentDate: string;
  paymentMethod: string;
  TransactionID: string;
  created_at: string;
  updated_at: string | null;
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
    // Payments are never updated once created — api-endpoints.md confirms
    // there is no update/status endpoint for this resource. "Paid" state
    // lives on the RSVP instead (TRSVP.paid + rsvpAPI's markRSVPPaid/
    // markRSVPUnpaid) — see eventor-frontend-types.md / rsvpAPI.ts.
  }),
});

export const { useGetAllPaymentsQuery, useGetPaymentByIdQuery } = paymentsAPI;