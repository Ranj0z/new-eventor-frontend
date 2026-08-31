import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { ApiDomain } from "../../utils/ApiDomain";
import type { TUser } from "../users/usersAPI";
import type { TRSVP } from "../rsvp/rsvpAPI";

export type TLoginInput = {
  email: string;
  password: string;
};

export type TLoginResponse = {
  token: string;
  user: TUser;
  // present only when guest RSVPs match this account's email — see
  // eventor-architecture-decisions.md §5
  unlinkedGuestRSVPs?: TRSVP[];
};

// Fields collected on the register form. Password confirmation is checked
// client-side only, never sent to the backend.
export type TRegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  password: string;
};

// ASSUMPTION (unconfirmed against a real response): register doesn't return
// a token/user — it puts the account in an unverified state and expects a
// follow-up /auth/verify call. Flagging so this is easy to find if the real
// response turns out to include a token.
export type TRegisterResponse = {
  message: string;
  email: string;
};

export type TVerifyInput = {
  email: string;
  verificationCode: string;
};

// ASSUMPTION: verify does not auto-login (no token/user in the response) —
// same reasoning as register above. Verify.tsx redirects to /login on
// success rather than assuming a session was created.
export type TVerifyResponse = {
  message: string;
};

export type TForgotPasswordInput = {
  email: string;
};

// api-endpoints.md confirms this is intentionally generic/enumeration-
// resistant — same message whether or not the email exists.
export type TForgotPasswordResponse = {
  message: string;
};

// ASSUMPTION: reset token arrives as a URL query param and is submitted
// alongside the new password. Param name (`token`) and body shape are not
// confirmed against a real reset-password email/link.
export type TResetPasswordInput = {
  token: string;
  password: string;
};

export type TResetPasswordResponse = {
  message: string;
};

export const loginAPI = createApi({
  reducerPath: "loginAPI",
  // no auth header needed for any of these — all pre-session auth flows
  baseQuery: fetchBaseQuery({
    baseUrl: ApiDomain,
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<TLoginResponse, TLoginInput>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),
    register: builder.mutation<TRegisterResponse, TRegisterInput>({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        body,
      }),
    }),
    verify: builder.mutation<TVerifyResponse, TVerifyInput>({
      query: (body) => ({
        url: "/auth/verify",
        method: "POST",
        body,
      }),
    }),
    forgotPassword: builder.mutation<TForgotPasswordResponse, TForgotPasswordInput>({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body,
      }),
    }),
    resetPassword: builder.mutation<TResetPasswordResponse, TResetPasswordInput>({
      query: (body) => ({
        url: "/auth/reset-password",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useVerifyMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = loginAPI;
