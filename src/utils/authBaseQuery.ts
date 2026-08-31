import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { ApiDomain } from "./ApiDomain";
import type { RootState } from "../app/store";

// Every RTK Query slice's prepareHeaders attaches Authorization when a
// token is present — reads and mutations alike, no exception.
// See eventor-build-spec.md §3.
export const authBaseQuery = () =>
  fetchBaseQuery({
    baseUrl: ApiDomain,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).user.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", "application/json");
      return headers;
    },
  });
