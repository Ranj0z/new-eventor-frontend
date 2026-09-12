import { createApi } from "@reduxjs/toolkit/query/react";
import { authBaseQuery } from "../../utils/authBaseQuery";

export type TTicketTypePreset = "Free Entry" | "Early Bird" | "Regular" | "VIP" | "Group ticket" | "Custom";

// `preset` is deliberately NOT part of this type — it's a frontend-only form
// hint used to prefill the create-event ticket type inputs (see eventsAPI's
// TTicketTypeInput). The backend has no `preset` column and never returns one;
// only `type` ("individual" | "group") and `groupSize` persist.
export type TTicketType = {
  TicketTypeID: number;
  EventID: number;
  name: string;
  type: "individual" | "group";
  price: number;
  totalQuantity: number;
  soldQuantity: number;
  groupSize: number | null; // only set for "group" rows
};

// Ticket types are created atomically as part of event creation (see
// eventsAPI.createEvent's `ticketTypes` payload) — there is no create/update/
// delete endpoint here by design ("no edits later"). This API is read-only:
// it powers both displaying an existing event's tiers and RSVP cart-building.
export const ticketTypesAPI = createApi({
  reducerPath: "ticketTypesAPI",
  baseQuery: authBaseQuery(),
  tagTypes: ["TicketTypes"],
  endpoints: (builder) => ({
    getTicketTypesByEvent: builder.query<{ data: TTicketType[] }, number>({
      query: (eventId) => `/ticket-type/event/${eventId}`,
      providesTags: ["TicketTypes"],
    }),
  }),
});

export const { useGetTicketTypesByEventQuery } = ticketTypesAPI;