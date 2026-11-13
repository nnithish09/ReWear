import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { logoutUser } from '../services/authService';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setSidebarOpen(false), [location.pathname]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.success('You have been logged out.');
    } catch {
      toast.error('Could not log out. Please try again.');
    }
  };

  return (
    <div className="min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />
      <div className="lg:pl-72">
        <Navbar onMenuClick={() => setSidebarOpen(true)} onLogout={handleLogout} />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
