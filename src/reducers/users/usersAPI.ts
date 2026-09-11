import { createApi } from "@reduxjs/toolkit/query/react";
import { authBaseQuery } from "../../utils/authBaseQuery";

export type TRole = "admin" | "host" | "user";

// password and verification_code intentionally NOT included — the backend
// currently sends both on /users (a live security bug, see
// eventor-frontend-types.md), but the frontend must never read or store
// them even if they arrive.
export type TUser = {
  UserID: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  role: TRole;
  isVerified: boolean;
  image_url: string | null;
  image_public_id: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export const usersAPI = createApi({
  reducerPath: "usersAPI",
  baseQuery: authBaseQuery(),
  tagTypes: ["Users"],
  endpoints: (builder) => ({
    // Backend returns { data: TUser[] } — see getAllUsersController.
    getAllUsers: builder.query<{ data: TUser[] }, void>({
      query: () => "/User/allUsers",
      providesTags: ["Users"],
    }),
    getUserById: builder.query<{ data: TUser }, number>({
      query: (id) => `/User/${id}`,
      providesTags: ["Users"],
    }),
    // Profile fields + is_verified — NOT role. api-endpoints.md gives no
    // dedicated is_verified endpoint either, so it's assumed to live here
    // alongside the other profile fields; flag if that turns out wrong.
    updateUser: builder.mutation<TUser, Partial<TUser> & { id: number }>({
      query: ({ id, ...patch }) => ({
        url: `/User/update/${id}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["Users"],
    }),
    // Role changes are three separate endpoints on the real backend, not a
    // generic "set role" field — there's no dedicated "downgrade to host"
    // route, only these three.
    promoteToHost: builder.mutation<TUser, number>({
      query: (id) => ({ url: `/User/updatetohost/${id}`, method: "PATCH" }),
      invalidatesTags: ["Users"],
    }),
    promoteToAdmin: builder.mutation<TUser, number>({
      query: (id) => ({ url: `/User/updatetoadmin/${id}`, method: "PATCH" }),
      invalidatesTags: ["Users"],
    }),
    downgradeToUser: builder.mutation<TUser, number>({
      query: (id) => ({ url: `/User/downgradetouser/${id}`, method: "PATCH" }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: builder.mutation<{ success: boolean }, number>({
      query: (id) => ({ url: `/User/delete/${id}`, method: "DELETE" }),
      invalidatesTags: ["Users"],
    }),
  }),
});

export const {
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  usePromoteToHostMutation,
  usePromoteToAdminMutation,
  useDowngradeToUserMutation,
  useDeleteUserMutation,
} = usersAPI;