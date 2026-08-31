import { createApi } from "@reduxjs/toolkit/query/react";
import { authBaseQuery } from "../../utils/authBaseQuery";

export type TVenue = {
  VenueID: number;
  venueName: string;
  address: string;
  capacity: number | null;
  createdAt: string | null;
  image_url: string | null;
};

export const venuesAPI = createApi({
  reducerPath: "venuesAPI",
  baseQuery: authBaseQuery(),
  tagTypes: ["Venues"], // was "Prescriptions" — copy-paste leftover, fixed
  endpoints: (builder) => ({
    createVenue: builder.mutation<{ data: TVenue }, Partial<TVenue>>({
      query: (body) => ({ url: "/venue/newVenue", method: "POST", body }),
      invalidatesTags: ["Venues"],
    }),
    getAllVenues: builder.query<{ Venues: TVenue[] }, void>({
      query: () => "/venue/allVenues",
      providesTags: ["Venues"],
    }),
    getVenueById: builder.query<{ data: TVenue }, number>({
      query: (id) => `/venue/${id}`,
      providesTags: ["Venues"],
    }),
    updateVenue: builder.mutation<TVenue, Partial<TVenue> & { id: number }>({
      query: ({ id, ...patch }) => ({
        url: `/venue/update/${id}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["Venues"],
    }),
    deleteVenue: builder.mutation<{ success: boolean }, number>({
      query: (id) => ({ url: `/venue/delete/${id}`, method: "DELETE" }),
      invalidatesTags: ["Venues"],
    }),
  }),
});

export const {
  useCreateVenueMutation,
  useGetAllVenuesQuery,
  useGetVenueByIdQuery,
  useUpdateVenueMutation,
  useDeleteVenueMutation,
} = venuesAPI;
