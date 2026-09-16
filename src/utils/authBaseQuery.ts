import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { ApiDomain } from "./ApiDomain";
import type { UserState } from "../reducers/login/userSlice";

// Deliberately NOT `RootState` from app/store: store.ts imports every API
// slice, and every slice imports this helper, so pulling RootState back in
// here closes a type cycle that TypeScript resolves by collapsing RootState
// to `PersistPartial` ("Property 'user' does not exist"). This slice of the
// state tree is all the base query ever reads.
type AuthState = { user: UserState };

// Every RTK Query slice's prepareHeaders attaches Authorization when a
// token is present — reads and mutations alike, no exception.
// See eventor-build-spec.md §3.
export const authBaseQuery = () =>
  fetchBaseQuery({
    baseUrl: ApiDomain,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as AuthState).user.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", "application/json");
      return headers;
    },
  });