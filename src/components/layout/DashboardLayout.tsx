import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Menu, X, ArrowLeft, LogOut, CalendarDays, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logout } from "../../reducers/login/userSlice";

export type DashboardNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

const navLinkClass = (collapsed: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
      collapsed ? "justify-center" : ""
    } ${
      isActive
        ? "bg-primary text-primary-content font-medium"
        : "text-base-content/70 hover:bg-base-200"
    }`;

// One sidebar shell, reused by /admin, /host and /user dashboards — only the
// nav items passed in change per role. See eventor-build-order.md Phase 6.
//
// Layout: the site Navbar (h-16, sticky top-0) renders above this via the
// root Layout route, so the aside/main pair below it fills the rest of the
// viewport. Aside is pinned (sticky, own height, overflow-hidden — it never
// scrolls); only `main` scrolls. Desktop aside is collapsible (icon rail);
// mobile keeps the existing slide-over drawer.
export default function DashboardLayout({ nav, title }: { nav: DashboardNavItem[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useDispatch();

  const sidebar = (isCollapsed: boolean) => (
    <div className="flex flex-col h-full">
      <Link
        to="/"
        className={`flex items-center gap-2 font-display text-lg text-primary px-3 py-4 ${
          isCollapsed ? "justify-center" : ""
        }`}
      >
        <CalendarDays size={20} />
        {!isCollapsed && "Eventor"}
      </Link>

      {!isCollapsed && (
        <p className="px-3 text-xs uppercase tracking-wide text-base-content/50 mb-2">{title}</p>
      )}

      <nav className="flex-1 space-y-1 px-2 overflow-hidden">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={navLinkClass(isCollapsed)}
            onClick={() => setOpen(false)}
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon size={17} />
            {!isCollapsed && item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 pb-4 pt-2 border-t border-base-300 space-y-1">
        <Link
          to="/"
          title={isCollapsed ? "Back to site" : undefined}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-base-content/70 hover:bg-base-200 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <ArrowLeft size={17} />
          {!isCollapsed && "Back to site"}
        </Link>
        <button
          onClick={() => dispatch(logout())}
          title={isCollapsed ? "Log out" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-base-content/70 hover:bg-base-200 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <LogOut size={17} />
          {!isCollapsed && "Log out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="md:flex md:h-[calc(100vh-4rem)]">
      <aside
        className={`hidden md:flex md:flex-col relative shrink-0 bg-base-100 border-r border-base-300 h-full overflow-hidden transition-all duration-200 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebar(collapsed)}
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-6 btn btn-xs btn-circle bg-base-100 border border-base-300 shadow-sm"
        >
          {collapsed ? <ChevronsRight size={12} /> : <ChevronsLeft size={12} />}
        </button>
      </aside>

      <header className="md:hidden sticky top-16 z-30 bg-base-100 border-b border-base-300 h-14 flex items-center justify-between px-4">
        <span className="font-display text-lg text-primary">{title}</span>
        <button onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={22} />
        </button>
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-base-100" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 btn btn-sm btn-circle btn-ghost"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            {sidebar(false)}
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 px-4 py-8 md:px-8 md:h-full md:overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}