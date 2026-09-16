import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { ApiDomain } from "../../utils/ApiDomain";
import type { UserState } from "../login/userSlice";

// Same reason as authBaseQuery: reading the token through a minimal local
// state type instead of RootState keeps store.ts out of this module's import
// cycle.
type AuthState = { user: UserState };

export type TUploadFolder = "profile" | "venue" | "event";

export type TUploadResult = {
  url: string;
  public_id: string;
};

type TUploadImageArgs = {
  file: File;
  folder: TUploadFolder;
};

// Deliberately NOT authBaseQuery: that helper hard-sets
// Content-Type: application/json on every request via prepareHeaders,
// which breaks multipart uploads — fetchBaseQuery serializes a FormData
// body correctly only if the browser is left to set its own
// multipart/form-data boundary. We still attach the same Authorization
// header so this endpoint is auth-gated like every other mutation.
const uploadsBaseQuery = fetchBaseQuery({
  baseUrl: ApiDomain,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as AuthState).user.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

export const uploadsAPI = createApi({
  reducerPath: "uploadsAPI",
  baseQuery: uploadsBaseQuery,
  endpoints: (builder) => ({
    uploadImage: builder.mutation<TUploadResult, TUploadImageArgs>({
      query: ({ file, folder }) => {
        const body = new FormData();
        body.append("image", file);
        body.append("folder", folder);
        return {
          url: "/uploads/image",
          method: "POST",
          body,
        };
      },
    }),
  }),
});

export const { useUploadImageMutation } = uploadsAPI;