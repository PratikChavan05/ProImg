import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Home, PlusCircle, MessageCircle, Menu, X, Users } from "lucide-react";
import NotificationBell from "./NotificationBell";

const navLink = ({ isActive }) =>
  `hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
    isActive
      ? "bg-ocean-50 text-ocean-800"
      : "text-ink-muted hover:bg-paper-dark hover:text-ink"
  }`;

const Navbar = ({ user }) => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-ocean-500 to-fresh-500 flex items-center justify-center text-white font-bold text-sm shadow-soft">
            P
          </span>
          <span className="font-display text-xl font-bold text-ink group-hover:text-ocean-700 transition">
            ProImg
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" end className={navLink}>
            <Home size={18} /> Home
          </NavLink>
          <NavLink to="/create" className={navLink}>
            <PlusCircle size={18} /> Create
          </NavLink>
          <NavLink to="/messages" className={navLink}>
            <MessageCircle size={18} /> Messages
          </NavLink>
          {user?._id && (
            <NavLink to={`/get/${user._id}`} className={navLink}>
              <Users size={18} /> Network
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link
            to="/create"
            className="md:hidden btn-primary !py-2 !px-3 !text-sm"
            aria-label="Create pin"
          >
            <PlusCircle size={18} />
          </Link>
          <Link to="/account" className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-paper-dark transition">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ocean-400 to-fresh-500 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white shadow-soft">
              {user?.name?.slice(0, 1).toUpperCase() || "?"}
            </div>
            <span className="hidden lg:block text-sm font-medium text-ink-soft max-w-[120px] truncate">
              {user?.name || "Profile"}
            </span>
          </Link>
          <button
            type="button"
            className="md:hidden p-2 rounded-xl text-ink-muted hover:bg-paper-dark"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-stone-100 bg-white px-4 py-3 space-y-1">
          <NavLink to="/" end className="block btn-ghost !justify-start" onClick={() => setOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/messages" className="block btn-ghost !justify-start" onClick={() => setOpen(false)}>
            Messages
          </NavLink>
          <NavLink to={`/get/${user?._id}`} className="block btn-ghost !justify-start" onClick={() => setOpen(false)}>
            Network
          </NavLink>
        </div>
      )}
    </header>
  );
};

export default Navbar;
