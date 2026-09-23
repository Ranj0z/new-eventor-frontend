import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import {
  Users as UsersIcon,
  CalendarDays,
  MapPin,
  Ticket,
  Wallet,
  Receipt,
  LifeBuoy,
  BarChart3,
  UserCircle,
  History,
} from "lucide-react";
import Layout from "./components/layout/Layout";
import DashboardLayout from "./components/layout/DashboardLayout";
import type { DashboardNavItem } from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Home from "./pages/Home/Home";
import About from "./pages/About/About";
import Features from "./pages/Features/Features";
import Events from "./pages/Events/Events";
import Venues from "./pages/Venues/Venues";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Verify from "./pages/Register/Verify";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ForgotPassword/ResetPassword";
import Error from "./pages/Error/Error";
import EventDetails from "./pages/EventDetails/EventDetails";

import AdminUsers from "./pages/Admin/Dashboard/Users/Users";
import AdminEvents from "./pages/Admin/Dashboard/Events/Events";
import AdminVenues from "./pages/Admin/Dashboard/Venues/Venues";
import AdminRSVPs from "./pages/Admin/Dashboard/RSVPs/RSVPs";
import AdminPayments from "./pages/Admin/Dashboard/Payments/Payments";
import AdminSupportTickets from "./pages/Admin/Dashboard/SupportTickets/SupportTickets";
import AdminWithdrawals from "./pages/Admin/Dashboard/Withdrawals/AdminWithdrawals";
import AdminWallet from "./pages/Admin/Dashboard/Wallet/AdminWallet";
import AdminAnalytics from "./pages/Admin/Dashboard/Analytics/Analytics";
import AdminProfile from "./pages/Admin/Dashboard/Profile/Profile";

import HostMyEvents from "./pages/Host/Dashboard/MyEvents/MyEvents";
import HostEventHistory from "./pages/Host/Dashboard/EventHistory/EventHistory";
import HostRSVPs from "./pages/Host/Dashboard/RSVPs/RSVPs";
import HostPayments from "./pages/Host/Dashboard/Payments/Payments";
import HostWallet from "./pages/Host/Dashboard/Wallet/Wallet";
import HostProfile from "./pages/Host/Dashboard/Profile/Profile";

import UserEvents from "./pages/User/Dashboard/Events/Events";
import UserMyRSVPs from "./pages/User/Dashboard/MyRSVPs/MyRSVPs";
import UserEventHistory from "./pages/User/Dashboard/EventHistory/EventHistory";
import UserSupport from "./pages/User/Dashboard/Support/Support";
import UserProfile from "./pages/User/Dashboard/Profile/Profile";

const adminNav: DashboardNavItem[] = [
  { to: "/admin/dashboard/users", label: "Users", icon: UsersIcon },
  { to: "/admin/dashboard/events", label: "Events", icon: CalendarDays },
  { to: "/admin/dashboard/venues", label: "Venues", icon: MapPin },
  { to: "/admin/dashboard/rsvps", label: "RSVPs", icon: Ticket },
  { to: "/admin/dashboard/payments", label: "Payments", icon: Receipt },
  { to: "/admin/dashboard/withdrawals", label: "Withdrawals", icon: Ticket },
  { to: "/admin/dashboard/wallet", label: "Wallets", icon: Wallet },
  { to: "/admin/dashboard/support-tickets", label: "Support tickets", icon: LifeBuoy },
  { to: "/admin/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/dashboard/profile", label: "Profile", icon: UserCircle },
];

const hostNav: DashboardNavItem[] = [
  { to: "/host/dashboard/my-events", label: "My events", icon: CalendarDays },
  { to: "/host/dashboard/event-history", label: "Event history", icon: History },
  { to: "/host/dashboard/rsvps", label: "RSVPs", icon: Ticket },
  { to: "/host/dashboard/payments", label: "Payments", icon: Receipt },
  { to: "/host/dashboard/wallet", label: "Wallet", icon: Wallet },
  { to: "/host/dashboard/profile", label: "Profile", icon: UserCircle },
];

const userNav: DashboardNavItem[] = [
  { to: "/user/dashboard/events", label: "Events", icon: CalendarDays },
  { to: "/user/dashboard/my-rsvps", label: "My RSVPs", icon: Ticket },
  { to: "/user/dashboard/event-history", label: "Event history", icon: History },
  { to: "/user/dashboard/support", label: "Support", icon: LifeBuoy },
  { to: "/user/dashboard/profile", label: "Profile", icon: UserCircle },
];

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <Error />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/about", element: <About /> },
      { path: "/features", element: <Features /> },
      { path: "/events", element: <Events /> },
      {
        path: "/venues",
        element: (
          <ProtectedRoute allowedRoles={["admin", "host", "user"]}>
            <Venues />
          </ProtectedRoute>
        ),
      },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/register/verify", element: <Verify /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },

      {
        path: "/admin/dashboard",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout nav={adminNav} title="Admin" />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="users" replace /> },
          { path: "users", element: <AdminUsers /> },
          { path: "events", element: <AdminEvents /> },
          { path: "venues", element: <AdminVenues /> },
          { path: "rsvps", element: <AdminRSVPs /> },
          { path: "payments", element: <AdminPayments /> },
          { path: "withdrawals", element: <AdminWithdrawals /> },
          { path: "wallet", element: <AdminWallet /> },
          { path: "support-tickets", element: <AdminSupportTickets /> },
          { path: "analytics", element: <AdminAnalytics /> },
          { path: "profile", element: <AdminProfile /> },
        ],
      },

      {
        path: "/host/dashboard",
        element: (
          <ProtectedRoute allowedRoles={["host"]}>
            <DashboardLayout nav={hostNav} title="Host" />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="my-events" replace /> },
          { path: "my-events", element: <HostMyEvents /> },
          { path: "event-history", element: <HostEventHistory /> },
          { path: "rsvps", element: <HostRSVPs /> },
          { path: "payments", element: <HostPayments /> },
          { path: "wallet", element: <HostWallet /> },
          { path: "profile", element: <HostProfile /> },
        ],
      },

      {
        path: "/user/dashboard",
        element: (
          <ProtectedRoute allowedRoles={["user"]}>
            <DashboardLayout nav={userNav} title="Dashboard" />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="events" replace /> },
          { path: "events", element: <UserEvents /> },
          { path: "my-rsvps", element: <UserMyRSVPs /> },
          { path: "event-history", element: <UserEventHistory /> },
          { path: "support", element: <UserSupport /> },
          { path: "profile", element: <UserProfile /> },
        ],
      },

      // Public slug catch-all — must stay last among /Layout children so a
      // literal static path (/about, /events, etc.) always wins over it.
      // See eventor-frontend-plan.md §2.
      { path: "/:slug", element: <EventDetails /> },

      { path: "*", element: <Error /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;