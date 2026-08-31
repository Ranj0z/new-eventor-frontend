import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { TUser } from "../users/usersAPI";

export type UserState = {
  token: string | null;
  user: TUser | null;
};

const initialState: UserState = { token: null, user: null };

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ token: string; user: TUser }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
    },
  },
});

export const { loginSuccess, logout } = userSlice.actions;
export default userSlice.reducer;
