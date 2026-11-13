import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, Plus } from 'lucide-react';
import Avatar from './Avatar';
import Logo from './Logo';
import { useAuth } from '../hooks/useAuth';

export default function Navbar({ onMenuClick, onLogout }) {
  const { displayName, email, photoURL } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointer = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const handleKey = (event) => event.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-canvas/85 px-4 backdrop-blur sm:px-8">
      <div className="flex items-center gap-3">
        <button className="btn-ghost !p-2 lg:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <Logo className="lg:hidden" />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link to="/wardrobe/add" className="btn-primary !px-3 sm:!px-4">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add clothing</span>
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-2.5 transition hover:border-clay/50"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Avatar name={displayName} photoURL={photoURL} size={32} />
            <ChevronDown className="h-4 w-4 text-muted" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="card absolute right-0 mt-2 w-64 animate-fade-up bg-white p-2 shadow-lift"
            >
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-muted">{email}</p>
              </div>
              <div className="my-1 border-t border-line" />
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-cream hover:text-ink"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
