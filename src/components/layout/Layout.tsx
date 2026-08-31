import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <Navbar />
      <Outlet />
    </div>
  );
}
