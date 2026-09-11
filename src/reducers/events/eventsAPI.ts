import { createApi } from "@reduxjs/toolkit/query/react";
import { authBaseQuery } from "../../utils/authBaseQuery";

export type TCategory = "Tech" | "Data Science" | "Web Dev";

export type TEvents = {
  EventID: number;
  title: string;
  description: string;
  VenueID: number;
  category: TCategory;
  date: string;
  time: string;
  ticketsPrice: number;
  totalTickets: number;
  soldTickets: number;
  createdAt: string;
  updatedAt: string | null;
  image_url: string | null;
  image_public_id: string | null;
};

export const eventsAPI = createApi({
  reducerPath: "eventsAPI",
  baseQuery: authBaseQuery(),
  tagTypes: ["Events"],
  endpoints: (builder) => ({
    createEvent: builder.mutation<{ data: TEvents }, Partial<TEvents>>({
      query: (body) => ({ url: "/event/newevent", method: "POST", body }),
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
  useUpdateEventMutation,
  useDeleteEventMutation,
} = eventsAPI;
