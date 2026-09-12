import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/es/storage";

import userSlice from "../reducers/login/userSlice";
import { loginAPI } from "../reducers/login/loginAPI";
import { usersAPI } from "../reducers/users/usersAPI";
import { eventsAPI } from "../reducers/events/eventsAPI";
import { venuesAPI } from "../reducers/venues/venuesAPI";
import { rsvpAPI } from "../reducers/rsvp/rsvpAPI";
import { ticketsAPI } from "../reducers/tickets/ticketsAPI";
import { ticketTypesAPI } from "../reducers/ticketTypes/ticketTypesAPI";
import { paymentsAPI } from "../reducers/payments/paymentsAPI";
import { uploadsAPI } from "../reducers/uploads/uploadsAPI";

// Only the auth session persists to localStorage — every RTK Query cache
// refetches fresh on load. See eventor-state-architecture.md §5.
const persistConfig = {
  key: "root",
  version: 1,
  storage,
  whitelist: ["user"],
};

const rootReducer = combineReducers({
  user: userSlice,
  [loginAPI.reducerPath]: loginAPI.reducer,
  [usersAPI.reducerPath]: usersAPI.reducer,
  [eventsAPI.reducerPath]: eventsAPI.reducer,
  [venuesAPI.reducerPath]: venuesAPI.reducer,
  [rsvpAPI.reducerPath]: rsvpAPI.reducer,
  [ticketsAPI.reducerPath]: ticketsAPI.reducer,
  [ticketTypesAPI.reducerPath]: ticketTypesAPI.reducer,
  [paymentsAPI.reducerPath]: paymentsAPI.reducer,
  [uploadsAPI.reducerPath]: uploadsAPI.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false })
      .concat(loginAPI.middleware)
      .concat(usersAPI.middleware)
      .concat(eventsAPI.middleware)
      .concat(venuesAPI.middleware)
      .concat(rsvpAPI.middleware)
      .concat(ticketsAPI.middleware)
      .concat(ticketTypesAPI.middleware)
      .concat(paymentsAPI.middleware)
      .concat(uploadsAPI.middleware),
});

export const persistedStore = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;