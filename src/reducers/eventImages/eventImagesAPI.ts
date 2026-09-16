import { createApi } from "@reduxjs/toolkit/query/react";
import { authBaseQuery } from "../../utils/authBaseQuery";

// Extra ("carousel") photos attached to an event. The hero image lives on
// events.image_url and is never represented here — see
// eventor-event-images-frontend-plan.md §2.
export type TEventImage = {
  id: number;
  EventID: number;
  url: string;
  public_id: string;
  sortOrder: number;
  createdAt: string;
};

// The other slices wrap list payloads as { data: [...] }; this normalizer
// accepts either that shape or a bare array so the hook always hands back a
// plain TEventImage[] regardless of which the backend returns.
const toImageList = (response: unknown): TEventImage[] => {
  if (Array.isArray(response)) return response as TEventImage[];
  if (response && typeof response === "object" && Array.isArray((response as { data?: unknown }).data)) {
    return (response as { data: TEventImage[] }).data;
  }
  return [];
};

export const eventImagesAPI = createApi({
  reducerPath: "eventImagesAPI",
  // Plain JSON in both directions, so the standard auth base query applies —
  // unlike uploadsAPI, which needs its own multipart-safe variant.
  baseQuery: authBaseQuery(),
  tagTypes: ["EventImages"],
  endpoints: (builder) => ({
    getEventImages: builder.query<TEventImage[], number>({
      query: (eventId) => `/event-images/event/${eventId}`,
      transformResponse: toImageList,
      providesTags: (_result, _error, eventId) => [{ type: "EventImages" as const, id: eventId }],
    }),

    addEventImage: builder.mutation<
      TEventImage,
      { eventId: number; url: string; public_id: string }
    >({
      query: ({ eventId, url, public_id }) => ({
        url: `/event-images/event/${eventId}`,
        method: "POST",
        body: { url, public_id },
      }),
      invalidatesTags: (_result, _error, { eventId }) => [{ type: "EventImages" as const, id: eventId }],
    }),

    // `eventId` is carried on the argument purely so the delete can invalidate
    // that one event's cache entry rather than every event's.
    deleteEventImage: builder.mutation<void, { imageId: number; eventId: number }>({
      query: ({ imageId }) => ({ url: `/event-images/${imageId}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, { eventId }) => [{ type: "EventImages" as const, id: eventId }],
    }),
  }),
});

export const {
  useGetEventImagesQuery,
  useAddEventImageMutation,
  useDeleteEventImageMutation,
} = eventImagesAPI;
