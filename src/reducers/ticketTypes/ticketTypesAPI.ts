import { createApi } from "@reduxjs/toolkit/query/react";
import { authBaseQuery } from "../../utils/authBaseQuery";
import { eventsAPI } from "../events/eventsAPI";

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
  status: "active" | "suspended"; // suspended tiers are hidden from public view
};

type TCreateTicketTypeArgs = {
  eventId: number;
  name: string;
  type: "individual" | "group";
  price: number;
  totalQuantity: number;
  groupSize?: number | null;
};

// A partial patch: either just `status` (suspend/reactivate) or the full
// editable field set — the backend only allows the latter when
// soldQuantity === 0, but that check happens server-side; this type just
// describes what the client is allowed to send.
type TUpdateTicketTypeArgs = {
  ticketTypeId: number;
} & Partial<Pick<TTicketType, "name" | "type" | "price" | "totalQuantity" | "groupSize" | "status">>;

export const ticketTypesAPI = createApi({
  reducerPath: "ticketTypesAPI",
  baseQuery: authBaseQuery(),
  tagTypes: ["TicketTypes"],
  endpoints: (builder) => ({
    getTicketTypesByEvent: builder.query<{ data: TTicketType[] }, number>({
      query: (eventId) => `/ticket-type/event/${eventId}`,
      providesTags: ["TicketTypes"],
    }),

    // Adding a tier to an existing event changes that event's derived
    // ticketsPrice/totalTickets, so this also invalidates eventsAPI's
    // "Events" tag — cross-slice, via dispatch, same pattern PaymentModal
    // uses for rsvpAPI (separate createApi instances can't invalidatesTags
    // each other directly).
    createTicketType: builder.mutation<TTicketType, TCreateTicketTypeArgs>({
      query: ({ eventId, ...body }) => ({
        url: `/ticket-type/event/${eventId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["TicketTypes"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(eventsAPI.util.invalidateTags(["Events"]));
        } catch {
          // Mutation failed — nothing to invalidate.
        }
      },
    }),

    updateTicketType: builder.mutation<TTicketType, TUpdateTicketTypeArgs>({
      query: ({ ticketTypeId, ...patch }) => ({
        url: `/ticket-type/update/${ticketTypeId}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["TicketTypes"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(eventsAPI.util.invalidateTags(["Events"]));
        } catch {
          // Mutation failed — nothing to invalidate.
        }
      },
    }),
  }),
});

export const {
  useGetTicketTypesByEventQuery,
  useCreateTicketTypeMutation,
  useUpdateTicketTypeMutation,
} = ticketTypesAPI;