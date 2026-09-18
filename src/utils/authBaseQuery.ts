import { fetchBaseQuery, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { ApiDomain } from "./ApiDomain";
import type { UserState } from "../reducers/login/userSlice";
import { sessionExpired } from "../reducers/login/userSlice";

// Deliberately NOT `RootState` from app/store: store.ts imports every API
// slice, and every slice imports this helper, so pulling RootState back in
// here closes a type cycle that TypeScript resolves by collapsing RootState
// to `PersistPartial` ("Property 'user' does not exist"). This slice of the
// state tree is all the base query ever reads.
type AuthState = { user: UserState };

// Every RTK Query slice's prepareHeaders attaches Authorization when a
// token is present — reads and mutations alike, no exception.
// See eventor-build-spec.md §3.
//
// Wrapped (rather than returning fetchBaseQuery directly) so every slice
// built on this helper automatically raises the session-expired modal on a
// 401 — no per-slice wiring needed. Deliberately checks ONLY 401: a 403
// means the token is still valid but the user lacks permission for that
// specific resource (e.g. a non-admin hitting an admin-only route) — that's
// a normal permissions error the calling component should surface itself,
// not a reason to log the user out.
export const authBaseQuery = (): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> => {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl: ApiDomain,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as AuthState).user.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", "application/json");
      return headers;
    },
  });

  return async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions);
    if (result.error?.status === 401) {
      api.dispatch(sessionExpired());
    }
    return result;
  };
};