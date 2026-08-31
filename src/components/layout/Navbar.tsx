import { Link, NavLink } from "react-router-dom";
import { Menu, X, CalendarDays, UserCircle, LayoutDashboard, LogOut } from "lucide-react";
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../app/store";
import { logout } from "../../reducers/login/userSlice";
import ThemeToggle from "./ThemeToggle";

const navLink = ({ isActive }: { isActive: boolean }) =>
  `text-sm transition-colors ${isActive ? "text-primary font-medium" : "text-base-content/70 hover:text-base-content"}`;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.user);

  const dashboardPath =
    user?.role === "admin" ? "/admin/dashboard"
    : user?.role === "host" ? "/host/dashboard"
    : user?.role === "user" ? "/user/dashboard"
    : "/login";

  const profilePath = `${dashboardPath}/profile`;

  const links = [
    { to: "/", label: "Home" },
    { to: "/events", label: "Events" },
    { to: "/venues", label: "Venues" },
    { to: "/about", label: "About" },
    { to: "/features", label: "Features" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-base-100/90 backdrop-blur border-b border-base-300">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl text-primary">
          <CalendarDays size={22} strokeWidth={2} />
          Eventor
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navLink} end={l.to === "/"}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <div className="dropdown dropdown-end">
              <button tabIndex={0} className="btn btn-sm btn-ghost btn-circle avatar placeholder" aria-label="Account menu">
                <div className="bg-primary text-primary-content rounded-full w-8">
                  <span className="text-xs">
                    {(user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")}
                  </span>
                </div>
              </button>
              <ul tabIndex={0} className="dropdown-content menu z-50 mt-3 w-52 rounded-lg bg-base-100 border border-base-300 shadow-lg p-2">
                <li className="px-3 py-1 text-xs text-base-content/50">
                  {user.firstName} {user.lastName}
                </li>
                <li>
                  <Link to={dashboardPath}>
                    <LayoutDashboard size={16} /> Dashboard
                  </Link>
                </li>
                <li>
                  <Link to={profilePath}>
                    <UserCircle size={16} /> Profile
                  </Link>
                </li>
                <li>
                  <button onClick={() => dispatch(logout())}>
                    <LogOut size={16} /> Log out
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-sm btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn btn-sm btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-base-300 px-4 py-3 flex flex-col gap-3">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navLink} onClick={() => setOpen(false)} end={l.to === "/"}>
              {l.label}
            </NavLink>
          ))}
          <div className="pt-2 flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Link to={dashboardPath} className="btn btn-sm btn-primary flex-1" onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
                <Link to={profilePath} className="btn btn-sm btn-ghost flex-1" onClick={() => setOpen(false)}>
                  Profile
                </Link>
                <button className="btn btn-sm btn-ghost flex-1" onClick={() => dispatch(logout())}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-sm btn-ghost flex-1" onClick={() => setOpen(false)}>
                  Log in
                </Link>
                <Link to="/register" className="btn btn-sm btn-primary flex-1" onClick={() => setOpen(false)}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}