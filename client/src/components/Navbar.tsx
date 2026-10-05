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
  Grid3X3,
  ClipboardList,
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
    { label: 'Slots', path: '/manager/slots', icon: Grid3X3 },
    { label: 'Reservations', path: '/manager/reservations', icon: CalendarCheck },
    { label: 'Parking Sessions', path: '/manager/sessions', icon: Radio },
    { label: 'Pricing', path: '/manager/pricing', icon: DollarSign },
    { label: 'IoT Devices', path: '/manager/devices', icon: Cpu },
  ];

  const adminLinks = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Managers', path: '/admin/managers', icon: User },
    { label: 'Parking Facilities', path: '/admin/parking', icon: MapPinned },
    { label: 'Slots', path: '/admin/slots', icon: Grid3X3 },
    { label: 'Reservations', path: '/admin/reservations', icon: ClipboardList },
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
    <header className="smart-nav sticky top-0 z-40">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-5">
        <Link to={homePath} className="flex items-center space-x-3 shrink-0" aria-label="SmartPark home">
          <div className="brand-mark p-2.5 rounded-xl text-white">
            <Car className="w-6 h-6" />
          </div>
          <div><span className="brand-name block leading-none">SmartPark<span className="brand-period">.</span></span><span className="brand-caption">A simpler way to park</span></div>
        </Link>

        {/* Desktop Nav */}
        <nav aria-label="Main navigation" className="desktop-nav hidden lg:flex items-center gap-1 min-w-0">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link px-2.5 py-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${
                  active
                    ? 'nav-link-active'
                    : ''
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
          <div className="profile-chip ml-2 pl-3 flex items-center gap-3">
            <div className="hidden xl:block text-right"><span className="profile-name block text-[11px] font-bold max-w-28 truncate">{user?.name}</span><span className="profile-role block text-[9px] uppercase tracking-wider">{user?.role?.replace('_', ' ')}</span></div>
            <button type="button" onClick={handleLogout} disabled={isLoggingOut} aria-label="Log out" title="Log out" className="p-2.5 rounded-xl nav-link disabled:opacity-50"><LogOut className="w-4 h-4" /></button>
          </div>
        </nav>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          className="mobile-menu-button lg:hidden p-2.5 rounded-xl border"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-navigation" className="mobile-nav-panel lg:hidden border-b border-slate-800 px-4 pt-3 pb-5 space-y-1 max-h-[calc(100vh-72px)] overflow-y-auto">
          <div className="profile-chip mb-3 py-3 flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold">{user?.name?.charAt(0).toUpperCase()}</div><div><span className="block text-sm font-bold">{user?.name}</span><span className="profile-role block text-[10px] uppercase tracking-wider">{user?.role?.replace('_', ' ')}</span></div></div>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${
                  active
                    ? 'nav-link-active'
                    : ''
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
            className="nav-link w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" />
            {isLoggingOut ? 'Signing Out...' : 'Logout'}
          </button>
        </div>
      )}
    </header>
  );
};
