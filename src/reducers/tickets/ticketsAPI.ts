import { createApi } from "@reduxjs/toolkit/query/react";
import { authBaseQuery } from "../../utils/authBaseQuery";

export type TTicketStatus = "Pending" | "In Progress" | "Closed";

export type TTicket = {
  TicketID: number;
  UserID: number;
  subject: string;
  description: string;
  ticketStatus: TTicketStatus;
  created_at: string;
  updated_at: string | null;
};

// Frontend domain name is "Tickets" (support tickets), but the confirmed
// backend paths for this resource are all under /ticket/* — the shape
// (UserID, subject, description, status) matches api-endpoints.md's
// "Tickets" section, not a separate /support-tickets route that doesn't
// exist in that doc.
export const ticketsAPI = createApi({
  reducerPath: "ticketsAPI",
  baseQuery: authBaseQuery(),
  tagTypes: ["Tickets"],
  endpoints: (builder) => ({
    createTicket: builder.mutation<{ data: TTicket }, Pick<TTicket, "subject" | "description">>({
      query: (body) => ({ url: "/ticket/newTicket", method: "POST", body }),
      invalidatesTags: ["Tickets"],
    }),
    getAllTickets: builder.query<{ Tickets: TTicket[] }, void>({
      query: () => "/ticket/allTickets",
      providesTags: ["Tickets"],
    }),
    getTicketById: builder.query<{ data: TTicket }, number>({
      query: (id) => `/ticket/${id}`,
      providesTags: ["Tickets"],
    }),
    getTicketsByUser: builder.query<{ Tickets: TTicket[] }, number>({
      query: (userId) => `/ticket/user/${userId}`,
      providesTags: ["Tickets"],
    }),
    updateTicketStatus: builder.mutation<TTicket, { id: number; ticketStatus: TTicketStatus }>({
      query: ({ id, ticketStatus }) => ({
        url: `/ticket/updateticket/${id}`,
        method: "PATCH",
        body: { ticketStatus },
      }),
      invalidatesTags: ["Tickets"],
    }),
  }),
});

export const {
  useCreateTicketMutation,
  useGetAllTicketsQuery,
  useGetTicketByIdQuery,
  useGetTicketsByUserQuery,
  useUpdateTicketStatusMutation,
} = ticketsAPI;
