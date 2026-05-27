import { NavLink } from "react-router-dom";
import { Home, PlusCircle, MessageCircle, User } from "lucide-react";

const linkClass = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[56px] rounded-xl transition ${
    isActive ? "text-ocean-700 bg-ocean-50" : "text-ink-muted hover:text-ocean-600 hover:bg-paper-dark"
  }`;

const BottomNav = () => {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-lg border-t border-stone-200 safe-area-pb"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-2 pt-1 pb-2">
        <NavLink to="/" end className={linkClass}>
          <Home size={22} strokeWidth={2} />
          <span className="text-[11px] font-medium">Home</span>
        </NavLink>
        <NavLink to="/create" className={linkClass}>
          <PlusCircle size={22} strokeWidth={2} />
          <span className="text-[11px] font-medium">Create</span>
        </NavLink>
        <NavLink to="/messages" className={linkClass}>
          <MessageCircle size={22} strokeWidth={2} />
          <span className="text-[11px] font-medium">Chat</span>
        </NavLink>
        <NavLink to="/account" className={linkClass}>
          <User size={22} strokeWidth={2} />
          <span className="text-[11px] font-medium">Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav;
