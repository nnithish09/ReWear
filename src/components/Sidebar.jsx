import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, PlusCircle, Shirt, X } from 'lucide-react';
import Logo from './Logo';
import Avatar from './Avatar';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/wardrobe', label: 'My Wardrobe', icon: Shirt, end: true },
  { to: '/wardrobe/add', label: 'Add Clothing', icon: PlusCircle, end: true },
];

export default function Sidebar({ open, onClose, onLogout }) {
  const { displayName, email, photoURL } = useAuth();
  const { pathname } = useLocation();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-cream/95 p-5 backdrop-blur transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Primary"
      >
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <button className="btn-ghost !p-2 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  (to === '/wardrobe' ? pathname.startsWith('/wardrobe') && pathname !== '/wardrobe/add' : isActive)
                    ? 'bg-ink text-canvas shadow-soft'
                    : 'text-muted hover:bg-white hover:text-ink'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="rounded-2xl border border-line bg-white/70 p-3.5">
          <div className="flex items-center gap-3">
            <Avatar name={displayName} photoURL={photoURL} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted">{email}</p>
            </div>
          </div>
          <button onClick={onLogout} className="btn-secondary mt-3 w-full">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}
