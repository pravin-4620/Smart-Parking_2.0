import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserRole } from '@smart-parking/shared';
import { useAuth } from '../hooks/useAuth';
import {
  Car,
  Compass,
  LayoutDashboard,
  CalendarCheck,
  Clock,
  CreditCard,
  User,
  Bell,
  Menu,
  X,
  Radio,
  LogOut,
  MapPinned,
  Cpu,
  Users,
  DollarSign,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const userLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Nearby Parking', path: '/nearby', icon: Compass },
    { label: 'Book Slot', path: '/booking', icon: CalendarCheck },
    { label: 'My Bookings', path: '/my-bookings', icon: Clock },
    { label: 'Sessions', path: '/my-sessions', icon: Radio },
    { label: 'Vehicles', path: '/my-vehicles', icon: Car },
    { label: 'RFID Cards', path: '/my-rfid', icon: CreditCard },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  const managerLinks = [
    { label: 'Dashboard', path: '/manager', icon: LayoutDashboard },
    { label: 'My Parking', path: '/manager/parking', icon: MapPinned },
    { label: 'Reservations', path: '/manager/reservations', icon: CalendarCheck },
    { label: 'Parking Sessions', path: '/manager/sessions', icon: Radio },
    { label: 'Pricing', path: '/manager/pricing', icon: DollarSign },
    { label: 'IoT Devices', path: '/manager/devices', icon: Cpu },
  ];

  const adminLinks = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Managers', path: '/admin/managers', icon: User },
    { label: 'Parking Facilities', path: '/admin/parking', icon: MapPinned },
    { label: 'Pricing', path: '/admin/pricing', icon: DollarSign },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'IoT Devices', path: '/admin/devices', icon: Cpu },
    { label: 'Payments', path: '/admin/payments', icon: DollarSign },
  ];

  const navLinks =
    user?.role === UserRole.ADMIN
      ? adminLinks
      : user?.role === UserRole.PARKING_MANAGER
        ? managerLinks
        : userLinks;

  const homePath =
    user?.role === UserRole.ADMIN
      ? '/admin'
      : user?.role === UserRole.PARKING_MANAGER
        ? '/manager'
        : '/dashboard';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to={homePath} className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/30">
            <Car className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">SmartPark</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {isLoggingOut ? 'Signing Out...' : 'Logout'}
          </button>
        </nav>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={async () => {
              setMobileMenuOpen(false);
              await handleLogout();
            }}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" />
            {isLoggingOut ? 'Signing Out...' : 'Logout'}
          </button>
        </div>
      )}
    </header>
  );
};
