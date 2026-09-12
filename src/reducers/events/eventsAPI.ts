import { createApi } from "@reduxjs/toolkit/query/react";
import { authBaseQuery } from "../../utils/authBaseQuery";
import type { TTicketTypePreset } from "../ticketTypes/ticketTypesAPI";

export type TCategory = "Tech" | "Data Science" | "Web Dev";

export type TEvents = {
  EventID: number;
  title: string;
  description: string;
  VenueID: number;
  category: TCategory;
  date: string;
  time: string;
  ticketsPrice: number; // server-derived: lowest tier price — never sent by the client
  totalTickets: number; // server-derived: sum of all tier quantities — never sent by the client
  soldTickets: number;
  createdAt: string;
  updatedAt: string | null;
  image_url: string | null;
  image_public_id: string | null;
};

// One row the host composes in the create-event form. `preset` is a
// frontend-only hint (prefills `name`/`price`) and is never sent to the
// backend as-is — createEvent's query maps it to `type` below.
// `name` is the editable label (preset-filled, but freely renamable; required
// free text for Custom). `groupSize` only applies to "Group ticket" rows —
// null/omitted otherwise.
export type TTicketTypeInput = {
  preset: TTicketTypePreset;
  name: string;
  price: number;
  totalQuantity: number; // individual seats — never multiplied by groupSize
  groupSize?: number | null;
};

// Shape actually sent to the backend for each ticket type row — matches what
// createEventService validates: no `preset`, an explicit `type`.
type TTicketTypeRequest = {
  name: string;
  type: "individual" | "group";
  price: number;
  totalQuantity: number;
  groupSize?: number | null;
};

// Event creation is one atomic request: event fields + the full ticketTypes
// array. The backend computes ticketsPrice/totalTickets itself — this type
// deliberately excludes those two fields from the client payload.
export type TCreateEventPayload = Omit<
  Partial<TEvents>,
  "ticketsPrice" | "totalTickets" | "EventID" | "soldTickets" | "createdAt" | "updatedAt"
> & {
  ticketTypes: TTicketTypeInput[];
};

// Maps a form row's preset to the backend's explicit type/groupSize fields,
// dropping `preset` (the backend has no such column).
const toTicketTypeRequest = (t: TTicketTypeInput): TTicketTypeRequest => {
  const isGroup = t.preset === "Group ticket";
  return {
    name: t.name,
    type: isGroup ? "group" : "individual",
    price: t.price,
    totalQuantity: t.totalQuantity,
    groupSize: isGroup ? t.groupSize : undefined,
  };
};

export const eventsAPI = createApi({
  reducerPath: "eventsAPI",
  baseQuery: authBaseQuery(),
  tagTypes: ["Events"],
  endpoints: (builder) => ({
    createEvent: builder.mutation<{ data: TEvents }, TCreateEventPayload>({
      query: ({ ticketTypes, ...eventFields }) => ({
        url: "/event/newevent",
        method: "POST",
        body: { ...eventFields, ticketTypes: ticketTypes.map(toTicketTypeRequest) },
      }),
      invalidatesTags: ["Events"],
    }),
    getAllEvents: builder.query<{ Events: TEvents[] }, void>({
      query: () => "/event/allevents",
      providesTags: ["Events"],
    }),
    getEventById: builder.query<{ data: TEvents }, number>({
      query: (id) => `/event/${id}`,
      providesTags: ["Events"],
    }),
    getEventsByHostId: builder.query<{ Events: TEvents[] }, number>({
      query: (hostId) => `/event/host/${hostId}`,
      transformResponse: (response: { data: TEvents[] }) => ({ Events: response.data }),
      providesTags: ["Events"],
    }),
    updateEvent: builder.mutation<TEvents, Partial<TEvents> & { id: number }>({
      query: ({ id, ...patch }) => ({
        url: `/event/update/${id}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["Events"],
    }),
    deleteEvent: builder.mutation<{ success: boolean }, number>({
      query: (id) => ({ url: `/event/delete/${id}`, method: "DELETE" }),
      invalidatesTags: ["Events"],
    }),
  }),
});

export const {
  useCreateEventMutation,
  useGetAllEventsQuery,
  useGetEventByIdQuery,
  useGetEventsByHostIdQuery,
  useUpdateEventMutation,
  useDeleteEventMutation,
} = eventsAPI;