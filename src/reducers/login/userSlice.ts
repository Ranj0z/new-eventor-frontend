import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { TUser } from "../users/usersAPI";

export type UserState = {
  token: string | null;
  user: TUser | null;
  // Set by authBaseQuery whenever any authenticated request comes back 401
  // (invalid/expired token) — never set for 403 (valid token, wrong role).
  // Dismissible by the user, but re-fires on the next 401 regardless of
  // whether it was previously dismissed.
  sessionExpired: boolean;
};

const initialState: UserState = { token: null, user: null, sessionExpired: false };

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ token: string; user: TUser }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.sessionExpired = false;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.sessionExpired = false;
    },
    // Token was rejected by the server (401). Clears auth state immediately
    // — a rejected token is dead regardless of whether the user has
    // acknowledged the modal yet — and raises the flag that shows it.
    sessionExpired: (state) => {
      state.token = null;
      state.user = null;
      state.sessionExpired = true;
    },
    // User dismissed the modal without logging back in. Auth state stays
    // cleared; only the modal's visibility is reset, and it will show again
    // on the next 401 (e.g. the next time they try an action that needs auth).
    clearSessionExpired: (state) => {
      state.sessionExpired = false;
    },
  },
});

export const { loginSuccess, logout, sessionExpired, clearSessionExpired } = userSlice.actions;
export default userSlice.reducer;